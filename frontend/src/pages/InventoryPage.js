import React, { useState, useEffect } from 'react';
import Sumary from './sumary';
import CompatibilityCheck from './compatibilityCheck';
import InventoryView from './inventoryView';
import SideBar from './Sidebar';

const InventoryPage = () => {
  // Estados para manejo responsivo
  const [isMobile, setIsMobile] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Detectar si es dispositivo móvil/tablet y orientación
  useEffect(() => {
    const checkDeviceAndOrientation = () => {
      const isMobileDevice = window.innerWidth <= 1024; // Considera tablets
      const isVerticalOrientation = window.innerHeight > window.innerWidth;
      
      setIsMobile(isMobileDevice);
      setIsVertical(isVerticalOrientation);
      
      // En dispositivos grandes, la sidebar siempre está visible
      // En móviles/tablets, está cerrada por defecto
      setSidebarOpen(!isMobileDevice);
    };
    
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
    };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#D9D9D9',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Barra lateral - Ahora responsiva */}
      <div
        style={{
          width: isMobile ? (sidebarOpen ? '250px' : '0px') : '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'width 0.3s ease',
          overflow: 'hidden', // Importante para ocultar contenido cuando width=0
          position: isMobile ? 'fixed' : 'relative',
          zIndex: 1000,
          height: '100%'
        }}
      >
        <SideBar 
          isMobile={isMobile} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />
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
          marginLeft: isMobile ? 0 : '0px',
          transition: 'margin-left 0.3s ease',
          height: '100%',
          overflow: 'auto', // Permite scroll cuando sea necesario
          WebkitOverflowScrolling: 'touch' // Scroll suave en iOS
        }}
      >
        {/* Orden ajustado para móvil y vertical - Primero InventoryView */}
        {(isMobile && isVertical) ? (
          <>
            {/* 1. InventoryView primero en móvil/vertical */}
            <div style={{ 
              flex: 1,
              minHeight: '500px'
            }}>
              <InventoryView />
            </div>
            
            {/* 2. CompatibilityCheck segundo en móvil/vertical */}
            <div style={{ 
              flex: 0,
              minHeight: '200px',
              overflow: 'auto'
            }}>
              <CompatibilityCheck />
            </div>
            
            {/* 3. Sumary último en móvil/vertical */}
            <div style={{ 
              flex: 0, 
              minHeight: '200px',
              overflow: 'auto'
            }}>
              <Sumary />
            </div>
          </>
        ) : (
          <>
            {/* Layout original para escritorio/horizontal */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'row',
                height: '30%', 
                gap: '20px',
              }}
            >
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
              }}>
                <Sumary />
              </div>
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
              }}>
                <CompatibilityCheck />
              </div>
            </div>

            <div style={{ 
              flex: 1,
            }}>
              <InventoryView />
            </div>
          </>
        )}
      </div>

      {/* Overlay cuando sidebar está abierta en móvil/tablet */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};

export default InventoryPage;