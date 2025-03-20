import React, { useEffect, useState, useRef, useCallback } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { ModuleRegistry } from "@ag-grid-community/core";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faSearch, faFileInvoice } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

// Registrar módulos de AG Grid
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

  // Métodos de pago disponibles
  const paymentMethods = ["cash", "credit_card", "debit_card", "transfer", "check", "other"];

  // Definiciones de columnas para AG Grid
  const columnDefs = [
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
        return date.toLocaleDateString();
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
      cellRenderer: (params) => {
        const method = params.value || 'cash';
        return (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={{
              backgroundColor: method === "cash" ? "#E3F2FD" : 
                              method === "credit_card" ? "#F3E5F5" : 
                              method === "debit_card" ? "#E8F5E9" : 
                              method === "transfer" ? "#FFF8E1" : 
                              method === "check" ? "#FFEBEE" : "#ECEFF1",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "capitalize"
            }}>
              {method.replace('_', ' ')}
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
      field: 'actions',
      suppressMenu: true,
      width: 120,
      headerClass: 'custom-header-sumary',
      cellRenderer: (params) => {
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button 
              className="edit-btn"
              style={{
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: '#5932EA'
              }}
              onClick={() => handleEdit(params.data)}
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button 
              className="delete-btn"
              style={{
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: '#d32f2f'
              }}
              onClick={() => handleDelete(params.data)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        );
      }
    }
  ];

  // Configuración predeterminada de columnas
  const defaultColDef = {
    resizable: true,
    sortable: true,
    suppressMenu: true,
  };

  // Función para manejar el evento onGridReady
  const onGridReady = (params) => {
    gridRef.current = params.api;
    params.api.sizeColumnsToFit();
  };

  // Cargar pagos y jobsheets al montar el componente
  useEffect(() => {
    fetchPayments();
    fetchJobsheets();
  }, []);

  // Función para buscar pagos
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchPayments(e.target.value);
    }, 500);
  };

  // Función para obtener todos los pagos con filtros opcionales
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      console.log("Fetching payments from /jobsheets/payments");
      
      const response = await fetch("http://localhost:3000/jobsheets/payments", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const text = await response.text();
        console.log("Raw response:", text);
        
        try {
          const data = JSON.parse(text);
          console.log("Parsed payments data:", data);
          setPayments(data || []);
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      } else {
        console.error("Failed to fetch payments, status:", response.status);
        // Intentar leer el mensaje de error
        const errorText = await response.text();
        console.error("Error response:", errorText);
      }
    } catch (error) {
      console.error("Network error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener datos de jobsheets para el selector de jobsheets
  const fetchJobsheets = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      // Cambiamos la URL para obtener jobsheets, no pagos
      const response = await fetch("http://localhost:3000/jobsheets", {
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

  // Función para editar un pago
  const handleEdit = (payment) => {
    setCurrentPayment(payment);
    setFormData({
      id: payment.id,
      jobsheet_id: payment.jobsheet_id,
      amount: payment.amount,
      method: payment.method,
      payment_date: new Date(payment.payment_date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  // Función para eliminar un pago
  const handleDelete = (payment) => {
    setCurrentPayment(payment);
    setShowDeleteModal(true);
  };

  // Función para confirmar la eliminación
  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      const response = await fetch(`http://localhost:3000/jobsheets/payments/${currentPayment.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Actualizar la lista tras el borrado
        fetchPayments(searchTerm);
        setShowDeleteModal(false);
      } else {
        console.error("Failed to delete payment");
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  // Función para abrir modal para un nuevo pago
  const handleOpenNewModal = () => {
    setCurrentPayment(null);
    setFormData({
      id: null,
      jobsheet_id: "",
      amount: "",
      method: "cash",
      payment_date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  // Función para manejar cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Función para guardar un pago (crear o actualizar)
  const handleSave = async () => {
    // Validación básica
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
  
      // Corregir las URLs para apuntar a las rutas de jobsheets/payments
      const url = formData.id
        ? `http://localhost:3000/jobsheets/payments/${formData.id}`
        : "http://localhost:3000/jobsheets/payments";
        
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
        // Actualizar la lista tras la operación
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
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              width: "300px",
            }}
          >
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={handleSearch}
              style={{
                width: "100%",
                padding: "10px 35px 10px 15px",
                borderRadius: "5px",
                border: "1px solid #ddd",
                fontSize: "14px",
              }}
            />
            <FontAwesomeIcon
              icon={faSearch}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: loading ? "#4321C9" : "gray",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
        
        <button
          onClick={handleOpenNewModal}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            padding: "10px 20px",
            backgroundColor: isHovered ? "#4321C9" : "#5932EA",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
        >
          Add Payment
        </button>
      </div>

      {/* Grid with loading indicator */}
      <div style={{ height: "calc(100vh - 180px)", width: "100%", position: "relative" }}>
        <div
          className="ag-theme-alpine"
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid #ddd",
            borderRadius: "5px",
            overflow: "hidden",
            opacity: loading ? 0.6 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={payments}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            modules={[ClientSideRowModelModule]}
            pagination={true}
            paginationPageSize={12}
            headerHeight={30}
            rowHeight={40}
            onGridReady={onGridReady}
            domLayout={'autoHeight'}
            suppressMenuHide={true} 
            suppressRowTransform={true} 
            suppressColumnVirtualisation={false} 
            ensureDomOrder={true} 
          />
        </div>
        {loading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(0, 0, 0, 0.1)",
                borderLeft: "4px solid #4321C9",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "500px",
              padding: "20px",
              boxShadow: "0 0 10px rgba(0,0,0,0.2)",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                {currentPayment ? "Edit Payment" : "Create New Payment"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  lineHeight: "1",
                }}
              >
                &times;
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Jobsheet:
                </label>
                <select
                  name="jobsheet_id"
                  value={formData.jobsheet_id}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="">Select Jobsheet</option>
                  {jobsheets.map((jobsheet) => (
                    <option key={jobsheet.id} value={jobsheet.id}>
                      #{jobsheet.id} - {jobsheet.customer_name} ({jobsheet.vehicle_model})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Amount:
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ 
                    position: "absolute", 
                    left: "10px", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    color: "#666"
                  }}>
                    $
                  </span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 8px 8px 25px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                    }}
                    step="0.01"
                    min="0.01"
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Payment Method:
                </label>
                <select
                  name="method"
                  value={formData.method}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Payment Date:
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f5f5f5",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  marginRight: "10px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#5932EA",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {currentPayment ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "400px",
              padding: "20px",
              boxShadow: "0 0 10px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Confirm Delete</h3>
            <p>
              Are you sure you want to delete this payment of ${parseFloat(currentPayment?.amount).toFixed(2)} for jobsheet #{currentPayment?.jobsheet_id}? This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f5f5f5",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ff4d4f",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
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
        `}
      </style>
    </>
  );
};

export default PaymentsPage;