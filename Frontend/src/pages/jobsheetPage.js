import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JobsheetView from './jobsheetView';
import SideBar from './Sidebar';

const JobsheetPage = () => {
  const navigate = useNavigate();
  
  // Estados para manejo responsivo - igual que en InventoryPage
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
      {/* Barra lateral - Estructura igual a InventoryPage */}
      <div
        style={{
          width: isMobile ? (sidebarOpen ? '250px' : '0px') : '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
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

      {/* Contenedor principal - Estructura igual a InventoryPage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          boxSizing: 'border-box',
          marginLeft: isMobile ? 0 : '0px',
          transition: 'margin-left 0.3s ease',
          height: '100%',
          overflow: 'auto', // Permite scroll cuando sea necesario
          WebkitOverflowScrolling: 'touch' // Scroll suave en iOS
        }}
      >
        {/* Contenedor para JobsheetView - toda la altura disponible */}
        <div style={{ 
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <JobsheetView />
        </div>
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

export default JobsheetPage;