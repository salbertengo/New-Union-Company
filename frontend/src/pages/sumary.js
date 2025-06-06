import React, { useState, useEffect } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Registrar módulos de AG Grid
ModuleRegistry.registerModules([ClientSideRowModelModule]);

const Sumary = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL;
  
  // Detectar si es tablet/dispositivo táctil y orientación
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  
  // Detectar orientación y dispositivo táctil
  useEffect(() => {
    const checkDeviceAndOrientation = () => {
      // Detectar si es dispositivo táctil
      const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(touchDevice);
      
      // Detectar orientación vertical
      const verticalOrientation = window.innerHeight > window.innerWidth;
      setIsVertical(verticalOrientation);
    };
    
    // Comprobar al inicio y cuando cambia la orientación
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    window.addEventListener('orientationchange', checkDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
      window.removeEventListener('orientationchange', checkDeviceAndOrientation);
    };
  }, []);
  
  // Cargar datos del inventario
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/inventory`, {
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
  }, [API_URL]);

  // Filtrar productos cuyo stock es menor que min
  const lowStockData = inventory.filter(product => product.stock < product.min);

  // Configuración de columnas adaptada para tablet vertical
  const lowStockColumns = [
    { 
      headerName: 'SKU', 
      field: 'sku', 
      headerClass: 'custom-header-sumary',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: isTouchDevice ? '14px' : '12px',
        overflow: 'visible',
        whiteSpace: isVertical ? 'normal' : 'nowrap',
        lineHeight: isVertical ? '1.4' : 'inherit'
      }
    },
    { 
      headerName: 'Name', 
      field: 'name', 
      headerClass: 'custom-header-sumary',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: isTouchDevice ? '14px' : '12px',
        overflow: 'visible',
        whiteSpace: isVertical ? 'normal' : 'nowrap',
        lineHeight: isVertical ? '1.4' : 'inherit'
      }
    },
    { 
      headerName: 'Stock', 
      field: 'stock', 
      headerClass: 'custom-header-sumary',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isTouchDevice ? '14px' : '12px'
      }
    }
  ];

  // Opciones para AG Grid adaptadas para tablet vertical
  const gridOptions = {
    suppressRowClickSelection: isTouchDevice,
    suppressMovableColumns: true,
    alwaysShowVerticalScroll: isVertical,
    domLayout: isVertical ? 'normal' : 'autoHeight'
  };

  return (
    <div
      style={{
        borderRadius: isTouchDevice ? '16px' : '30px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        padding: isTouchDevice ? '15px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <h3 style={{ 
        margin: 0, 
        marginBottom: '10px', 
        fontSize: isTouchDevice ? '18px' : '16px' 
      }}>
        Low Stock Parts
      </h3>
      
      {/* Contenedor flexible para la grid */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        WebkitOverflowScrolling: 'touch' // Para scroll suave en iOS
      }}>
        <div 
          className={`ag-theme-alpine sumary-grid ${isTouchDevice ? 'touch-grid' : ''}`} 
          style={{ 
            width: '100%', 
            height: '100%',
            overflow: 'auto'
          }}
        >
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%' 
            }}>
              <p>Loading...</p>
            </div>
          ) : (
            <AgGridReact
              rowData={lowStockData}
              columnDefs={lowStockColumns}
              defaultColDef={{ 
                flex: 1, 
                resizable: false, 
                sortable: true,
                wrapText: isVertical,
                autoHeight: isVertical
              }}
              modules={[ClientSideRowModelModule]}
              pagination={false}
              rowHeight={isTouchDevice ? (isVertical ? 48 : 36) : 24}
              headerHeight={isTouchDevice ? 40 : 28}
              gridOptions={gridOptions}
              suppressSizeToFit={false}
              onFirstDataRendered={(params) => {
                params.api.sizeColumnsToFit();
              }}
            />
          )}
        </div>
      </div>
      
      {/* Estilos específicos para tablas en tablet */}
      <style>{`
        .touch-grid .ag-header-cell {
          padding: 8px 4px !important;
        }
        
        .touch-grid .ag-header-cell-text {
          font-size: 14px !important;
          font-weight: 600 !important;
        }
        
        .touch-grid .ag-cell {
          padding: 8px 8px !important;
        }
        
        /* Mejora del scroll en dispositivos táctiles */
        @media (pointer: coarse) {
          .ag-body-viewport {
            -webkit-overflow-scrolling: touch !important;
            overflow-scrolling: touch !important;
          }
          
          /* Mejores barras de desplazamiento para touch */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          ::-webkit-scrollbar-thumb {
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default Sumary;