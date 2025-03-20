import React, { useState, useEffect } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Registrar mÃ³dulos de AG Grid
ModuleRegistry.registerModules([ClientSideRowModelModule]);

const Sumary = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/inventory', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setInventory(data);
        } else {
          console.error('Error fetching inventory:', response.status);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
      setLoading(false);
    };
    fetchInventory();
  }, []);

  // Filtrar productos cuyo stock es menor que min
  const lowStockData = inventory.filter(product => product.stock < product.min);

  const lowStockColumns = [
    { headerName: 'SKU', field: 'sku', headerClass: 'custom-header-sumary' },
    { headerName: 'Name', field: 'name', headerClass: 'custom-header-sumary' },
    { headerName: 'Stock', field: 'stock', headerClass: 'custom-header-sumary' }
  ];

  return (
    <div
      style={{
        borderRadius: '30px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <h3 style={{ margin: 0, marginBottom: '10px', fontSize: '18px' }}>Low Stock Parts</h3>
      {/* Contenedor flexible para la grid */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="ag-theme-alpine sumary-grid" style={{ width: '100%', height: '100%' }}>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <AgGridReact
              rowData={lowStockData}
              columnDefs={lowStockColumns}
              defaultColDef={{ flex: 1, resizable: true }}
              modules={[ClientSideRowModelModule]}
              pagination={false}
              rowHeight={24}
              headerHeight={28}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Sumary;
