// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import BatchPage from '../pages/BatchPage';
import BagPage from '../pages/BagPage';
import FormPage from '../pages/FormPage';
import BatchList from '../components/BatchList';
import BagList from '../components/BagList';
import FormList from '../components/FormList';
import ReportsPage from '../pages/ReportsPage';
import BatchDetails from '../pages/BatchDetails';
import BagDetails from '../pages/BagDetails';
import FormDetails from '../pages/FormDetails';
import Submissions from '../pages/Submissions';
import SubmissionList from '../pages/SubmissionList';

// ------------------------
// Protected Route Wrapper
// ------------------------
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading message="Authenticating..." />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

// ------------------------
// Public Route Wrapper
// ------------------------
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading message="Loading..." />;

  if (user) return <Navigate to="/dashboard" state={{ from: location }} replace />;

  return children;
};

// ------------------------
// App Routes
// ------------------------
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Batch Routes */}
      <Route
        path="/batches/new"
        element={
          <ProtectedRoute>
            <BatchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batches"
        element={
          <ProtectedRoute>
            <BatchList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batches/:id"
        element={
          <ProtectedRoute>
            <BatchDetails />
          </ProtectedRoute>
        }
      />

      {/* Bag Routes */}
      <Route
        path="/bags/new"
        element={
          <ProtectedRoute>
            <BagPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bags"
        element={
          <ProtectedRoute>
            <BagList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bags/:id"
        element={
          <ProtectedRoute>
            <BagDetails />
          </ProtectedRoute>
        }
      />

      {/* Form Routes */}
      <Route
        path="/forms/new"
        element={
          <ProtectedRoute>
            <FormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms"
        element={
          <ProtectedRoute>
            <FormList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forms/:id"
        element={
          <ProtectedRoute>
            <FormDetails />
          </ProtectedRoute>
        }
      />
      {/* Form Submission (fill) */}
      <Route
        path="/submissions/:formId"
        element={
          <ProtectedRoute>
            <Submissions />
          </ProtectedRoute>
        }
      />
      {/* Form Submissions (list) */}
      <Route
        path="/forms/:formId/submissions"
        element={
          <ProtectedRoute>
            <SubmissionList />
          </ProtectedRoute>
        }
      />
      {/* Reports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Default & Catch-all Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
