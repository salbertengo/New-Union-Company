import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCog, faSearch } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FocusTrap } from 'focus-trap-react';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const InventoryView = () => {
  // Estado para detección de dispositivo y orientación
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isVerticalOrientation, setIsVerticalOrientation] = useState(false);
  
  // Detectar dispositivo táctil y orientación
  useEffect(() => {
    const detectDeviceAndOrientation = () => {
      // Detectar si es dispositivo táctil
      const isTouchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouchEnabled);
      
      // Detectar orientación vertical
      setIsVerticalOrientation(window.innerHeight > window.innerWidth);
    };
    
    // Detectar al cargar y cuando cambia la orientación o el tamaño de ventana
    detectDeviceAndOrientation();
    window.addEventListener('resize', detectDeviceAndOrientation);
    window.addEventListener('orientationchange', detectDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', detectDeviceAndOrientation);
      window.removeEventListener('orientationchange', detectDeviceAndOrientation);
    };
  }, []);

  const GridStyles = () => (
  <style>
    {`
      /* Estilo más fuerte y visible para filas resaltadas */
      #inventory-grid-container .ag-row.highlight-flash {
        background-color: #4CAF50 !important; 
        animation: flashHighlight 2s ease;
      }
      
      /* Animación más visible */
      @keyframes flashHighlight {
        0%, 20% { background-color: #4CAF50 !important; }
        100% { background-color: transparent; }
      }
      
      /* Asegurarnos que el highlight es visible en las celdas */
      #inventory-grid-container .ag-row.highlight-flash .ag-cell {
        background-color: transparent !important;
      }
      
      /* Estilos específicos para dispositivos táctiles */
      .touch-cell {
        padding: ${isTouchDevice ? '16px 8px' : '8px'} !important;
        height: ${isTouchDevice ? '60px' : 'auto'};
        user-select: none; /* Mejora experiencia táctil */
      }
      
      /* Mejoras para scroll táctil */
      .ag-theme-alpine .ag-body-viewport {
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain;
        touch-action: pan-y;
      }
      
      /* Ajustes para orientación vertical */
      @media (orientation: portrait) {
        .ag-theme-alpine .ag-header-cell {
          padding: 0 5px !important;
        }
        
        .ag-theme-alpine .ag-cell {
          padding: 10px 5px !important;
        }
        
        .ag-header-cell-label {
          width: 100%;
          text-align: center;
        }
      }
      
      /* Botones de acción más grandes para táctil */
      .action-button-touch {
        min-width: 40px !important;
        min-height: 40px !important;
        margin: 2px !important;
      }
    `}
  </style>
  );

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
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [showGoodsReceiveModal, setShowGoodsReceiveModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [jobsheets, setJobsheets] = useState([]);
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductMinStock, setNewProductMinStock] = useState(0);
  const [goodsReceiveData, setGoodsReceiveData] = useState({
    supplier_name: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    items: []
  });
  const [newReceiveItem, setNewReceiveItem] = useState({
    product_id: '',
    product_name: '',
    quantity: 1,
    cost_price: 0,
    sale_price: 0,
    jobsheet_id: '',
    license_plate: ''
  });
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // or 'error'
  });
  const modalInitialFocusRef = useRef(null);
  const [receiveHighlightIndex, setReceiveHighlightIndex] = useState(null);
  const [highlightedRowIds, setHighlightedRowIds] = useState([]);

  useEffect(() => {
    if (!gridReady || !gridRef.current || highlightedRowIds.length === 0) return;
    
    console.log('🔍 Aplicando highlight a productos:', highlightedRowIds);

    const findProductPage = (productId) => {
      let foundPage = -1;
      const pageSize = gridRef.current.paginationGetPageSize();
      const totalRows = gridRef.current.getDisplayedRowCount();
      const totalPages = Math.ceil(totalRows / pageSize);
      
      for (let page = 0; page < totalPages; page++) {
        let found = false;
        
        gridRef.current.paginationGoToPage(page);
        
        gridRef.current.forEachNodeAfterFilterAndSort(node => {
          if (node.data && highlightedRowIds.includes(node.data.id.toString())) {
            foundPage = page;
            found = true;
          }
        });
        
        if (found) break;
      }
      
      return foundPage;
    };
    
    const targetPage = findProductPage(highlightedRowIds[0]);
    
    if (targetPage >= 0) {
      console.log(`🔍 Productos encontrados en página ${targetPage+1}, navegando...`);
      
      gridRef.current.paginationGoToPage(targetPage);
      
      setTimeout(() => {
        const matchingNodes = [];
        gridRef.current.forEachNodeAfterFilterAndSort(node => {
          if (node.data && highlightedRowIds.includes(node.data.id.toString())) {
            matchingNodes.push(node);
          }
        });
        
        console.log(`🟢 Encontrados ${matchingNodes.length} productos para highlight en página actual`);
        
        matchingNodes.forEach(node => {
          const rowElement = document.querySelector(`#inventory-grid-container .ag-row[row-index="${node.rowIndex}"]`);
          
          if (rowElement) {
            console.log(`✅ Aplicando highlight a fila ${node.rowIndex} (ID=${node.data.id})`);
            
            rowElement.style.transition = "all 0.3s ease";
            rowElement.style.backgroundColor = "#4CAF50";
            rowElement.style.color = "white";
            rowElement.style.fontWeight = "bold";
            
            if (highlightedRowIds.length > matchingNodes.length) {
              setNotification({
                show: true,
                type: 'info',
                message: `${matchingNodes.length} de ${highlightedRowIds.length} productos nuevos visibles en esta página`
              });
            }
            
            setTimeout(() => {
              rowElement.style.backgroundColor = "#90EE90";
            }, 500);
          }
        });
        
        setTimeout(() => {
          matchingNodes.forEach(node => {
            const rowElement = document.querySelector(`#inventory-grid-container .ag-row[row-index="${node.rowIndex}"]`);
            if (rowElement) {
              rowElement.style.backgroundColor = '';
              rowElement.style.color = '';
              rowElement.style.fontWeight = '';
            }
          });
          setHighlightedRowIds([]);
        }, 3000);
      }, 300);
    } else {
      console.log('❌ No se encontraron productos para highlight en ninguna página');
      setHighlightedRowIds([]);
    }
  }, [highlightedRowIds, gridReady]);

  const fetchInventoryData = useCallback(async (search = '', category = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/inventory`;
      const params = new URLSearchParams();

      if (search.trim()) {
        params.append('search', search.trim());
      }
      if (category) {
        params.append('category', category);
      }

      const query = params.toString();
      if (query) {
        url += `?${query}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Error fetching inventory: ${response.status}`);
      }

      const data = await response.json();
      setRowData(data);
      return data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  },
  [API_URL]
);

  const fetchSuppliers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/suppliers/names`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, [API_URL]);

const fetchJobsheets = useCallback(async () => {
  try {
    setLoading(true);
    console.log("Starting jobsheets fetch...");
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No authentication token found");
      setLoading(false);
      return;
    }
    
    const url = `${API_URL}/jobsheets?state=${encodeURIComponent("in progress")}`;
    console.log(`Fetching jobsheets from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`Error fetching jobsheets: ${response.status} ${response.statusText}`);
      setJobsheets([]);
      setLoading(false);
      return;
    }
    
    const data = await response.json();
    console.log("Jobsheets data:", data);
    
    if (Array.isArray(data) && data.length > 0) {
      setJobsheets(data);
      console.log(`Found ${data.length} jobsheets`);
    } else {
      console.log("No jobsheets found or invalid response format");
      setJobsheets([]);
    }
    
  } catch (error) {
    console.error("Exception during jobsheets fetch:", error);
    setNotification({
      show: true,
      type: 'error',
      message: 'Network error when loading job sheets'
    });
    setJobsheets([]);
  } finally {
    setLoading(false);
  }
}, [API_URL]);

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
    fetchInventoryData().then(() => {
    });
    
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

 const handleOpenGoodsReceiveModal = async () => {
  setShowGoodsReceiveModal(true);
  
  setGoodsReceiveData({
    supplier_name: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    items: []
  });
  
  setJobsheets([]);
  setLoading(true);
  
  try {
    await Promise.all([
      fetchSuppliers(),
      fetchJobsheets()
    ]);
  } catch (error) {
    console.error("Error initializing goods receive modal:", error);
  }
  
  setTimeout(() => {
    if (modalInitialFocusRef.current) {
      modalInitialFocusRef.current.focus();
    }
  }, 100);
};

  const handleGoodsReceiveInputChange = (e) => {
    const { name, value } = e.target;
    setGoodsReceiveData({
      ...goodsReceiveData,
      [name]: value
    });
  };

  const handleNewReceiveItemChange = (e) => {
  const { name, value } = e.target;
  
  setNewReceiveItem({
    ...newReceiveItem,
    [name]: value
  });
  
  if (name === 'product_name') {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      if (value.trim() === '') {
        setIsNewProduct(false);
        return;
      }
      
      const exactProduct = rowData.find(p => 
        p.name.toLowerCase() === value.toLowerCase() || 
        `${p.sku} - ${p.name}`.toLowerCase() === value.toLowerCase()
      );
      
      if (exactProduct) {
        setIsNewProduct(false);
        setNewReceiveItem(prev => ({
          ...prev,
          product_id: exactProduct.id,
          cost_price: exactProduct.cost || 0,
          sale_price: exactProduct.sale || 0
        }));
      } else {
        if (value.trim().length >= 3) {
          setIsNewProduct(true);
        }
      }
    }, 500);
  }
};
const addItemToReceive = () => {
    if (!newReceiveItem.product_name || !newReceiveItem.quantity || 
        !newReceiveItem.cost_price || !newReceiveItem.sale_price) {
      setNotification({
        show: true,
        type: 'error',
        message: 'Please complete all required fields'
      });
      return;
    }

    if (isNewProduct) {
      if (!newProductSku) {
        setNotification({
          show: true,
          type: 'error',
          message: 'Please enter an SKU for the new product'
        });
        return;
      }
      
      const skuExists = rowData.some(p => p.sku.toLowerCase() === newProductSku.toLowerCase());
      if (skuExists) {
        setNotification({
          show: true,
          type: 'error',
          message: 'This SKU already exists. Please choose a different one'
        });
        return;
      }
    }

    const itemToAdd = { ...newReceiveItem };
    
    if (isNewProduct) {
      itemToAdd._isNew = true;
      itemToAdd.sku = newProductSku;
      itemToAdd.name = newReceiveItem.product_name;
      itemToAdd.product_id = null;
      itemToAdd.category = newProductCategory;
      itemToAdd.min = parseInt(newProductMinStock) || 0;
    }

    const prevLen = goodsReceiveData.items.length;
    setGoodsReceiveData({
      ...goodsReceiveData,
      items: [...goodsReceiveData.items, itemToAdd]
    });
    setReceiveHighlightIndex(prevLen);
    setTimeout(() => setReceiveHighlightIndex(null), 3000);

    setNotification({
      show: true,
      type: 'success',
      message: isNewProduct ? 'New product added successfully' : 'Item added successfully'
    });
    
    setNewReceiveItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      cost_price: 0,
      sale_price: 0,
      jobsheet_id: '',
      license_plate: ''
    });
    setIsNewProduct(false);
    setNewProductSku('');
    setNewProductCategory('');
    setNewProductMinStock(0);
    
    const productField = document.querySelector('input[name="product_name"]');
    if (productField) productField.focus();
};
  const removeReceiveItem = (index) => {
    const newItems = [...goodsReceiveData.items];
    newItems.splice(index, 1);
    
    setGoodsReceiveData({
      ...goodsReceiveData,
      items: newItems
    });
  };
const handleSubmitGoodsReceive = async () => {
  if (!goodsReceiveData.supplier_name || !goodsReceiveData.items.length) {
    setNotification({
      show: true,
      type: 'error',
      message: 'Please enter supplier name and add at least one item'
    });
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(goodsReceiveData)
    });
      
    if (response.ok) {
      const productIds = goodsReceiveData.items
        .filter(i => !i._isNew)
        .map(i => i.product_id.toString());
      
      await fetchInventoryData(searchTerm, categoryTerm);
      
      setTimeout(() => {
        console.log(`🔄 Aplicando highlight a ${productIds.length} productos recibidos`);
        setHighlightedRowIds(productIds);
      }, 500);

      setNotification({
        show: true,
        type: 'success',
        message: 'Goods receipt successfully registered'
      });
      setShowGoodsReceiveModal(false);
    } else {
      const errorData = await response.json();
      setNotification({
        show: true,
        type: 'error',
        message: errorData.message || 'Error registering goods receipt'
      });
    }
  } catch (error) {
    console.error("Error submitting goods receive:", error);
    setNotification({
      show: true,
      type: 'error',
      message: 'Network error when submitting goods receipt'
    });
  }
};

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    suppressMenu: true,
    minWidth: isTouchDevice ? 100 : 60,
    cellStyle: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '12px',
    fontSize: isTouchDevice ? '16px' : '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#333',
    height: '100%'
  },
    headerClass: 'custom-header',
    cellClass: isTouchDevice ? 'touch-cell' : ''
  }), [isTouchDevice]);

  const gridOptions = useMemo(() => ({
    suppressRowClickSelection: isTouchDevice,
    suppressColumnVirtualisation: isTouchDevice && isVerticalOrientation,
    suppressMovableColumns: true,
    rowBuffer: isTouchDevice ? 20 : 10,
    animateRows: true,
    paginationPageSize: isTouchDevice ? 8 : 12,
    headerHeight: isTouchDevice ? 50 : 30,
    rowHeight: isTouchDevice ? 65 : 50,
    alwaysShowVerticalScroll: isTouchDevice,
    suppressScrollOnNewData: false,
  }), [isTouchDevice, isVerticalOrientation]);

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
  { 

    headerName: 'SKU', 
    field: 'sku',
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 60 : 80, // Smaller on mobile
    maxWidth: isTouchDevice && isVerticalOrientation ? 70 : 100,
    headerClass: 'custom-header-inventory' 
  },
  { 
    headerName: 'Name', 
    field: 'name', 
  flex: isTouchDevice && isVerticalOrientation ? 6 : 4, 
    minWidth: isTouchDevice ? 180 : 220,

    autoHeight: true,
    wrapText: true,
    cellClass: 'cell-name',
    headerClass: 'custom-header-inventory', 
    suppressMenu: true,
    cellRenderer: params => { 
    const isHighlighted = highlightedRowIds.includes(params.data.id.toString());
    
    return (
      <div title={params.value} style={{ display: 'flex', alignItems: 'center' }}>
        {params.value}
        
        {isHighlighted && (
          <div style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            marginLeft: '8px',
            display: 'inline-flex',
            alignItems: 'center'
          }}>
            NEW
          </div>
        )}
      </div>
    );
  },
},   
  { 
    headerName: 'Category', 
    field: 'category', 
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 60 : 100, // Smaller on mobile
    hide: isTouchDevice && isVerticalOrientation && window.innerWidth < 480, 
    headerClass: 'custom-header-inventory' 
  },
  { 
    headerName: 'Brand', 
    field: 'brand', 
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 60 : 100, // Smaller on mobile
    hide: isTouchDevice && isVerticalOrientation && window.innerWidth < 480, 
    headerClass: 'custom-header-inventory' 
  },
  { 
    headerName: 'Stock', 
    field: 'stock', 
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 50 : 70, // Smaller on mobile
    headerClass: 'custom-header-inventory' 
  },
  { 
    headerName: 'Min', 
    field: 'min', 
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 45 : 70, // Smaller on mobile
    headerClass: 'custom-header-inventory' 
  },
  { 
    headerName: 'Cost', 
    field: 'cost',
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 55 : 80, // Smaller on mobile
    headerClass: 'custom-header-inventory' 
  },
  { 
    headerName: 'Sale', 
    field: 'sale',
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 55 : 80, // Smaller on mobile
    headerClass: 'custom-header-inventory' 
  },
  {
    headerName: 'Actions',
    flex: 1,
    minWidth: isTouchDevice && isVerticalOrientation ? 110 : 130, // Smaller on mobile
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
], [isTouchDevice, isVerticalOrientation]);


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

  const handleSaveAndAddAnother = async () => {
    if (!editItem) return;
    const { sku, name, cost, sale } = editItem;
    if (!sku || !name || !cost || !sale) {
      alert("Please complete all required fields (SKU, Name, Cost and Sale).");
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editItem),
      });
  
      if (response.ok) {
        fetchInventoryData(searchTerm, categoryTerm);
        setEditItem({
          sku: '',
          name: '',
          category: uniqueCategories[0] || '',
          brand: uniqueBrands[0] || '',
          stock: 0,
          min: 0,
          cost: 0,
          sale: 0
        });
        alert("Product created successfully. You can now add another one.");
      } else {
        const errorData = await response.json();
        if (errorData.error === 'duplicate_sku' || 
            (errorData.message && errorData.message.includes('SKU already exists'))) {
          alert("This SKU already exists. Please enter a unique SKU.");
        } else {
          console.error('Error saving product:', response.status);
          alert("Error creating product. Please try again.");
        }
      }
    } catch (error) {
      console.error('Error in handleSaveAndAddAnother:', error);
      alert("Error connecting to server. Please check your connection.");
    }
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
        response = await fetch(`${API_URL}/inventory/${editItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editItem),
        });
      } else {
        response = await fetch(`${API_URL}/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editItem),
        });
      }
  
      if (response.ok) {
        fetchInventoryData(searchTerm, categoryTerm);
        setShowModal(false);
      } else {
        const errorData = await response.json();
        if (errorData.error === 'duplicate_sku') {
          alert("This SKU already exists. Please enter a unique SKU.");
        } else {
          console.error('Error saving item:', response.status);
          alert("Error saving product. Please try again.");
        }
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      alert("Error connecting to server. Please check your connection.");
    }
  };

  const handleDelete = async () => {
    if (!editItem?.id) return;
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/inventory/${editItem.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        fetchInventoryData(searchTerm, categoryTerm);
        setShowModal(false);
      } else {
        console.error('Error deleting item:', response.status);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

const onGridReady = params => {
  gridRef.current = params.api;
  setGridReady(true);
  
  // Esperar a que el grid se renderice completamente
  setTimeout(() => {
    if (!params.columnApi) return;
    
    // Paso 1: Establecer anchos específicos para cada tipo de columna
    const nameCol = params.columnApi.getColumn('name');
    const skuCol = params.columnApi.getColumn('sku');
    const actionCol = params.columnApi.getColumn('Actions');
    
    if (isTouchDevice && isVerticalOrientation) {
      // Configuración para móvil en vertical
      if (nameCol) {
        params.columnApi.setColumnWidth(nameCol, Math.max(180, window.innerWidth * 0.5));
      }
      if (skuCol) {
        params.columnApi.setColumnWidth(skuCol, 80);
      }
      if (actionCol) {
        params.columnApi.setColumnWidth(actionCol, 100);
      }
      
      // Ocultar algunas columnas en pantallas muy pequeñas
      if (window.innerWidth < 480) {
        const colsToHide = ['category', 'brand'];
        colsToHide.forEach(colId => {
          const col = params.columnApi.getColumn(colId);
          if (col) params.columnApi.setColumnVisible(col, false);
        });
      }
    } else {
      // Configuración para desktop o landscape
      if (nameCol) {
        params.columnApi.setColumnWidth(nameCol, 250);
      }
    }
    
    // Paso 2: Distribuir el espacio restante proporcionalmente
    params.api.sizeColumnsToFit();
    
    // Paso 3: Asegurarnos que el ancho de la columna name se mantiene
    if (nameCol) {
      const currentWidth = nameCol.getActualWidth();
      const minDesiredWidth = isTouchDevice && isVerticalOrientation ? 
        Math.max(180, window.innerWidth * 0.5) : 250;
      
      if (currentWidth < minDesiredWidth) {
        params.columnApi.setColumnWidth(nameCol, minDesiredWidth);
      }
    }
    
    // Forzar refresh para aplicar cambios
    params.api.refreshCells({force: true});
  }, 300);
};

  const Notification = ({ show, message, type, onClose }) => {
    useEffect(() => {
      if (show) {
        const timer = setTimeout(() => {
          onClose();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [show, onClose]);
  
    if (!show) return null;
  
    return (
      <div
        style={{
          position: 'fixed',
          bottom: isTouchDevice ? '40px' : '20px',
          right: isTouchDevice ? '20px' : '20px',
          backgroundColor: type === 'success' ? '#34A853' : '#D32F2F',
          color: 'white',
          padding: isTouchDevice ? '16px 24px' : '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1100,
          maxWidth: isTouchDevice ? '90%' : '400px',
          animation: 'slideIn 0.3s ease',
          fontSize: isTouchDevice ? '16px' : '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: isTouchDevice ? '36px' : '24px', 
            height: isTouchDevice ? '36px' : '24px', 
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {type === 'success' ? (
              <svg width={isTouchDevice ? '20' : '14'} height={isTouchDevice ? '20' : '14'} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width={isTouchDevice ? '20' : '14'} height={isTouchDevice ? '20' : '14'} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: isTouchDevice ? '16px' : '14px', fontWeight: '500', flex: 1 }}>{message}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: isTouchDevice ? '24px' : '18px',
              opacity: 0.7,
              transition: 'opacity 0.2s',
              width: isTouchDevice ? '44px' : '24px',
              height: isTouchDevice ? '44px' : '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              margin: 0
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
          >
            ×
          </button>
        </div>
        <style jsx="true">{`
          @keyframes slideIn {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

return (
  <div
    style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: isTouchDevice ? "16px" : "30px",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      boxSizing: "border-box",
      padding: isTouchDevice && isVerticalOrientation ? "15px" : "20px",
      position: "relative",
      touchAction: "manipulation",
      WebkitOverflowScrolling: "touch"
    }}
  >
    <GridStyles />
    
    <div
      style={{
        display: "flex",
        flexDirection: isTouchDevice && isVerticalOrientation ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isTouchDevice && isVerticalOrientation ? "stretch" : "center",
        marginBottom: isTouchDevice ? "15px" : "10px",
        gap: isTouchDevice ? "12px" : "10px"
      }}
    >
      {/* Título y barra de búsqueda */}
      <div style={{ 
        flex: 1,
        maxWidth: isTouchDevice && isVerticalOrientation ? "100%" : "300px"
      }}>
        <h2 style={{ 
          margin: 0, 
          marginBottom: "10px",
          fontSize: isTouchDevice ? "20px" : "18px",
          fontWeight: "600",
          color: "#333333"
        }}>
          Inventory
        </h2>
        
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search inventory..."
            style={{
              width: "100%",
              padding: isTouchDevice ? "12px 40px 12px 12px" : "8px 30px 8px 10px",
              borderRadius: "10px",
              border: "1px solid white",
              backgroundColor: "#F9FBFF",
              fontSize: isTouchDevice ? "16px" : "14px",
              boxSizing: "border-box"
            }}
          />
          <FontAwesomeIcon 
            icon={faSearch} 
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: loading ? "#4321C9" : "gray",
              cursor: "pointer",
              fontSize: isTouchDevice ? "18px" : "14px"
            }}
          />
        </div>
      </div>
      
      <select
        value={categoryTerm}
        onChange={handleCategoryChange}
        style={{
          padding: isTouchDevice ? "12px" : "5px",
          width: isTouchDevice && isVerticalOrientation ? "100%" : "216px",
          borderRadius: "10px",
          border: "1px solid white",
          backgroundColor: "#F9FBFF",
          height: isTouchDevice ? "46px" : "35px",
          color: "gray",
          fontSize: isTouchDevice ? "16px" : "inherit",
          appearance: "none",
          backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          backgroundSize: "14px",
          boxSizing: "border-box"
        }}
      >
        <option value="">All Categories</option>
        {uniqueCategories.map(cat => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      
      <div style={{
        display: "flex",
        flexDirection: isTouchDevice && isVerticalOrientation ? "column" : "row",
        gap: "10px",
        width: isTouchDevice && isVerticalOrientation ? "100%" : "auto"
      }}>
        <button
          onClick={handleOpenGoodsReceiveModal}
          style={{
            padding: isTouchDevice ? "14px 20px" : "10px 20px",
            backgroundColor: "#34A853",
            color: "white",
            border: "none",
            borderRadius: isTouchDevice ? "10px" : "5px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: isTouchDevice && isVerticalOrientation ? "center" : "flex-start",
            gap: "8px",
            width: isTouchDevice && isVerticalOrientation ? "100%" : "auto",
            fontSize: isTouchDevice ? "16px" : "14px"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2D9249"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#34A853"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.66667 6.66669L8.00001 10L11.3333 6.66669" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 10V2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Goods Receive
        </button>

        <button
          onClick={handleAddProduct}
          style={{
            padding: isTouchDevice ? "14px 20px" : "10px 20px",
            backgroundColor: isHovered ? "#4321C9" : "#5932EA",
            color: "white",
            border: "none",
            borderRadius: isTouchDevice ? "10px" : "5px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: isTouchDevice && isVerticalOrientation ? "center" : "flex-start",
            gap: "8px",
            width: isTouchDevice && isVerticalOrientation ? "100%" : "auto",
            fontSize: isTouchDevice ? "16px" : "14px"
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3.33331V12.6666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.33337 8H12.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Add Product
        </button>
      </div>
    </div>

    <div style={{ flex: 1, position: "relative", touchAction: "auto" }}>
      <div 
        id="inventory-grid-container" 
        className={`ag-theme-alpine inventory-view ${isTouchDevice ? 'touch-enabled-grid' : ''}`}
        style={{ 
          width: "100%", 
          height: "100%",
          overflowX: "hidden",
          overflowY: "auto",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.3s ease",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "-ms-autohiding-scrollbar",
          touchAction: "pan-y"
        }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          modules={[ClientSideRowModelModule]}
          pagination={true}
          paginationPageSize={isTouchDevice ? 8 : 12}
          headerHeight={isTouchDevice ? 46 : 30}
          rowHeight={isTouchDevice ? 65 : 50}
          suppressSizeToFit={false}
          suppressHorizontalScroll={isVerticalOrientation}
          onGridReady={onGridReady}
          getRowNodeId={data => data.id.toString()}
          rowClassRules={{
            'inventory-highlight-row': params => 
              highlightedRowIds.includes(params.data.id.toString())
          }}
          gridOptions={gridOptions}
        />
      </div>
      
      {loading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000
        }}>
          <div style={{
            width: isTouchDevice ? "50px" : "40px",
            height: isTouchDevice ? "50px" : "40px",
            border: `4px solid rgba(0, 0, 0, 0.1)`,
            borderLeft: `4px solid #4321C9`,
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }}></div>
        </div>
      )}
    </div>

            {/* Compatibility Modal */}
      {showCompatibilityModal && selectedProduct && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(5px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease",
          }}
        >

          
            {/* Necesitamos una función que retorne un solo elemento para asegurar que FocusTrap tiene un único hijo */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                width: "95%",
                maxWidth: "600px",
                maxHeight: "90vh",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "modalFadeIn 0.3s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #5932EA 0%, #4321C9 100%)",
                  padding: "24px 30px",
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "200px",
                    height: "100%",
                    background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%)",
                    transform: "skewX(-20deg) translateX(30%)",
                  }}
                ></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                      Motorcycle Compatibility
                    </h2>
                    <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
                      {`Managing compatible motorcycles for ${selectedProduct.name}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCompatibilityModal(false)}
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      transition: "background-color 0.2s",
                      userSelect: "none",
                      zIndex: 10
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 30px" }}>
                {/* Product Information - Summary */}
                <div 
                  style={{ 
                    backgroundColor: "#f9fafc", 
                    borderRadius: "12px", 
                    padding: "16px", 
                    marginBottom: "24px",
                    border: "1px solid #e0e0e0"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", color: "#666" }}>SKU: {selectedProduct.sku}</div>
                      <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>{selectedProduct.name}</div>
                    </div>
                    <div style={{ 
                      backgroundColor: "#EDE7F6", 
                      color: "#5932EA", 
                      padding: "4px 12px", 
                      borderRadius: "16px", 
                      fontSize: "14px",
                      fontWeight: "500" 
                    }}>
                      {selectedProduct.category}
                    </div>
                  </div>
                </div>

                {/* Add New Compatibility */}
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                    Add New Compatibility
                  </h3>
                  <div 
                    style={{ 
                      backgroundColor: "#f9fafc", 
                      borderRadius: "12px", 
                      padding: "16px", 
                      border: "1px solid #e0e0e0"
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px" }}>
                      <input
                        type="text"
                        placeholder="Enter motorcycle model (e.g., Honda CBR 250R)"
                        value={newCompatibility}
                        onChange={(e) => setNewCompatibility(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          outline: "none",
                          fontSize: "14px",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                        onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                      />
                      <button
                        onClick={handleAddCompatibility}
                        disabled={!newCompatibility.trim()}
                        style={{
                          padding: "0 20px",
                          backgroundColor: !newCompatibility.trim() ? "#e0e0e0" : "#5932EA",
                          color: !newCompatibility.trim() ? "#999" : "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: !newCompatibility.trim() ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseOver={(e) => {
                          if (newCompatibility.trim()) {
                            e.currentTarget.style.backgroundColor = "#4321C9";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (newCompatibility.trim()) {
                            e.currentTarget.style.backgroundColor = "#5932EA";
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
                      Enter the specific motorcycle model that is compatible with this product.
                    </div>
                  </div>
                </div>

                {/* Current Compatibilities */}
                <div>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Current Compatibilities</span>
                    <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal" }}>
                      {compatibilities.length} models listed
                    </span>
                  </h3>

                  {compatibilities.length === 0 ? (
                    <div 
                      style={{ 
                        padding: "24px", 
                        backgroundColor: "#f9fafc", 
                        borderRadius: "12px",
                        border: "1px solid #e0e0e0",
                        textAlign: "center",
                        color: "#666"
                      }}
                    >
                      <div style={{ 
                        width: "48px", 
                        height: "48px", 
                        margin: "0 auto 16px auto", 
                        backgroundColor: "#e0e0e0",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 5H6C4.34315 5 3 6.34315 3 8V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V8C21 6.34315 19.6569 5 18 5Z" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 12H9M12 12H17" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "500" }}>No compatibilities added yet</p>
                      <p style={{ margin: "0", fontSize: "14px" }}>Add motorcycle models that are compatible with this product</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {compatibilities.map((comp, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 16px",
                            backgroundColor: index % 2 === 0 ? "#f9fafc" : "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e0e0e0",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f0f4ff";
                            e.currentTarget.style.borderColor = "#d4daff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#f9fafc" : "#fff";
                            e.currentTarget.style.borderColor = "#e0e0e0";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ 
                              width: "32px", 
                              height: "32px", 
                              backgroundColor: "#EDE7F6", 
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#5932EA"
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 15.5C14 16.3284 13.3284 17 12.5 17C11.6716 17 11 16.3284 11 15.5C11 14.6716 11.6716 14 12.5 14C13.3284 14 14 14.6716 14 15.5Z" fill="#5932EA"/>
                                <path d="M8.5 17C9.32843 17 10 16.3284 10 15.5C10 14.6716 9.32843 14 8.5 14C7.67157 14 7 14.6716 7 15.5C7 16.3284 7.67157 17 8.5 17Z" fill="#5932EA"/>
                                <path d="M19.5 12L16 9V11C13 10 10 12 10 12" stroke="#5932EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17 17C17.8284 17 18.5 16.3284 18.5 15.5C18.5 14.6716 17.8284 14 17 14C16.1716 14 15.5 14.6716 15.5 15.5C15.5 16.3284 16.1716 17 17 17Z" fill="#5932EA"/>
                                <path fillRule="evenodd" clipRule="evenodd" d="M3 12.5V17.5H5.54879C5.79381 16.6453 6.57462 16 7.5 16C8.42538 16 9.20619 16.6453 9.45121 17.5H10.5488C10.7938 16.6453 11.5746 16 12.5 16C13.4254 16 14.2062 16.6453 14.4512 17.5H16.5488C16.7938 16.6453 17.5746 16 18.5 16C19.4254 16 20.2062 16.6453 20.4512 17.5H21V12.5L19 8H14V11L12.8406 10.2054C12.479 9.98224 12.0978 9.80209 11.7 9.66577M4 9.5H10M4 7.5H8" stroke="#5932EA" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <span style={{ fontSize: "14px", fontWeight: "500" }}>{comp.motorcycle_model}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteCompatibility(comp.motorcycle_model)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#D32F2F",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#FFF5F5"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 4H3.33333H14" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M5.33331 4.00016V2.66683C5.33331 2.31321 5.4738 1.97407 5.72385 1.72402C5.9739 1.47397 6.31304 1.33349 6.66665 1.33349H9.33331C9.68693 1.33349 10.0261 1.47397 10.2761 1.72402C10.5262 1.97407 10.6666 2.31321 10.6666 2.66683V4.00016M12.6666 4.00016V13.3335C12.6666 13.6871 12.5262 14.0263 12.2761 14.2763C12.0261 14.5264 11.6869 14.6668 11.3333 14.6668H4.66665C4.31304 14.6668 3.9739 14.5264 3.24629 12.5037C3.02124 12.2786 2.89583 11.9787 2.89583 11.6667V4.00016H12.6666Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M6.66669 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M9.33331 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
 
              {/* Footer */}
              <div
                style={{
                  borderTop: "1px solid #e0e0e0",
                  padding: "16px 24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  backgroundColor: "#f9fafc",
                }}
              >
                <button
                  onClick={() => setShowCompatibilityModal(false)}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#5932EA",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                >
                  Done
                </button>
              </div>

              {/* CSS animations */}
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
        </div>
      )}
{showGoodsReceiveModal && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="goods-receive-modal-title"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(5px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      animation: "fadeIn 0.2s ease",
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        width: "95%",
        maxWidth: "800px",
        maxHeight: "90vh",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "modalFadeIn 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #34A853 0%, #2D9249 100%)",
          padding: "24px 30px",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "200px",
            height: "100%",
            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%)",
            transform: "skewX(-20deg) translateX(30%)",
          }}
        ></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 id="goods-receive-modal-title" style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
              Goods Receipt
            </h2>
            <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
              Register received items and update inventory
            </p>
          </div>
          <button
            onClick={() => setShowGoodsReceiveModal(false)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              transition: "background-color 0.2s",
              userSelect: "none",
              zIndex: 10
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 30px" }}>
        {/* Supplier & Invoice Details */}
        <div style={{ 
          padding: "20px", 
          backgroundColor: "#f9fafc", 
          borderRadius: "12px", 
          marginBottom: "24px",
          border: "1px solid #e0e0e0" 
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
            Supplier & Invoice Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                Supplier *
              </label>
              <input
                type="text"
                list="suppliers-list"
                name="supplier_name"
                ref={modalInitialFocusRef}
                value={goodsReceiveData.supplier_name || ""}
                onChange={(e) => {
                  setGoodsReceiveData({
                    ...goodsReceiveData,
                    supplier_name: e.target.value
                  });
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                placeholder="Enter supplier name"
                required
              />
              <datalist id="suppliers-list">
                {suppliers.map((supplier, index) => (
                  <option key={index} value={supplier.name || supplier} />
                ))}
              </datalist>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                Invoice Number
              </label>
              <input
                type="text"
                name="invoice_number"
                value={goodsReceiveData.invoice_number}
                onChange={handleGoodsReceiveInputChange}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                placeholder="Enter invoice number"
              />
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                Invoice Date *
              </label>
              <input
                type="date"
                name="invoice_date"
                value={goodsReceiveData.invoice_date}
                onChange={handleGoodsReceiveInputChange}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                required
              />
            </div>
          </div>
        </div>

        {/* Add New Item */}
        <div style={{ 
          padding: "20px", 
          backgroundColor: "#f9fafc", 
          borderRadius: "12px", 
          marginBottom: "24px",
          border: "1px solid #e0e0e0" 
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
            Add New Item
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                Product *
              </label>
              <input
                type="text"
                list="products-list"
                name="product_name"
  value={newReceiveItem.product_name || ""}
                onChange={handleNewReceiveItemChange}

                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                placeholder="Type product name or SKU"
                required
              />
              <datalist id="products-list">
                {rowData.map(product => (
                  <option key={product.id} value={`${product.sku} - ${product.name}`} />
                ))}
              </datalist>
            </div>
            {isNewProduct && (
  <div style={{ 
    gridColumn: "1 / -1",  // Span across all columns
    marginTop: "12px",
    padding: "15px", 
    backgroundColor: "#fff8e1", 
    borderRadius: "8px",
    border: "1px solid #ffe0b2",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "16px"
  }}>
    <div style={{ 
      gridColumn: "1 / -1",
      display: "flex", 
      alignItems: "center", 
      gap: "8px", 
      marginBottom: "8px",
      fontSize: "14px",
      color: "#f57c00"
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="#f57c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontWeight: "600" }}>
        New product will be created
      </span>
      <button
        onClick={() => setIsNewProduct(false)}
        style={{
          background: "none",
          border: "none",
          marginLeft: "auto",
          color: "#666",
          cursor: "pointer",
          fontSize: "13px",
          textDecoration: "underline"
        }}
      >
        Cancel
      </button>
    </div>
    
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#555" }}>
        SKU for new product *
      </label>
      <input
        type="text"
        value={newProductSku}
        onChange={(e) => setNewProductSku(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box"
        }}
        placeholder="Enter unique SKU"
        required
      />
    </div>
    
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#555" }}>
        Category (optional)
      </label>
      <input
        type="text"
        list="category-options"
        value={newProductCategory}
        onChange={(e) => setNewProductCategory(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box"
        }}
        placeholder="Select category"
      />
      <datalist id="category-options">
        {uniqueCategories.map(cat => (
          <option key={cat} value={cat} />
        ))}
      </datalist>
    </div>
    
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#555" }}>
        Minimum Stock Level *
      </label>
      <input
        type="number"
        min="0"
        value={newProductMinStock}
        onChange={(e) => setNewProductMinStock(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box"
        }}
        placeholder="0"
        required
      />
    </div>
  </div>
)}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={newReceiveItem.quantity}
                onChange={handleNewReceiveItemChange}
                min="1"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                required
              />
            </div>
            
         <div>
  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
    Cost Price *
  </label>
  <div style={{ position: "relative" }}>
    <span style={{
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#666",
      fontSize: "14px",
      pointerEvents: "none"
    }}>$</span>
    <input
      type="number"
      step="0.01"
      min="0"
      name="cost_price"
  value={newReceiveItem.cost_price || ''}
      onChange={e => setNewReceiveItem({
        ...newReceiveItem,
        cost_price: parseFloat(e.target.value) || 0
      })}
      style={{
        width: "100%",
        padding: "12px 12px 12px 30px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        backgroundColor: "#fff",
        fontSize: "14px",
        outline: "none",
        boxSizing: "border-box"
      }}
      placeholder="0.00"
      required
    />
  </div>
</div>
            
           <div>
  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
    Sale Price *
  </label>
  <div style={{ position: "relative" }}>
    <span style={{
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#666",
      fontSize: "14px",
      pointerEvents: "none"
    }}>$</span>
    <input
      type="number"
      step="0.01"
      min="0"
      name="sale_price"
  value={newReceiveItem.sale_price || ''}
      onChange={e => setNewReceiveItem({
        ...newReceiveItem,
        sale_price: parseFloat(e.target.value) || 0
      })}
      style={{
        width: "100%",
        padding: "12px 12px 12px 30px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        backgroundColor: "#fff",
        fontSize: "14px",
        outline: "none",
        boxSizing: "border-box"
      }}
      placeholder="0.00"
      required
    />
  </div>
</div>
            
            <div>
  <label style={{ 
    display: "block", 
    marginBottom: "8px", 
    fontSize: "14px", 
    fontWeight: "500", 
    color: "#444",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}>
    <span>Assign to Job Sheet</span>
    <span style={{ fontSize: "12px", color: "#666" }}>
      {jobsheets.length > 0 ? `${jobsheets.length} active job sheets` : ""}
    </span>
  </label>

  <div style={{ 
    height: "200px", 
    maxHeight: "200px", 
    overflowY: "auto", 
    border: "1px solid #e0e0e0", 
    borderRadius: "8px",
    backgroundColor: "#fff" 
  }}>
    {loading ? (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          border: "3px solid rgba(0, 0, 0, 0.1)",
          borderTop: "3px solid #5932EA",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <div style={{ color: "#666", fontSize: "14px" }}>Loading job sheets...</div>
      </div>
    ) : jobsheets && jobsheets.length > 0 ? (
      <div style={{ padding: "8px" }}>
        {jobsheets.map(job => (
          <div 
            key={job.id} 
            style={{ 
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              marginBottom: "8px",
              borderRadius: "8px",
              cursor: "pointer",
              border: newReceiveItem.jobsheet_id === job.id ? "2px solid #5932EA" : "1px solid #e0e0e0",
              backgroundColor: newReceiveItem.jobsheet_id === job.id ? "#F5F3FF" : "#fff",
              transition: "all 0.2s ease"
            }}
            onClick={() => {
              setNewReceiveItem({
                ...newReceiveItem,
                license_plate: job.license_plate || "",
                jobsheet_id: job.id
              });
            }}
            onMouseEnter={(e) => {
              if (newReceiveItem.jobsheet_id !== job.id) {
                e.currentTarget.style.backgroundColor = "#f5f5ff";
                e.currentTarget.style.borderColor = "#d4daff";
              }
            }}
            onMouseLeave={(e) => {
              if (newReceiveItem.jobsheet_id !== job.id) {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.borderColor = "#e0e0e0";
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                minWidth: "32px",
                height: "32px",
                backgroundColor: newReceiveItem.jobsheet_id === job.id ? "#5932EA" : "#EDE7F6",
                color: newReceiveItem.jobsheet_id === job.id ? "#fff" : "#5932EA",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                fontSize: "13px"
              }}>
                #{job.id}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "500" }}>
                {job.license_plate || "No plate"}
              </div>
            </div>
            {newReceiveItem.jobsheet_id === job.id ? (
              <div style={{
                backgroundColor: "#5932EA",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                gap: "4px"
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Selected
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewReceiveItem({
                    ...newReceiveItem,
                    license_plate: job.license_plate || "",
                    jobsheet_id: job.id
                  });
                }}
                style={{
                  padding: "4px 10px",
                  backgroundColor: "#5932EA",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500"
                }}
              >
                Select
              </button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div style={{ 
        padding: "24px", 
        textAlign: "center", 
        color: "#666",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%"
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "12px", color: "#999" }}>
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 10H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 14H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "500" }}>No active job sheets found</p>
        <p style={{ margin: "0", fontSize: "13px" }}>Create a job sheet first or check your filters</p>
      </div>
    )}
  </div>
  
  {newReceiveItem.jobsheet_id && (
    <div style={{ 
      fontSize: "12px", 
      color: "#2E7D32", 
      marginTop: "8px",
      display: "flex",
      alignItems: "center",
      gap: "4px"
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Job #{newReceiveItem.jobsheet_id} selected - Plate: {newReceiveItem.license_plate || "No plate"}
    </div>
  )}
</div>

          </div>
          
          {/* Add Item Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={addItemToReceive}
              style={{
                padding: "10px 20px",
                backgroundColor: "#34A853",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2D9249"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#34A853"}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3.33331V12.6666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.33337 8H12.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Item
            </button>
          </div>
        </div>

        {/* Items List */}
        <div style={{ 
          padding: "20px", 
          backgroundColor: "#f9fafc", 
          borderRadius: "12px",
          border: "1px solid #e0e0e0" 
        }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Items to Receive</span>
            <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal" }}>
              {goodsReceiveData.items.length} items
            </span>
          </h3>
          
          {goodsReceiveData.items.length === 0 ? (
            <div 
              style={{ 
                padding: "24px", 
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px dashed #e0e0e0",
                textAlign: "center",
                color: "#666"
              }}
            >
              <p style={{ margin: "0", fontSize: "14px" }}>No items added yet. Use the form above to add items.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "8px" }}>
              <div style={{ 
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px",
                gap: "12px",
                padding: "8px 16px",
                borderBottom: "1px solid #e0e0e0",
                fontSize: "13px",
                fontWeight: "600",
                color: "#666"
              }}>
                <div>Product</div>
                <div>Quantity</div>
                <div>Cost</div>
                <div>Sale</div>
                <div>Total</div>
                <div>Assigned To</div>
                <div></div>
              </div>
              
              {goodsReceiveData.items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px",
                    gap: "12px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    backgroundColor: index === receiveHighlightIndex ? "#e7fbe9" : "#fff",
                    transition: "background-color 1s ease"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>{item.product_name}</div>
                  <div>{item.quantity}</div>
                  <div>${Number(item.cost_price).toFixed(2)}</div>
                  <div>${Number(item.sale_price).toFixed(2)}</div>
                  <div>${(item.quantity * item.cost_price).toFixed(2)}</div>
                  <div>
                    {item.jobsheet_id ? (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        backgroundColor: "#EDE7F6",
                        color: "#5932EA",
                        borderRadius: "12px",
                        padding: "4px 8px",
                        fontSize: "12px",
                        gap: "4px",
                        fontWeight: "500"
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 15.5C14 16.3284 13.3284 17 12.5 17C11.6716 17 11 16.3284 11 15.5C11 14.6716 11.6716 14 12.5 14C13.3284 14 14 14.6716 14 15.5Z" fill="#5932EA"/>
                          <path d="M8.5 17C9.32843 17 10 16.3284 10 15.5C10 14.6716 9.32843 14 8.5 14C7.67157 14 7 14.6716 7 15.5C7 16.3284 7.67157 17 8.5 17Z" fill="#5932EA"/>
                          <path d="M19.5 12L16 9V11C13 10 10 12 10 12" stroke="#5932EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M17 17C17.8284 17 18.5 16.3284 18.5 15.5C18.5 14.6716 17.8284 14 17 14C16.1716 14 15.5 14.6716 15.5 15.5C15.5 16.3284 16.1716 17 17 17Z" fill="#5932EA"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M3 12.5V17.5H5.54879C5.79381 16.6453 6.57462 16 7.5 16C8.42538 16 9.20619 16.6453 9.45121 17.5H10.5488C10.7938 16.6453 11.5746 16 12.5 16C13.4254 16 14.2062 16.6453 14.4512 17.5H16.5488C16.7938 16.6453 17.5746 16 18.5 16C19.4254 16 20.2062 16.6453 20.4512 17.5H21V12.5L19 8H14V11L12.8406 10.2054C12.479 9.98224 12.0978 9.80209 11.7 9.66577M4 9.5H10M4 7.5H8" stroke="#5932EA" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        #{item.jobsheet_id}
                      </div>
                    ) : (
                      <span style={{ color: "#999", fontSize: "13px" }}>--</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeReceiveItem(index)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#D32F2F",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#FFF5F5"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4H3.33333H14" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5.33331 4.00016V2.66683C5.33331 2.31321 5.4738 1.97407 5.72385 1.72402C5.9739 1.47397 6.31304 1.33349 6.66665 1.33349H9.33331C9.68693 1.33349 10.0261 1.47397 10.2761 1.72402C10.5262 1.97407 10.6666 2.31321 10.6666 2.66683V4.00016M12.6666 4.00016V13.3335C12.6666 13.6871 12.5262 14.0263 12.2761 14.2763C12.0261 14.5264 11.6869 14.6668 11.3333 14.6668H4.66665C4.31304 14.6668 3.9739 14.5264 3.72385 14.2763C3.4738 14.0263 3.33331 13.6871 3.33331 13.3335V4.00016H12.6666Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {goodsReceiveData.items.length > 0 && (
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              marginTop: "16px",
              paddingTop: "16px", 
              borderTop: "1px solid #e0e0e0" 
            }}>
              <div style={{ 
                padding: "12px 24px", 
                backgroundColor: "#EDE7F6",
                borderRadius: "8px",
                fontWeight: "600"
              }}>
                Total: ${goodsReceiveData.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #e0e0e0",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f9fafc",
        }}
      >
        <button
          onClick={() => setShowGoodsReceiveModal(false)}
          style={{
            padding: "12px 20px",
            backgroundColor: "transparent",
            color: "#666",
            border: "1px solid #d0d0d0",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
            e.currentTarget.style.color = "#555";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#666";
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitGoodsReceive}
          disabled={goodsReceiveData.items.length === 0 || !goodsReceiveData.supplier_name}
          style={{
            padding: "12px 24px",
            backgroundColor: goodsReceiveData.items.length === 0 || !goodsReceiveData.supplier_name ? "#e0e0e0" : "#34A853",
            color: goodsReceiveData.items.length === 0 || !goodsReceiveData.supplier_name ? "#999" : "white",
            border: "none",
            borderRadius: "8px",
            cursor: goodsReceiveData.items.length === 0 || !goodsReceiveData.supplier_name ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            if (goodsReceiveData.items.length > 0 && goodsReceiveData.supplier_name) {
              e.currentTarget.style.backgroundColor = "#2D9249";
            }
          }}
          onMouseOut={(e) => {
            if (goodsReceiveData.items.length > 0 && goodsReceiveData.supplier_name) {
              e.currentTarget.style.backgroundColor = "#34A853";
            }
          }}
        >
          Submit Receipt
        </button>
      </div>
    </div>
  </div>
)}
 {showModal && editItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          aria-describedby="product-modal-description"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(5px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "95%",
              maxWidth: "800px",
              maxHeight: "90vh",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
              animation: "modalFadeIn 0.3s ease",
            }}
          >
            {/* NUEVO DISEÑO DE HEADER - Completamente rediseñado con altura fija */}
            <div
              style={{
                background: "linear-gradient(135deg, #5932EA 0%, #4321C9 100%)",
                color: "white",
                position: "relative",
                overflow: "visible",
                width: "100%",
                height: "150px", // Altura fija estricta
                boxSizing: "border-box",
              }}
            >
              {/* Decoración de fondo */}
              <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "200px",
                height: "100%",
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%)",
                transform: "skewX(-20deg) translateX(30%)",
                pointerEvents: "none"
              }}></div>
              
              {/* Contenido del header en grid para mejor control */}
              <div style={{
                display: "grid",
                gridTemplateRows: "auto auto",
                height: "100%",
                padding: "24px 30px",
                boxSizing: "border-box",
              }}>
                {/* Fila 1: Título y botón de cierre */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start"
                }}>
                  <div style={{ maxWidth: "calc(100% - 40px)" }}>
                    <h2 id="product-modal-title" style={{ 
                      margin: 0, 
                      fontSize: "22px", 
                      fontWeight: "600", 
                      whiteSpace: "nowrap",
                      overflow: "visible",
                      textOverflow: "ellipsis",
                    }}>
                      {editItem.id ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <p id="product-modal-description" style={{ 
                      margin: "4px 0 0 0", 
                      opacity: "0.8", 
                      fontSize: "14px",
                      whiteSpace: "nowrap",
                      overflow: "visible", 
                      textOverflow: "ellipsis",
                    }}>
                      {editItem.id ? `Editing ${editItem.name || 'Product'}` : "Enter product details below"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    aria-label="Close modal"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                      width: "32px",
                      height: "32px",
                      minWidth: "32px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      transition: "background-color 0.2s",
                      userSelect: "none",
                      zIndex: 10,
                      outline: "none",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
                    onFocus={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                    onBlur={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
                  >
                    ×
                  </button>
                </div>
                
                {/* Fila 2: Selector de Quick Mode con diseño moderno y limpio */}
                <div style={{
                  alignSelf: "end",
                  marginTop: "auto"
                }}>
                  {/* Diseño simplificado con switch visual en lugar de texto largo */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}>
                    <button
                      onClick={() => setQuickMode(!quickMode)}
                      style={{
                        backgroundColor: "transparent",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "14px",
                        cursor: "pointer",
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      {/* Switch visual */}
                      <div style={{
                        width: "36px",
                        height: "20px",
                        backgroundColor: quickMode ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        position: "relative",
                        transition: "background-color 0.2s"
                      }}>
                        <div style={{
                          position: "absolute",
                          left: quickMode ? "18px" : "2px",
                          top: "2px",
                          width: "16px",
                          height: "16px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "left 0.2s"
                        }}></div>
                      </div>
                      <span style={{ fontWeight: "500" }}>Quick Mode</span>
                    </button>
                    
                    {/* Texto descriptivo corto y no truncado */}
                    <span style={{
                      fontSize: "13px",
                      opacity: "0.8",
                    }}>
                      {quickMode ? "Essential fields only" : "Show all fields"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 30px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Product Identification - Always visible */}
                <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                    Product Identification
                  </h3>
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr", 
                    gap: "16px", 
                    width: "100%", 
                    boxSizing: "border-box" 
                  }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                        SKU *
                      </label>
                      <input
                        type="text"
                        value={editItem.sku}
                        onChange={(e) => setEditItem({ ...editItem, sku: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          backgroundColor: "#fff",
                          fontSize: "14px",
                          transition: "border-color 0.2s",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                        Name *
                      </label>
                      <input
                        type="text"
                        value={editItem.name}
                        onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e0e0e0",
                          backgroundColor: "#fff",
                          fontSize: "14px",
                          transition: "border-color 0.2s",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Information - Always visible */}
                <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                    Pricing Information
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div>
  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
    Cost Price *
  </label>
  <div style={{ position: "relative" }}>
    <span style={{
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#666",
      fontSize: "14px",
      pointerEvents: "none"
    }}>$</span>
    <input
      type="number"
      step="0.01"
      min="0"
      name="cost_price"
      value={newReceiveItem.cost_price}
      onChange={e => setNewReceiveItem({
        ...newReceiveItem,
        cost_price: parseFloat(e.target.value) || 0
      })}
      style={{
        width: "100%",
        padding: "12px 12px 12px 30px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        backgroundColor: "#fff",
        fontSize: "14px",
        outline: "none",
        boxSizing: "border-box"
      }}
      placeholder="0.00"
      required
    />
  </div>
                    </div>
                   <div>
  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
    Sale Price *
  </label>
  <div style={{ position: "relative" }}>
    <span style={{
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#666",
      fontSize: "14px",
      pointerEvents: "none"
    }}>$</span>
    <input
      type="number"
      step="0.01"
      min="0"
      name="sale_price"
      value={newReceiveItem.sale_price}
      onChange={e => setNewReceiveItem({
        ...newReceiveItem,
        sale_price: parseFloat(e.target.value) || 0
      })}
      style={{
        width: "100%",
        padding: "12px 12px 12px 30px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        backgroundColor: "#fff",
        fontSize: "14px",
        outline: "none",
        boxSizing: "border-box"
      }}
      placeholder="0.00"
      required
    />
</div>
                      {editItem.cost > 0 && editItem.sale > 0 && (
                        <div style={{ 
                          marginTop: "6px", 
                          fontSize: "13px", 
                          color: 
                          editItem.sale > editItem.cost 
                            ? "#2E7D32" 
                            : editItem.sale < editItem.cost 
                              ? "#C62828" 
                              : "#666"
                        }}>
                          {editItem.sale > editItem.cost 
                            ? `Margin: ${((editItem.sale - editItem.cost) / editItem.cost * 100).toFixed(1)}%` 
                            : editItem.sale < editItem.cost 
                              ? "Warning: Sale price is lower than cost" 
                              : "No margin - selling at cost"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional sections - Only visible if not in quick mode */}

                  {!quickMode && (
  <>
    {/* Classification */}
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr 1fr", 
      gap: "16px",
      marginBottom: "20px"
    }}>
      {/* Categoría */}
      <div>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
          Category
        </label>
        <input
          type="text"
          list="category-options"
          value={editItem.category}
          onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            backgroundColor: "#fff",
            fontSize: "14px",
            transition: "border-color 0.2s",
            outline: "none",
            boxSizing: "border-box"
          }}
          onFocus={(e) => e.target.style.borderColor = "#5932EA"}
          onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
        />
        <datalist id="category-options">
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
      </div>

      {/* Marca */}
      <div>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
          Brand
        </label>
        <input
          type="text"
          list="brand-options"
          value={editItem.brand}
          onChange={(e) => setEditItem({ ...editItem, brand: e.target.value })}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            backgroundColor: "#fff",
            fontSize: "14px",
            transition: "border-color 0.2s",
            outline: "none",
            boxSizing: "border-box"
          }}
          onFocus={(e) => e.target.style.borderColor = "#5932EA"}
          onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
        />
        <datalist id="brand-options">
          {uniqueBrands.map(brand => (
            <option key={brand} value={brand} />
          ))}
        </datalist>
      </div>
    </div>

                    {/* Inventory Information */}
                    <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
  <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
    Inventory Information
  </h3>
  <div style={{ 
    display: "grid", 
    gridTemplateColumns: "1fr 1fr", 
    gap: "16px", /* Reducido el gap para evitar choques */
    width: "100%", 
    boxSizing: "border-box" 
  }}>
    <div>
      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
        Current Stock
      </label>
      <input
        type="text"
        value={editItem.stock === 0 ? '' : editItem.stock}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '' || /^\d+$/.test(val)) {
            setEditItem({ ...editItem, stock: val === '' ? 0 : Number(val) });
          }
        }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          fontSize: "14px",
          transition: "border-color 0.2s",
          outline: "none",
          boxSizing: "border-box" /* Asegurarse que tiene box-sizing */
        }}
        onFocus={(e) => e.target.style.borderColor = "#5932EA"}
        onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
        placeholder="0"
      />
    </div>
    <div>
      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
        Minimum Stock Alert
      </label>
      <input
        type="text"
        value={editItem.min === 0 ? '' : editItem.min}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '' || /^\d+$/.test(val)) {
            setEditItem({ ...editItem, min: val === '' ? 0 : Number(val) });
          }
        }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          fontSize: "14px",
          transition: "border-color 0.2s",
          outline: "none",
          boxSizing: "border-box" /* Asegurarse que tiene box-sizing */
        }}
        onFocus={(e) => e.target.style.borderColor = "#5932EA"}
        onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
        placeholder="0"
      />
    </div>
  </div>
</div>
                  </>
                )}
              </div>
            </div>

            {/* Footer with improved actions */}
            <div
              style={{
                borderTop: "1px solid #e0e0e0",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9fafc",
              }}
            >
              {editItem.id && (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: "transparent",
                    color: "#D32F2F",
                    border: "1px solid #FFCDD2",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#FFF5F5";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H3.33333H14" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.33331 4.00016V2.66683C5.33331 2.31321 5.4738 1.97407 5.72385 1.72402C5.9739 1.47397 6.31304 1.33349 6.66665 1.33349H9.33331C9.68693 1.33349 10.0261 1.47397 10.2761 1.72402C10.5262 1.97407 10.6666 2.31321 10.6666 2.66683V4.00016M12.6666 4.00016V13.3335C12.6666 13.6871 12.5262 14.0263 12.2761 14.2763C12.0261 14.5264 11.6869 14.6668 11.3333 14.6668H4.66665C4.31304 14.6668 3.9739 14.5264 3.72385 14.2763C3.4738 14.0263 3.33331 13.6871 3.33331 13.3335V4.00016H12.6666Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.66669 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.33331 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Delete Product
                </button>
              )}
              
              <div style={{ display: "flex", gap: "12px", marginLeft: "auto" }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: "transparent",
                    color: "#666",
                    border: "1px solid #d0d0d0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.color = "#555";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#666";
                  }}
                >
                  Cancel
                </button>
                
                {!editItem.id && (
                  <button
                    onClick={handleSaveAndAddAnother}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#4E9F3D",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      minWidth: "170px",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#3D8030"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#4E9F3D"}
                  >
                    Save & Add Another
                  </button>
                )}
                
                <button
                  onClick={handleSave}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#5932EA",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    minWidth: "120px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                >
                  {editItem.id ? "Update Product" : "Create Product"}
                </button>
              </div>
            </div>

            {/* CSS animations */}
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
        </div>
      )}

{notification.show && (
  <Notification
    show={notification.show}
    message={notification.message}
    type={notification.type}
    onClose={() => setNotification({ ...notification, show: false })}
  />
)}
      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (orientation: portrait) {
          .ag-theme-alpine .ag-paging-button {
            min-width: 40px !important;
            min-height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: ${isTouchDevice ? '16px' : '14px'} !important;
          }
          
          .ag-theme-alpine .ag-paging-panel {
            height: ${isTouchDevice ? '60px' : '35px'} !important;
            padding: ${isTouchDevice ? '10px' : '5px'} !important;
          }
        }
        
        input, select, button {
          -webkit-tap-highlight-color: rgba(0,0,0,0);
        }
        
        .touch-enabled-grid {
          -webkit-overflow-scrolling: touch !important;
          scroll-behavior: smooth !important;
          overscroll-behavior: contain !important;
        }
      `}</style>
    </div>
    
  );

  
};

export default InventoryView;

