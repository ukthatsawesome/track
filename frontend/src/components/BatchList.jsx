import React, { useEffect, useState, useMemo } from 'react';
import { useBatchAPI } from '../api/batches';
import { Link, useNavigate } from 'react-router-dom';
import SortFilter, { sortData } from './SortFilter';
import SearchFilter from './SearchFilter';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import '../styles/BatchList.css';

function BatchList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ sortBy: null, sortOrder: 'asc' });
  const [error, setError] = useState(null);
  const { getBatches, partialUpdateBatch } = useBatchAPI();
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth(); // Get auth loading state and user

  // Local state to track per-item status updates and errors
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [statusErrors, setStatusErrors] = useState({});

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const data = await getBatches();
        setBatches(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) { // Only fetch batches if authentication is not loading
      fetchBatches();
    }
  }, [authLoading]);

  const displayedBatches = useMemo(() => {
    const searchKeys = ['batch', 'country', 'production_type', 'status'];
    let processedBatches = [...batches];

    // 1. Filter
    if (searchTerm) {
      processedBatches = processedBatches.filter(item =>
        searchKeys.some(key =>
          item[key] && item[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 2. Sort
    return sortData(processedBatches, sortConfig.sortBy, sortConfig.sortOrder);
  }, [batches, searchTerm, sortConfig]);

  if (loading) {
    return <p>Loading batches...</p>;
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

  const handleStatusChange = async (batchId, nextStatus) => {
    // Optimistic update with revert on error
    setUpdatingStatus(prev => ({ ...prev, [batchId]: true }));
    setStatusErrors(prev => ({ ...prev, [batchId]: '' }));

    const prevBatches = batches;
    const nextBatches = batches.map(b => b.batch_id === batchId ? { ...b, status: nextStatus } : b);
    setBatches(nextBatches);

    try {
      await partialUpdateBatch(batchId, { status: nextStatus });
    } catch (e) {
      // Revert and show error
      console.error('Failed to update batch status:', e);
      setBatches(prevBatches);
      setStatusErrors(prev => ({
        ...prev,
        [batchId]: e.response?.data?.detail || 'Failed to update status.'
      }));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [batchId]: false }));
    }
  };

  return (
    <div className="batch-list-container">
      {/* Top header with title left, controls right */}
      <div className="list-header">
        <h2 className="batch-list-title">List of Batches</h2>
        <div className="filter-sort-controls">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search batches..."
          />
          <SortFilter
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
          />
        </div>
      </div>

      {displayedBatches.length === 0 ? (
        <p>No batches found. Create one to get started!</p>
      ) : (
        <ul className="batch-list">
          {displayedBatches.map(batch => (
            <li key={batch.batch_id} className="batch-list-item">
              <Link to={`/batches/${batch.batch_id}`}>
                <div className="card-header">
                  <h3>Batch ID: {batch.batch}</h3>
                  <StatusBadge value={batch.status} />
                </div>
                <div className="card-body">
                  <p>Country: {batch.country}</p>
                  <p>Production Type: {batch.production_type}</p>
                </div>
              </Link>

              {/* Removed inline status editor; keep actions lightweight */}
              <div className="card-actions">
                {batch.status !== 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bags/new?batchId=${batch.batch_id}&fromBatchCreation=true`);
                    }}
                    className="btn btn-primary"
                  >
                    Add Bag
                  </button>
                )}
                <Link to={`/batches/${batch.batch_id}`} className="btn btn-secondary">View Details</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BatchList;