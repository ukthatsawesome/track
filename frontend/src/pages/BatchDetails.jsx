import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBatchAPI } from '../api/batches';
import { useFormAPI } from '../api/forms';
import Loading from '../components/Loading';
import '../styles/BatchDetails.css';
import { useAuth } from '../context/AuthContext';

function BatchDetails() {
  const { id } = useParams();
  const { getBatch, partialUpdateBatch } = useBatchAPI();
  const { getForm } = useFormAPI();
  const { user } = useAuth();

  const [batch, setBatch] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [formName, setFormName] = useState('N/A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 
  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        const data = await getBatch(id);
        setBatch(data);
        if (data.form) {
          const form = await getForm(data.form);
          setFormName(form.name);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch batch details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();
  }, [id, getBatch, getForm]);

 
  const canEditStatus = (batch) => {
    if (!user) return false;
   
   
    return user.is_staff || batch.status !== 'completed';
  };

 
  const handleStatusChange = async (nextStatus) => {
    if (!batch) return;
    setUpdatingStatus(true);
    setStatusError('');
    const prev = batch;

   
    setBatch({ ...batch, status: nextStatus });

    try {
      await partialUpdateBatch(batch.batch_id, { status: nextStatus });
    } catch (e) {
      console.error(e);
     
      setBatch(prev);
      setStatusError(e.response?.data?.detail || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

 
  if (loading) return <Loading />;
  if (error) return <div className="error-message">{error}</div>;
  if (!batch) return <div className="no-data-message">No batch data found.</div>;

 
  return (
    <div className="batch-details-container">
      <h2>Batch Details</h2>

      <div className="detail-item"><strong>Batch ID:</strong> {batch.batch_id}</div>
      <div className="detail-item"><strong>Batch Code:</strong> {batch.batch}</div>
      <div className="detail-item"><strong>User:</strong> {batch.user}</div>
      <div className="detail-item"><strong>Country:</strong> {batch.country}</div>
      <div className="detail-item"><strong>Production Type:</strong> {batch.production_type}</div>
      <div className="detail-item"><strong>Production Date:</strong> {new Date(batch.production_date).toLocaleDateString()}</div>
      <div className="detail-item"><strong>Form Gate Sourced:</strong> {batch.form_gate_sourced ? 'Yes' : 'No'}</div>
      <div className="detail-item"><strong>Cluster Group:</strong> {batch.cluster_group}</div>
      <div className="detail-item"><strong>Quantity:</strong> {batch.quantity}</div>
      <div className="detail-item"><strong>UOMs:</strong> {batch.uoms}</div>
      <div className="detail-item"><strong>Status:</strong> {batch.status}</div>

      <div className="detail-item">
        <label htmlFor="batch-status-select"><strong>Change Status</strong></label>
        <select
          id="batch-status-select"
          value={batch.status || ''}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updatingStatus || !canEditStatus(batch)}
          className={statusError ? 'error' : ''}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {statusError && <div className="error-text">{statusError}</div>}
      </div>

      <div className="detail-item"><strong>Created At:</strong> {new Date(batch.created_at).toLocaleString()}</div>

      {batch.completed_at && (
        <div className="detail-item">
          <strong>Completed At:</strong> {new Date(batch.completed_at).toLocaleString()}
        </div>
      )}

      <div className="detail-item"><strong>Bag Count:</strong> {batch.bag_counts}</div>
      <div className="detail-item"><strong>Associated Form:</strong> {formName}</div>

      {batch.form_data && Object.keys(batch.form_data).length > 0 && (
        <div className="detail-item">
          <strong>Form Data:</strong>
          {Object.entries(batch.form_data).map(([key, value]) => (
            <div key={key} style={{ marginLeft: '20px' }}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'working', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

export default BatchDetails;
