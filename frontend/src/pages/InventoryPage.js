// filepath: /c:/Users/salbe/OneDrive/Escritorio/New Union Company/frontend/src/pages/InventoryPage.js
import React, { useEffect, useState } from 'react';
import Sumary from './sumary';
import CompatibilityCheck from './compatibilityCheck';
import InventoryView from './inventoryView';

const InventoryPage = () => {
  // Calcula el factor de escala para mantener el aspect ratio de 1440×1020
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const scaleW = window.innerWidth / 1440;
      const scaleH = window.innerHeight / 1080;  // Cambiado de 1080 a 1020
      setScale(Math.min(scaleW, scaleH));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#D9D9D9'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '1440px',
          height: '1020px',  // Actualiza a 1020 para respetar el diseño en Figma
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {/* Sumary Box en porcentajes */}
        <div
          style={{
            position: 'absolute',
            left: '15%',
            top: '10%',
            width: '50%',
            height: '40%'
          }}
        >
          <Sumary />
        </div>

        {/* Compatibility Check Box en porcentajes */}
        <div
          style={{
            position: 'absolute',
            left: '70%',
            top: '10%',
            width: '50%',
            height: '40%'
          }}
        >
          <CompatibilityCheck />
        </div>

        {/* InventoryView Box en porcentajes */}
        <div
          style={{
            position: 'absolute',
            left: '19.31%',
            top: '50%',
            width: '77.78%',
            height: '51.85%'
          }}
        >
          <InventoryView />
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
