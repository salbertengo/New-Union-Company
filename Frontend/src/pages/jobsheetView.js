import React, { useEffect, useState, useRef, useCallback } from "react";
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
  faBoxOpen,
  faTools,
  faMoneyBillWave
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Invoice from "../components/invoice";
import CreateJobsheetModal from '../pages/createJobsheeModal';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const JobsheetView = () => {
  const [jobsheets, setJobsheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [setVehicles] = useState([]);
  const [currentJobsheet, setCurrentJobsheet] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const gridRef = useRef(null);
  const searchTimeout = useRef(null);
  const [selectedCustomerSearchTerm, setCustomerSearchTerm] = useState("");
  const [setFilteredCustomers] = useState([]);
  const [setShowCustomerResults] = useState(false);
  const [selectedCustomerName,setSelectedCustomerName] = useState("");
  const customerSearchTimeout = useRef(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [jobsheetItems, setJobsheetItems] = useState([]);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [jobsheetPayments, setJobsheetPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [editingLaborId, setEditingLaborId] = useState(null);
  const [editedLaborPrice, setEditedLaborPrice] = useState("");
  const [laborIsBilled, setLaborIsBilled] = useState(true);
  
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    price: 0,
    product_id: null,
  });
  const [showInvoiceModalFromPayments, setShowInvoiceModalFromPayments] =
    useState(false);
  const [showTaxPresets, setShowTaxPresets] = useState(false);
  const [taxName, setTaxName] = useState("IVA Standard");
  const [taxRate, setTaxRate] = useState(21);
  const [taxPreset, setTaxPreset] = useState("standard");

  const [labors, setLabors] = useState([]);
  const [laborDescription, setLaborDescription] = useState("");
  const [laborPrice, setLaborPrice] = useState("");
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [laborTrackingNotes, setLaborTrackingNotes] = useState("");
  const [editingTrackingLaborId, setEditingTrackingLaborId] = useState(null);

  const [formData, setFormData] = useState({
    customer_id: "",
    vehicle_id: "",
    description: "",
    state: "pending",
    date_created: new Date().toISOString().split("T")[0],
  });

  const columnDefs = [
    {
      headerName: "ID",
      field: "id",
      width: 80,
      suppressMenu: true,
      headerClass: "custom-header-sumary",
    },
    {
      headerName: "Customer",
      field: "customer_name",
      suppressMenu: true,
      headerClass: "custom-header-sumary",
    },
    {
      headerName: "Model",
      field: "vehicle_model",
      suppressMenu: true,
      headerClass: "custom-header-sumary",
    },
    {
      headerName: "Plate",
      field: "license_plate",
      suppressMenu: true,
      headerClass: "custom-header-sumary",
      width: 120,
      cellRenderer: (params) => {
        if (!params.data) return null;

        // Formato para placas: dos letras, cuatro números, una letra
        let plate = params.value || "AB1234C";

        // Asegurarse de que tenga formato argentino
        if (!/^[A-Z]{2}\d{4}[A-Z]$/.test(plate)) {
          // Intentar formatear la placa existente
          const parts = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
          if (parts.length >= 7) {
            const letters = parts.replace(/[^A-Z]/g, "");
            const numbers = parts.replace(/[^0-9]/g, "");

            if (letters.length >= 3 && numbers.length >= 4) {
              plate = `${letters.substring(0, 2)}${numbers.substring(
                0,
                4
              )}${letters.substring(2, 3)}`;
            }
          }
        }

        // Dividir la placa: dos letras arriba, los números y la letra restante abajo
        const topPart = plate.substring(0, 2);
        const bottomPart = plate.substring(2);

        return (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: "54px",
                height: "32px",
                backgroundColor: "black",
                border: "1px solid #444",
                borderRadius: "3px",
                display: "grid",
                gridTemplateRows: "40% 60%",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  color: "white",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: "13px",
                  textAlign: "center",
                  borderBottom: "1px solid #444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {topPart}
              </div>
              <div
                style={{
                  color: "white",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: "13px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {bottomPart}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      headerName: "Created",
      field: "created_at",
      suppressMenu: true,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data.created_at) return "—";
        const date = new Date(params.data.created_at);
        return date.toLocaleDateString();
      },
    },
    {
      headerName: "State",
      field: "state",
      suppressMenu: true,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        const state = params.data.state || "pending";
        let color = "#FF9500";

        if (state === "completed") color = "#00C853";
        else if (state === "in progress") color = "#2979FF";
        else if (state === "cancelled") color = "#F44336";

        return (
          <button
            className="status-btn"
            data-id={params.data.id}
            data-status={state}
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}40`,
              borderRadius: "12px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              textTransform: "capitalize",
              minWidth: "90px",
            }}
            onClick={() => handleStatusChange(params.data.id, state)}
          >
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </button>
        );
      },
    },
    {
      headerName: "Items",
      field: "items",
      width: 160,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data) return '';
        return (
          <ActionButtonsContainer>
            <ActionButton
              icon={faBoxOpen}
              onClick={() => handleOpenItemsModal(params.data)}
              tooltip="Manage Items"
              type="primary"
            />
          </ActionButtonsContainer>
        );
      },
    },
    {
      headerName: "Payments",
      field: "payments",
      width: 160,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data) return '';
          return (
            <ActionButtonsContainer>
              <ActionButton
              icon={faMoneyBillWave}
              onClick={() => handleOpenPaymentsModal(params.data)}
              type="primary"
              />
              </ActionButtonsContainer>
              );
            },
          },

    {
      headerName: "Labor",
      field: "labor",
      width: 160,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data) return '';
        return (
          <ActionButtonsContainer>
            <ActionButton
              icon={faTools}
              onClick={() => handleOpenLaborModal(params.data)}
              tooltip="Manage Labor"
              type="warning"
            />
          </ActionButtonsContainer>
        );
      },
    },
    {
      headerName: "Actions",
      field: "actions",
      width: 160,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data) return '';
        return (
          <ActionButtonsContainer>
            <ActionButton
              icon={faEdit}
              onClick={() => handleEdit(params.data)}
              tooltip="Edit Job Sheet"
              type="default"
            />
            <ActionButton
              icon={faTrash}
              onClick={() => handleDelete(params.data)}
              tooltip="Delete Job Sheet"
              type="danger"
            />
          </ActionButtonsContainer>
        );
      },
    },
  ];


  const onGridReady = (params) => {
    gridRef.current = params.api;
  };
  const handleEditLabor = (labor) => {
    setEditingLaborId(labor.id);
    setEditedLaborPrice(labor.price || "0");
  };
  const handleSaveEditedLabor = async () => {
    if (!editingLaborId) return;
    
    try {
      // Call your existing update function with the edited price
      await handleUpdateLabor(editingLaborId, { price: parseFloat(editedLaborPrice) });
      
      // Reset editing state
      setEditingLaborId(null);
      setEditedLaborPrice("");
      
      // Show success notification
      setNotification({
        show: true,
        message: "Labor price updated successfully",
        type: "success"
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      
    } catch (error) {
      console.error("Error updating labor price:", error);
      setNotification({
        show: true,
        message: "Failed to update labor price",
        type: "error"
      });
      setTimeout(() => setNotification({ show: false }), 3000);
    }
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
      // Si hay un término de búsqueda, intentamos primero cargar todos para filtrado local
      if (search && search.trim() !== "") {
        await fetchJobsheetsForLocalSearch(status, search);
        return;
      }

      // Para solicitudes sin búsqueda, usamos el endpoint normal
      let url = "http://localhost:3000/jobsheets";
      if (status && status !== "all") {
        url += `?state=${encodeURIComponent(status)}`;
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
        setJobsheets(jobsheetData);
      } else {
        console.error("Error del servidor:", response.status);
        setJobsheets([]);
      }
    } catch (error) {
      console.error("Error en fetchJobsheets:", error);
      setJobsheets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Nueva función para cargar jobsheets y realizar búsqueda localmente
  const fetchJobsheetsForLocalSearch = async (status, searchTerm) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Cargar todos los jobsheets, opcionalmente filtrados por estado
      let url = "http://localhost:3000/jobsheets";
      if (status && status !== "all") {
        url += `?state=${encodeURIComponent(status)}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const allJobsheets = await response.json();

        // Filtrar localmente por el término de búsqueda
        const searchTermLower = searchTerm.toLowerCase();
        const filtered = allJobsheets.filter((js) => {
          // Búsqueda en ID
          if (js.id.toString().includes(searchTermLower)) return true;

          // Búsqueda en nombre de cliente
          if (js.customer_name?.toLowerCase().includes(searchTermLower))
            return true;

          // Búsqueda en modelo de vehículo o placa
          if (js.vehicle_model?.toLowerCase().includes(searchTermLower))
            return true;
          if (js.license_plate?.toLowerCase().includes(searchTermLower))
            return true;

          return false;
        });

        console.log(
          `Búsqueda local: encontrados ${filtered.length} de ${allJobsheets.length} jobsheets`
        );
        setJobsheets(filtered);
      }
    } catch (error) {
      console.error("Error en búsqueda local:", error);
    }
  };

  const StatusFilterButton = () => {
    const statuses = [
      "all",
      "pending",
      "in progress",
      "completed",
      "cancelled",
    ];

    const nextStatus = () => {
      const currentIndex = statuses.indexOf(statusFilter);
      const nextIndex = (currentIndex + 1) % statuses.length;
      setStatusFilter(statuses[nextIndex]);
      fetchJobsheets(searchTerm, statuses[nextIndex]);
    };

    let color = "#666";
    if (statusFilter === "pending") color = "#FF9500";
    else if (statusFilter === "completed") color = "#00C853";
    else if (statusFilter === "in progress") color = "#2979FF";
    else if (statusFilter === "cancelled") color = "#F44336";

    return (
      <button
        onClick={nextStatus}
        style={{
          backgroundColor: statusFilter === "all" ? "#F9FBFF" : `${color}20`,
          color: statusFilter === "all" ? "#333" : color,
          border: `1px solid ${
            statusFilter === "all" ? "#F9FBFF" : `${color}40`
          }`,
          borderRadius: "10px",
          padding: "5px 15px",
          height: "35px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
          textTransform: "capitalize",
          // Se eliminó el marginLeft: '10px' que causaba el solapamiento
        }}
      >
        {statusFilter === "all" ? "All States" : statusFilter}
      </button>
    );
  };
  const handleOpenPaymentsModal = async (jobsheet) => {
    try {
      // Get fresh jobsheet data before opening modal
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoading(true);

      const response = await fetch(
        `http://localhost:3000/jobsheets/${jobsheet.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        let freshJobsheet = await response.json();

        // 1. FIXED: Use the correct URL structure for payments
        const paymentsResponse = await fetch(
          `http://localhost:3000/jobsheets/payments/jobsheet/${freshJobsheet.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // 2. NEW: Fetch items for this jobsheet
        const itemsResponse = await fetch(
          `http://localhost:3000/jobsheets/${freshJobsheet.id}/items`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // 3. NEW: Fetch labors for this jobsheet
        const laborsResponse = await fetch(
          `http://localhost:3000/labor/jobsheet/${freshJobsheet.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Process all responses
        if (paymentsResponse.ok) {
          const payments = await paymentsResponse.json();
          setJobsheetPayments(payments);

          // Calculate the total manually
          const totalPaid = payments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount || 0),
            0
          );

          // Update the amount_paid in the jobsheet object
          freshJobsheet.amount_paid = totalPaid;
        } else {
          console.error("Error fetching payments:", paymentsResponse.status);
          setJobsheetPayments([]);
        }

        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          setJobsheetItems(items);
        } else {
          console.error("Error fetching items:", itemsResponse.status);
          setJobsheetItems([]);
        }

        if (laborsResponse.ok) {
          const labors = await laborsResponse.json();
          setLabors(labors);
        } else {
          console.error("Error fetching labors:", laborsResponse.status);
          setLabors([]);
        }

        // Set the current jobsheet with correct total
        setCurrentJobsheet(freshJobsheet);

        // Now open the modal with updated data
        setShowPaymentsModal(true);
      } else {
        console.error("Error fetching jobsheet:", response.status);
      }
    } catch (error) {
      console.error("Error in handleOpenPaymentsModal:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setNotification({
        show: true,
        message: "Please enter a valid payment amount",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:3000/jobsheets/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobsheet_id: currentJobsheet.id,
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          payment_date: new Date().toISOString().split("T")[0],
        }),
      });

      const paymentResponse = await response.json();

      if (response.ok) {
        // Update the payments list
        setJobsheetPayments([
          ...jobsheetPayments,
          {
            id: paymentResponse.id,
            amount: parseFloat(paymentAmount),
            method: paymentMethod,
            payment_date: new Date().toISOString().split("T")[0],
          },
        ]);

        // Reset payment form
        setPaymentAmount("");

        // Show success message
        setNotification({
          show: true,
          message: "Payment added successfully",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);

        // Add this line to refresh the payments modal with updated data
        handleOpenPaymentsModal(currentJobsheet);

        // Add this line to refresh the main jobsheets list
        fetchJobsheets(searchTerm, statusFilter);
      } else {
        setNotification({
          show: true,
          message: paymentResponse.message || "Error adding payment",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      setNotification({
        show: true,
        message: "Error adding payment",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJobsheetPayments = async (jobsheetId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      setIsLoading(true);

      // Changed URL to match your backend route structure
      const url = `http://localhost:3000/jobsheets/payments/jobsheet/${jobsheetId}`;
      console.log("Fetching payments from:", url);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Log response before trying to parse
      console.log("Payment fetch response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Payment fetch error (${response.status}):`, errorText);
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      setJobsheetPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setJobsheetPayments([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeletePayment = async (paymentId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/jobsheets/payments/${paymentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Update the payment list
        const updatedPayments = jobsheetPayments.filter(
          (payment) => payment.id !== paymentId
        );
        setJobsheetPayments(updatedPayments);

        // Also refresh the main jobsheet list to update totals
        fetchJobsheets(searchTerm, statusFilter);

        setNotification({
          show: true,
          message: "Payment deleted successfully",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      } else {
        // Handle error
      }
    } catch (error) {
      // Error handling code
    }
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
      date_created:
        jobsheet.date_created?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
    });

    setSelectedCustomerName(jobsheet.customer_name || "");

    fetchVehicles(jobsheet.customer_id);
    setShowModal(true);
  };

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
        console.error(
          "Error fetching jobsheet items:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("Error fetching jobsheet items:", error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.product_id || !currentJobsheet) {
      setNotification({
        show: true,
        message: "You must select a product and a jobsheet first",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      setIsLoading(true);
      const response = await fetch(`http://localhost:3000/jobsheets/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobsheet_id: currentJobsheet.id,
          product_id: newItem.product_id,
          quantity: newItem.quantity,
          price: newItem.price,
        }),
      });

      // Intentar obtener el cuerpo de la respuesta como JSON
      const responseData = await response.text();
      let errorMessage = responseData;

      try {
        // Intentar parsear como JSON si es posible
        const jsonData = JSON.parse(responseData);
        errorMessage =
          jsonData.error || jsonData.message || "Error desconocido";
      } catch (e) {
        // Si no es JSON, usar el texto tal cual
        console.log("Respuesta no es JSON:", responseData);
      }

      if (response.ok) {
        setNotification({
          show: true,
          message: "Product added successfully",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);

        // Limpiar formulario
        setNewItem({ name: "", quantity: 1, price: 0, product_id: null });

        // Recargar lista de items
        fetchJobsheetItems(currentJobsheet.id);
        await refreshCurrentJobsheetData();
      } else {
        console.error("Error adding item:", response.status, errorMessage);

        // Mostrar el mensaje específico, incluido el de "Insufficient stock"
        setNotification({
          show: true,
          message: errorMessage || "Error al agregar el producto",
          type: "error",
        });

        // Para errores, mantener la notificación más tiempo
        setTimeout(() => setNotification({ show: false }), 5000);
      }
    } catch (error) {
      console.error("Error adding item:", error);

      setNotification({
        show: true,
        message: "Error de conexión: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 5000);
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
        const updatedItems = jobsheetItems.filter((item) => item.id !== itemId);
        setJobsheetItems(updatedItems);

        // Notificación de éxito
        setNotification({
          show: true,
          message: "Item deleted successfully",
          type: "success",
        });

        // Ocultar notificación después de 3 segundos
        setTimeout(() => setNotification({ show: false }), 3000);

        // Recargar los jobsheets para actualizar totales
        fetchJobsheets(searchTerm);
        await refreshCurrentJobsheetData();
      } else {
        console.error("Error deleting item:", response.status);
        setNotification({
          show: true,
          message: "Error al eliminar el item",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setNotification({
        show: true,
        message: "Error al eliminar el item: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
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
        console.error(
          "Error obteniendo datos del jobsheet:",
          getResponse.status
        );
        return;
      }

      const jobsheetData = await getResponse.json();

      const updateData = {
        vehicle_id: jobsheetData.vehicle_id,
        customer_id: jobsheetData.customer_id,
        state: nextStatus,
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

  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [showInventoryResults, setShowInventoryResults] = useState(false);
  const inventorySearchTimeout = useRef(null);

  const handleInventorySearch = (e) => {
    const value = e.target.value;
    setInventorySearchTerm(value);
    setShowInventoryResults(true);

    if (inventorySearchTimeout.current) {
      clearTimeout(inventorySearchTimeout.current);
    }

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
            type: "error",
          });
          setTimeout(() => setNotification({ show: false }), 3000);
        }
      } catch (error) {
        console.error("Error searching inventory:", error);
        setFilteredInventory([]);
        setNotification({
          show: true,
          message: "Error searching: " + error.message,
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };
  // Función para obtener labores de un jobsheet
  const fetchLabors = async (jobsheetId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }

      setIsLoading(true);

      const response = await fetch(
        `http://localhost:3000/labor/jobsheet/${jobsheetId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLabors(data);
      } else {
        const errorText = await response.text();
        console.error("Error fetching labors:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching labors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLabor = async () => {
    if (!laborDescription.trim()) {
      setNotification({
        show: true,
        message: "Please enter a valid labor description",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoading(true);

      // Guardar la descripción para el mensaje
      const currentDescription = laborDescription;

      const response = await fetch(`http://localhost:3000/labor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobsheet_id: currentJobsheet.id,
          description: laborDescription,
          price: laborPrice ? parseFloat(laborPrice) : 0,
          is_completed: false,
          is_billed: laborIsBilled,
          tracking_notes: laborTrackingNotes,
        }),
      });

      if (response.ok) {
        setLaborDescription("");
        setLaborPrice("");
        setLaborIsBilled(true);
        setLaborTrackingNotes("");

        fetchLabors(currentJobsheet.id);
        fetchJobsheets(searchTerm, statusFilter);

        setNotification({
          show: true,
          message: `"${currentDescription}" added successfully`,
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      } else {
        const errorData = await response.text();
        console.error("Error adding labor:", errorData);

        setNotification({
          show: true,
          message: "Error adding labor",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      }
    } catch (error) {
      console.error("Error adding labor:", error);
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdateLabor = async (id, updates) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoading(true);

      // Only validate price if we're specifically setting is_completed to 1 (completed)
      // AND we're not also providing a price in the same update
      if (updates.is_completed === 1 && !updates.price) {
        // Find the current labor to check its existing price
        const currentLabor = labors.find((labor) => labor.id === id);
        if (
          !currentLabor ||
          !currentLabor.price ||
          parseFloat(currentLabor.price) <= 0
        ) {
          setNotification({
            show: true,
            message: "Please enter a valid price for the completed labor",
            type: "error",
          });
          setTimeout(() => setNotification({ show: false }), 3000);
          return;
        }
      }

      const response = await fetch(`http://localhost:3000/labor/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchLabors(currentJobsheet.id);
        fetchJobsheets(searchTerm, statusFilter); // Para actualizar totales

        setNotification({
          show: true,
          message: "Labor updated successfully",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      } else {
        const errorData = await response.text();
        console.error("Error updating labor:", errorData);

        setNotification({
          show: true,
          message: "Error updating labor",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      }
    } catch (error) {
      console.error("Error updating labor:", error);
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLaborTracking = async (laborId, notes) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      setIsLoading(true);
      const response = await fetch(`http://localhost:3000/labor/${laborId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tracking_notes: notes }),
      });
      if (response.ok) {
        fetchLabors(currentJobsheet.id);
        setEditingTrackingLaborId(null);
        setNotification({ show: true, message: "Tracking notes updated", type: "success" });
        setTimeout(() => setNotification({ show: false }), 2000);
      } else {
        setNotification({ show: true, message: "Error updating tracking notes", type: "error" });
        setTimeout(() => setNotification({ show: false }), 2000);
      }
    } catch (error) {
      setNotification({ show: true, message: "Error: " + error.message, type: "error" });
      setTimeout(() => setNotification({ show: false }), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLabor = async (id) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoading(true);

      const response = await fetch(`http://localhost:3000/labor/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchLabors(currentJobsheet.id);
        fetchJobsheets(searchTerm, statusFilter);

        setNotification({
          show: true,
          message: "Labor deleted successfully",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      } else {
        const errorData = await response.text();
        console.error("Error deleting labor:", errorData);

        setNotification({
          show: true,
          message: "Error deleting labor",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      }
    } catch (error) {
      console.error("Error deleting labor:", error);
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLaborModal = async (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setShowLaborModal(true);
    setLabors([]);
    setLaborDescription("");
    setLaborPrice("");

    fetchLabors(jobsheet.id);
  };
  const handleSelectInventoryItem = (item) => {
    setNewItem({
      ...newItem,
      name: item.name || item.description || "Unnamed Product",
      price: parseFloat(item.sale) || 0,
      product_id: item.id,
      quantity: 1,
    });
    setInventorySearchTerm("");
    setShowInventoryResults(false);
  };

  const handleToggleLaborCompleted = async (labor) => {
    const updates = {
      is_completed: labor.is_completed === 1 ? 0 : 1,
    };
    await handleUpdateLabor(labor.id, updates);
  };

  const handleToggleLaborBilled = async (labor) => {
    const updates = {
      is_billed: labor.is_billed === false ? true : false,
    };
    await handleUpdateLabor(labor.id, updates);
  };

  const refreshCurrentJobsheetData = async () => {
    if (!currentJobsheet) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      // Refresca jobsheet
      const response = await fetch(`http://localhost:3000/jobsheets/${currentJobsheet.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const freshJobsheet = await response.json();
        setCurrentJobsheet(freshJobsheet);
      }
      // Refresca items
      const itemsResponse = await fetch(`http://localhost:3000/jobsheets/${currentJobsheet.id}/items`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        setJobsheetItems(items);
      }
      // Refresca labors
      const laborsResponse = await fetch(`http://localhost:3000/labor/jobsheet/${currentJobsheet.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (laborsResponse.ok) {
        const labors = await laborsResponse.json();
        setLabors(labors);
      }
      // Refresca payments
      const paymentsResponse = await fetch(`http://localhost:3000/jobsheets/payments/jobsheet/${currentJobsheet.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (paymentsResponse.ok) {
        const payments = await paymentsResponse.json();
        setJobsheetPayments(payments);
      }
    } catch (e) {
      // No hacer nada
    }
  };

  const handleOpenInvoiceModal = async () => {
    await refreshCurrentJobsheetData();
    setShowInvoiceModalFromPayments(true);
  };

  return (
    <>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: "30px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
          padding: "20px",
        }}
      >
        {/* Header, filters and button to add */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px" }}>Job Sheets</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search jobsheets..."
                value={searchTerm}
                onChange={handleSearch}
                style={{
                  padding: "5px 30px 5px 10px",
                  width: "216px",
                  borderRadius: "10px",
                  border: "1px solid white",
                  backgroundColor: "#F9FBFF",
                  height: "25px",
                }}
              />
              <FontAwesomeIcon
                icon={faSearch}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: loading ? "#4321C9" : "gray",
                  cursor: "pointer",
                }}
              />
            </div>

            <StatusFilterButton />

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
        </div>

        {/* Grid con el mismo estilo que InventoryView */}
        <div style={{ flex: 1, position: "relative" }}>
          <div
            className="ag-theme-alpine inventory-view"
            style={{
              width: "100%",
              height: "100%",
              overflowX: "hidden",
              overflowY: "auto",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={jobsheets}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: false,
                sortable: true,
                flex: 1,
                suppressMenu: true,
              }}
              modules={[ClientSideRowModelModule]}
              pagination={true}
              paginationPageSize={12}
              headerHeight={30}
              rowHeight={50}
              suppressSizeToFit={true}
              suppressHorizontalScroll={true}
              onGridReady={onGridReady}
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
              ></div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
  <CreateJobsheetModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    currentJobsheet={currentJobsheet}
    refreshJobsheets={fetchJobsheets}
  />
)}
        
        {showPaymentsModal && currentJobsheet && (
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
              backdropFilter: "blur(3px)",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "14px",
                width: "950px",
                maxHeight: "92vh",
                boxShadow:
                  "0 10px 30px rgba(0,0,0,0.15), 0 1px 8px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "modalFadeIn 0.3s ease",
              }}
            >
              {/* Encabezado con información del trabajo */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 24px",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  background:
                    "linear-gradient(135deg, #00C853 0%, #009624 100%)",
                  color: "white",
                }}
              >
                <div>
                  <h2
                    style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}
                  >
                    Payment Management
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      opacity: "0.9",
                      fontSize: "14px",
                    }}
                  >
                    Order #{currentJobsheet.id} •{" "}
                    {currentJobsheet.customer_name || "Cliente"} •{" "}
                    {currentJobsheet.vehicle_model || "Vehículo"}
                  </p>
                </div>
                <button
                  onClick={() => setShowPaymentsModal(false)}
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
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.3)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.2)")
                  }
                >
                  ×
                </button>
              </div>

              {/* Área principal de contenido - Diseño de dos columnas */}
              <div style={{ display: "flex", height: "calc(92vh - 140px)" }}>
                {/* Panel izquierdo - Detalles de servicios e items */}
                <div
                  style={{
                    width: "58%",
                    borderRight: "1px solid rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    maxHeight: "calc(92vh - 140px)",
                  }}
                >
                  <div style={{ padding: "20px", overflowY: "auto" }}>
                    {/* Resumen financiero */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#f0f9ff",
                          borderRadius: "10px",
                          border: "1px solid #d0e8ff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#555",
                            marginBottom: "5px",
                          }}
                        >
                          Total to pay
                        </div>
                        <div
                          style={{
                            fontSize: "22px",
                            fontWeight: "700",
                            color: "#0277BD",
                            display: "flex",
                            alignItems: "baseline",
                          }}
                        >
                          $
                          {parseFloat(
                            currentJobsheet.total_amount || 0
                          ).toFixed(2)}
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "400",
                              color: "#777",
                              marginLeft: "5px",
                            }}
                          >
                            + taxes
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "#f2fff2",
                          borderRadius: "10px",
                          border: "1px solid #d0ffd0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#555",
                            marginBottom: "5px",
                          }}
                        >
                          Payment status
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "600",
                              color:
                                currentJobsheet.amount_paid >=
                                currentJobsheet.total_amount
                                  ? "#00C853"
                                  : currentJobsheet.amount_paid > 0
                                  ? "#FF9800"
                                  : "#F44336",
                            }}
                          >
                            {currentJobsheet.amount_paid >=
                            currentJobsheet.total_amount
                              ? "Fully Paid"
                              : currentJobsheet.amount_paid > 0
                              ? "Partially Paid"
                              : "Payment Pending"}
                          </div>

                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: "100px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor:
                                currentJobsheet.amount_paid >=
                                currentJobsheet.total_amount
                                  ? "#E8F5E9"
                                  : currentJobsheet.amount_paid > 0
                                  ? "#FFF3E0"
                                  : "#FFEBEE",
                              color:
                                currentJobsheet.amount_paid >=
                                currentJobsheet.total_amount
                                  ? "#2E7D32"
                                  : currentJobsheet.amount_paid > 0
                                  ? "#E65100"
                                  : "#C62828",
                            }}
                          >
                            {currentJobsheet.amount_paid > 0
                              ? `$${parseFloat(
                                  currentJobsheet.amount_paid || 0
                                ).toFixed(2)} paid`
                              : "Not paid"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sección de productos/repuestos */}
                    <div style={{ marginBottom: "25px" }}>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#333",
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "15px",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginRight: "8px" }}
                        >
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                        Parts and Products
                      </h3>

                      <div
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          border: "1px solid #eee",
                          overflow: "hidden",
                        }}
                      >
                        {jobsheetItems.length === 0 ? (
                          <div
                            style={{
                              padding: "20px",
                              textAlign: "center",
                              color: "#777",
                              backgroundColor: "#fafafa",
                            }}
                          >
                            No parts or products registered
                          </div>
                        ) : (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              <tr style={{ backgroundColor: "#f9f9f9" }}>
                                <th
                                  style={{
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    fontSize: "13px",
                                    color: "#555",
                                    fontWeight: "600",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  Product
                                </th>
                                <th
                                  style={{
                                    padding: "10px 12px",
                                    textAlign: "center",
                                    fontSize: "13px",
                                    color: "#555",
                                    fontWeight: "600",
                                    borderBottom: "1px solid #eee",
                                    width: "80px",
                                  }}
                                >
                                  Qty.
                                </th>
                                <th
                                  style={{
                                    padding: "10px 12px",
                                    textAlign: "right",
                                    fontSize: "13px",
                                    color: "#555",
                                    fontWeight: "600",
                                    borderBottom: "1px solid #eee",
                                    width: "100px",
                                  }}
                                >
                                  Price
                                </th>
                                <th
                                  style={{
                                    padding: "10px 12px",
                                    textAlign: "right",
                                    fontSize: "13px",
                                    color: "#555",
                                    fontWeight: "600",
                                    borderBottom: "1px solid #eee",
                                    width: "100px",
                                  }}
                                >
                                  Subtotal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobsheetItems.map((item) => (
                                <tr
                                  key={item.id}
                                  style={{
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "#f9fafc")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  <td
                                    style={{
                                      padding: "12px",
                                      borderBottom: "1px solid #eee",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {item.name}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px",
                                      borderBottom: "1px solid #eee",
                                      textAlign: "center",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {item.quantity}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px",
                                      borderBottom: "1px solid #eee",
                                      textAlign: "right",
                                      fontSize: "14px",
                                    }}
                                  >
                                    ${parseFloat(item.price).toFixed(2)}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px",
                                      borderBottom: "1px solid #eee",
                                      textAlign: "right",
                                      fontWeight: "500",
                                      fontSize: "14px",
                                    }}
                                  >
                                    $
                                    {(
                                      parseFloat(item.price) * item.quantity
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                              <tr style={{ backgroundColor: "#f9fafc" }}>
                                <td
                                  colSpan="3"
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    fontWeight: "600",
                                    fontSize: "14px",
                                  }}
                                >
                                  Products Total:
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#0277BD",
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
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Sección de mano de obra */}
                    <div style={{ marginBottom: "25px" }}>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#333",
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "15px",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginRight: "8px" }}
                        >
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                        Labor and Services
                      </h3>

                      <div
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: "8px",
                          border: "1px solid #eee",
                          overflow: "hidden",
                        }}
                      >
                        {labors.filter((labor) => labor.is_completed === 1)
                          .length === 0 ? (
                          <div
                            style={{
                              padding: "20px",
                              textAlign: "center",
                              color: "#777",
                              backgroundColor: "#fafafa",
                            }}
                          >
                            No completed labor services
                          </div>
                        ) : (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              <tr style={{ backgroundColor: "#f9f9f9" }}>
                                <th
                                  style={{
                                    padding: "10px 12px",
                                    textAlign: "left",
                                    fontSize: "13px",
                                    color: "#555",
                                    fontWeight: "600",
                                    borderBottom: "1px solid #eee",
                                  }}
                                >
                                  Service
                                </th>
                                <th
                                  style={{
                                    padding: "10px 12px",
                                    textAlign: "right",
                                    fontSize: "13px",
                                    color: "#555",
                                    fontWeight: "600",
                                    borderBottom: "1px solid #eee",
                                    width: "120px",
                                  }}
                                >
                                  Cost
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {labors
                                .filter((labor) => labor.is_completed === 1)
                                .map((labor) => (
                                  <tr
                                    key={labor.id}
                                    style={{
                                      transition: "background-color 0.2s",
                                    }}
                                    onMouseOver={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#f9fafc")
                                    }
                                    onMouseOut={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                    }
                                  >
                                    <td
                                      style={{
                                        padding: "12px",
                                        borderBottom: "1px solid #eee",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {labor.description}
                                      {labor.completed_at && (
                                        <div
                                          style={{
                                            fontSize: "12px",
                                            color: "#777",
                                            marginTop: "3px",
                                          }}
                                        >
                                          Completed:{" "}
                                          {new Date(
                                            labor.completed_at
                                          ).toLocaleDateString()}
                                        </div>
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        padding: "12px",
                                        borderBottom: "1px solid #eee",
                                        textAlign: "right",
                                        fontWeight: "500",
                                        fontSize: "14px",
                                      }}
                                    >
                                      ${parseFloat(labor.price || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              <tr style={{ backgroundColor: "#f9fafc" }}>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    fontWeight: "600",
                                    fontSize: "14px",
                                  }}
                                >
                                  Labor Total:
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#0277BD",
                                  }}
                                >
                                  $
                                  {labors
                                    .filter((labor) => labor.is_completed === 1)
                                    .reduce(
                                      (sum, labor) =>
                                        sum + parseFloat(labor.price || 0),
                                      0
                                    )
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Sección de cálculo de impuestos */}
                    <div style={{ marginBottom: "25px" }}>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#333",
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "15px",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="1" x2="12" y2="23"></line>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Taxes and total
                      </h3>

                      {/* Sistema de impuestos */}
                      <div
                        style={{
                          backgroundColor: "#f9f2ff",
                          borderRadius: "10px",
                          border: "1px solid #e7d6ff",
                          padding: "15px",
                          marginBottom: "20px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "15px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "500",
                              color: "#333",
                            }}
                          >
                            Taxes Configuration
                          </div>

                          {/* Aquí necesitamos añadir estados para manejar los impuestos */}
                          {/* Añadir estos estados al componente:
                      const [taxRate, setTaxRate] = useState(0);
                      const [taxName, setTaxName] = useState("");
                      const [taxPreset, setTaxPreset] = useState("none");
                      const [showTaxPresets, setShowTaxPresets] = useState(false); 
                  */}

                          {/* Botón de selección de impuestos */}
                          <div style={{ position: "relative" }}>
                            <button
                              onClick={() => setShowTaxPresets(!showTaxPresets)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                backgroundColor: "#7B1FA2",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                padding: "8px 12px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onMouseOver={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#6A1B9A")
                              }
                              onMouseOut={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#7B1FA2")
                              }
                            >
                              {taxName || `Impuesto (${taxRate}%)`}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>

                            {/* Dropdown de opciones de impuestos */}
                            {showTaxPresets && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  right: 0,
                                  width: "200px",
                                  backgroundColor: "white",
                                  borderRadius: "8px",
                                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                                  marginTop: "5px",
                                  zIndex: 5,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  onClick={() => {
                                    setTaxPreset("standard");
                                    setTaxName("IVA Standard");
                                    setTaxRate(21);
                                    setShowTaxPresets(false);
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f0f0f0",
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "#f9f5fd")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  <div
                                    style={{
                                      fontWeight: "500",
                                      fontSize: "13px",
                                    }}
                                  >
                                    IVA Standard (21%)
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#666",
                                      marginTop: "2px",
                                    }}
                                  ></div>
                                </div>
                                <div
                                  onClick={() => {
                                    setTaxPreset("reduced");
                                    setTaxName("IVA Reduced");
                                    setTaxRate(10.5);
                                    setShowTaxPresets(false);
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f0f0f0",
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "#f9f5fd")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  <div
                                    style={{
                                      fontWeight: "500",
                                      fontSize: "13px",
                                    }}
                                  >
                                    IVA Reduced (10.5%)
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#666",
                                      marginTop: "2px",
                                    }}
                                  ></div>
                                </div>
                                <div
                                  onClick={() => {
                                    setTaxPreset("custom");
                                    setShowTaxPresets(false);
                                    // Prompt para valores personalizados
                                    const name = prompt(
                                      "Nombre del impuesto:",
                                      taxName || "Impuesto"
                                    );
                                    if (name !== null) {
                                      const rate = prompt(
                                        "Tasa de impuesto (%):",
                                        taxRate || "0"
                                      );
                                      if (rate !== null) {
                                        setTaxName(name);
                                        setTaxRate(parseFloat(rate) || 0);
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f0f0f0",
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "#f9f5fd")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  <div
                                    style={{
                                      fontWeight: "500",
                                      fontSize: "13px",
                                    }}
                                  >
                                    Personalized
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#666",
                                      marginTop: "2px",
                                    }}
                                  >
                                    Manual input
                                  </div>
                                </div>
                                <div
                                  onClick={() => {
                                    setTaxPreset("none");
                                    setTaxName("");
                                    setTaxRate(0);
                                    setShowTaxPresets(false);
                                  }}
                                  style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "#f9f5fd")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                      "transparent")
                                  }
                                >
                                  <div
                                    style={{
                                      fontWeight: "500",
                                      fontSize: "13px",
                                    }}
                                  >
                                    Sin Impuesto (0%)
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#666",
                                      marginTop: "2px",
                                    }}
                                  >
                                    0%{" "}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cálculo del impuesto */}
                        {(() => {
                          // Calcular el monto total sin impuestos
                          const totalItems = jobsheetItems.reduce(
                            (sum, item) =>
                              sum + parseFloat(item.price) * item.quantity,
                            0
                          );
                          const totalLabors = labors
                            .filter((labor) => labor.is_completed === 1)
                            .reduce(
                              (sum, labor) =>
                                sum + parseFloat(labor.price || 0),
                              0
                            );
                          const subtotal = totalItems + totalLabors;

                          // Calcular el impuesto
                          const taxAmount = subtotal * (taxRate / 100);
                          const grandTotal = subtotal + taxAmount;

                          return (
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "500",
                                    fontSize: "14px",
                                    color: "#333",
                                  }}
                                >
                                  Subtotal (without taxes):
                                </div>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#333",
                                  }}
                                >
                                  ${subtotal.toFixed(2)}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginTop: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "500",
                                    fontSize: "14px",
                                    color: "#7B1FA2",
                                  }}
                                >
                                  {taxName || "Impuesto"} ({taxRate}%):
                                </div>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#7B1FA2",
                                  }}
                                >
                                  ${taxAmount.toFixed(2)}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: "10px",
                                  paddingTop: "10px",
                                  borderTop: "1px dashed #e6d8ec",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "15px",
                                    color: "#333",
                                  }}
                                >
                                  Total (with taxes):
                                </div>
                                <div
                                  style={{
                                    fontWeight: "700",
                                    fontSize: "15px",
                                    color: "#7B1FA2",
                                  }}
                                >
                                  ${grandTotal.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Sección de generación de facturas */}
                    <div
                      style={{
                        marginBottom: "24px",
                        backgroundColor: "#f9f2ff",
                        padding: "16px",
                        borderRadius: "10px",
                        border: "1px solid #e7d6ff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: "0 0 6px 0",
                              fontSize: "16px",
                              color: "#6A1B9A",
                            }}
                          >
                            Invoice Generation
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              color: "#666",
                            }}
                          >
                            Create a printable invoice with all products,
                            services and taxes
                          </p>
                        </div>
                        <button
                          onClick={handleOpenInvoiceModal}
                          style={{
                            padding: "10px 18px",
                            backgroundColor: "#6A1B9A",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            boxShadow: "0 2px 8px rgba(106, 27, 154, 0.2)",
                            transition: "all 0.2s ease",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#4A148C")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#6A1B9A")
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          Generate Invoice
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel derecho - Historial de pagos y forma de pago */}
                <div
                  style={{
                    width: "40%",
                    padding: "20px",
                    backgroundColor: "#fafbfc",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    height: "100%",
                    minHeight: 0
                  }}
                >
                  <div style={{ marginBottom: "20px", flex: 1, overflowY: "auto", minHeight: 0 }}>
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      Payment History
                    </h3>

                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: "10px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        border: "1px solid #eee",
                        overflow: "hidden",
                        maxHeight: "320px",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ overflowY: "auto", flexGrow: 1 }}>
                        {jobsheetPayments.length === 0 ? (
                          <div
                            style={{
                              padding: "30px 20px",
                              textAlign: "center",
                              backgroundColor: "#fafbfc",
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                backgroundColor: "#f5f5f5",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 12px auto",
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="3"
                                  y="5"
                                  width="18"
                                  height="14"
                                  rx="2"
                                  stroke="#999"
                                  strokeWidth="2"
                                />
                                <line
                                  x1="3"
                                  y1="10"
                                  x2="21"
                                  y2="10"
                                  stroke="#999"
                                  strokeWidth="2"
                                />
                                <line
                                  x1="7"
                                  y1="15"
                                  x2="13"
                                  y2="15"
                                  stroke="#999"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                            <p
                              style={{
                                color: "#666",
                                margin: "0 0 4px 0",
                                fontWeight: "500",
                              }}
                            >
                              No payments registered
                            </p>
                            <p
                              style={{
                                color: "#888",
                                margin: 0,
                                fontSize: "13px",
                              }}
                            >
                              Add a payment using the form below
                            </p>
                          </div>
                        ) : (
                          <div>
                            {jobsheetPayments.map((payment, index) => (
                              <div
                                key={payment.id}
                                style={{
                                  padding: "14px 16px",
                                  borderBottom:
                                    index < jobsheetPayments.length - 1
                                      ? "1px solid #f0f0f0"
                                      : "none",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#f9fafc")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "transparent")
                                }
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "38px",
                                      height: "38px",
                                      backgroundColor:
                                        payment.method === "cash"
                                          ? "#E3F2FD"
                                          : payment.method === "credit_card"
                                          ? "#F3E5F5"
                                          : payment.method === "debit_card"
                                          ? "#E8F5E9"
                                          : payment.method === "transfer"
                                          ? "#FFF8E1"
                                          : payment.method === "check"
                                          ? "#FFEBEE"
                                          : "#ECEFF1",
                                      borderRadius: "8px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color:
                                        payment.method === "cash"
                                          ? "#1976D2"
                                          : payment.method === "credit_card"
                                          ? "#9C27B0"
                                          : payment.method === "debit_card"
                                          ? "#2E7D32"
                                          : payment.method === "transfer"
                                          ? "#FF9800"
                                          : payment.method === "check"
                                          ? "#F44336"
                                          : "#607D8B",
                                    }}
                                  >
                                    {/* Iconos según método de pago */}
                                    {payment.method === "cash" && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect
                                          x="2"
                                          y="6"
                                          width="20"
                                          height="12"
                                          rx="2"
                                          ry="2"
                                        ></rect>
                                        <circle cx="12" cy="12" r="2"></circle>
                                        <path d="M6 12h.01M18 12h.01"></path>
                                      </svg>
                                    )}
                                    {payment.method === "credit_card" && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect
                                          x="1"
                                          y="4"
                                          width="22"
                                          height="16"
                                          rx="2"
                                          ry="2"
                                        ></rect>
                                        <line
                                          x1="1"
                                          y1="10"
                                          x2="23"
                                          y2="10"
                                        ></line>
                                      </svg>
                                    )}
                                    {payment.method === "transfer" && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polyline points="17 1 21 5 17 9"></polyline>
                                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                        <polyline points="7 23 3 19 7 15"></polyline>
                                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                      </svg>
                                    )}
                                    {(payment.method === "debit_card" ||
                                      payment.method === "check" ||
                                      payment.method === "other") && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z"></path>
                                        <polyline points="8 10 12 14 16 10"></polyline>
                                      </svg>
                                    )}
                                  </div>

                                  <div style={{ marginLeft: "14px" }}>
                                    <div
                                      style={{
                                        fontWeight: "500",
                                        fontSize: "14px",
                                        color: "#333",
                                      }}
                                    >
                                      {payment.method === "cash"
                                        ? "Cash"
                                        : payment.method === "credit_card"
                                        ? "Credit Card"
                                        : payment.method === "debit_card"
                                        ? "Debit Card"
                                        : payment.method === "transfer"
                                        ? "Bank Transfer"
                                        : payment.method === "check"
                                        ? "Check"
                                        : "Other"}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#888",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {new Date(
                                        payment.payment_date
                                      ).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      color: "#00C853",
                                      fontSize: "15px",
                                    }}
                                  >
                                    ${parseFloat(payment.amount).toFixed(2)}
                                  </div>

                                  <button
                                    onClick={() =>
                                      handleDeletePayment(payment.id)
                                    }
                                    style={{
                                      backgroundColor: "#fff0f0",
                                      color: "#ff4d4f",
                                      border: "none",
                                      borderRadius: "6px",
                                      width: "28px",
                                      height: "28px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                    }}
                                    onMouseOver={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#ffccc7")
                                    }
                                    onMouseOut={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#fff0f0")
                                    }
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 6h18"></path>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      <line
                                        x1="10"
                                        y1="11"
                                        x2="10"
                                        y2="17"
                                      ></line>
                                      <line
                                        x1="14"
                                        y1="11"
                                        x2="14"
                                        y2="17"
                                      ></line>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {jobsheetPayments.length > 0 && (
                        <div
                          style={{
                            padding: "12px 16px",
                            borderTop: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            backgroundColor: "#f9fafc",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "600",
                              fontSize: "14px",
                              color: "#333",
                            }}
                          >
                            Total paid:
                          </div>
                          <div
                            style={{
                              fontWeight: "700",
                              fontSize: "15px",
                              color: "#00C853",
                            }}
                          >
                            $
                            {jobsheetPayments
                              .reduce(
                                (sum, payment) =>
                                  sum + parseFloat(payment.amount),
                                0
                              )
                              .toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formulario para añadir nuevo pago */}
                  <div style={{ marginBottom: "20px" }}>
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      Add New Payment
                    </h3>

                    {notification.show && (
                      <div
                        style={{
                          padding: "10px 14px",
                          marginBottom: "15px",
                          borderRadius: "8px",
                          backgroundColor:
                            notification.type === "success"
                              ? "#E8F5E9"
                              : "#FFEBEE",
                          border: `1px solid ${
                            notification.type === "success"
                              ? "#C8E6C9"
                              : "#FFCDD2"
                          }`,
                          color:
                            notification.type === "success"
                              ? "#2E7D32"
                              : "#C62828",
                          fontSize: "14px",
                        }}
                      >
                        {notification.message}
                      </div>
                    )}

                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: "10px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        border: "1px solid #eee",
                        padding: "20px",
                      }}
                    >
                      <div style={{ marginBottom: "15px" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#333",
                          }}
                        >
                          Payment Amount ($)
                        </label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="Insert the payment amount"
                          step="0.01"
                          min="0.01"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            border: "1px solid #ddd",
                            fontSize: "15px",
                            backgroundColor: "#f9fafc",
                            transition: "border-color 0.2s",
                            outline: "none",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "#00C853")
                          }
                          onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                        />
                      </div>

                      <div style={{ marginBottom: "20px" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#333",
                          }}
                        >
                          Payment Method
                        </label>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "10px",
                          }}
                        >
                          {[
                            {
                              id: "cash",
                              name: "Cash",
                              color: "#1976D2",
                              bg: "#E3F2FD",
                            },
                            {
                              id: "credit_card",
                              name: "Credit",
                              color: "#9C27B0",
                              bg: "#F3E5F5",
                            },
                            {
                              id: "debit_card",
                              name: "Debit",
                              color: "#2E7D32",
                              bg: "#E8F5E9",
                            },
                            {
                              id: "transfer",
                              name: "Transfer",
                              color: "#FF9800",
                              bg: "#FFF8E1",
                            },
                            {
                              id: "check",
                              name: "Check",
                              color: "#F44336",
                              bg: "#FFEBEE",
                            },
                            {
                              id: "other",
                              name: "Other",
                              color: "#607D8B",
                              bg: "#ECEFF1",
                            },
                          ].map((method) => (
                            <div
                              key={method.id}
                              onClick={() => setPaymentMethod(method.id)}
                              style={{
                                backgroundColor:
                                  paymentMethod === method.id
                                    ? method.bg
                                    : "#f9fafc",
                                border: `1px solid ${
                                  paymentMethod === method.id
                                    ? method.color
                                    : "#ddd"
                                }`,
                                borderRadius: "8px",
                                padding: "10px",
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.2s",
                              }}
                              onMouseOver={(e) => {
                                if (paymentMethod !== method.id) {
                                  e.currentTarget.style.backgroundColor =
                                    "#f0f0f0";
                                }
                              }}
                              onMouseOut={(e) => {
                                if (paymentMethod !== method.id) {
                                  e.currentTarget.style.backgroundColor =
                                    "#f9fafc";
                                }
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: "500",
                                  fontSize: "13px",
                                  color:
                                    paymentMethod === method.id
                                      ? method.color
                                      : "#555",
                                }}
                              >
                                {method.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleAddPayment}
                        style={{
                          width: "100%",
                          padding: "12px",
                          backgroundColor: "#00C853",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "15px",
                          transition: "background-color 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#00B248")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#00C853")
                        }
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTop: "2px solid white",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }}
                          ></div>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Record Payment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie del modal */}
              <div
                style={{
                  padding: "15px 24px",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  display: "flex",
                  justifyContent: "flex-end",
                  backgroundColor: "#fafbfc",
                }}
              >
                <button
                  onClick={() => setShowPaymentsModal(false)}
                  style={{
                    padding: "10px 24px",
                    backgroundColor: "#5932EA",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 6px rgba(89, 50, 234, 0.2)",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
{showInvoiceModalFromPayments && currentJobsheet && (
  <Invoice
    isOpen={showInvoiceModalFromPayments}
    onClose={() => setShowInvoiceModalFromPayments(false)}
    jobsheet={currentJobsheet}
    items={jobsheetItems}
    labors={labors}
    payments={jobsheetPayments}
    taxName={taxName}
    taxRate={taxRate}
  />
)}
        <style>
          {`
            @keyframes modalFadeIn {
              0% { opacity: 0; transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from { transform: translateX(20px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg);}
              100% { transform: rotate(360deg);}
            }
          `}
        </style>
{showLaborModal && currentJobsheet && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(40,40,60,0.25)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(2px)"
  }}>
    <div style={{
      background: "#fff",
      borderRadius: 18,
      width: 800,
      maxWidth: "95vw",
      maxHeight: "90vh",
      boxShadow: "0 8px 32px rgba(60,60,100,0.18)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Header with vehicle data */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px 12px 28px",
        borderBottom: "1px solid #f0f0f0",
        background: "#f7f7fb"
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#333" }}>
            Labor & Services
          </h2>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4, display: "flex", alignItems: "center", gap: 16 }}>
            <span><strong>Customer:</strong> {currentJobsheet.customer_name || "Customer"}</span>
            <span><strong>Vehicle:</strong> {currentJobsheet.vehicle_model || "Vehicle"}</span>
            <span><strong>Plate:</strong> {currentJobsheet.license_plate || "No plate"}</span>
          </div>
        </div>
        <button onClick={() => setShowLaborModal(false)} style={{
          background: "#f2f2f7",
          border: "none",
          borderRadius: "50%",
          width: 38,
          height: 38,
          fontSize: 22,
          color: "#666",
          cursor: "pointer",
          fontWeight: 700,
          transition: "background 0.2s"
        }}>×</button>
      </div>
      <div style={{ padding: "28px", background: "#f9faff", flex: 1, overflowY: "auto" }}>
        {labors.length === 0 ? (
          <div style={{ backgroundColor: "#f9faff", padding: 40, textAlign: "center", borderRadius: 12, border: "1px dashed #ccc", color: "#888" }}>
            <div style={{ fontSize: 18, marginBottom: 10 }}>No labor/services registered</div>
            <div style={{ fontSize: 15 }}>This job sheet has no labor or service tasks yet.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {labors.map(labor => (
              <div key={labor.id} style={{
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 4px rgba(60,60,100,0.06)",
                display: "flex",
                alignItems: "flex-start",
                gap: 18,
                position: "relative"
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: labor.is_completed === 1 ? "#e8f5e9" : "#f4f4f4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  color: labor.is_completed === 1 ? "#00AB55" : "#aaa"
                }}>
                  {labor.is_completed === 1 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00AB55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 17, color: "#333", marginBottom: 4 }}>{labor.description}</div>
                  <div style={{ fontSize: 14, color: labor.is_completed === 1 ? "#00AB55" : "#888", marginBottom: 6 }}>
                    {labor.is_completed === 1 ? "Completed" : "Pending"}
                  </div>
                  <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
                    <strong>Price:</strong> ${parseFloat(labor.price || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 13, color: labor.tracking_notes ? "#444" : "#aaa", fontStyle: labor.tracking_notes ? "normal" : "italic", background: "#f7f9fc", borderRadius: 8, padding: 10, marginTop: 4 }}>
                    {labor.tracking_notes || 'No technical notes for this task.'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}
{showDeleteModal && (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000
  }}>
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 32,
      minWidth: 320,
      boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <h2 style={{margin: 0, marginBottom: 16, fontSize: 20, color: '#C62828'}}>Confirm Deletion</h2>
      <p style={{margin: 0, marginBottom: 24, color: '#444', textAlign: 'center'}}>
        Are you sure you want to delete this jobsheet?<br/>This action cannot be undone.
      </p>
      <div style={{display: 'flex', gap: 16}}>
        <button
          onClick={() => setShowDeleteModal(false)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmDelete}
          style={{
            padding: '10px 18px',
            backgroundColor: '#C62828',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </>
  );
};

export default JobsheetView;
