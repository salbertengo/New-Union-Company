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
  faSearch, 
  faPlus,
  faMoneyBill,
  faCalendarAlt,
  faCreditCard,
  faIdCard,
  faExchangeAlt,
  faFileInvoiceDollar,
  faWallet,
  faMobile // Add this import
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
  const gridRef = useRef(null);
  const searchTimeout = useRef(null);
  const [jobsheets, setJobsheets] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    jobsheet_id: "",
    amount: "",
    method: "cash",
    payment_date: new Date().toISOString().split('T')[0]
  });

  const paymentMethods = ["cash", "paynow", "nets"];
  const API_URL = process.env.REACT_APP_API_URL;
  const columnDefs = useMemo(() => [
    {
      headerName: 'ID',
      field: 'id',
      width: 80,
      suppressMenu: true,
      headerClass: 'custom-header-sumary'
    },
    {
      headerName: 'Jobsheet',
      field: 'jobsheet_id',
      suppressMenu: true,
      headerClass: 'custom-header-sumary',
      cellRenderer: (params) => {
        return `#${params.value}`;
      }
    },
{
  headerName: 'Date',
  field: 'payment_date',
  suppressMenu: true,
  headerClass: 'custom-header-sumary',
  cellRenderer: (params) => {
    if (!params.value) return '';
    const date = new Date(params.value);
    // Cambiar al formato DD/MM/YYYY usando la localización en-GB
    return date.toLocaleDateString('en-GB');
  }
},
    {
      headerName: 'Amount',
      field: 'amount',
      suppressMenu: true,
      headerClass: 'custom-header-sumary',
      cellRenderer: (params) => {
        return `$${parseFloat(params.value).toFixed(2)}`;
      }
    },
    {
      headerName: 'Method',
      field: 'method',
      suppressMenu: true,
      headerClass: 'custom-header-sumary',
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
            icon = <FontAwesomeIcon icon={faMobile} />; // Add import for faMobile
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
      headerClass: 'custom-header-sumary'
    },
    {
      headerName: 'Actions',
      width: 160,
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
    }
  ], []);

  
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchPayments(e.target.value);
    }, 500);
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      // First get all payments
      const response = await fetch(`${API_URL}/jobsheets/payments`, {
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
        console.error("Failed to fetch payments");
        setPayments([]);
      }
    } catch (error) {
      console.error("Network error fetching payments:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

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
        amount: "",
        method: "cash",
        payment_date: new Date().toISOString().split('T')[0]
      });
      setShowModal(true);
    }, 50); // Un pequeño retraso es suficiente
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = async () => {
    if (!formData.jobsheet_id || !formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please fill in all required fields with valid values");
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
      <div
        style={{
          width: '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <SideBar />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          boxSizing: 'border-box',
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
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '18px' }}>Payments</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                }}>
                  <input
                    type="text"
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={handleSearch}
                    style={{
                      padding: '5px 30px 5px 10px',
                      width: '216px',
                      borderRadius: '10px',
                      border: '1px solid white',
                      backgroundColor: '#F9FBFF',
                      height: '25px',
                    }}
                  />
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: loading ? '#4321C9' : 'gray',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleOpenNewModal}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isHovered ? '#4321C9' : '#5932EA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add Payment</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <div 
  className="ag-theme-alpine inventory-view" 
  style={{ 
    width: '100%', 
    height: '100%',
    overflowX: 'hidden',
    overflowY: 'auto',
    opacity: loading ? 0.6 : 1,
    transition: 'opacity 0.3s ease',
  }}
            >
  <AgGridReact
    key={`payments-grid-${showModal ? 'hidden' : 'visible'}`}
    ref={gridRef}
    rowData={payments}
    columnDefs={columnDefs}
    defaultColDef={{
      resizable: false,
      sortable: true,
      suppressMenu: true, // Crítico para evitar el error
      flex: 1,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
        fontSize: '14px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#333'
      },
      headerClass: 'custom-header'
    }}
    modules={[ClientSideRowModelModule]}
    pagination={true}
    paginationPageSize={12}
    headerHeight={30}
    rowHeight={50}
    suppressSizeToFit={true}
    suppressHorizontalScroll={true}
    suppressMenuHide={true} // Añadir esta propiedad
    suppressLoadingOverlay={true} // Gestiona tu propio estado de carga
    onGridReady={onGridReady}
    // Ocultar temporalmente la grid cuando el modal está abierto
    style={{ display: showModal ? 'none' : 'block' }}
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
                  width: "520px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  overflow: "hidden",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
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
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <FontAwesomeIcon icon={faMoneyBill} style={{ fontSize: '24px' }}/>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
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

                <div style={{ padding: "24px 30px" }}>
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
                            fontSize: "14px",
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
                            fontSize: "14px",
                            backgroundColor: "#f9faff",
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
                              padding: "10px",
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
                              fontSize: "13px",
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
                            fontSize: "14px",
                            backgroundColor: "#f9faff",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
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
                        transition: "all 0.2s"
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
                        gap: "8px"
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
                  width: "400px",
                  overflow: "hidden",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #FF4D4F 0%, #D32F2F 100%)",
                    padding: "20px 24px",
                    color: "white",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Confirm Delete</h3>
                </div>
                
                <div style={{ padding: "20px 24px" }}>
                  <p style={{ margin: "0 0 20px 0", fontSize: "14px", lineHeight: "1.5" }}>
                    Are you sure you want to delete this payment of <strong>${parseFloat(currentPayment?.amount).toFixed(2)}</strong> for jobsheet #{currentPayment?.jobsheet_id}?
                    <br /><br />
                    This action cannot be undone.
                  </p>
                  
                  <div
                    style={{
                      display: "flex",
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

          <style>
            {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            
            /* Uniform styles for AG Grid */
.ag-theme-alpine {
  --ag-header-height: 30px;
  --ag-row-height: 50px;
  --ag-header-foreground-color: #333;
  --ag-header-background-color: #F9FBFF;
  --ag-odd-row-background-color: #fff;
  --ag-row-border-color: rgba(0, 0, 0, 0.1);
  --ag-cell-horizontal-padding: 12px;
  --ag-borders: none;
  --ag-font-size: 14px;
  --ag-font-family: Poppins, sans-serif; /* Usa la fuente principal de la aplicación */
}

/* Estilo de encabezado unificado */
.ag-theme-alpine .ag-header {
  border-bottom: 1px solid #5932EA;
}

.ag-theme-alpine .ag-cell {
  display: flex;
  align-items: center;
}

/* Una única clase de cabecera para todas las tablas */
.custom-header {
  background-color: #F9FBFF !important;
  font-weight: 600 !important;
  color: #333 !important;
  border-bottom: 1px solid #5932EA !important;
  text-align: left !important;
  padding-left: 12px !important;
}


            `}
          </style>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;