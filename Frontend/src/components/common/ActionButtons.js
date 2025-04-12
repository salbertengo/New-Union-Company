import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


export const ActionButton = ({ 
    icon, 
    onClick, 
    tooltip, 
    type = 'default', // 'default', 'primary', 'danger', 'warning', 'success'
    disabled = false
  }) => {
    // Configuración de colores según el tipo de botón
    const colors = {
      default: {
        base: "#EDE7F6",
        hover: "#D1C4E9",
        color: "#5932EA"
      },
      primary: {
        base: "#E3F2FD",
        hover: "#BBDEFB",
        color: "#1976D2"
      },
      danger: {
        base: "#FFEBEE",
        hover: "#FFCDD2",
        color: "#D32F2F"
      },
      warning: {
        base: "#FFF8E1",
        hover: "#FFECB3",
        color: "#F57C00"
      },
      success: {
        base: "#E8F5E9",
        hover: "#C8E6C9",
        color: "#2E7D32"
      }
    };
  
    const colorSet = colors[type] || colors.default;
  
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        style={{
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: '8px',
          background: colorSet.base,
          color: colorSet.color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '0',
          transition: 'all 0.2s ease',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = colorSet.hover;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = colorSet.base;
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = colorSet.hover;
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(89,50,234,0.3)";
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.background = colorSet.base;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <FontAwesomeIcon icon={icon} />
      </button>
    );
  };
  
  // Componente contenedor para agrupar botones de acción
  export const ActionButtonsContainer = ({ children }) => {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        gap: '10px',
        alignItems: 'center'
      }}>
        {children}
      </div>
    );
  };