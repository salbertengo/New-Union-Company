import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/login';
import Registration from './pages/userManagementPage';
import Inventory from './pages/InventoryPage';
import CustomersPage from './pages/customersPage';
import JobsheetPage from './pages/jobsheetPage';
import PaymentsPage from './pages/paymentsPage';
import VehiclesPage from './pages/vehiclesPage';
import UserManagement from './pages/userManagementPage';
import DashboardPage from './pages/dashboardPage';
// Protected route component for admin-only routes
const AdminRoute = ({ children }) => {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!isLoggedIn) return <Navigate to="/login" />;
  
  if (!isAdmin()) return <Navigate to="/jobsheets" />;
  
  return children;
};

// Protected route for any authenticated user
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  if (!isLoggedIn) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/jobsheets" /> : <Login />} />
        <Route path="/register" element={isLoggedIn ? <Navigate to="/jobsheets" /> : <Registration />} />
        
        {/* Admin-only routes */}
        <Route
          path="/inventorydashboard"
          element={
            <AdminRoute>
              <Inventory />
            </AdminRoute>
          }
        />
                <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/customersdashboard"
          element={
            <AdminRoute>
              <CustomersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <AdminRoute>
              <PaymentsPage />
            </AdminRoute>
          }
        />
                <Route
          path="/vehicles"
          element={
            <AdminRoute>
              <VehiclesPage />
            </AdminRoute>
          }
        />
                <Route
          path="/usermanagement"
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          }
        />
        
        {/* Routes accessible by all users */}
        <Route
          path="/jobsheets"
          element={
            <ProtectedRoute>
              <JobsheetPage />
            </ProtectedRoute>
          }
        />
        
        {/* Default redirect */}
        <Route path="/" element={
          <Navigate to={isLoggedIn ? "/jobsheets" : "/login"} />
        } />
      </Routes>
    </Router>
  );
}

export default App;