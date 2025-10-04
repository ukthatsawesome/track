import React, { useState, useEffect } from 'react';
import { useBatchAPI } from '../api/batches';
import { useBagAPI } from '../api/bags';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import '../styles/ReportsPage.css';

function ReportsPage() {
  const [batchData, setBatchData] = useState([]);
  const [bagData, setBagData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getBatches } = useBatchAPI();
  const { getBags } = useBagAPI();
  const { loading: authLoading } = useAuth(); // Get auth loading state

  useEffect(() => {
    const fetchData = async () => {
      try {
        const batches = await getBatches();
        const bags = await getBags();
        setBatchData(batches);
        setBagData(bags);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) { // Only fetch data if authentication is not loading
      fetchData();
    }
  }, [authLoading]);

  if (loading) {
    return <p>Loading reports...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  // Process data for charts
  const batchesByCountry = batchData.reduce((acc, batch) => {
    acc[batch.country] = (acc[batch.country] || 0) + 1;
    return acc;
  }, {});

  const batchesByProductionType = batchData.reduce((acc, batch) => {
    acc[batch.production_type] = (acc[batch.production_type] || 0) + 1;
    return acc;
  }, {});

  const bagsPerBatch = bagData.reduce((acc, bag) => {
    acc[bag.batch] = (acc[bag.batch] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="reports-page-container">
      <h1 className="reports-page-title">Reports Dashboard</h1>

      <div className="report-section">
        <h2>Batches by Country</h2>
        <div className="chart-placeholder">
          {Object.entries(batchesByCountry).map(([country, count]) => (
            <p key={country}>{country}: {count}</p>
          ))}
        </div>
      </div>

      <div className="report-section">
        <h2>Batches by Production Type</h2>
        <div className="chart-placeholder">
          {Object.entries(batchesByProductionType).map(([type, count]) => (
            <p key={type}>{type}: {count}</p>
          ))}
        </div>
      </div>

      <div className="report-section">
        <h2>Bags per Batch</h2>
        <div className="chart-placeholder">
          {Object.entries(bagsPerBatch).map(([batchId, count]) => (
            <p key={batchId}>Batch {batchId}: {count} bags</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;