import "../styles.css";
import React, { useEffect } from 'react';
<<<<<<< Updated upstream
=======
import { useNavigate } from 'react-router-dom';
>>>>>>> Stashed changes

const Sidebar = () => {
    const navigate = useNavigate();
    
    useEffect(() => {
      const existingScript = document.getElementById("script-buttons");
      if (existingScript) {
          existingScript.remove();
      }

        const loadScript = () => {
            const script = document.createElement('script');
            script.id = 'script-buttons';
            script.src = `${process.env.PUBLIC_URL}/script-buttons.js`;
            script.async = true;
            document.body.appendChild(script);
        };

        if (!document.getElementById('script-buttons')) {
            setTimeout(loadScript, 100);
        }
    }, []);

<<<<<<< Updated upstream
=======
  const handleNavigation = (path) => {
    navigate(path);
  };

>>>>>>> Stashed changes
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        boxSizing: 'border-box'
      }}
    >
      <nav>
<<<<<<< Updated upstream
        <button className="sidebar-button" id="btn1">
          <svg className="icon-interior" id="dashboard-icon"></svg>
          Dashboard
        </button>
        <button className="sidebar-button" id="btn2">
          <svg className="icon" id="inventory-icon"></svg>
          Inventory
        </button>
        <button className="sidebar-button sidebar-button1" id="btn3">
          <svg className="jobsheets-button-general" id="jobsheets-icon"></svg>
          Jobsheets
        </button>
        <button className="sidebar-button" id="btn4">
          <svg className="payments-button" id="payments-icon"></svg>
          <span className="texto-btn4">Payments</span>
        </button>
        <button className="sidebar-button sidebar-button2" id="btn5">
=======
        <button 
          className="sidebar-button" 
          id="btn1"
          onClick={() => handleNavigation('/')}
        >
          <svg className="icon-interior" id="dashboard-icon"></svg>
          Dashboard
        </button>
        <button 
          className="sidebar-button" 
          id="btn2"
          onClick={() => handleNavigation('/inventorydashboard')}
        >
          <svg className="icon" id="inventory-icon"></svg>
          Inventory
        </button>
        <button 
          className="sidebar-button sidebar-button1" 
          id="btn3"
          onClick={() => handleNavigation('/jobsheets')} // Asumiendo esta ruta
        >
          <svg className="jobsheets-button-general" id="jobsheets-icon"></svg>
          Jobsheets
        </button>
        <button 
          className="sidebar-button" 
          id="btn4"
          onClick={() => handleNavigation('/payments')} // Asumiendo esta ruta
        >
          <svg className="payments-button" id="payments-icon"></svg>
          <span className="texto-btn4">Payments</span>
        </button>
        <button 
          className="sidebar-button sidebar-button2" 
          id="btn5"
          onClick={() => handleNavigation('/customersdashboard')}
        >
>>>>>>> Stashed changes
          Customers
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;