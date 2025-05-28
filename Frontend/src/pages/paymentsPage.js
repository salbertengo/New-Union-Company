import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { ModuleRegistry } from "@ag-grid-community/core";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faEdit, 
  faTrash, 
  faTimes, 
  faPlus,
  faMoneyBill,
  faCalendarAlt,
  faCreditCard,
  faCheck,
  faExchangeAlt,
  faFileInvoiceDollar,
  faWallet,
  faMobile,
  faBars // Añadir para el icono del menú en móvil
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import SideBar from './Sidebar';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';


// Register AG Grid modules
ModuleRegistry.registerModules([ClientSideRowModelModule]);

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const gridRef = useRef(null);
  const searchTimeout = useRef(null);
  const [jobsheets, setJobsheets] = useState([]);
  const [formData, setFormData] = useState({
  id: null,
  jobsheet_id: "",
  amount: "",
  method: "cash",
  payment_date: new Date().toLocaleDateString('en-GB').split('/').reverse().join('-')
});
const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
const [showDatePicker, setShowDatePicker] = useState(false);
const [methodFilter, setMethodFilter] = useState("");
const [showExitConfirmation, setShowExitConfirmation] = useState(false);
const [formChanged, setFormChanged] = useState(false);
const [isInteractingWithDatePicker, setIsInteractingWithDatePicker] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { 
    const checkDeviceAndOrientation = () => {
      const isMobileDevice = window.innerWidth <= 1024; // Considera tablets
      const isVerticalOrientation = window.innerHeight > window.innerWidth;
      setIsMobile(isMobileDevice);
      setIsVertical(isVerticalOrientation);
      setSidebarOpen(!isMobileDevice);
    };
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
    };
  }, []);
  
  const paymentMethods = ["cash", "paynow", "nets"];
  const API_URL = process.env.REACT_APP_API_URL;
    const columnDefs = useMemo(() => {
    // Columnas base para todas las vistas
    const baseColumns = [
      {
        headerName: 'ID',
        field: 'id',
        width: isMobile ? 70 : 80,
        suppressMenu: true,
        headerClass: 'custom-header-inventory'
      },
      {
        headerName: 'Amount',
        field: 'amount',
        suppressMenu: true,
        headerClass: 'custom-header-inventory',
        width: isMobile ? 100 : 120,
        cellRenderer: (params) => {
          return `$${parseFloat(params.value).toFixed(2)}`;
        }
      }
    ];
    
    // Columnas adicionales para escritorio o tablets horizontales
    const desktopColumns = [
      {
        headerName: 'Jobsheet',
        field: 'jobsheet_id',
        suppressMenu: true,
        width: isMobile ? 100 : 120,
        headerClass: 'custom-header-inventory',
        cellRenderer: (params) => {
          return `#${params.value}`;
        }
      },
      {
  headerName: 'Date',
  field: 'payment_date',
  suppressMenu: true,
  headerClass: 'custom-header-inventory',
  width: isMobile && !isVertical ? 100 : 120,
  cellRenderer: (params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
},
      {
        headerName: 'Method',
        field: 'method',
        suppressMenu: true,
        headerClass: 'custom-header-inventory',
        width: 100,
        cellRenderer: (params) => {
          // Use default method if value is undefined or not in our color map
          let method = params.value || 'cash';
          
          const colors = {
            cash: { bg: "#E3F2FD", text: "#0D47A1", icon: "#2196F3" },
            paynow: { bg: "#F3E5F5", text: "#4A148C", icon: "#9C27B0" },
            nets: { bg: "#E8F5E9", text: "#1B5E20", icon: "#4CAF50" }
          };
          
          // Check if method exists in our colors object, if not use 'cash'
          if (!colors[method]) {
            method = 'cash';
          }
          
          let icon;
          switch(method) {
            case 'cash':
              icon = <FontAwesomeIcon icon={faMoneyBill} />;
              break;
            case 'paynow':
              icon = <FontAwesomeIcon icon={faMobile} />;
              break;
            case 'nets':
              icon = <FontAwesomeIcon icon={faCreditCard} />;
              break;
            default:
              icon = <FontAwesomeIcon icon={faMoneyBill} />;
          }
          
          return (
            <div style={{
              height: "100%", // Fill the entire cell
              display: "flex",
              alignItems: "center", 
              justifyContent: "flex-start", // Changed to left-align
              paddingLeft: "12px" // Added left padding
            }}>
              <div style={{
                backgroundColor: colors[method].bg,
                color: colors[method].text,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                lineHeight: 0
              }}>
                {icon}
              </div>
            </div>
          );
        }
      },
      {
        headerName: 'Customer',
        field: 'customer_name',
        suppressMenu: true,
        headerClass: 'custom-header-inventory',
        hide: isMobile && isVertical
      },
    ];
    
    // Columna de acciones adaptada según el dispositivo
    const actionsColumn = {
      headerName: 'Actions',
      width: isMobile ? 120 : 160,
      cellRenderer: params => {
        if (!params.data) return '';
        return (
          <ActionButtonsContainer>
            <ActionButton
              icon={faEdit}
              onClick={() => handleEdit(params.data)}
              tooltip="Edit Payment"
              type="default"
            />
            <ActionButton
              icon={faTrash}
              onClick={() => handleDelete(params.data)}
              tooltip="Delete Payment" 
              type="danger"
            />
          </ActionButtonsContainer>
        );
      }
    };
    
    // En vista móvil vertical, mostrar menos columnas
    if (isMobile && isVertical) {
      return [...baseColumns, {
        headerName: 'Date',
        field: 'payment_date',
        suppressMenu: true,
        headerClass: 'custom-header-inventory',
        width: 100,
        cellRenderer: (params) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString('en-GB');
        }
      }, actionsColumn];
    }
    
    // Vista completa para desktop o tablets horizontales
    return [...baseColumns, ...desktopColumns, actionsColumn];
  }, [isMobile, isVertical]);
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};
  const handleModalClose = () => {
  if (formChanged) {
    setShowExitConfirmation(true);
  } else {
    setShowModal(false);
  }
};
useEffect(() => {
  let clickTimeout = null;
  
  function handleClickOutside(event) {
    const datePickerContainer = document.getElementById('date-picker-container');
    const isTargetDateInput = event.target.type === 'date';
    
    // Si el click fue dentro del contenedor o en un input de fecha, no cerramos
    if ((datePickerContainer && datePickerContainer.contains(event.target)) || 
        isTargetDateInput || 
        isInteractingWithDatePicker) {
      return;
    }
    
    // Si el datepicker está abierto y se hizo clic fuera, cerrarlo
    if (showDatePicker) {
      setShowDatePicker(false);
    }
  }

  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('touchstart', handleClickOutside);
  
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('touchstart', handleClickOutside);
    if (clickTimeout) clearTimeout(clickTimeout);
  };
}, [showDatePicker, isInteractingWithDatePicker]);

const showToast = (message, type = 'success') => {
  setNotification({
    show: true,
    message,
    type
  });
  
  setTimeout(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, 5000);
};
const fetchPayments = useCallback(async (filters = {}) => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    // Construir correctamente la cadena de consulta para filtros
    const params = new URLSearchParams();
    
    // Filtro de rango de fechas
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    
    // Filtro de método de pago
    if (filters.method) params.append('method', filters.method);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    console.log("Fetching payments with query:", queryString);

    // Realizar la solicitud con filtros
    const response = await fetch(`${API_URL}/jobsheets/payments${queryString}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
        const data = await response.json();
        
        // Get all unique jobsheet IDs from payments
        const jobsheetIds = [...new Set(data.map(payment => payment.jobsheet_id))];
        
        // Create a map of jobsheet data
        const jobsheetMap = {};
        
        // Fetch details for each jobsheet
        await Promise.all(jobsheetIds.map(async (id) => {
          try {
            const jobsheetResponse = await fetch(`${API_URL}/jobsheets/${id}`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (jobsheetResponse.ok) {
              const jobsheet = await jobsheetResponse.json();
              let determinedCustomerName = jobsheet.customer_name;

              if (!determinedCustomerName && jobsheet.customer && typeof jobsheet.customer === 'object') {
                determinedCustomerName = jobsheet.customer.name || `${jobsheet.customer.first_name || ''} ${jobsheet.customer.last_name || ''}`.trim();
              }

              if (!determinedCustomerName && jobsheet.customer_id) {
                try {
                  const customerApiUrl = `${API_URL}/customers/${jobsheet.customer_id}`;
                  const customerResponse = await fetch(customerApiUrl, {
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  if (customerResponse.ok) {
                    const customerData = await customerResponse.json();
                    if (customerData.name) {
                      determinedCustomerName = customerData.name;
                    } else if (customerData.first_name || customerData.last_name) {
                      determinedCustomerName = `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim();
                    } else {
                      determinedCustomerName = `Customer #${jobsheet.customer_id}`;
                    }
                  } else {
                    console.error(`Failed to fetch customer ${jobsheet.customer_id} for jobsheet ${id}. Status: ${customerResponse.status}`);
                    determinedCustomerName = `Customer #${jobsheet.customer_id}`; // Fallback if customer fetch fails
                  }
                } catch (custError) {
                  console.error(`Error fetching customer ${jobsheet.customer_id} for jobsheet ${id}:`, custError);
                  determinedCustomerName = `Customer #${jobsheet.customer_id}`; // Fallback on error
                }
              }
              
              jobsheetMap[id] = {
                customer_name: determinedCustomerName || 'Unknown Customer',
                vehicle_model: jobsheet.vehicle_model || jobsheet.vehicle?.model || 'Unknown Vehicle',
                plate_number: jobsheet.plate_number || jobsheet.vehicle?.plate_number || 'Unknown Plate'
              };
            }
          } catch (error) {
            console.error(`Error fetching jobsheet ${id}:`, error);
          }
        }));
        
        // Enhance each payment with customer info from jobsheet map
        const enhancedPayments = data.map(payment => ({
          ...payment,
          customer_name: jobsheetMap[payment.jobsheet_id]?.customer_name || 'Unknown Customer',
          vehicle_model: jobsheetMap[payment.jobsheet_id]?.vehicle_model,
          plate_number: jobsheetMap[payment.jobsheet_id]?.plate_number
        }));
        
        setPayments(enhancedPayments);
         } else {
      showToast("Failed to fetch payments", "error");
      setPayments([]);
    }
  } catch (error) {
    console.error("Network error fetching payments:", error);
    showToast("Error loading payments data", "error");
    setPayments([]);
  } finally {
    setLoading(false);
  }
}, [API_URL, showToast]);

const formatDateRange = () => {
  if (dateFilter.startDate && dateFilter.endDate) {
    return `${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`;
  } else if (dateFilter.startDate) {
    return `From ${formatDate(dateFilter.startDate)}`;
  } else if (dateFilter.endDate) {
    return `Up ${formatDate(dateFilter.endDate)}`;
  }
  return 'Filter by date';
};

const onGridReady = (params) => {
    gridRef.current = params.api;
    setTimeout(() => {
      if (gridRef.current && !gridRef.current.isDestroyed) {
        gridRef.current.sizeColumnsToFit();
      }
    }, 100);
  };  

  useEffect(() => {
    fetchPayments();
    fetchJobsheets();
    
    return () => {
      // Limpia la referencia de la grid al desmontar
      if (gridRef.current) {
        gridRef.current = null;
      }
      
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);
const applyFilters = useCallback(() => {
  setLoading(true);
  
  const filters = {};
  if (dateFilter.startDate) filters.startDate = dateFilter.startDate;
  if (dateFilter.endDate) filters.endDate = dateFilter.endDate;
  if (methodFilter) filters.method = methodFilter;
  
  fetchPayments(filters);
}, [dateFilter, methodFilter, fetchPayments]);
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchPayments(e.target.value);
    }, 500);
  };
  

  const fetchJobsheets = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      const response = await fetch(`${API_URL}/jobsheets`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        setJobsheets(data);
      } else {
        console.error("Failed to fetch jobsheets");
      }
    } catch (error) {
      console.error("Error fetching jobsheets:", error);
    }
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
        bottom: isMobile ? '40px' : '20px',
        right: isMobile ? '20px' : '20px',
        backgroundColor: type === 'error' ? '#D32F2F' : '#34A853',
        color: 'white',
        padding: isMobile ? '16px 24px' : '12px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 2000,
        maxWidth: isMobile ? '90%' : '400px',
        animation: 'slideIn 0.3s ease',
        fontSize: isMobile ? '16px' : '14px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: isMobile ? '36px' : '24px', 
          height: isMobile ? '36px' : '24px', 
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {type === 'success' ? (
            <FontAwesomeIcon icon={faCheck} style={{ fontSize: isMobile ? '16px' : '12px' }} />
          ) : (
            <FontAwesomeIcon icon={faTimes} style={{ fontSize: isMobile ? '16px' : '12px' }} />
          )}
        </div>
        <span style={{ fontWeight: '500', fontSize: isMobile ? '16px' : '14px' }}>{message}</span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: isMobile ? '24px' : '18px',
          opacity: 0.7,
          transition: 'opacity 0.2s',
          width: isMobile ? '44px' : '24px',
          height: isMobile ? '44px' : '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          position: 'absolute',
          top: '12px',
          right: '12px',
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = 1}
        onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
      >
        ×
      </button>
    </div>
  );
};


  const handleEdit = (payment) => {
    // Usa setTimeout para evitar conflictos con AG-Grid
    setTimeout(() => {
      setCurrentPayment(payment);
      setFormData({
        id: payment.id,
        jobsheet_id: payment.jobsheet_id,
        amount: payment.amount,
        method: payment.method,
        payment_date: new Date(payment.payment_date).toISOString().split('T')[0]
      });
      setShowModal(true);
    }, 50);
  };

  const handleDelete = (payment) => {
    setTimeout(() => {
      setCurrentPayment(payment);
      setShowDeleteModal(true);
    }, 50);
  };

  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      const response = await fetch(`${API_URL}/jobsheets/payments/${currentPayment.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchPayments(searchTerm);
        setShowDeleteModal(false);
      } else {
        console.error("Failed to delete payment");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const handleOpenNewModal = () => {
    // Usa setTimeout para romper el flujo sincrónico y evitar conflictos con AG-Grid
    setTimeout(() => {
      setCurrentPayment(null);
      setFormData({
        id: null,
        jobsheet_id: "",
        amount: "", // Quitamos el valor por defecto para que no aparezca el 0
        method: "cash",
        payment_date: new Date().toISOString().split('T')[0]
      });
      setShowModal(true);
    }, 50); // Un pequeño retraso es suficiente
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Para el campo de cantidad, permitir solo valores numéricos válidos
    if (name === 'amount') {
      // Si es una entrada válida numérica o está vacío, actualizar
      if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
      // No actualizar si la entrada no es válida
      return;
    }
    
    // Para otros campos, actualizar normalmente
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = async () => {
    // Cambiar validación y alertas por notificaciones visuales
    if (!formData.jobsheet_id) {
      setNotification({
        show: true,
        message: "Please select a job sheet",
        type: "error"
      });
      setTimeout(() => setNotification({show: false}), 3000);
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setNotification({
        show: true,
        message: "Please enter a valid amount greater than 0",
        type: "error"
      });
      setTimeout(() => setNotification({show: false}), 3000);
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      const url = formData.id
        ? `${API_URL}/jobsheets/payments/${formData.id}`
        : `${API_URL}/jobsheets/payments`;
        
      const method = formData.id ? "PUT" : "POST";
  
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
  
      if (response.ok) {
        fetchPayments(searchTerm);
        setShowModal(false);
      } else {
        console.error("Failed to save payment");
      }
    } catch (error) {
      console.error("Error saving payment:", error);
    }
  };

  // Componente DateRangeSelector mejorado para paymentsPage.js
const DateRangeSelector = () => {
  // Formato para mostrar fechas en DD/MM/YYYY
const formatDate = (date) => {
  if (!date) return "";
  try {
    const [year, month, day] = date.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return date;
  }
};
  
  // Verificar si el rango seleccionado es hoy
  const isToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return dateFilter.startDate === todayStr && dateFilter.endDate === todayStr;
  };
  
  // Mostrar correctamente el rango de fechas
  const displayDateRange = () => {
    if (!dateFilter.startDate && !dateFilter.endDate) {
      return "Filter by date";
    }
    
    if (isToday()) {
      return "Today";
    }
    
    if (dateFilter.startDate && dateFilter.endDate) {
      if (dateFilter.startDate === dateFilter.endDate) {
        return formatDate(dateFilter.startDate);
      }
      return `${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`;
    } else if (dateFilter.startDate) {
      return `From ${formatDate(dateFilter.startDate)}`;
    } else if (dateFilter.endDate) {
      return `Until ${formatDate(dateFilter.endDate)}`;
    }
  };
  
  return (
    <div id="date-picker-container" style={{
      position: 'relative',
      width: isMobile && isVertical ? '100%' : '220px'
    }}>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setShowDatePicker(!showDatePicker);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '12px 15px' : '10px 12px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          backgroundColor: '#F9FBFF',
          cursor: 'pointer',
          justifyContent: 'space-between',
          height: isMobile ? '46px' : '36px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#5932EA' }} />
          <span style={{ 
            fontSize: '14px', 
            color: (dateFilter.startDate || dateFilter.endDate) ? '#333' : '#999',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis' 
          }}>
            {displayDateRange()}
          </span>
        </div>
        {(dateFilter.startDate || dateFilter.endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDateFilter({ startDate: "", endDate: "" });
              setTimeout(() => applyFilters(), 0);
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              color: '#999',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        )}
      </div>
      
      
     {showDatePicker && (
  <div
    style={{
      position: "absolute",
      top: "45px",            
      left: "0",             
      zIndex: 1000,
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 2px 15px rgba(0,0,0,0.15)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      width: "280px", 
      maxWidth: isMobile ? "90%" : "280px"
    }}
          onMouseEnter={() => setIsInteractingWithDatePicker(true)}
          onMouseLeave={() => setIsInteractingWithDatePicker(false)}
          onTouchStart={() => setIsInteractingWithDatePicker(true)}
          onTouchEnd={() => setTimeout(() => setIsInteractingWithDatePicker(false), 300)}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '5px' 
          }}>
            <h3 style={{ 
              margin: '0', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#333' 
            }}>
              Filter by dates
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDatePicker(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#999',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#555' 
            }}>
              Start Date
            </label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon 
                icon={faCalendarAlt} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#5932EA',
                }}
              />
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, startDate: e.target.value }));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInteractingWithDatePicker(true);
                }}
                onBlur={() => setIsInteractingWithDatePicker(false)}
                style={{
                  width: "100%",
                  padding: '10px 12px 10px 35px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  fontSize: '14px',
                  backgroundColor: '#f9fbff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#555' 
            }}>
              End Date
            </label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon 
                icon={faCalendarAlt} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#5932EA',
                }}
              />
              <input
                type="date"
                value={dateFilter.endDate}
                min={dateFilter.startDate}
                onChange={(e) => {
                  setDateFilter(prev => ({ ...prev, endDate: e.target.value }));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInteractingWithDatePicker(true);
                }}
                onBlur={() => setIsInteractingWithDatePicker(false)}
                style={{
                  width: "100%",
                  padding: '10px 12px 10px 35px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  fontSize: '14px',
                  backgroundColor: '#f9fbff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '5px',
            gap: '10px' 
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Configurar para el día de hoy
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                setDateFilter({ startDate: todayStr, endDate: todayStr });
                setShowDatePicker(false);
                setTimeout(() => applyFilters(), 0);
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#333',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease',
                flex: '1'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            >
              Today
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDatePicker(false);
                setTimeout(() => applyFilters(), 0);
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#5932EA',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 6px rgba(89, 50, 234, 0.3)',
                transition: 'background-color 0.2s ease',
                flex: '1'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4321C9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5932EA'}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
     ); 
  };
  
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
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '30px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            padding: isMobile ? '16px' : '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile && isVertical ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile && isVertical ? 'stretch' : 'center',
              marginBottom: isMobile ? '15px' : '10px',
              gap: isMobile ? '10px' : '0'
            }}
          >
            {isMobile && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px' 
              }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px' }}>Payments</h2>
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#5932EA',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FontAwesomeIcon icon={faBars} size="lg" />
                  </button>
                )}
              </div>
            )}

            {!isMobile && <h2 style={{ margin: 0, fontSize: '18px' }}>Payments</h2>}

           <div style={{ 
  display: 'flex', 
  flexDirection: isMobile && isVertical ? 'column' : 'row', 
  gap: '10px', 
  alignItems: isMobile && isVertical ? 'stretch' : 'center',
  width: isMobile && isVertical ? '100%' : 'auto',
  marginBottom: '15px'
}}>
  {/* Reemplazar todo el div con id="date-picker-container" por: */}
  <DateRangeSelector />
  
  {/* Resto de elementos */}
  <div style={{
    position: 'relative',
    width: isMobile && isVertical ? '100%' : '180px'
  }}>
    <select
      value={methodFilter}
      onChange={(e) => {
        setMethodFilter(e.target.value);
        // Aplicar filtros inmediatamente después de actualizar el estado
        setTimeout(() => {
          const filters = {};
          if (dateFilter.startDate) filters.startDate = dateFilter.startDate;
          if (dateFilter.endDate) filters.endDate = dateFilter.endDate;
          if (e.target.value) filters.method = e.target.value;
          
          fetchPayments(filters);
        }, 0);
      }}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        backgroundColor: '#F9FBFF',
        appearance: 'none',
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%235932EA\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 9L12 15L18 9\"/></svg>')",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        fontSize: '14px'
      }}
    >
      <option value="">All payment methods</option>
      <option value="cash">Cash</option>
      <option value="paynow">PayNow</option>
      <option value="nets">NETS</option>
    </select>
</div>
              <button
                onClick={handleOpenNewModal}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  padding: isMobile ? '14px 20px' : '10px 20px',
                  backgroundColor: isHovered ? '#4321C9' : '#5932EA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: isMobile ? '16px' : 'inherit',
                  width: isMobile && isVertical ? '100%' : 'auto',
                  justifyContent: isMobile && isVertical ? 'center' : 'flex-start'
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add Payment</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <div 
              className="ag-theme-alpine inventory-view touch-enabled-grid" 
              style={{ 
                width: '100%', 
                height: '100%',
                overflowX: 'auto',
                overflowY: 'auto',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.3s ease',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={payments}
                columnDefs={columnDefs}
                defaultColDef={{
                  resizable: false,
                  sortable: true,
                  suppressMenu: true,
                  flex: 1,
                  minWidth: isMobile ? 90 : 100,
                  cellClass: isMobile ? 'touch-cell' : '',
                  cellStyle: {
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '12px',
                    fontSize: isMobile ? '14px' : '14px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    color: '#333'
                  }
                }}
                modules={[ClientSideRowModelModule]}
                pagination={true}
                paginationPageSize={isMobile ? 7 : 12}
                headerHeight={isMobile ? 50 : 30}
                rowHeight={isMobile ? 65 : 50}
                suppressSizeToFit={true}
                suppressHorizontalScroll={false}
                suppressMenuHide={true}
                suppressLoadingOverlay={true}
                onGridReady={onGridReady}
              />
            </div>
            {loading && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(0, 0, 0, 0.1)',
                    borderLeft: '4px solid #4321C9',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                ></div>
              </div>
            )}
          </div>

          {showModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
                backdropFilter: "blur(5px)",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  width: isMobile ? "90%" : "520px",
                  maxHeight: isMobile ? "90%" : "90%",
                  overflowY: "auto",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #5932EA 0%, #4321C9 100%)",
                    padding: isMobile ? "20px" : "24px 30px",
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
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <FontAwesomeIcon icon={faMoneyBill} style={{ fontSize: '24px' }}/>
                        <h2 style={{ margin: 0, fontSize: isMobile ? "18px" : "22px", fontWeight: "600" }}>
                          {currentPayment ? "Edit Payment" : "Add Payment"}
                        </h2>
                      </div>
                      <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
                        {currentPayment 
                          ? `Payment #${currentPayment.id} for jobsheet #${currentPayment.jobsheet_id}`
                          : "Record a new payment for a jobsheet"}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
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
                        position: "relative",
                        zIndex: 10,   
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div style={{ padding: isMobile ? "20px" : "24px 30px" }}>
                  <div style={{ display: "grid", gap: "20px" }}>
                    <div>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Select Jobsheet
                      </label>
                      <div style={{
                        position: "relative",
                        backgroundColor: "#f9faff",
                        borderRadius: "10px",
                        border: "1px solid #e0e0e0",
                        overflow: "hidden",
                      }}>
                        <select
                          name="jobsheet_id"
                          value={formData.jobsheet_id}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "14px 16px",
                            fontSize: isMobile ? "16px" : "14px", // Agrandar para evitar zoom en móviles
                            border: "none",
                            backgroundColor: "transparent",
                            appearance: "none",
                            outline: "none",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">Select a jobsheet</option>
                          {jobsheets.map((jobsheet) => (
                            <option key={jobsheet.id} value={jobsheet.id}>
                              #{jobsheet.id} - {jobsheet.customer_name || "Customer"} ({jobsheet.vehicle_model || "Vehicle"})
                            </option>
                          ))}
                        </select>
                        <div style={{
                          position: "absolute",
                          right: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                          color: "#5932EA"
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Payment Amount
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{
                          position: "absolute",
                          left: "16px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#666",
                          fontSize: "16px",
                          fontWeight: "500"
                        }}>$</span>
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          style={{
                            width: "100%",
                            padding: "14px 16px 14px 28px",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                            fontSize: isMobile ? "16px" : "14px",
                            backgroundColor: "#f9fbff",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Payment Method
                      </label>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "10px"
                      }}>
                        {paymentMethods.map((method) => (
                          <div 
                            key={method}
                            onClick={() => setFormData({...formData, method})}
                            style={{
                              padding: isMobile ? "12px 10px" : "10px",
                              borderRadius: "10px",
                              border: `1px solid ${formData.method === method ? "#5932EA" : "#e0e0e0"}`,
                              backgroundColor: formData.method === method ? "#f5f3ff" : "white",
                              cursor: "pointer",
                              textAlign: "center",
                              transition: "all 0.2s ease",
                            }}
                            onMouseOver={(e) => {
                              if(formData.method !== method) {
                                e.currentTarget.style.backgroundColor = "#fafafa";
                                e.currentTarget.style.borderColor = "#d0d0d0";
                              }
                            }}
                            onMouseOut={(e) => {
                              if(formData.method !== method) {
                                e.currentTarget.style.backgroundColor = "white";
                                e.currentTarget.style.borderColor = "#e0e0e0";
                              }
                            }}
                          >
                            <div style={{
                              fontSize: isMobile ? "14px" : "13px",
                              fontWeight: formData.method === method ? "600" : "500",
                              color: formData.method === method ? "#5932EA" : "#555",
                              textTransform: "capitalize"
                            }}>
                              {method}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Payment Date
                      </label>
                      <div style={{ position: "relative" }}>
                        <FontAwesomeIcon 
                          icon={faCalendarAlt} 
                          style={{
                            position: "absolute",
                            left: "16px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#5932EA",
                          }}
                        />
                        <input
                          type="date"
                          name="payment_date"
                          value={formData.payment_date}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "14px 16px 14px 40px",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                            fontSize: isMobile ? "16px" : "14px",
                            backgroundColor: "#f9fbff",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    flexDirection: isMobile && isVertical ? "column" : "row",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginTop: "30px"
                  }}>
                    <button
                      onClick={() => setShowModal(false)}
                      style={{
                        padding: "12px 20px",
                        backgroundColor: "#f5f5f5",
                        color: "#333",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                        width: isMobile && isVertical ? "100%" : "auto",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e5e5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: "12px 24px",
                        backgroundColor: "#5932EA",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "600",
                        boxShadow: "0 2px 6px rgba(89, 50, 234, 0.3)",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isMobile && isVertical ? "center" : "space-between",
                        gap: "8px",
                        width: isMobile && isVertical ? "100%" : "auto",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                    >
                      {currentPayment ? "Update Payment" : "Save Payment"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showExitConfirmation && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(3px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1100,
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        width: "95%",
        maxWidth: "400px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #eee",
          padding: "20px 24px",
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>
          Discard Changes?
        </h3>
        <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
          You have unsaved changes. Are you sure you want to close without saving?
        </p>
      </div>
      
      <div style={{ padding: "16px 24px 24px" }}>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowExitConfirmation(false)}
            style={{
              padding: "10px 16px",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowExitConfirmation(false);
              setShowModal(false);
              setFormChanged(false);
            }}
            style={{
              padding: "10px 16px",
              backgroundColor: "#D32F2F",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  </div>
)}

          {/* Modal de eliminación adaptado para móvil */}
          {showDeleteModal && (
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
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  width: isMobile ? "85%" : "400px",
                  overflow: "hidden",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #FF4D4F 0%, #D32F2F 100%)",
                    padding: isMobile ? "20px" : "20px 24px",
                    color: "white",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Confirm Delete</h3>
                </div>
                
                <div style={{ padding: isMobile ? "20px" : "20px 24px" }}>
                  <p style={{ margin: "0 0 20px 0", fontSize: "14px", lineHeight: "1.5" }}>
                    Are you sure you want to delete this payment of <strong>${parseFloat(currentPayment?.amount).toFixed(2)}</strong> for jobsheet #{currentPayment?.jobsheet_id}?
                    <br /><br />
                    This action cannot be undone.
                  </p>
                  
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile && isVertical ? "column" : "row",
                      justifyContent: "flex-end",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#f5f5f5",
                        color: "#333",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                        width: isMobile && isVertical ? "100%" : "auto",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e5e5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#FF4D4F",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 6px rgba(255, 77, 79, 0.3)",
                        width: isMobile && isVertical ? "100%" : "auto",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#D32F2F"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#FF4D4F"}
                    >
                      Delete Payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notificación adaptativa */}
          {notification.show && (
            <div
              style={{
                position: "fixed",
                bottom: isMobile ? "10px" : "20px",
                right: isMobile ? "10px" : "20px",
                backgroundColor: notification.type === "error" ? "#FF4D4F" : "#5932EA",
                color: "white",
                padding: isMobile ? "12px 16px" : "10px 20px",
                borderRadius: "8px",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                zIndex: 1000,
                animation: "fadeIn 0.3s ease",
                fontSize: isMobile ? "14px" : "inherit",
                maxWidth: isMobile ? "85%" : "280px"
              }}
            >
              {notification.message}
            </div>
          )}

          {/* Estilos CSS adaptados para móviles */}
          <style>
            {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
             @keyframes slideIn {
      from { transform: translateX(30px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }

            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            /* Estilos touch-friendly */
            .touch-enabled-grid {
              -webkit-overflow-scrolling: touch !important;
              overflow-scrolling: touch !important;
              scroll-behavior: smooth !important;
              overscroll-behavior: contain !important;
            }
            
            .touch-cell {
              padding: 16px 8px !important;
            }
            
            /* Estilos para AG Grid */
            .ag-theme-alpine {
              --ag-header-height: ${isMobile ? "50px" : "30px"};
              --ag-row-height: ${isMobile ? "65px" : "50px"};
              --ag-header-foreground-color: #333;
              --ag-header-background-color: #F9FBFF;
              --ag-odd-row-background-color: #fff;
              --ag-row-border-color: rgba(0, 0, 0, 0.1);
              --ag-cell-horizontal-padding: ${isMobile ? "16px" : "12px"};
              --ag-borders: none;
              --ag-font-size: ${isMobile ? "15px" : "14px"};
              --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            

            
            .ag-theme-alpine .ag-cell {
              display: flex;
              align-items: center;
            }
            

            @media (pointer: coarse) {
              ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              
              ::-webkit-scrollbar-thumb {
                background-color: rgba(89, 50, 234, 0.5);
                border-radius: 6px;
              }
              
              ::-webkit-scrollbar-track {
                background-color: rgba(0, 0, 0, 0.05);
              }
              
              input, select, button {
                font-size: 16px !important;
              }
              
              .ag-theme-alpine .ag-header-cell {
                padding: 0 5px !important;
              }
              
              .ag-theme-alpine .ag-cell {
                padding: 10px 5px !important;
              }
            }
            `}
          </style>
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

export default PaymentsPage;