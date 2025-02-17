import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCog } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const InventoryView = () => {
  const [rowData, setRowData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryTerm, setCategoryTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const gridRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [compatibilities, setCompatibilities] = useState([]);
  const [newCompatibility, setNewCompatibility] = useState('');
  const [refreshInventory, setRefreshInventory] = useState(false);

  const fetchInventoryData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData, refreshInventory]);

  const uniqueCategories = [...new Set(rowData.map(item => item.category))];
  const uniqueBrands = [...new Set(rowData.map(item => item.brand))];

  const filteredData = rowData.filter(item => {
    const nameMatches = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatches = categoryTerm ? item.category === categoryTerm : true;
    return nameMatches && categoryMatches;
  });

  const defaultColDef = {
    resizable: true // Removed flex: 1
  };

  const handleOpenEditModal = (data) => {
    setEditItem(data);
    setShowModal(true);
  };

  const handleOpenCompatibilityModal = async (product) => {
    setSelectedProduct(product);
    await fetchCompatibilities(product.id);
    setShowCompatibilityModal(true);
  };

  const fetchCompatibilities = async (productId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3000/compatibility/${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCompatibilities(data);
      } else {
        console.error('Error fetching compatibilities:', response.status);
      }
    } catch (error) {
      console.error('Error fetching compatibilities:', error);
    }
  };

  const handleAddCompatibility = async () => {
    if (!newCompatibility.trim()) {
      alert("Please enter the motorcycle model to add compatibility.");
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3000/compatibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          motorcycle_model: newCompatibility.trim()
        }),
      });
      if (response.ok) {
        await fetchCompatibilities(selectedProduct.id);
        setNewCompatibility('');
      } else {
        console.error('Error adding compatibility:', response.status);
      }
    } catch (error) {
      console.error('Error adding compatibility:', error);
    }
  };

  const handleDeleteCompatibility = async (motorcycle_model) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3000/compatibility`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          motorcycle_model
        }),
      });
      if (response.ok) {
        await fetchCompatibilities(selectedProduct.id);
      } else {
        console.error('Error deleting compatibility:', response.status);
      }
    } catch (error) {
      console.error('Error deleting compatibility:', error);
    }
  };

  const columnDefs = [
    { headerName: 'SKU', field: 'sku', width: 250, headerStyle: { fontFamily: "Impact", fontSize: "8px", color: "red" } },
    { headerName: 'Name', field: 'name', width: 300 },
    { headerName: 'Category', field: 'category', width: 120 },
    { headerName: 'Brand', field: 'brand', width: 120 },
    { headerName: 'Stock', field: 'stock', width: 80 },
    { headerName: 'Min', field: 'min', width: 80 },
    { headerName: 'Cost', field: 'cost', width: 80 },
    { headerName: 'Sale', field: 'sale', width: 80 },
    {
      headerName: 'Edit',
      field: 'edit',
      width: 30, // Set a fixed width
      sortable: false,
      filter: false,
      cellStyle: {
        padding: '5px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      cellRenderer: params => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEditModal(params.data);
          }}
          title="Edit product"
          style={{
            cursor: 'pointer',
            color: '#3498db',
            textAlign: 'center',
            lineHeight: 'normal', // Adjust lineHeight if needed
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <FontAwesomeIcon icon={faEdit} style={{ fontSize: '14px' }} />
        </div>
      )
    },
    {
      headerName: 'Compatibility',
      field: 'compatibility',
      width: 80, // Set a fixed width
      sortable: false,
      filter: false,
      cellStyle: {
        padding: '5px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      cellRenderer: params => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleOpenCompatibilityModal(params.data);
          }}
          title="Modify compatibility"
          style={{
            cursor: 'pointer',
            color: '#f39c12',
            textAlign: 'center',
            lineHeight: 'normal', // Adjust lineHeight if needed
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <FontAwesomeIcon icon={faCog} style={{ fontSize: '14px' }} />
        </div>
      )
    }
  ];

  const handleRowClicked = () => {
  };

  const handleAddProduct = () => {
    const newProduct = {
      sku: '',
      name: '',
      category: uniqueCategories[0] || '',
      brand: uniqueBrands[0] || '',
      stock: 0,
      min: 0,
      cost: 0,
      sale: 0
    };
    setEditItem(newProduct);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    const { sku, name, cost, sale } = editItem;
    if (!sku || !name || !cost || !sale) {
      alert("Please complete all required fields (SKU, Name, Cost and Sale).");
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      let response;
      if (editItem.id) {
        response = await fetch(`http://localhost:3000/inventory/${editItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editItem),
        });
      } else {
        response = await fetch('http://localhost:3000/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editItem),
        });
      }
  
      if (response.ok) {
        // En lugar de actualizar rowData directamente, 
        // usamos refreshInventory para provocar una nueva carga
        setRefreshInventory(prev => !prev);
        setShowModal(false);
      } else {
        console.error('Error saving item:', response.status);
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  };

  const handleDelete = async () => {
    if (!editItem?.id) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/inventory/${editItem.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        // Actualiza la tabla *después* de que el backend confirme la eliminación
        setRefreshInventory(prev => !prev);
        setShowModal(false);
      } else {
        console.error('Error deleting item:', response.status);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const onGridReady = (params) => {
    gridRef.current = params.api;
    params.api.sizeColumnsToFit();
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '30px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        padding: '20px'
      }}
    >
      {/* Header, filters and button to add */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>Inventory View</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name"
            style={{
              padding: '5px',
              width: '216px',
              borderRadius: '10px',
              border: '1px solid white',
              backgroundColor: '#F9FBFF',
              height: '25px'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={categoryTerm}
            onChange={(e) => setCategoryTerm(e.target.value)}
            style={{
              padding: '5px',
              width: '216px',
              borderRadius: '10px',
              border: '1px solid white',
              backgroundColor: '#F9FBFF',
              height: '35px',
              color: 'gray'
            }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddProduct}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: isHovered ? '#4321C9' : '#5932EA',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1 }}>
        <div className="ag-theme-alpine" style={{ width: '100%', height: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filteredData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            modules={[ClientSideRowModelModule]}
            pagination
            paginationPageSize={12}
            onRowClicked={handleRowClicked}
            headerHeight={30}
            rowHeight={25}
            suppressSizeToFit={true}
            onGridReady={onGridReady}
          />
        </div>
      </div>

      {/* Modal for product */}
      {showModal && editItem && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '450px',
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 9999
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}
          >
            <h2 style={{ margin: 0 }}>
              {editItem.id ? 'Edit Product' : 'Add Product'}
            </h2>
            <button
              onClick={() => setShowModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                lineHeight: '1'
              }}
            >
              &times;
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>SKU</label>
              <input
                type="text"
                value={editItem.sku}
                onChange={(e) => setEditItem({ ...editItem, sku: e.target.value })}
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Name</label>
              <input
                type="text"
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Category
              </label>
              <select
                value={editItem.category}
                onChange={(e) =>
                  setEditItem({ ...editItem, category: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Brand</label>
              <select
                value={editItem.brand}
                onChange={(e) =>
                  setEditItem({ ...editItem, brand: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              >
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Stock
              </label>
              <input
                type="number"
                value={editItem.stock}
                onChange={(e) =>
                  setEditItem({ ...editItem, stock: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Min</label>
              <input
                type="number"
                value={editItem.min}
                onChange={(e) =>
                  setEditItem({ ...editItem, min: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Cost</label>
              <input
                type="number"
                value={editItem.cost}
                onChange={(e) =>
                  setEditItem({ ...editItem, cost: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
            <div style={{ flex: '1 1 45%' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Sale
              </label>
              <input
                type="number"
                value={editItem.sale}
                onChange={(e) =>
                  setEditItem({ ...editItem, sale: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#5932EA',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              Save
            </button>
         
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4321C9',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modal for compatibility */}
      {showCompatibilityModal && selectedProduct && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '500px',
            maxHeight: '80%',
            overflowY: 'auto',
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 10000
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}
          >
            <h2 style={{ margin: 0 }}>
              Compatibilities for {selectedProduct.name}
            </h2>
            <button
              onClick={() => setShowCompatibilityModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                lineHeight: '1'
              }}
            >
              &times;
            </button>
          </div>
          {compatibilities.length === 0 ? (
            <p>No compatibilities registered.</p>
          ) : (
            <div>
              {compatibilities.map((comp, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    padding: '5px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                >
                  <span>{comp.motorcycle_model}</span>
                  
                </div>
              ))}
            </div>
          )}
          {/* Add new compatibility */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
            <input
              type="text"
              placeholder="New motorcycle model"
              value={newCompatibility}
              onChange={(e) => setNewCompatibility(e.target.value)}
              style={{
                flex: 1,
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF'
              }}
            />
            <button
              onClick={handleAddCompatibility}
              style={{
                marginLeft: '5px',
                padding: '10px 20px',
                backgroundColor: '#5932EA',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              +
            </button>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCompatibilityModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4321C9',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;