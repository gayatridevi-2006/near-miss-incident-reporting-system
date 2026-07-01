import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AccountStatus from './pages/AccountStatus';
import Dashboard from './pages/Dashboard';
import ReportIncident from './pages/ReportIncident';
import IncidentDetails from './pages/IncidentDetails';
import ActionItems from './pages/ActionItems';
import AdminPanel from './pages/AdminPanel';
import Analytics from './pages/Analytics';
import DepartmentManagement from './pages/DepartmentManagement';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import HODRegistrationApproval from './pages/HODRegistrationApproval';
import FirstLoginChangePassword from './pages/FirstLoginChangePassword';
import HODDashboard from './pages/HODDashboard';
import HODIncidentDetails from './pages/HODIncidentDetails';
import HODReports from './pages/HODReports';
import Reports from './pages/Reports';

import './App.css';

// Private Route Guard Component
const PrivateRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#FFFFFF', color: 'var(--primary-blue)' }}>
        <h3>Verifying Session...</h3>
      </div>
    );
  }
  
  if (isAuthenticated && user?.first_login) {
    return <Navigate to="/first-login-change-password" replace />;
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// First Login Route Guard Component
const FirstLoginRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.first_login ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// Layout component to contain sidebar + pages
const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  );
};

// Admin Guard
const AdminRoute = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// HOD Guard
const HODRoute = () => {
  const { isHOD } = useAuth();
  return isHOD ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// Analytics Access Guard (Admin, Safety Officer, HOD, GM, PH, SM)
const AnalyticsRoute = () => {
  const { isAdmin, isSafetyOfficer, isHOD, isGeneralManager, isPlantHead, isSeniorManagement } = useAuth();
  const hasAccess = isAdmin || isSafetyOfficer || isHOD || isGeneralManager || isPlantHead || isSeniorManagement;
  return hasAccess ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account-status" element={<AccountStatus />} />

          {/* First Login Force Password Reset Route */}
          <Route element={<FirstLoginRoute />}>
            <Route path="/first-login-change-password" element={<FirstLoginChangePassword />} />
          </Route>

          {/* Secure Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/report" element={<ReportIncident />} />
              <Route path="/incidents/:id" element={<IncidentDetails />} />
              <Route path="/actions" element={<ActionItems />} />
              <Route path="/profile" element={<UserProfile />} />
              
              {/* HOD Guarded */}
              <Route element={<HODRoute />}>
                <Route path="/hod/approvals" element={<HODRegistrationApproval />} />
                <Route path="/hod-dashboard" element={<HODDashboard />} />
                <Route path="/hod-incidents/:id" element={<HODIncidentDetails />} />
                <Route path="/hod-reports" element={<HODReports />} />
              </Route>

              {/* Analytics Guarded */}
              <Route element={<AnalyticsRoute />}>
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
              
              {/* Admin Guarded */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/admin/departments" element={<DepartmentManagement />} />
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
