import "../styles.css";
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; 

const Sidebar = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth(); // Add this to check for admin role
    
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

  const handleNavigation = (path) => {
    navigate(path);
  };

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
          onClick={() => handleNavigation('/inventorydashboard')} // Updated to match your route
        >
          <svg className="icon" id="inventory-icon"></svg>
          Inventory
        </button>
        {/* Add Vehicles button */}
        <button 
          className="sidebar-button" 
          id="btn-vehicles"
          onClick={() => handleNavigation('/vehicles')}
        >
          <svg className="icon" id="vehicles-icon"></svg>
          Vehicles
        </button>
        <button 
          className="sidebar-button sidebar-button1" 
          id="btn3"
          onClick={() => handleNavigation('/jobsheets')}
        >
          <svg className="jobsheets-button-general" id="jobsheets-icon"></svg>
          Jobsheets
        </button>
        <button 
          className="sidebar-button" 
          id="btn4"
          onClick={() => handleNavigation('/payments')}
        >
          <svg className="payments-button" id="payments-icon"></svg>
          <span className="texto-btn4">Payments</span>
        </button>
        <button 
          className="sidebar-button sidebar-button2" 
          id="btn5"
          onClick={() => handleNavigation('/customersdashboard')}
        >
          Customers
        </button>
        
        {/* Only show User Management for admins */}
        {isAdmin() && (
          <button 
            className="sidebar-button" 
            id="btn-usermanagement"
            onClick={() => handleNavigation('/usermanagement')}
          >
            <svg className="icon" id="user-management-icon"></svg>
            User Management
          </button>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;