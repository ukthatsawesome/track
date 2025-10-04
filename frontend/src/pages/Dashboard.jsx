import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css'; // Import the CSS file

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">

      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome to the Batch Tracking System</h2>
          <div className="features-grid">
            <div className="feature-card" onClick={() => navigate('/batches')}>
              <h3>📦 Batches</h3>
              <p>Manage and track production batches</p>
            </div>
            <div className="feature-card" onClick={() => navigate('/bags')}>
              <h3>🎒 Bags</h3>
              <p>Track individual bags within batches</p>
            </div>
            <div className="feature-card" onClick={() => navigate('/forms')}>
              <h3>📋 Forms</h3>
              <p>Manage dynamic forms and submissions</p>
            </div>
            <div className="feature-card" onClick={() => navigate('/reports')}>
              <h3>📊 Reports</h3>
              <p>View analytics and reports</p>
            </div>
            <div className="feature-card" onClick={() => navigate('/batches/new')}>
              <h3>➕ Create New Batch</h3>
              <p>Start a new batch creation process</p>
            </div>
            <div className="feature-card" onClick={() => navigate('/forms/new')}>
              <h3>➕ Create New Form</h3>
              <p>Start a new form creation process</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
