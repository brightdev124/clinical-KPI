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
import ClinicianManagement from './pages/ClinicianManagement';
import AssignDirector from './pages/AssignDirector';
import MonthlyReview from './pages/MonthlyReview';

import UserManagement from './pages/UserManagement';
import PermissionManagement from './pages/PermissionManagement';
import ClinicianProfile from './pages/ClinicianProfile';
import ClinicianTypesManagement from './pages/ClinicianTypesManagement';
import PositionManagement from './pages/PositionManagement';
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

  // Special handling for clinicians - only show Dashboard
  if (user?.role === 'clinician') {
    return (
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    );
  }

  return (
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
        <Route path="assign-director" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <AssignDirector />
          </RoleBasedRoute>
        } />
        <Route path="clinician/:id" element={<ClinicianProfile />} />
        <Route path="review/:clinicianId" element={
          <RoleBasedRoute allowedRoles={['director']}>
            <MonthlyReview />
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
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppContent />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;