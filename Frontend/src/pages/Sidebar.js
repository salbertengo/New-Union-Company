import "../styles.css";
import React, { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

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
          Customers
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;