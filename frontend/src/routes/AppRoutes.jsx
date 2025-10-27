
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading message="Authenticating..." />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading message="Loading..." />;

  if (user) return <Navigate to="/dashboard" state={{ from: location }} replace />;

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {}
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

      {}
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

      {}
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
      {}
      <Route
        path="/submissions/:formId"
        element={
          <ProtectedRoute>
            <Submissions />
          </ProtectedRoute>
        }
      />
      {}
      <Route
        path="/forms/:formId/submissions"
        element={
          <ProtectedRoute>
            <SubmissionList />
          </ProtectedRoute>
        }
      />
      {}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
