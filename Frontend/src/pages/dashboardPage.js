import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardView from './dashboardView';
import SideBar from './Sidebar';

const DashboardPage = () => {
  const navigate = useNavigate();
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
      setSidebarOpen(!isMobileDevice); // En escritorio la sidebar siempre está visible
    };
    
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    window.addEventListener('orientationchange', checkDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
      window.removeEventListener('orientationchange', checkDeviceAndOrientation);
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
      {/* Sidebar - Ahora responsiva */}
      <div
        style={{
          width: isMobile ? (sidebarOpen ? '250px' : '0px') : '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'width 0.3s ease',
          overflow: 'hidden', // Oculta el contenido cuando el ancho es 0
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
          boxSizing: 'border-box',
          marginLeft: isMobile ? 0 : '0px',
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Main Content */}
        <div className="dashboard-content"
          style={{
            flex: 1,
            padding: isMobile && isVertical ? '15px' : '20px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch', // Para scroll suave en iOS
            touchAction: 'pan-y' // Habilitar scroll vertical táctil
          }}
        >
          <DashboardView 
            isMobile={isMobile} 
            isVertical={isVertical}
          />
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

export default DashboardPage;