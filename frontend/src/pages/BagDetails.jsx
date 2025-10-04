import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBagAPI } from '../api/bags';
import { useFormAPI } from '../api/forms'; // Import useFormAPI
import Loading from '../components/Loading';
import '../styles/BagDetails.css';

const BagDetails = () => {
    const { id } = useParams();
    const { getBag } = useBagAPI();
    const { getForm } = useFormAPI(); // Get getForm from useFormAPI
    const [bag, setBag] = useState(null);
    const [formName, setFormName] = useState('N/A'); // New state for form name
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBagDetails = async () => {
            try {
                const data = await getBag(id);
                setBag(data);
                if (data.form) {
                    const form = await getForm(data.form);
                    setFormName(form.name);
                }
            } catch (err) {
                setError('Failed to fetch bag details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchBagDetails();
    }, [id, getBag, getForm]); // Add getForm to dependencies

    if (loading) {
        return <Loading />;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!bag) {
        return <div className="no-data-message">No bag data found.</div>;
    }

    return (
        <div className="bag-details-container">
            <h2>Bag Details</h2>
            <div className="detail-item">
                <strong>Bag ID:</strong> {bag.bag_id}
            </div>
            <div className="detail-item">
                <strong>Batch ID:</strong> {bag.batch}
            </div>
            <div className="detail-item">
                <strong>Internal Lot Number:</strong> {bag.internal_lot_number}
            </div>
            <div className="detail-item">
                <strong>State:</strong> {bag.state}
            </div>
            <div className="detail-item">
                <strong>QR Code:</strong> {bag.qr_code}
            </div>
            <div className="detail-item">
                <strong>External Lot Number:</strong> {bag.external_lot_number}
            </div>
            <div className="detail-item">
                <strong>External Update Date:</strong> {new Date(bag.external_update_date).toLocaleDateString()}
            </div>
            <div className="detail-item">
                <strong>Status:</strong> {bag.status}
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
};

export default BagDetails;