import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCog, faSearch, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FocusTrap } from 'focus-trap-react';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const InventoryView = () => {
  const [rowData, setRowData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryTerm, setCategoryTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [quickMode, setQuickMode] = useState(false);
  const gridRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [compatibilities, setCompatibilities] = useState([]);
  const [newCompatibility, setNewCompatibility] = useState('');
  const [refreshInventory, setRefreshInventory] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef(null);
  const [gridReady, setGridReady] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL;

  // States for Goods Receive Modal
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [grnDetails, setGrnDetails] = useState({
    supplier_name: '',
    supplier_invoice_no: '',
    grn_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] // Each item: { product_id, name, sku, quantity_received, cost_price }
  });
  const [grnItemSearchTerm, setGrnItemSearchTerm] = useState('');
  const [grnItemSearchResults, setGrnItemSearchResults] = useState([]);
  const [selectedProductForGrn, setSelectedProductForGrn] = useState(null);
  const [currentGrnItemDetails, setCurrentGrnItemDetails] = useState({ quantity_received: 1, cost_price: '' });
  const [isSavingGrn, setIsSavingGrn] = useState(false);

  const fetchInventoryData = useCallback(async (search = '', category = '') => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      setLoading(false);
      return;
    }
    
    try {
      let url = `${API_URL}/inventory`;
      const params = new URLSearchParams();
      
      if (search) {
        params.append('search', search);
      }
      
      if (category) {
        params.append('category', category);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Error fetching inventory');
      const data = await response.json();
      console.log('Fetched inventory data:', data); // Log the data received from backend
      setRowData(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchInventoryData(value, categoryTerm);
    }, 500);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setCategoryTerm(value);
    fetchInventoryData(searchTerm, value);
  };

  useEffect(() => {
    fetchInventoryData();
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [fetchInventoryData, refreshInventory]);

  useEffect(() => {
    return () => {
      if (gridRef.current) {
        gridRef.current = null;
      }
    };
  }, []);

  const uniqueCategories = [...new Set(rowData.map(item => item.category))];
  const uniqueBrands = [...new Set(rowData.map(item => item.brand))];

  const handleOpenEditModal = (data) => {
    setTimeout(() => {
      const clonedData = JSON.parse(JSON.stringify(data));
      setEditItem(clonedData);
      setShowModal(true);
    }, 50);
  };

  const handleOpenCompatibilityModal = async (product) => {
    setTimeout(async () => {
      const clonedProduct = JSON.parse(JSON.stringify(product));
      setSelectedProduct(clonedProduct);
      await fetchCompatibilities(clonedProduct.id);
      setShowCompatibilityModal(true);
    }, 50);
  };

  const defaultColDef = {
    resizable: false,
    sortable: true,
    suppressMenu: true,
    flex: 1,
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '12px',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#333'
    },
    headerClass: 'custom-header'
  };
  
  const fetchCompatibilities = async (productId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/compatibility/${productId}`, {
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
      const response = await fetch(`${API_URL}/compatibility`, {
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
      const response = await fetch(`${API_URL}/compatibility`, {
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

  const columnDefs = useMemo(() => [
    { headerName: 'SKU', field: 'sku', width: 250, headerClass: 'custom-header-inventory', suppressMenu: true },
    { 
      headerName: 'Name', 
      field: 'name', 
      width: 400,
      autoHeight: true,
      wrapText: true,
      cellClass: 'cell-name',
      headerClass: 'custom-header-inventory', 
      suppressMenu: true,
      cellRenderer: params => {
        const cellValue = params.value || '';
        return (
          <div title={cellValue}>
            {cellValue}
          </div>
        );
      },
    },   
    { headerName: 'Category', field: 'category', width: 80, headerClass: 'custom-header-inventory', suppressMenu: true },
    { headerName: 'Brand', field: 'brand', width: 120, headerClass: 'custom-header-inventory', suppressMenu: true },
    { headerName: 'Stock', field: 'stock', width: 80, headerClass: 'custom-header-inventory', suppressMenu: true },
    { headerName: 'Min', field: 'min', width: 80, headerClass: 'custom-header-inventory', suppressMenu: true },
    { headerName: 'Cost', field: 'cost', width: 80, headerClass: 'custom-header-inventory', suppressMenu: true },
    { headerName: 'Sale', field: 'sale', width: 80, headerClass: 'custom-header-inventory', suppressMenu: true },
    {
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filter: false,
      suppressMenu: true,
      cellRenderer: params => (
        <ActionButtonsContainer>
          <ActionButton
            icon={faEdit}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditModal(params.data);
            }}
            tooltip="Edit Product"
            type="default"
          />
          <ActionButton
            icon={faCog}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCompatibilityModal(params.data);
            }}
            tooltip="Manage Compatibility"
            type="primary"
          />
        </ActionButtonsContainer>
      ),
      headerClass: 'custom-header-inventory'
    }
  ], []);

  const handleAddProduct = () => {
    setTimeout(() => {
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
    }, 50);
  };

  const handleOpenReceiveStockModal = () => {
    setGrnDetails({
      supplier_name: '',
      supplier_invoice_no: '',
      grn_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: []
    });
    setGrnItemSearchTerm('');
    setGrnItemSearchResults([]);
    setSelectedProductForGrn(null);
    setCurrentGrnItemDetails({ quantity_received: 1, cost_price: '' });
    setShowReceiveStockModal(true);
  };

  const handleGrnInputChange = (e) => {
    const { name, value } = e.target;
    setGrnDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleGrnItemSearch = async (term) => {
    setGrnItemSearchTerm(term);
    if (term.length < 2) {
      setGrnItemSearchResults([]);
      setSelectedProductForGrn(null);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/inventory?search=${encodeURIComponent(term)}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGrnItemSearchResults(data);
      } else { setGrnItemSearchResults([]); }
    } catch (error) { setGrnItemSearchResults([]); }
  };

  const selectProductForGrn = (product) => {
    setSelectedProductForGrn(product);
    setGrnItemSearchTerm(product.name); 
    setCurrentGrnItemDetails({ quantity_received: 1, cost_price: product.cost || '' });
    setGrnItemSearchResults([]);
  };

  const addProductToGrn = () => {
    if (!selectedProductForGrn || !currentGrnItemDetails.quantity_received || currentGrnItemDetails.cost_price === '') {
      alert("Please select a product, and enter valid quantity and cost price.");
      return;
    }
    const qty = parseFloat(currentGrnItemDetails.quantity_received);
    const cost = parseFloat(currentGrnItemDetails.cost_price);

    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      alert("Invalid quantity or cost price.");
      return;
    }

    setGrnDetails(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: selectedProductForGrn.id,
        name: selectedProductForGrn.name,
        sku: selectedProductForGrn.sku,
        quantity_received: qty,
        cost_price: cost
      }]
    }));
    setSelectedProductForGrn(null);
    setGrnItemSearchTerm('');
    setCurrentGrnItemDetails({ quantity_received: 1, cost_price: '' });
  };

  const removeProductFromGrn = (index) => {
    setGrnDetails(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSaveGrn = async () => {
    if (!grnDetails.supplier_name.trim()) {
      alert("Supplier name is required.");
      return;
    }
    if (grnDetails.items.length === 0) {
      alert("Please add at least one item to the receipt.");
      return;
    }

    setIsSavingGrn(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsSavingGrn(false);
      alert("Authentication error. Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/inventory/receive-stock`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(grnDetails),
      });

      if (response.ok) {
        alert("Stock received successfully!");
        setShowReceiveStockModal(false);
        fetchInventoryData(searchTerm, categoryTerm); // This line attempts to refresh the data
      } else {
        const errorData = await response.json();
        console.error('Failed to save goods receipt:', errorData);
        alert(`Failed to save receipt: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving goods receipt:', error);
      alert(`Error saving receipt: ${error.message}`);
    } finally {
      setIsSavingGrn(false);
    }
  };

  const totalGrnValue = grnDetails.items.reduce((sum, item) => sum + (item.quantity_received * item.cost_price), 0);

  const onGridReady = (params) => {
    gridRef.current = params.api;
    
    setTimeout(() => {
      if (gridRef.current && !gridRef.current.isDestroyed()) {
        gridRef.current.sizeColumnsToFit();
        setGridReady(true);
      }
    }, 100);
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
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name"
              style={{
                padding: '5px 30px 5px 10px',
                width: '216px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF',
                height: '25px'
              }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <FontAwesomeIcon 
              icon={faSearch} 
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: loading ? '#4321C9' : 'gray',
                cursor: 'pointer'
              }}
            />
          </div>
          <select
            value={categoryTerm}
            onChange={handleCategoryChange}
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
            style={{
              padding: '10px 20px',
              backgroundColor: isHovered ? '#4321C9' : '#5932EA',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              fontWeight: 600
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            Add Product
          </button>
          <button
            onClick={handleOpenReceiveStockModal}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
          >
            <FontAwesomeIcon icon={faPlusCircle} />
            Receive Stock
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div className="ag-theme-alpine inventory-view" 
          style={{ 
            width: '100%', 
            height: '100%',
            overflowX: 'hidden',
            overflowY: 'auto',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.3s ease'
          }}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef} 
            modules={[ClientSideRowModelModule]}
            pagination={true}
            paginationPageSize={12}
            headerHeight={30}
            rowHeight={50}
            suppressSizeToFit={false}
            suppressHorizontalScroll={false}
            onGridReady={onGridReady}
          />
        </div>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderLeft: '4px solid #4321C9',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Goods Receive Modal */}
      {showReceiveStockModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(5px)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 1050, animation: "fadeIn 0.2s ease",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowReceiveStockModal(false); }}
        >
          <div
            style={{
              backgroundColor: "white", borderRadius: "16px",
              width: "95%", maxWidth: "800px", maxHeight: "90vh",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              animation: "modalFadeIn 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: "linear-gradient(135deg, #28a745 0%, #218838 100%)", color: "white", padding: "20px 30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>Receive New Stock (GRN)</h2>
                <button
                  onClick={() => setShowReceiveStockModal(false)}
                  style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: "30px", height: "30px", borderRadius: "50%", cursor: "pointer", fontSize: "16px" }}
                >&times;</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 30px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>Supplier Name *</label>
                  <input type="text" name="supplier_name" value={grnDetails.supplier_name} onChange={handleGrnInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>Supplier Invoice No.</label>
                  <input type="text" name="supplier_invoice_no" value={grnDetails.supplier_invoice_no} onChange={handleGrnInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>Date Received *</label>
                  <input type="date" name="grn_date" value={grnDetails.grn_date} onChange={handleGrnInputChange} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>Notes</label>
                <textarea name="notes" value={grnDetails.notes} onChange={handleGrnInputChange} style={{...inputStyle, minHeight: '60px', resize: 'vertical'}} placeholder="Optional notes..." />
              </div>

              <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "20px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600" }}>Add Items to Receipt</h3>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", alignItems: "flex-end", marginBottom: "10px" }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>Search Product *</label>
                    <input type="text" value={grnItemSearchTerm} onChange={(e) => handleGrnItemSearch(e.target.value)} placeholder="Name/SKU" style={inputStyle} />
                    {grnItemSearchResults.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", zIndex: 1060, maxHeight: "150px", overflowY: "auto" }}>
                        {grnItemSearchResults.map(p => (
                          <div key={p.id} onClick={() => selectProductForGrn(p)} style={{ padding: "8px", cursor: "pointer", borderBottom: "1px solid #eee" }}>
                            {p.name} ({p.sku}) - Cost: ${p.cost?.toFixed(2) || 'N/A'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>Qty Received *</label>
                    <input type="number" value={currentGrnItemDetails.quantity_received} onChange={(e) => setCurrentGrnItemDetails(prev => ({ ...prev, quantity_received: e.target.value }))} min="0.01" step="any" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>Cost Price (Unit) *</label>
                    <input type="number" value={currentGrnItemDetails.cost_price} onChange={(e) => setCurrentGrnItemDetails(prev => ({ ...prev, cost_price: e.target.value }))} min="0.00" step="any" style={inputStyle} placeholder="0.00" />
                  </div>
                  <button onClick={addProductToGrn} style={{ ...buttonStyle("#5932EA"), height: "42px", padding: "0 15px" }} disabled={!selectedProductForGrn}>Add</button>
                </div>
                 {selectedProductForGrn && <div style={{fontSize: '12px', color: '#555', marginBottom: '10px'}}>Selected: {selectedProductForGrn.name}</div>}
              </div>

              {grnDetails.items.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", fontWeight: "600" }}>Items in this Receipt</h4>
                  <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{position: 'sticky', top: 0, backgroundColor: '#f9fafc'}}>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                          <th style={thStyle}>Product (SKU)</th>
                          <th style={{...thStyle, textAlign: 'right'}}>Qty</th>
                          <th style={{...thStyle, textAlign: 'right'}}>Cost/Unit</th>
                          <th style={{...thStyle, textAlign: 'right'}}>Total Cost</th>
                          <th style={thStyle}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grnDetails.items.map((item, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={tdStyle}>{item.name} ({item.sku})</td>
                            <td style={{...tdStyle, textAlign: 'right'}}>{item.quantity_received.toFixed(2)}</td>
                            <td style={{...tdStyle, textAlign: 'right'}}>${item.cost_price.toFixed(2)}</td>
                            <td style={{...tdStyle, textAlign: 'right'}}>${(item.quantity_received * item.cost_price).toFixed(2)}</td>
                            <td style={{...tdStyle, textAlign: 'center', width: '50px'}}>
                              <button onClick={() => removeProductFromGrn(index)} style={{background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '14px'}}>✖</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{textAlign: 'right', marginTop: '10px', fontSize: '16px', fontWeight: 'bold'}}>
                        Grand Total: ${totalGrnValue.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #e0e0e0", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: "12px", backgroundColor: "#f9fafc" }}>
              <button onClick={() => setShowReceiveStockModal(false)} style={buttonStyle("#6c757d", true)}>Cancel</button>
              <button onClick={handleSaveGrn} style={buttonStyle("#28a745")} disabled={isSavingGrn || grnDetails.items.length === 0}>
                {isSavingGrn ? "Saving..." : "Save Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #e0e0e0",
  backgroundColor: "#fff",
  fontSize: "14px",
  transition: "border-color 0.2s",
  outline: "none",
  boxSizing: "border-box"
};

const thStyle = { padding: "10px 8px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#333" };
const tdStyle = { padding: "10px 8px", fontSize: "13px", color: "#555" };

const buttonStyle = (bgColor, isOutlined = false) => ({
  padding: "10px 20px",
  backgroundColor: isOutlined ? "transparent" : bgColor,
  color: isOutlined ? bgColor : "white",
  border: isOutlined ? `1px solid ${bgColor}` : "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
  transition: "all 0.2s",
});

export default InventoryView;