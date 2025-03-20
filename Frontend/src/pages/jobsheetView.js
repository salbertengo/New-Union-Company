import React, { useEffect, useState, useRef, useCallback } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { ModuleRegistry } from "@ag-grid-community/core";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faSearch } from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const JobsheetView = () => {
  const [jobsheets, setJobsheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [currentJobsheet, setCurrentJobsheet] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const gridRef = useRef(null);
  const searchTimeout = useRef(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const customerSearchTimeout = useRef(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [jobsheetItems, setJobsheetItems] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [newItem, setNewItem] = useState({
  name: "",
  quantity: 1,
  price: 0,
  product_id: null 
});
  // Form data state for creating/editing jobsheets
  const [formData, setFormData] = useState({
    customer_id: "",
    vehicle_id: "",
    description: "",
    state: "pending",
    date_created: new Date().toISOString().split("T")[0],
  });

 // Reemplaza tu definición de columnDefs con esta versión completamente actualizada
const columnDefs = [
  { 
    headerName: 'ID', 
    field: 'id', 
    width: 80,
    suppressMenu: true,
    headerClass: 'custom-header-sumary' 
  },
  { 
    headerName: 'Customer', 
    field: 'customer_name',
    suppressMenu: true,
    headerClass: 'custom-header-sumary'
  },
  { 
    headerName: 'Model', 
    field: 'vehicle_model', 
    suppressMenu: true,
    headerClass: 'custom-header-sumary' 
  },
  // Reemplaza el columnDef para license_plate con este:
  // Reemplaza el cellRenderer para license_plate con este:
{ 
  headerName: 'Plate', 
  field: 'license_plate',
  suppressMenu: true,
  headerClass: 'custom-header-sumary',
  width: 120,
  cellRenderer: (params) => {
    if (!params.data) return null;
    
    // Formato para placas: dos letras, cuatro números, una letra
    let plate = params.value || 'AB1234C';
    
    // Asegurarse de que tenga formato argentino
    if (!/^[A-Z]{2}\d{4}[A-Z]$/.test(plate)) {
      // Intentar formatear la placa existente
      const parts = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (parts.length >= 7) {
        const letters = parts.replace(/[^A-Z]/g, '');
        const numbers = parts.replace(/[^0-9]/g, '');
        
        if (letters.length >= 3 && numbers.length >= 4) {
          plate = `${letters.substring(0, 2)}${numbers.substring(0, 4)}${letters.substring(2, 3)}`;
        }
      } 
    }
    
    // Dividir la placa: dos letras arriba, los números y la letra restante abajo
    const topPart = plate.substring(0, 2);
    const bottomPart = plate.substring(2);
    
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '54px',
          height: '32px',
          backgroundColor: 'black',
          border: '1px solid #444',
          borderRadius: '3px',
          display: 'grid',
          gridTemplateRows: '40% 60%',
          overflow: 'hidden'
        }}>
          <div style={{
            color: 'white',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '13px',
            textAlign: 'center',
            borderBottom: '1px solid #444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {topPart}
          </div>
          <div style={{
            color: 'white',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '13px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {bottomPart}
          </div>
        </div>
      </div>
    );
  }
},
  { 
    headerName: 'Created', 
    field: 'created_at',
    suppressMenu: true,
    headerClass: 'custom-header-sumary',
    cellRenderer: (params) => {
      if (!params.data.created_at) return '—';
      const date = new Date(params.data.created_at);
      return date.toLocaleDateString();
    }
  },
  { 
    headerName: 'State', 
    field: 'state', 
    suppressMenu: true,
    headerClass: 'custom-header-sumary',
    cellRenderer: (params) => {
      const state = params.data.state || 'pending';
      let color = '#FF9500';
      
      if (state === 'completed') color = '#00C853';
      else if (state === 'in progress') color = '#2979FF';
      else if (state === 'cancelled') color = '#F44336';
      
      return (
        <button 
          className="status-btn"
          data-id={params.data.id}
          data-status={state}
          style={{
            backgroundColor: `${color}20`,
            color: color,
            border: `1px solid ${color}40`,
            borderRadius: '12px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            textTransform: 'capitalize',
            minWidth: '90px'
          }}
          onClick={() => handleStatusChange(params.data.id, state)}
        >
          {state.charAt(0).toUpperCase() + state.slice(1)}
        </button>
      );
    }
  },
  {
    headerName: 'Items',
    field: 'items',
    suppressMenu: true,
    width: 120,
    headerClass: 'custom-header-sumary',
    cellRenderer: (params) => {
      return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button 
            className="items-btn"
            style={{
              border: 'none',
              backgroundColor: '#5932EA20',
              color: '#5932EA',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onClick={() => handleOpenItemsModal(params.data)}
          >
            Manage Items
          </button>
        </div>
      );
    }
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

  const defaultColDef = {
    resizable: true,
    sortable: true,
    suppressMenu: true,
  };

  const onGridReady = (params) => {
    gridRef.current = params.api;
  };

  const fetchJobsheets = useCallback(async (search = "", status = "all") => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      setLoading(false);
      return;
    }
  
    try {
      // Construir URL con parámetros
      let url = "http://localhost:3000/jobsheets";
      const params = [];
      
      if (search) {
        params.push(`search=${encodeURIComponent(search)}`);
      }
      
      if (status && status !== "all") {
        params.push(`state=${encodeURIComponent(status)}`);  
      }
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      
      console.log("Solicitando URL:", url);
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const jobsheetData = await response.json();
        console.log("Datos recibidos:", jobsheetData);
        
        // IMPORTANTE: Ya no necesitamos transformar los datos, usamos los del backend directamente
        setJobsheets(jobsheetData);
      } else {
        const errorText = await response.text();
        console.error("Error del servidor:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error en fetchJobsheets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  
const StatusFilterButton = () => {
  const statuses = ["all", "pending", "in progress", "completed", "cancelled"];
  
  const nextStatus = () => {
    const currentIndex = statuses.indexOf(statusFilter);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatusFilter(statuses[nextIndex]);
    fetchJobsheets(searchTerm, statuses[nextIndex]);
  };

  let color = '#666';
  if (statusFilter === 'pending') color = '#FF9500';
  else if (statusFilter === 'completed') color = '#00C853';
  else if (statusFilter === 'in progress') color = '#2979FF';
  else if (statusFilter === 'cancelled') color = '#F44336';

  return (
    <button 
      onClick={nextStatus}
      style={{
        backgroundColor: statusFilter === 'all' ? '#f0f0f0' : `${color}20`,
        color: statusFilter === 'all' ? '#333' : color,
        border: `1px solid ${statusFilter === 'all' ? '#ddd' : `${color}40`}`,
        borderRadius: '5px',
        padding: '10px 15px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        textTransform: 'capitalize',
        marginLeft: '10px'
      }}
    >
      {statusFilter === 'all' ? 'All States' : statusFilter}
    </button>
  );
};
  
  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setShowCustomerResults(true);

    // Clear previous timeout
    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }

    // Set new timeout for search
    customerSearchTimeout.current = setTimeout(async () => {
      if (value.trim() === "") {
        setFilteredCustomers([]);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      try {
        // Use the correct endpoint - this matches what your backend expects
        const response = await fetch(
          `http://localhost:3000/customers?search=${encodeURIComponent(value)}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const results = await response.json();
          console.log("Customer search results:", results);
          setFilteredCustomers(results);

          // Make sure the results dropdown is shown
          setShowCustomerResults(true);
        } else {
          console.error("Error searching customers:", response.status);

          // Fallback: filter locally from already loaded customers
          const searchTermLower = value.toLowerCase();
          const filtered = customers.filter((customer) => {
            const fullName = `${customer.first_name || ""} ${
              customer.last_name || ""
            }`.toLowerCase();
            return fullName.includes(searchTermLower);
          });
          setFilteredCustomers(filtered);
        }
      } catch (error) {
        console.error("Error searching customers:", error);

        // Fallback: filter locally from already loaded customers
        const searchTermLower = value.toLowerCase();
        const filtered = customers.filter((customer) => {
          const fullName = `${customer.first_name || ""} ${
            customer.last_name || ""
          }`.toLowerCase();
          return fullName.includes(searchTermLower);
        });
        setFilteredCustomers(filtered);
      }
    }, 300);
  };

  const handleSelectCustomer = (customer) => {
    // Update form data with customer ID
    setFormData({
      ...formData,
      customer_id: customer.id,
      vehicle_id: "", // Reset vehicle when customer changes
    });

    // Handle different customer object structures
    let customerDisplayName = "Unknown Customer";

    // Try to get the name based on possible object structures
    if (customer.name) {
      // If customer has a single name field
      customerDisplayName = customer.name;
    } else if (customer.first_name || customer.last_name) {
      // If customer has separate first_name/last_name fields
      customerDisplayName = `${customer.first_name || ""} ${
        customer.last_name || ""
      }`.trim();
    }

    setSelectedCustomerName(customerDisplayName);
    setShowCustomerResults(false);
    setCustomerSearchTerm("");

    fetchVehicles(customer.id);

    console.log("Selected customer:", customer);
  };

  const handleEdit = (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setFormData({
      customer_id: jobsheet.customer_id,
      vehicle_id: jobsheet.vehicle_id,
      description: jobsheet.description || "",
      state: jobsheet.state || "pending",
      date_created: jobsheet.date_created?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
    });
  
    setSelectedCustomerName(jobsheet.customer_name || "");
  
    fetchVehicles(jobsheet.customer_id);
    setShowModal(true);
  };

  // Update handleOpenNewModal to clear selected customer
  const handleOpenNewModal = () => {
    setCurrentJobsheet(null);
    setFormData({
      customer_id: "",
      vehicle_id: "",
      description: "",
      state: "pending",
      date_created: new Date().toISOString().split("T")[0],
    });
    setSelectedCustomerName("");
    setCustomerSearchTerm("");
    setShowModal(true);
  };
  const getPaymentStatus = (jobsheet) => {
    if (!jobsheet.total_amount) return "No Items";
    if (!jobsheet.amount_paid) return "Unpaid";
    if (jobsheet.amount_paid >= jobsheet.total_amount) return "Paid";
    const percentage = Math.round(
      (jobsheet.amount_paid / jobsheet.total_amount) * 100
    );
    return `Partial (${percentage}%)`;
  };
  const handleOpenItemsModal = async (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setShowItemsModal(true);
    setJobsheetItems([]);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  
  
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      const response = await fetch(
        `http://localhost:3000/jobsheets/${jobsheet.id}/items`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (response.ok) {
        const items = await response.json();
        console.log("Items obtenidos:", items);
        setJobsheetItems(items);
      } else {
        // Para depurar: obtener el texto del error
        const errorText = await response.text();
        console.error("Error fetching jobsheet items:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching jobsheet items:", error);
    }
  };

  // Modifica el handleAddItem para usar el endpoint correcto
  const handleAddItem = async () => {
    if (!newItem.product_id || !currentJobsheet) {
      setNotification({
        show: true,
        message: "Debe seleccionar un producto y especificar la cantidad",
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
  
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:3000/jobsheets/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobsheet_id: currentJobsheet.id,
            product_id: newItem.product_id,
            quantity: newItem.quantity,
            price: newItem.price
          }),
        }
      );
  
      if (response.ok) {
        setNotification({
          show: true,
          message: "Product added successfully",
          type: "success"
        });
        setTimeout(() => setNotification({show: false}), 3000);
        
        // Limpiar formulario
        setNewItem({ name: "", quantity: 1, price: 0, product_id: null });
        
        // Recargar lista de items
        fetchJobsheetItems(currentJobsheet.id);
      } else {
        const errorText = await response.text();
        console.error("Error adding item:", response.status, errorText);
        
        setNotification({
          show: true,
          message: "Error while adding item",
          type: "error"
        });
        setTimeout(() => setNotification({show: false}), 3000);
      }
    } catch (error) {
      console.error("Error adding item:", error);
      
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error"
      });
      setTimeout(() => setNotification({show: false}), 3000);
    } finally {
      setIsLoading(false);
    }
  };

// Función auxiliar para cargar items
const fetchJobsheetItems = async (jobsheetId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    const response = await fetch(
      `http://localhost:3000/jobsheets/${jobsheetId}/items`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const items = await response.json();
      console.log("Items recargados:", items);
      setJobsheetItems(items);
    }
  } catch (error) {
    console.error("Error fetching jobsheet items:", error);
  }
};

const handleDeleteItem = async (itemId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    // Endpoint correcto según tus rutas
    const response = await fetch(
      `http://localhost:3000/jobsheets/items/${itemId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      // Mostrar confirmación visual
      const updatedItems = jobsheetItems.filter(item => item.id !== itemId);
      setJobsheetItems(updatedItems);
      
      // Notificación de éxito
      setNotification({
        show: true,
        message: "Item eliminado correctamente",
        type: "success"
      });
      
      // Ocultar notificación después de 3 segundos
      setTimeout(() => setNotification({show: false}), 3000);
      
      // Recargar los jobsheets para actualizar totales
      fetchJobsheets(searchTerm);
    } else {
      console.error("Error deleting item:", response.status);
      setNotification({
        show: true,
        message: "Error al eliminar el item",
        type: "error"
      });
      setTimeout(() => setNotification({show: false}), 3000);
    }
  } catch (error) {
    console.error("Error deleting item:", error);
    setNotification({
      show: true,
      message: "Error al eliminar el item: " + error.message,
      type: "error"
    });
    setTimeout(() => setNotification({show: false}), 3000);
  }
};
  const handleStatusChange = async (id, currentStatus) => {
    // Define el ciclo de estados
    const statusCycle = ["pending", "in progress", "completed", "cancelled"];
    
    // Encuentra el índice del estado actual
    const currentIndex = statusCycle.indexOf(currentStatus);
    
    // Calcula el siguiente estado (vuelve al inicio si llega al final)
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
      
      const getResponse = await fetch(`http://localhost:3000/jobsheets/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!getResponse.ok) {
        console.error("Error obteniendo datos del jobsheet:", getResponse.status);
        return;
      }
      
      const jobsheetData = await getResponse.json();
      
      const updateData = {
        vehicle_id: jobsheetData.vehicle_id,
        customer_id: jobsheetData.customer_id,
        state: nextStatus
      };
      
      
      const response = await fetch(`http://localhost:3000/jobsheets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        console.log("¡Estado actualizado con éxito!");
        fetchJobsheets(searchTerm, statusFilter); 

      } else {
        const errorText = await response.text();
        console.error("Error actualizando estado:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error actualizando estado:", error);
    }
  };
  // Fetch customers for dropdown
  const fetchCustomers = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/customers", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error("Error fetching customers:", response.status);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  // Fetch vehicles for dropdown
  const fetchVehicles = async (customerId = null) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      let url = "http://localhost:3000/vehicles";
      if (customerId) {
        url += `?customer_id=${customerId}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      } else {
        console.error("Error fetching vehicles:", response.status);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  useEffect(() => {
    fetchJobsheets(searchTerm, statusFilter);
    fetchCustomers();
    fetchVehicles();
  }, [fetchJobsheets, searchTerm, statusFilter]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  
    searchTimeout.current = setTimeout(() => {
      console.log("Searching for:", value);
      fetchJobsheets(value, statusFilter);
    }, 500);
  };

 

  // Handle all other form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  
  const handleDelete = (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setShowDeleteModal(true);
  };

  // Save jobsheet (create or update)
  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      let url = "http://localhost:3000/jobsheets";
      let method = "POST";

      if (currentJobsheet) {
        url += `/${currentJobsheet.id}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        fetchJobsheets(searchTerm);
      } else {
        console.error("Error saving jobsheet:", response.status);
        alert("Error saving jobsheet");
      }
    } catch (error) {
      console.error("Error saving jobsheet:", error);
      alert("Error saving jobsheet");
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    const token = localStorage.getItem("token");
    if (!token || !currentJobsheet) {
      console.error("No token found or no jobsheet selected");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/jobsheets/${currentJobsheet.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setShowDeleteModal(false);
        fetchJobsheets(searchTerm);
      } else {
        console.error("Error deleting jobsheet:", response.status);
        alert("Error deleting jobsheet");
      }
    } catch (error) {
      console.error("Error deleting jobsheet:", error);
      alert("Error deleting jobsheet");
    }
  };

  // Añade estos estados adicionales al principio del componente
const [inventorySearchTerm, setInventorySearchTerm] = useState("");
const [filteredInventory, setFilteredInventory] = useState([]);
const [showInventoryResults, setShowInventoryResults] = useState(false);
const inventorySearchTimeout = useRef(null);

// Añade esta función para buscar en el inventario
const handleInventorySearch = (e) => {
  const value = e.target.value;
  setInventorySearchTerm(value);
  setShowInventoryResults(true);

  // Limpiar timeout anterior
  if (inventorySearchTimeout.current) {
    clearTimeout(inventorySearchTimeout.current);
  }

  // Configurar nuevo timeout para la búsqueda
  inventorySearchTimeout.current = setTimeout(async () => {
    if (value.trim() === "") {
      setFilteredInventory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/inventory?search=${encodeURIComponent(value)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const results = await response.json();
        console.log("Inventory search results:", results);
        setFilteredInventory(results);
      } else {
        console.error("Error searching inventory:", response.status);
        setFilteredInventory([]);
        setNotification({
          show: true,
          message: "Error searching inventory",
          type: "error"
        });
        setTimeout(() => setNotification({show: false}), 3000);
      }
    } catch (error) {
      console.error("Error searching inventory:", error);
      setFilteredInventory([]);
      setNotification({
        show: true,
        message: "Error searching: " + error.message,
        type: "error"
      });
      setTimeout(() => setNotification({show: false}), 3000);
    } finally {
      setIsLoading(false);
    }
  }, 300);
};

// Añade función para seleccionar un item del inventario
const handleSelectInventoryItem = (item) => {
  setNewItem({
    ...newItem,
    name: item.name || item.description || "Unnamed Product",
    price: parseFloat(item.sale) || 0,
    product_id: item.id,
    quantity: 1
  });
  setInventorySearchTerm("");
  setShowInventoryResults(false);
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
        placeholder="Search jobsheets..."
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
    <StatusFilterButton />
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
    Add Job Sheet
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
    {console.log("Renderizando AG Grid con datos:", jobsheets)}
    <AgGridReact
      ref={gridRef}
      rowData={jobsheets}
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
                {currentJobsheet ? "Edit Job Sheet" : "Create New Job Sheet"}
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

            {/* Form Fields */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              {/* Customer Selection */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Customer:
                </label>
                <div style={{ position: "relative" }}>
                  {selectedCustomerName ? (
                    <div
                      style={{
                        marginBottom: "10px",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        backgroundColor: "#f0f4ff",
                        border: "1px solid #d0d8ff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: "500" }}>
                        {selectedCustomerName}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedCustomerName("");
                          setFormData({
                            ...formData,
                            customer_id: "",
                            vehicle_id: "",
                          });
                          setVehicles([]);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "#666",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Search customers by name..."
                        value={customerSearchTerm}
                        onChange={handleCustomerSearch}
                        onFocus={() => setShowCustomerResults(true)}
                        onBlur={(e) => {
                          // Delay hiding results to allow for clicking on a result
                          setTimeout(() => setShowCustomerResults(false), 200);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      />

                      {showCustomerResults && filteredCustomers.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            backgroundColor: "white",
                            border: "1px solid #ddd",
                            borderTop: "none",
                            borderRadius: "0 0 4px 4px",
                            maxHeight: "200px",
                            overflowY: "auto",
                            zIndex: 10,
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                          }}
                        >
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #eee",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                (e.target.style.backgroundColor = "#f5f5f5")
                              }
                              onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = "transparent")
                              }
                            >
                              {customer.name ||
                                `${customer.first_name || ""} ${
                                  customer.last_name || ""
                                }`.trim() ||
                                "Unknown Customer"}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Vehicle Selection */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Vehicle:
                </label>
                <select
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                  disabled={!formData.customer_id}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.plate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Status:
                </label>
                <select
  name="state"
  value={formData.state}
  onChange={handleInputChange}
  style={{
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ddd",
  }}
>
                  <option value="pending">Pending</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Created */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Date:
                </label>
                <input
                  type="date"
                  name="date_created"
                  value={formData.date_created}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                />
              </div>
              {/* Description */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "bold",
                  }}
                >
                  Description:
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            {/* Form Actions */}
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
                {currentJobsheet ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

{showItemsModal && currentJobsheet && (
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
    {/* Contenido del modal de items, sin cambios */}
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        width: "600px",
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
          Manage Items - Job Sheet #{currentJobsheet.id}
        </h2>
        <button
          onClick={() => setShowItemsModal(false)}
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

      {/* Items List */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0 }}>Current Items</h3>
        {jobsheetItems.length === 0 ? (
          <p style={{ fontStyle: "italic", color: "#666" }}>
            No items added yet
          </p>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Item
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Quantity
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Price
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Total
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobsheetItems.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    ${parseFloat(item.price).toFixed(2)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    $
                    {(
                      parseFloat(item.price) * item.quantity
                    ).toFixed(2)}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#d32f2f",
                        cursor: "pointer",
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan="3"
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontWeight: "bold",
                  }}
                >
                  Total:
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontWeight: "bold",
                  }}
                >
                  $
                  {jobsheetItems
                    .reduce(
                      (sum, item) =>
                        sum +
                        parseFloat(item.price) * item.quantity,
                      0
                    )
                    .toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Add New Item Form */}
      <div style={{ borderTop: "1px solid #eee", paddingTop: "20px" }}>
  <h3>Add New Item</h3>
  
  {/* Notificaciones */}
  {notification.show && (
    <div 
      style={{
        padding: "8px 12px",
        marginBottom: "10px",
        borderRadius: "4px",
        backgroundColor: notification.type === "success" ? "#e6f7e6" : "#ffeaea",
        border: `1px solid ${notification.type === "success" ? "#c3e6cb" : "#f5c6cb"}`,
        color: notification.type === "success" ? "#155724" : "#721c24"
      }}
    >
      {notification.message}
    </div>
  )}
  
  <div style={{ position: "relative" }}>
  <div style={{ 
    display: "flex", 
    alignItems: "center", 
    border: "1px solid #ddd", 
    borderRadius: "4px", 
    padding: "4px 8px",
    backgroundColor: "#fff" 
  }}>
    <FontAwesomeIcon 
      icon={faSearch} 
      style={{ 
        color: "#5932EA", 
        marginRight: "8px" 
      }} 
    />
    <input
      ref={searchInputRef}
      type="text"
      placeholder="Search items by name or SKU."
      value={inventorySearchTerm}
      onChange={handleInventorySearch}
      onFocus={() => setShowInventoryResults(true)}
      style={{
        flex: 1,
        border: "none",
        outline: "none",
        padding: "6px 0",
        fontSize: "14px"
      }}
    />
    {inventorySearchTerm && (
      <button
        onClick={() => {
          setInventorySearchTerm("");
          setFilteredInventory([]);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
          color: "#999"
        }}
      >
        ×
      </button>
    )}
    {isLoading && (
      <div style={{
        width: "16px",
        height: "16px",
        border: "2px solid rgba(0,0,0,0.1)",
        borderLeft: "2px solid #5932EA",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginLeft: "8px"
      }}></div>
    )}
  </div>
      {showInventoryResults && filteredInventory.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {filteredInventory.map((item, index) => (
            <div
              key={item.id}
              className="inventory-item"
              tabIndex="0"
              onClick={() => handleSelectInventoryItem(item)}
              style={{
                padding: "12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                outline: "none"
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
            >
              <div style={{ 
                width: "36px", 
                height: "36px", 
                backgroundColor: "#5932EA20", 
                borderRadius: "4px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                marginRight: "12px",
                color: "#5932EA",
                fontWeight: "bold",
                fontSize: "16px"
              }}>
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "15px" }}>{item.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    <span>SKU: {item.sku || 'N/A'}</span>
                    <span style={{ 
                      marginLeft: "12px", 
                      color: item.stock > 0 ? "#2e7d32" : "#d32f2f"
                    }}>
                      {item.stock > 0 ? `${item.stock} en stock` : "Sin stock"}
                    </span>
                  </div>
                  <div style={{ fontWeight: "600", color: "#5932EA", fontSize: "14px" }}>
                    ${parseFloat(item.sale).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ 
                marginLeft: "8px",
                padding: "5px 8px",
                backgroundColor: "#5932EA10",
                borderRadius: "4px",
                color: "#5932EA",
                fontSize: "12px",
                fontWeight: "500"
              }}>
                Seleccionar
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showInventoryResults && inventorySearchTerm && filteredInventory.length === 0 && !isLoading && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          padding: "12px",
          backgroundColor: "white",
          border: "1px solid #ddd",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          color: "#666",
          fontSize: "14px",
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}>
          <div style={{ color: "#888", marginBottom: "6px" }}>
            <FontAwesomeIcon icon={faSearch} style={{ marginRight: "8px" }} />
          </div>
          No se encontraron productos que coincidan con "{inventorySearchTerm}"
        </div>
      )}
    </div>

    {newItem.product_id && (
      <div
        style={{
          marginTop: "15px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "15px",
          backgroundColor: "#f8f9ff",
          borderRadius: "6px",
          border: "1px solid #e0e4ff"
        }}
      >
        <div style={{ flex: 3 }}>
          <div style={{ fontWeight: "600", fontSize: "15px" }}>{newItem.name}</div>
          <div style={{ fontSize: "14px", color: "#5932EA", marginTop: "4px" }}>
            ${parseFloat(newItem.price).toFixed(2)} por unidad
          </div>
        </div>
        
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <button 
            onClick={() => setNewItem({...newItem, quantity: Math.max(1, newItem.quantity - 1)})}
            style={{
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "4px 0 0 4px",
              cursor: "pointer"
            }}
          >-</button>
          
          <input
            type="number"
            value={newItem.quantity}
            min="1"
            onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
            style={{
              width: "45px",
              textAlign: "center",
              padding: "4px 0",
              border: "1px solid #ddd",
              borderLeft: "none",
              borderRight: "none",
              outline: "none"
            }}
          />
          
          <button 
            onClick={() => setNewItem({...newItem, quantity: newItem.quantity + 1})}
            style={{
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "0 4px 4px 0",
              cursor: "pointer"
            }}
          >+</button>
        </div>
        
        <div style={{ textAlign: "right", fontWeight: "600", color: "#5932EA", fontSize: "15px" }}>
          Total: ${(parseFloat(newItem.price) * newItem.quantity).toFixed(2)}
        </div>
        
        <button
          onClick={handleAddItem}
          style={{
            padding: "8px 16px",
            backgroundColor: "#5932EA",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500"
          }}
        >
          Add
        </button>
      </div>
    )}
  </div>
</div>

      {/* Modal Actions */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => setShowItemsModal(false)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#5932EA",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Done
        </button>
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
              Are you sure you want to delete this job sheet? This action cannot
              be undone.
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

export default JobsheetView;
