import React, { useEffect, useState, useMemo } from 'react';
import { useBagAPI } from '../api/bags';
import { useBatchAPI } from '../api/batches';
import { Link } from 'react-router-dom';
import SortFilter, { sortData } from './SortFilter';
import SearchFilter from './SearchFilter';
import '../styles/BagList.css';
import { useAuth } from '../context/AuthContext';

function BagList() {
  const [bags, setBags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ sortBy: null, sortOrder: 'asc' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getBags, partialUpdateBag } = useBagAPI();
  const { getBatch } = useBatchAPI(); // Get getBatch from useFormAPI
  const { loading: authLoading, user } = useAuth(); // Get auth loading state and user

  // Local state to track per-item status updates and errors
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [statusErrors, setStatusErrors] = useState({});

  useEffect(() => {
    const fetchBags = async () => {
      try {
        const data = await getBags();
        // Fetch batch details for each bag
        const bagsWithBatchNames = await Promise.all(data.map(async (bag) => {
          if (bag.batch) {
            const batch = await getBatch(bag.batch);
            return { ...bag, batch_name: batch.batch }; // Assuming batch object has a 'batch' field for its name
          }
          return { ...bag, batch_name: 'N/A' };
        }));
        setBags(bagsWithBatchNames);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) { // Only fetch bags if authentication is not loading
      fetchBags();
    }
  }, [authLoading]);

  const displayedBags = useMemo(() => {
    const searchKeys = ['bag_id', 'batch_name', 'internal_lot_number', 'status'];
    let processedBags = [...bags];

    // 1. Filter
    if (searchTerm) {
      processedBags = processedBags.filter(item =>
        searchKeys.some(key =>
          item[key] && item[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 2. Sort
    return sortData(processedBags, sortConfig.sortBy, sortConfig.sortOrder);
  }, [bags, searchTerm, sortConfig]);

  if (loading) {
    return <p>Loading bags...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'working', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
  ];

  const StatusBadge = ({ value }) => {
    const cls =
      value === 'completed'
        ? 'status-completed'
        : value === 'working'
        ? 'status-working'
        : 'status-draft';
    const label = value === 'working' ? 'Pending' : (value || '').replace(/^\w/, c => c.toUpperCase());
    return <span className={`status-badge ${cls}`}>{label}</span>;
  };

  const canEditStatus = (item) => {
    // Lock when completed unless admin; admins can always edit
    if (user?.is_staff) return true;
    return item.status !== 'completed';
  };

  const handleStatusChange = async (bagId, nextStatus) => {
    // Optimistic update with revert on error
    setUpdatingStatus(prev => ({ ...prev, [bagId]: true }));
    setStatusErrors(prev => ({ ...prev, [bagId]: '' }));

    const prevBags = bags;
    const nextBags = bags.map(b => b.bag_id === bagId ? { ...b, status: nextStatus } : b);
    setBags(nextBags);

    try {
      await partialUpdateBag(bagId, { status: nextStatus });
    } catch (e) {
      console.error('Failed to update bag status:', e);
      setBags(prevBags);
      setStatusErrors(prev => ({
        ...prev,
        [bagId]: e.response?.data?.detail || 'Failed to update status.'
      }));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [bagId]: false }));
    }
  };

  return (
    <div className="bag-list-container">
      {/* Top header with title left, controls right */}
      <div className="list-header">
        <h2 className="bag-list-title">List of Bags</h2>
        <div className="filter-sort-controls">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search bags..."
          />
          <SortFilter
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
          />
        </div>
      </div>

      {displayedBags.length === 0 ? (
        <p>No bags found. Create one to get started!</p>
      ) : (
        <ul className="bag-list">
          {displayedBags.map(bag => (
            <li key={bag.bag_id} className="bag-list-item">
              <Link to={`/bags/${bag.bag_id}`}>
                <div className="card-header">
                  <h3>Bag ID: {bag.bag_id}</h3>
                  <StatusBadge value={bag.status} />
                </div>
                <div className="card-body">
                  <p>Batch: {bag.batch_name}</p>
                  <p>Internal Lot Number: {bag.internal_lot_number}</p>
                </div>
              </Link>

              {/* Removed inline status editor; keep actions lightweight */}
              <div className="card-actions">
                <Link to={`/bags/${bag.bag_id}`} className="btn btn-secondary">View Details</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BagList;