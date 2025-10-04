import React, { useState, useEffect, useMemo } from 'react';
import { useBatchAPI } from '../api/batches';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import SortFilter from './SortFilter'; // Import SortFilter component
import SearchFilter from './SearchFilter'; // Import SearchFilter component
import '../styles/BatchList.css';
import { sortData } from './SortFilter'; // Import the utility

function BatchList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ sortBy: null, sortOrder: 'asc' });
  const [error, setError] = useState(null);
  const { getBatches } = useBatchAPI();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth(); // Get auth loading state

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

  return (
    <div className="batch-list-container">
      <h2 className="batch-list-title">List of Batches</h2>
      <div className="filter-sort-controls">
        <SearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search batches..." />
        <SortFilter sortConfig={sortConfig} onSortChange={setSortConfig} />
      </div>
      {displayedBatches.length === 0 ? (
        <p>No batches found. Create one to get started!</p>
      ) : (
        <ul className="batch-list">
          {displayedBatches.map(batch => (
            <li key={batch.batch_id} className="batch-list-item">
              <Link to={`/batches/${batch.batch_id}`}>
                <h3>Batch ID: {batch.batch}</h3>
                <p>Country: {batch.country}</p>
                <p>Production Type: {batch.production_type}</p>
                <p>Status: {batch.status}</p>
              </Link>
              {batch.status !== 'completed' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent Link navigation
                    navigate(`/bags/new?batchId=${batch.batch_id}&fromBatchCreation=true`);
                  }}
                  className="add-bag-button"
                >
                  Add Bag
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BatchList;