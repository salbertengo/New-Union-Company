import React, { useState, useEffect } from 'react';

const Sidebar = () => {
    useEffect(() => {
        // Verifica si el script ya está cargado para evitar duplicados
        if (!document.getElementById('script-buttons')) {
          const script = document.createElement('script');
          script.id = 'script-buttons';
          script.src = '/script-buttons.js'; // Se carga desde la carpeta `public/`
          script.async = true;
          document.body.appendChild(script);
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
            <button class="sidebar-button" id="btn1">
                <svg class="icon-interior" id="dashboard-icon"></svg>
                Dashboard
            </button>
            <button class="sidebar-button" id="btn2">
                <svg class="icon" id="inventory-icon"></svg>
                Inventory
            </button>
            <button class="sidebar-button sidebar-button1" id="btn3">
                <svg class="jobsheets-button-general" id="jobsheets-icon"></svg>
                Jobsheets
            </button>
            <button class="sidebar-button" id="btn4">
                <svg class="payments-button" id="payments-icon"></svg>
                <span class="texto-btn4">Payments</span>
            </button>
            <button class="sidebar-button sidebar-button2" id="btn5">
                Customers
            </button>
      </nav>
      {/* Agregá aquí el contenido que necesites para tu sidebar */}
    </div>
  );
};

export default Sidebar;