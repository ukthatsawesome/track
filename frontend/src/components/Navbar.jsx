import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">BatchTrack</Link>
      </div>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/batches">View Batches</Link>
            <Link to="/bags">View Bags</Link>
            <Link to="/forms">View Forms</Link>
            <Link to="/reports">View Reports</Link>
            <Link to="/batches/new">Create Batch</Link>
            {/* <Link to="/bags/new">Create Bag</Link> */}
            <Link to="/forms/new">Create Form</Link>
            <span className="welcome-message">Welcome, {user.username}!</span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;