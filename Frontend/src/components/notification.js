import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const NotificationModal = ({ 
  type = 'info', // 'success', 'error', 'warning', 'info'
  title,
  message, 
  onClose, 
  autoClose = false, 
  autoCloseTime = 5000,
  showCloseButton = true,
  primaryButtonText = 'OK',
  secondaryButtonText,
  onPrimaryButtonClick,
  onSecondaryButtonClick
}) => {
  // Auto close functionality
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseTime, onClose]);

  // Define colors based on notification type
  const colors = {
    success: {
      background: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
      icon: "✓",
      lightBg: "#E8F5E9"
    },
    error: {
      background: "linear-gradient(135deg, #F44336 0%, #D32F2F 100%)",
      icon: "✕",
      lightBg: "#FFEBEE"
    },
    warning: {
      background: "linear-gradient(135deg, #FFC107 0%, #FFA000 100%)",
      icon: "⚠",
      lightBg: "#FFF8E1"
    },
    info: {
      background: "linear-gradient(135deg, #5932EA 0%, #4321C9 100%)",
      icon: "ℹ",
      lightBg: "#EDE7F6"
    }
  };

  const typeConfig = colors[type] || colors.info;
  
  // If there's no separate title provided, generate one based on type
  const displayTitle = title || (type.charAt(0).toUpperCase() + type.slice(1));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "450px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: typeConfig.background,
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
            aria-hidden="true"
          ></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "36px", 
                height: "36px", 
                borderRadius: "50%", 
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold"
              }}>
                {typeConfig.icon}
              </div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                {displayTitle}
              </h2>
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close notification"
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
                  zIndex: 10,
                  outline: "none",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 30px", backgroundColor: typeConfig.lightBg }}>
          <p style={{ 
            margin: 0, 
            fontSize: "16px", 
            lineHeight: "1.6", 
            color: "#333",
            whiteSpace: "pre-wrap"
          }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            backgroundColor: "#f9fafc",
          }}
        >
          {secondaryButtonText && (
            <button
              onClick={onSecondaryButtonClick || onClose}
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
                e.currentTarget.style.backgroundColor = "#f6f6f6";
                e.currentTarget.style.borderColor = "#c0c0c0";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#d0d0d0";
              }}
            >
              {secondaryButtonText}
            </button>
          )}
          <button
            onClick={onPrimaryButtonClick || onClose}
            style={{
              padding: "12px 24px",
              backgroundColor: type === 'error' ? "#D32F2F" : "#5932EA",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = type === 'error' ? "#C62828" : "#4321C9"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = type === 'error' ? "#D32F2F" : "#5932EA"}
          >
            {primaryButtonText}
          </button>
        </div>
      </div>
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
    </div>,
    document.body
  );
};

export default NotificationModal;