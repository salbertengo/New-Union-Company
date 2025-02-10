//// filepath: /c:/Users/salbe/OneDrive/Escritorio/New Union Company/frontend/src/pages/compatibilityCheck.js
import React, { useState } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const CompatibilityCheck = () => {
  // Datos de ejemplo
  const [rowData] = useState([
    { id: 1, slu: '0001', name: 'Spare A', stock: 10, brand: 'Honda', model: 'CBR', spare: 'Chain' },
    { id: 2, slu: '0002', name: 'Spare B', stock: 5, brand: 'Yamaha', model: 'R1', spare: 'Filter' },
    { id: 3, slu: '0003', name: 'Spare C', stock: 0, brand: 'Honda', model: 'CBR', spare: 'Brake Pad' }
  ]);

  // Estados para filtros
  const [brandTerm, setBrandTerm] = useState('');
  const [modelTerm, setModelTerm] = useState('');
  const [spareTerm, setSpareTerm] = useState('');

  // Filtrado
  const filteredData = rowData.filter(item => {
    const brandMatches = item.brand.toLowerCase().includes(brandTerm.toLowerCase());
    const modelMatches = item.model.toLowerCase().includes(modelTerm.toLowerCase());
    const spareMatches = item.spare.toLowerCase().includes(spareTerm.toLowerCase());
    return brandMatches && modelMatches && spareMatches;
  });

  // Definición de columnas
  const columnDefs = [
    { headerName: 'SLU', field: 'slu' },
    { headerName: 'Name', field: 'name' },
    { headerName: 'Stock', field: 'stock' }
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
      <h3>Compatibility Check</h3>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Motorcycle brand"
          style={{ marginRight: '10px', padding: '5px' }}
          value={brandTerm}
          onChange={(e) => setBrandTerm(e.target.value)}
        />
        <input
          type="text"
          placeholder="Brand model"
          style={{ marginRight: '10px', padding: '5px' }}
          value={modelTerm}
          onChange={(e) => setModelTerm(e.target.value)}
        />
        <input
          type="text"
          placeholder="Spare name"
          style={{ padding: '5px' }}
          value={spareTerm}
          onChange={(e) => setSpareTerm(e.target.value)}
        />
      </div>
      <div className="ag-theme-alpine" style={{ width: '100%', height: '250px' }}>
        <AgGridReact
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={{ flex: 1, resizable: true }}
          modules={[ClientSideRowModelModule]}
        />
      </div>
    </div>
  );
};

export default CompatibilityCheck;