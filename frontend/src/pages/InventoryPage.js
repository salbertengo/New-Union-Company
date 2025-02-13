//// filepath: /c:/Users/salbe/OneDrive/Escritorio/New Union Company/frontend/src/pages/InventoryPage.js
import React from 'react';
import Sumary from './sumary';
import CompatibilityCheck from './compatibilityCheck';
import InventoryView from './inventoryView';

const InventoryPage = () => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#D9D9D9',
        boxSizing: 'border-box',
        overflow: 'hidden' // Evita scroll global
      }}
    >
      {/* Barra lateral */}
      <div
        style={{
          width: '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
      </div>

      {/* Contenedor principal */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        {/* Contenedor para los dos boxes superiores (30% del alto) */}
        <div style={{ display: 'flex', height: '30%', gap: '20px' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Sumary />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <CompatibilityCheck />
          </div>
        </div>

        {/* Contenedor para InventoryView (70% del alto restante) */}
        <div style={{ flex: 1 }}>
          <InventoryView />
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;