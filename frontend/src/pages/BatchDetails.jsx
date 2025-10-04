import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBatchAPI } from '../api/batches';
import { useFormAPI } from '../api/forms'; // Import useFormAPI
import Loading from '../components/Loading';
import '../styles/BatchDetails.css';

const BatchDetails = () => {
    const { id } = useParams();
    const { getBatch } = useBatchAPI();
    const { getForm } = useFormAPI(); // Get getForm from useFormAPI
    const [batch, setBatch] = useState(null);
    const [formName, setFormName] = useState('N/A'); // New state for form name
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
                setError('Failed to fetch batch details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBatchDetails();
    }, [id, getBatch, getForm]); // Add getForm to dependencies

    if (loading) {
        return <Loading />;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!batch) {
        return <div className="no-data-message">No batch data found.</div>;
    }

    return (
        <div className="batch-details-container">
            <h2>Batch Details</h2>
            <div className="detail-item">
                <strong>Batch ID:</strong> {batch.batch_id}
            </div>
            <div className="detail-item">
                <strong>Batch Code:</strong> {batch.batch}
            </div>
            <div className="detail-item">
                <strong>User:</strong> {batch.user}
            </div>
            <div className="detail-item">
                <strong>Country:</strong> {batch.country}
            </div>
            <div className="detail-item">
                <strong>Production Type:</strong> {batch.production_type}
            </div>
            <div className="detail-item">
                <strong>Production Date:</strong> {new Date(batch.production_date).toLocaleDateString()}
            </div>
            <div className="detail-item">
                <strong>Form Gate Sourced:</strong> {batch.form_gate_sourced ? 'Yes' : 'No'}
            </div>
            <div className="detail-item">
                <strong>Cluster Group:</strong> {batch.cluster_group}
            </div>
            <div className="detail-item">
                <strong>Quantity:</strong> {batch.quantity}
            </div>
            <div className="detail-item">
                <strong>UOMs:</strong> {batch.uoms}
            </div>
            <div className="detail-item">
                <strong>Status:</strong> {batch.status}
            </div>
            <div className="detail-item">
                <strong>Created At:</strong> {new Date(batch.created_at).toLocaleString()}
            </div>
            {batch.completed_at && (
                <div className="detail-item">
                    <strong>Completed At:</strong> {new Date(batch.completed_at).toLocaleString()}
                </div>
            )}
            <div className="detail-item">
                <strong>Bag Count:</strong> {batch.bag_counts}
            </div>
            <div className="detail-item">
                <strong>Associated Form:</strong> {formName}
            </div>
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
};

export default BatchDetails;