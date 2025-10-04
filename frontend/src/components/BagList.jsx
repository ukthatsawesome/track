import React, { useState, useEffect, useMemo } from 'react';
import { useBagAPI } from '../api/bags';
import { useBatchAPI } from '../api/batches'; // Import useBatchAPI
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import SortFilter from './SortFilter'; // Import SortFilter component
import SearchFilter from './SearchFilter'; // Import SearchFilter component
import '../styles/BagList.css';
import { sortData } from './SortFilter'; // Import the utility

function BagList() {
  const [bags, setBags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ sortBy: null, sortOrder: 'asc' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getBags } = useBagAPI();
  const { getBatch } = useBatchAPI(); // Get getBatch from useBatchAPI
  const { loading: authLoading } = useAuth(); // Get auth loading state

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

  return (
    <div className="bag-list-container">
      <h2 className="bag-list-title">List of Bags</h2>
      <div className="filter-sort-controls">
        <SearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search bags..." />
        <SortFilter sortConfig={sortConfig} onSortChange={setSortConfig} />
      </div>
      {displayedBags.length === 0 ? (
        <p>No bags found. Create one to get started!</p>
      ) : (
        <ul className="bag-list">
          {displayedBags.map(bag => (
            <li key={bag.bag_id} className="bag-list-item">
              <Link to={`/bags/${bag.bag_id}`}>
                <h3>Bag ID: {bag.bag_id}</h3>
                <p>Batch: {bag.batch_name}</p>
                <p>Internal Lot Number: {bag.internal_lot_number}</p>
                <p>Status: {bag.status}</p>
              </Link>
            </li>
          ))}
        </ul>
      )
      }
    </div>
  );
}

export default BagList;