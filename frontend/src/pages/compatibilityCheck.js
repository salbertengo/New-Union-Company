import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const CompatibilityCheck = () => {
  const [spareTerm, setSpareTerm] = useState('');
  const [modelTerm, setModelTerm] = useState('');
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnDefs, setColumnDefs] = useState([]);

  // Ajusta las columnas según la búsqueda
  useEffect(() => {
    // Si solo spareName (repuesto)
    if (spareTerm.trim() && !modelTerm.trim()) {
      setColumnDefs([
        { headerName: 'Motorcycle Model', field: 'motorcycle_model', headerClass: 'custom-header-sumary' }
      ]);
    }
    // Si solo modelo de moto
    else if (!spareTerm.trim() && modelTerm.trim()) {
      setColumnDefs([
        { headerName: 'SKU', field: 'sku', headerClass: 'custom-header-sumary' },
        { headerName: 'Name', field: 'name', headerClass: 'custom-header-sumary' },
        { headerName: 'Stock', field: 'stock', headerClass: 'custom-header-sumary' }
      ]);
    }
    // Si ambos o ninguno (para mantener la lógica que ya tenías)
    else {
      setColumnDefs([
        { headerName: 'SKU', field: 'sku', headerClass: 'custom-header-sumary' },
        { headerName: 'Name', field: 'name', headerClass: 'custom-header-sumary' },
        { headerName: 'Stock', field: 'stock', headerClass: 'custom-header-sumary' },
        { headerName: 'Motorcycle Model', field: 'motorcycle_model', headerClass: 'custom-header-sumary' }
      ]);
    }
  }, [spareTerm, modelTerm]);

  const defaultColDef = {
    flex: 1,
    resizable: true,
    sortable: true
  };

  const fetchCompatibleParts = async (spare, model) => {
    if (!spare.trim() && !model.trim()) {
      setRowData([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (spare.trim()) params.append('spareName', spare.trim());
      if (model.trim()) params.append('motorcycleModel', model.trim());

      const response = await fetch(
        `http://localhost:3000/compatibility?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (response.ok) {
        let data = await response.json();

        // Si solo se busca por repuesto, agrupa los resultados por modelo
        if (spare.trim() && !model.trim()) {
          const uniqueModels = [...new Set(data.map(item => item.motorcycle_model))];
          data = uniqueModels.map(model => ({ motorcycle_model: model }));
        }

        setRowData(data);
      } else {
        console.error('Error fetching compatible parts:', response.status);
        setRowData([]);
      }
    } catch (error) {
      console.error('Error fetching compatible parts:', error);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  };

  // Evitar múltiples llamadas en cada pulsación
  const debouncedFetch = useCallback(
    debounce((spare, model) => {
      fetchCompatibleParts(spare, model);
    }, 500),
    []
  );

  // Ejecutar búsqueda cuando cambie alguno de los inputs
  useEffect(() => {
    debouncedFetch(spareTerm, modelTerm);
  }, [spareTerm, modelTerm, debouncedFetch]);

  const handleRowClicked = (params) => {
    console.log('Row clicked: ', params.data);
  };

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
      <h3 style={{ margin: 0, marginBottom: '10px', fontSize: '18px' }}>
        Compatibility Check
      </h3>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Spare name"
          style={{
            marginRight: '10px',
            padding: '5px',
            width: '180px',
            borderRadius: '10px',
            border: '1px solid white',
            backgroundColor: '#F9FBFF',
            height: '25px'
          }}
          value={spareTerm}
          onChange={(e) => setSpareTerm(e.target.value)}
        />
        <input
          type="text"
          placeholder="Model"
          style={{
            padding: '5px',
            width: '180px',
            borderRadius: '10px',
            border: '1px solid white',
            backgroundColor: '#F9FBFF',
            height: '25px'
          }}
          value={modelTerm}
          onChange={(e) => setModelTerm(e.target.value)}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="ag-theme-alpine sumary-grid" style={{ width: '100%', height: '100%' }}>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              modules={[ClientSideRowModelModule]}
              headerHeight={28}
              rowHeight={24}
              pagination={false}
              onRowClicked={handleRowClicked}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CompatibilityCheck;