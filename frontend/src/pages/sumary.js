//// filepath: /c:/Users/salbe/OneDrive/Escritorio/New Union Company/frontend/src/pages/sumary.js
import React, { useState } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Registrar módulos de AG Grid
ModuleRegistry.registerModules([ClientSideRowModelModule]);

const Sumary = () => {
  // Datos de prueba para “Low Stock Parts”
  const [lowStockData] = useState([
    { id: 1, sku: 'A001', name: 'Part A', stock: 3 },
    { id: 2, sku: 'B002', name: 'Part B', stock: 5 }
  ]);
  const lowStockColumns = [
    { headerName: 'SKU', field: 'sku' },
    { headerName: 'Name', field: 'name' },
    { headerName: 'Stock', field: 'stock' }
  ];

  // Datos de prueba para “Last Consumptions”
  const [lastConsumptionsData] = useState([
    { id: 1, sku: 'A001', name: 'Part A', consumed: 10 },
    { id: 2, sku: 'C003', name: 'Part C', consumed: 7 }
  ]);
  const lastConsumptionsColumns = [
    { headerName: 'SKU', field: 'sku' },
    { headerName: 'Name', field: 'name' },
    { headerName: 'Consumed', field: 'consumed' }
  ];

  return (
    <div
      style={{

        borderRadius: '30px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        padding: '20px'
      }}
    >
      <h3>Low Stock Parts</h3>
      <div
        className="ag-theme-alpine"
        style={{ width: '100%', height: '120px', marginBottom: '20px' }}
      >
        <AgGridReact
          rowData={lowStockData}
          columnDefs={lowStockColumns}
          defaultColDef={{ flex: 1, resizable: true }}
          modules={[ClientSideRowModelModule]}
        />
      </div>

      <h3>Last Consumptions</h3>
      <div
        className="ag-theme-alpine"
        style={{ width: '100%', height: '120px' }}
      >
        <AgGridReact
          rowData={lastConsumptionsData}
          columnDefs={lastConsumptionsColumns}
          defaultColDef={{ flex: 1, resizable: true }}
          modules={[ClientSideRowModelModule]}
        />
      </div>
    </div>
  );
};

export default Sumary;