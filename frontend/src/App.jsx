import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import Navbar from './components/Navbar'; 
import './styles/Global.css';
import './styles/Login.css';
import './styles/Dashboard.css';
import './styles/BatchPage.css';
import './styles/BagPage.css';
import './styles/FormPage.css';
import './styles/Navbar.css'; 
import './styles/BatchList.css'; 
import './styles/BagList.css';
import './styles/FormList.css';
import './styles/ReportsPage.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="layout-container">
          <Navbar /> {/* Render Navbar component */}
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
