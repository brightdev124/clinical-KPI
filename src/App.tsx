import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LandingPage from './components/LandingPage';
import PendingApproval from './components/PendingApproval';

import Dashboard from './pages/Dashboard';
import KPIManagement from './pages/KPIManagement';
import KPIGroupManagement from './pages/KPIGroupManagement';
import ClinicianManagement from './pages/ClinicianManagement';
import AssignDirector from './pages/AssignDirector';
import MonthlyReview from './pages/MonthlyReview';
import WeeklyReview from './pages/WeeklyReview';

import UserManagement from './pages/UserManagement';
import PermissionManagement from './pages/PermissionManagement';
import ClinicianProfile from './pages/ClinicianProfile';
import ClinicianTypesManagement from './pages/ClinicianTypesManagement';
import PositionManagement from './pages/PositionManagement';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import SecuritySettingsPage from './pages/SecuritySettings';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';

const AppContent: React.FC = () => {
  const { isAuthenticated, isPendingApproval, user } = useAuth();

  if (isPendingApproval) {
    return <PendingApproval />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Special handling for clinicians - only show Dashboard and Security Settings
  if (user?.role === 'clinician') {
    return (
      <>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="security-settings" element={<SecuritySettingsPage />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="kpis" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <KPIManagement />
          </RoleBasedRoute>
        } />
        <Route path="clinicians" element={
          <RoleBasedRoute allowedRoles={['director']}>
            <ClinicianManagement />
          </RoleBasedRoute>
        } />
        <Route path="kpi-groups" element={
          <RoleBasedRoute allowedRoles={['director']}>
            <KPIGroupManagement />
          </RoleBasedRoute>
        } />
        <Route path="assign-director" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <AssignDirector />
          </RoleBasedRoute>
        } />
        <Route path="clinician/:id" element={<ClinicianProfile />} />
        <Route path="review/:clinicianId" element={
          <RoleBasedRoute allowedRoles={['director']}>
            <WeeklyReview />
          </RoleBasedRoute>
        } />
        <Route path="my-reviews" element={
          <RoleBasedRoute allowedRoles={['director']}>
            <WeeklyReview />
          </RoleBasedRoute>
        } />

        <Route path="users" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <UserManagement />
          </RoleBasedRoute>
        } />
        <Route path="permissions" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <PermissionManagement />
          </RoleBasedRoute>
        } />
        <Route path="clinician-types" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <ClinicianTypesManagement />
          </RoleBasedRoute>
        } />
        <Route path="positions" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <PositionManagement />
          </RoleBasedRoute>
        } />
        <Route path="security-settings" element={<SecuritySettingsPage />} />
      </Route>
    </Routes>
  </>
);
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected routes */}
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;