import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import InventoryPage from './pages/InventoryPage';
import './styles.css'; // Asegúrate de importar el archivo de estilos

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/inventory"
            element={isAuthenticated ? <InventoryPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/inventory" /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;