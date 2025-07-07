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
import MonthlyReview from './pages/MonthlyReview';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import UserManagement from './pages/UserManagement';
import ClinicianProfile from './pages/ClinicianProfile';
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

  // Special handling for clinicians - redirect to their profile
  if (user?.role === 'clinician') {
    return (
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<ClinicianProfile />} />
          <Route path="clinician/:id" element={<ClinicianProfile />} />
          <Route path="*" element={<ClinicianProfile />} />
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
          <RoleBasedRoute allowedRoles={['super-admin', 'director']}>
            <ClinicianManagement />
          </RoleBasedRoute>
        } />
        <Route path="clinician/:id" element={<ClinicianProfile />} />
        <Route path="review/:clinicianId" element={
          <RoleBasedRoute allowedRoles={['super-admin', 'director']}>
            <MonthlyReview />
          </RoleBasedRoute>
        } />
        <Route path="analytics" element={
          <RoleBasedRoute allowedRoles={['super-admin', 'director']}>
            <PerformanceAnalytics />
          </RoleBasedRoute>
        } />
        <Route path="users" element={
          <RoleBasedRoute allowedRoles={['super-admin']}>
            <UserManagement />
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