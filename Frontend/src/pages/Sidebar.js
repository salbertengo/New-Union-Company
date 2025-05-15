import "../styles.css";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; 
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faBars, 
    faTimes, 
    faSignOutAlt, 
    faTachometerAlt, 
    faWarehouse,
    faCar,
    faTools,
    faCreditCard,
    faUsers,
    faUserCog
} from "@fortawesome/free-solid-svg-icons";

const Sidebar = ({ isMobile, sidebarOpen, setSidebarOpen }) => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    
    useEffect(() => {
        const existingScript = document.getElementById("script-buttons");
        if (existingScript) {
            existingScript.remove();
        }
    }, []);

    const handleNavigation = (path) => {
        navigate(path);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
        setShowLogoutModal(false);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    // Botón para mostrar/ocultar sidebar en móvil
    const SidebarToggle = () => (
        <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
                position: 'fixed',
                top: '10px',
                left: sidebarOpen ? '240px' : '10px',
                zIndex: 1000,
                backgroundColor: '#5932EA',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                transition: 'left 0.3s ease'
            }}
        >
            <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
        </button>
    );

    // Estilo común para todos los botones del sidebar para garantizar alineación
    const buttonStyle = {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '12px 15px',
        marginBottom: '8px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.2s',
    };

    // Estilo común para los iconos
const iconStyle = {
  width: '24px',         // ancho fijo
  fontSize: '18px',      // tamaño de todos los iconos
  marginRight: '12px',
  color: '#5932EA',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};

    return (
        <>
            {isMobile && <SidebarToggle />}
            
            <div
                style={{
                    width: isMobile ? (sidebarOpen ? '100%' : '0%') : '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px',
                    boxSizing: 'border-box',
                    transition: 'width 0.3s ease',
                    overflowX: 'hidden',
                    opacity: isMobile && !sidebarOpen ? 0 : 1,
                    justifyContent: 'space-between'
                }}
            >
                {/* Sección de navegación con estilos uniformes */}
                <nav style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <button 
                        className="sidebar-button"
                        id="btn1"
                        onClick={() => handleNavigation('/dashboard')}
                        style={buttonStyle}
                    >
                        <span style={iconStyle}>
                            <FontAwesomeIcon icon={faTachometerAlt} />
                        </span>
                        Dashboard
                    </button>
                    
                    <button 
                        className="sidebar-button"
                        id="btn2"
                        onClick={() => handleNavigation('/inventorydashboard')}
                        style={buttonStyle}
                    >
                        <span style={iconStyle}>
                            <FontAwesomeIcon icon={faWarehouse} />
                        </span>
                        Inventory
                    </button>
                    
                    <button 
                        className="sidebar-button"
                        id="btn-vehicles"
                        onClick={() => handleNavigation('/vehicles')}
                        style={buttonStyle}
                    >
                        <span style={iconStyle}>
                            <FontAwesomeIcon icon={faCar} />
                        </span>
                        Vehicles
                    </button>
                    
                    <button 
                        className="sidebar-button"
                        id="btn3"
                        onClick={() => handleNavigation('/jobsheets')}
                        style={buttonStyle}
                    >
                        <span style={iconStyle}>
                            <FontAwesomeIcon icon={faTools} />
                        </span>
                        Jobsheets
                    </button>
                    
<button 
    className="sidebar-button"
    id="btn92"
    onClick={() => handleNavigation('/payments')}
    style={buttonStyle}
>
    <span style={iconStyle}>
        <FontAwesomeIcon 
            icon={faCreditCard} 
        />
    </span>
    Payments
</button>
                    <button 
                        className="sidebar-button"
                        id="btn5"
                        onClick={() => handleNavigation('/customersdashboard')}
                        style={buttonStyle}
                    >
                        <span style={iconStyle}>
                            <FontAwesomeIcon icon={faUsers} />
                        </span>
                        Customers
                    </button>
                    
                    {isAdmin() && (
                        <button 
                            className="sidebar-button"
                            id="btn-usermanagement"
                            onClick={() => handleNavigation('/usermanagement')}
                            style={buttonStyle}
                        >
                            <span style={iconStyle}>
                                <FontAwesomeIcon icon={faUserCog} />
                            </span>
                            User Management
                        </button>
                    )}
                </nav>

                {/* Botón de logout con el mismo estilo para mantener consistencia */}
                <div style={{ marginTop: '20px' }}>
                    <button 
                        className="sidebar-button logout-button"
                        onClick={handleLogout}
                        style={{
                            ...buttonStyle,
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        <span style={iconStyle}>
                            <FontAwesomeIcon icon={faSignOutAlt} />
                        </span>
                        Log Out
                    </button>
                </div>
            </div>

            {/* Modal de confirmación de logout */}
            {showLogoutModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1100,
                        backdropFilter: 'blur(3px)'
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            padding: '20px',
                            maxWidth: '90%',
                            width: '320px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                            animation: 'fadeIn 0.3s'
                        }}
                    >
                        <h3 style={{ 
                            marginTop: '0',
                            color: '#333',
                            fontSize: '18px',
                            borderBottom: '1px solid #eee',
                            paddingBottom: '10px'
                        }}>
                            Confirm Logout
                        </h3>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Are you sure you want to log out of the system?
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '10px',
                                marginTop: '20px'
                            }}
                        >
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                style={{
                                    padding: '8px 15px',
                                    border: 'none',
                                    borderRadius: '5px',
                                    backgroundColor: '#f1f1f1',
                                    color: '#333',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                style={{
                                    padding: '8px 15px',
                                    border: 'none',
                                    borderRadius: '5px',
                                    backgroundColor: '#5932EA',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    
                    .sidebar-button:hover {
                        background-color: #f5f5f5;
                    }
                    
                    .logout-button:hover {
                        background-color: #f5f5f5;
                        border-color: #5932EA;
                    }
                `}
            </style>
        </>
    );
};

export default Sidebar;