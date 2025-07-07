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

const AppContent: React.FC = () => {
  const { isAuthenticated, isPendingApproval } = useAuth();

  console.log('AppContent state:', { isAuthenticated, isPendingApproval });

  if (isPendingApproval) {
    console.log('Showing PendingApproval page');
    return <PendingApproval />;
  }

  if (!isAuthenticated) {
    console.log('Showing LandingPage');
    return <LandingPage />;
  }

  console.log('Showing authenticated routes');

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="kpis" element={<KPIManagement />} />
        <Route path="clinicians" element={<ClinicianManagement />} />
        <Route path="clinician/:id" element={<ClinicianProfile />} />
        <Route path="review/:clinicianId" element={<MonthlyReview />} />
        <Route path="analytics" element={<PerformanceAnalytics />} />
        <Route path="users" element={<UserManagement />} />
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