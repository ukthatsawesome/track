// BagDetails component imports
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBagAPI } from '../api/bags';
import { useFormAPI } from '../api/forms';
import Loading from '../components/Loading';
import '../styles/BagDetails.css';
import { useAuth } from '../context/AuthContext';
import { useBatchAPI } from '../api/batches';

function BagDetails() {
  const { id } = useParams();
  const { getBag, partialUpdateBag } = useBagAPI();
  const { getForm } = useFormAPI();
  const { user } = useAuth();

  const [bag, setBag] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [formName, setFormName] = useState('N/A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getBatch } = useBatchAPI();
  const [batch, setBatch] = useState(null);

  // ✅ Fetch bag, related form, and associated batch
  useEffect(() => {
    const fetchBagDetails = async () => {
      try {
        const data = await getBag(id);
        setBag(data);

        if (data.form) {
          const form = await getForm(data.form);
          setFormName(form.name);
        }

        // Fetch associated batch and apply rules
        if (data.batch) {
          const batchData = await getBatch(data.batch);
          setBatch(batchData);

          // If batch is completed, enforce bag status completed and lock it
          if (batchData.status === 'completed' && data.status !== 'completed') {
            setBag(prev => ({ ...prev, status: 'completed' }));
            try {
              await partialUpdateBag(data.bag_id, { status: 'completed' });
            } catch (e) {
              console.error('Failed to enforce completed status on bag:', e);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch bag details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBagDetails();
  }, [id, getBag, getForm, getBatch, partialUpdateBag]);

  // ✅ Combine role-based permission with batch rule
  const canEditStatus = (bagToCheck) => {
    if (!user) return false;
    const roleAllowed = user.role === 'admin' || user.id === bagToCheck.created_by;
    const batchAllows = !(batch && batch.status === 'completed');
    return roleAllowed && batchAllows;
  };

  // ✅ Handle status change
  const handleStatusChange = async (nextStatus) => {
    if (!bag) return;
    setUpdatingStatus(true);
    setStatusError('');

    const previous = bag;
    setBag({ ...bag, status: nextStatus });

    try {
      await partialUpdateBag(bag.bag_id, { status: nextStatus });
    } catch (e) {
      console.error(e);
      setBag(previous);
      setStatusError(e.response?.data?.detail || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ✅ Loading & Error UI
  if (loading) return <Loading />;
  if (error) return <div className="error-message">{error}</div>;
  if (!bag) return <div className="no-data-message">No bag data found.</div>;

  // ✅ Main UI
  return (
    <div className="bag-details-container">
      <h2>Bag Details</h2>

      <div className="detail-item"><strong>Bag ID:</strong> {bag.bag_id}</div>
      <div className="detail-item"><strong>Batch ID:</strong> {bag.batch}</div>
      <div className="detail-item"><strong>Internal Lot Number:</strong> {bag.internal_lot_number}</div>
      <div className="detail-item"><strong>State:</strong> {bag.state}</div>
      <div className="detail-item"><strong>QR Code:</strong> {bag.qr_code}</div>
      <div className="detail-item"><strong>External Lot Number:</strong> {bag.external_lot_number}</div>
      <div className="detail-item"><strong>External Update Date:</strong> {new Date(bag.external_update_date).toLocaleDateString()}</div>
      <div className="detail-item"><strong>Status:</strong> {bag.status}</div>

      <div className="detail-item">
        <label htmlFor="bag-status-select"><strong>Change Status</strong></label>
        <select
          id="bag-status-select"
          value={bag.status || ''}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updatingStatus || !canEditStatus(bag)}
          className={statusError ? 'error' : ''}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {statusError && <div className="error-text">{statusError}</div>}
      </div>

      <div className="detail-item">
        <strong>Created At:</strong> {new Date(bag.created_at).toLocaleString()}
      </div>

      {bag.completed_at && (
        <div className="detail-item">
          <strong>Completed At:</strong> {new Date(bag.completed_at).toLocaleString()}
        </div>
      )}

      <div className="detail-item">
        <strong>Associated Form:</strong> {formName}
      </div>

      {bag.form_data && Object.keys(bag.form_data).length > 0 && (
        <div className="detail-item">
          <strong>Form Data:</strong>
          {Object.entries(bag.form_data).map(([key, value]) => (
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

export default BagDetails;
