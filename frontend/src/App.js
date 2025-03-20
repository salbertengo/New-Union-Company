import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Registration from './pages/register';
import Inventory from './pages/InventoryPage';
import CustomersPage from './pages/customersPage';
import JobsheetPage from './pages/jobsheetPage';
import PaymentsPage from  './pages/paymentsPage';
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoggedIn(false);
        setIsCheckingAuth(false);
        return;
      }
      
      try {
        // Opcional: verificar validez del token con el backend
        const response = await fetch('http://localhost:3000/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          // Si el token no es válido, elimínalo
          localStorage.removeItem('token');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error verificando token:", error);
        // Si no se puede conectar al servidor, considerar el usuario como autenticado
        // para permitir intentar operaciones offline
        setIsLoggedIn(!!token);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifyToken();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  // Mostrar un indicador de carga mientras verifica la autenticación
  if (isCheckingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(0, 0, 0, 0.1)',
          borderLeft: '4px solid #5932EA',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/inventorydashboard" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={isLoggedIn ? <Navigate to="/inventorydashboard" /> : <Registration />} />
        <Route
          path="/inventorydashboard"
          element={
            isLoggedIn ? (
              <Inventory onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/customersdashboard"
          element={
            isLoggedIn ? (
              <CustomersPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/jobsheets"
          element={
            isLoggedIn ? (
              <JobsheetPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
         <Route
          path="/payments"
          element={
            isLoggedIn ? (
              <PaymentsPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/inventorydashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;