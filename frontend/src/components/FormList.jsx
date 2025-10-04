import React, { useState, useEffect, useMemo } from 'react';
import { useFormAPI } from '../api/forms';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import SortFilter from './SortFilter'; // Import SortFilter component
import SearchFilter from './SearchFilter'; // Import SearchFilter component
import '../styles/FormList.css';
import { sortData } from './SortFilter'; // Import the utility

function FormList() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ sortBy: null, sortOrder: 'asc' });
  const [error, setError] = useState(null);
  const { getForms } = useFormAPI();
  const { loading: authLoading } = useAuth(); // Get auth loading state

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const data = await getForms();
        setForms(data);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) { // Only fetch forms if authentication is not loading
      fetchForms();
    }
  }, [authLoading]);

  const displayedForms = useMemo(() => {
    const searchKeys = ['name', 'description'];
    let processedForms = [...forms];

    // 1. Filter
    if (searchTerm) {
      processedForms = processedForms.filter(item =>
        searchKeys.some(key =>
          item[key] && item[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 2. Sort
    return sortData(processedForms, sortConfig.sortBy, sortConfig.sortOrder);
  }, [forms, searchTerm, sortConfig]);

  if (loading) {
    return <p>Loading forms...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <div className="form-list-container">
      <h2 className="form-list-title">List of Forms</h2>
      <div className="filter-sort-controls">
        <SearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search forms..." />
        <SortFilter sortConfig={sortConfig} onSortChange={setSortConfig} />
      </div>
      {displayedForms.length === 0 ? (
        <p>No forms found. Create one to get started!</p>
      ) : (
        <ul className="form-list">
          {displayedForms.map(form => (
            <li key={form.form_id} className="form-list-item">
              <Link to={`/forms/${form.form_id}`}>
                <h3>Form Name: {form.name}</h3>
                {/* <p>Form ID: {form.form_id</p> */}
                <p>Description: {form.description}</p>
              </Link>
              {form.association_type === 'standalone' && (
                <Link to={`/submissions/${form.form_id}`} className="fill-form-button">
                  Fill Form
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FormList;