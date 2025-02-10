//// filepath: /c:/Users/salbe/OneDrive/Escritorio/New Union Company/frontend/src/pages/inventoryView.js
import React, { useEffect, useState } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const InventoryView = () => {
  const [rowData, setRowData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryTerm, setCategoryTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }
      try {
        const response = await fetch('http://localhost:3000/inventory', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Error fetching inventory');
        const data = await response.json();
        setRowData(data);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
    };
    fetchData();
  }, []);

  const uniqueCategories = [...new Set(rowData.map(item => item.category))];

  const filteredData = rowData.filter(item => {
    const nameMatches = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatches = categoryTerm ? item.category === categoryTerm : true;
    return nameMatches && categoryMatches;
  });

  // Ajuste de columnas para que entren en el contenedor
  const defaultColDef = {
    flex: 1,
    resizable: true
  };

  const columnDefs = [
    { headerName: 'SKU', field: 'sku' },
    { headerName: 'Name', field: 'name' },
    { headerName: 'Category', field: 'category' },
    { headerName: 'Brand', field: 'brand' },
    { headerName: 'Stock', field: 'stock' },
    { headerName: 'Min', field: 'min' },
    { headerName: 'Cost', field: 'cost' },
    { headerName: 'Sale', field: 'sale' },
  ];

  const handleRowClicked = (params) => {
    setEditItem(params.data);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3000/inventory/${editItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editItem),
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

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
      <h2>Inventory</h2>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Search by name"
          style={{ marginRight: '10px', padding: '5px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={categoryTerm}
          onChange={(e) => setCategoryTerm(e.target.value)}
          style={{ padding: '5px' }}
        >
          <option value="">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div
        className="ag-theme-alpine"
        style={{
          width: '100%',
          height: '380px'
        }}
      >
        <AgGridReact
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          modules={[ClientSideRowModelModule]}
          pagination
          paginationPageSize={12}
          onRowClicked={handleRowClicked}
        />
      </div>

      {showModal && editItem && (
        <div
          style={{
            position: 'fixed',
            top: '30%',
            left: '35%',
            width: '400px',
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 9999
          }}
        >
          <button
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
              position: 'absolute',
              top: '5px',
              right: '10px',
              cursor: 'pointer'
            }}
            onClick={() => setShowModal(false)}
          >
            X
          </button>
          <h3>Edit Item</h3>
          <label>
            SKU:
            <input
              type="text"
              value={editItem.sku}
              onChange={e => setEditItem({ ...editItem, sku: e.target.value })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <label>
            Name:
            <input
              type="text"
              value={editItem.name}
              onChange={e => setEditItem({ ...editItem, name: e.target.value })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <label>
            Category:
            <input
              type="text"
              value={editItem.category}
              onChange={e => setEditItem({ ...editItem, category: e.target.value })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <label>
            Brand:
            <input
              type="text"
              value={editItem.brand || ''}
              onChange={e => setEditItem({ ...editItem, brand: e.target.value })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <label>
            Stock:
            <input
              type="number"
              value={editItem.stock || 0}
              onChange={e => setEditItem({ ...editItem, stock: parseInt(e.target.value || 0, 10) })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <label>
            Min:
            <input
              type="number"
              value={editItem.min || 0}
              onChange={e => setEditItem({ ...editItem, min: parseInt(e.target.value || 0, 10) })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>

          <label>
            Cost:
            <input
              type="number"
              step="0.01"
              value={editItem.cost || 0}
              onChange={e => setEditItem({ ...editItem, cost: parseFloat(e.target.value || 0) })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <label>
            Sale:
            <input
              type="number"
              step="0.01"
              value={editItem.sale || 0}
              onChange={e => setEditItem({ ...editItem, sale: parseFloat(e.target.value || 0) })}
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </label>
          <button onClick={handleSave} style={{ marginRight: '10px' }}>
            Save
          </button>
          <button onClick={() => setShowModal(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default InventoryView;