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
  faMoneyBillWave,
  faCheck,
  faPlus,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Invoice from "../components/invoice";
import CreateJobsheetModal from '../pages/createJobsheeModal';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';
import Joyride, { STATUS } from 'react-joyride';

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
  const [showCancelModal, setShowCancelModal] = useState(false);
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
  const [laborIsBilled, setLaborIsBilled] = useState(false);  
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
  const [showBillingConfirmModal, setShowBillingConfirmModal] = useState(false);
  const [laborToUnbill, setLaborToUnbill] = useState(null);
  const [editingJobsheet, setEditingJobsheet] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;
  const [formData, setFormData] = useState({
    customer_id: "",
    vehicle_id: "",
    description: "",
    state: "pending",
    date_created: new Date().toISOString().split("T")[0],
  });

  // Add states for the guided tour
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([
    {
      target: '.labor-task-list',
      content: 'This area displays all labor tasks for the current job sheet. Tasks are color-coded based on their completion status.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '.add-labor-form',
      content: 'Add new labor or service tasks using this form. Fill in the description, price, and any technical notes.',
      placement: 'right',
    },
    {
      target: '.billing-toggle',
      content: 'Toggle whether a task should be included in the final invoice. Billing items require a price while non-billing items don\'t.',
      placement: 'top',
    },
    {
      target: '.labor-tracking-notes',
      content: 'Add technical notes to track progress and document important details about the work performed.',
      placement: 'bottom',
    },
    {
      target: '.labor-actions',
      content: 'Manage tasks using these action buttons. Mark tasks as complete, edit notes, or remove tasks as needed.',
      placement: 'left',
    },
    {
      target: '.labor-summary',
      content: 'View a summary of all labor tasks, including completion stats and total value of work performed.',
      placement: 'top',
    },
  ]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
    }
  };

  const columnDefs = [
     {
       headerName: "ID",
       field: "id",
       width: 0,
       suppressMenu: true,
       headerClass: "custom-header",
     },
     {
       headerName: "Customer",
       field: "customer_name",
       width: 140,
       suppressMenu: true,
       headerClass: "custom-header",
     },
     {
       headerName: "Model",
       field: "vehicle_model",
       suppressMenu: true,
       headerClass: "custom-header",
     },
     {
      headerName: "Plate",
      field: "license_plate",
      suppressMenu: true,
      headerClass: "custom-header",
      width: 120,
      cellRenderer: (params) => {
        if (!params.data) return null;
        // Simplemente devolver el texto de la placa sin formato especial
        return <div>{params.value || ""}</div>;
      },
    },
     {
       headerName: "Created",
       field: "created_at",
       suppressMenu: true,
       headerClass: "custom-header",
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
            {params.data.state !== "cancelled" && (
              <ActionButton
                icon={faTrash}
                onClick={() => handleCancel(params.data)}
                tooltip="Cancel Job Sheet"
                type="danger"
              />
            )}
          </ActionButtonsContainer>
        );
      },
    },
  ];

  const renderPlate = (plate) => {
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
  };

  const onGridReady = (params) => {
    gridRef.current = params.api;
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
      let url = `${API_URL}/jobsheets`;
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
      let url = `${API_URL}/jobsheets`;
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
        `${API_URL}/jobsheets/${jobsheet.id}`,
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
          `${API_URL}/jobsheets/payments/jobsheet/${freshJobsheet.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // 2. NEW: Fetch items for this jobsheet
        const itemsResponse = await fetch(
          `${API_URL}/jobsheets/${freshJobsheet.id}/items`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // 3. NEW: Fetch labors for this jobsheet
        const laborsResponse = await fetch(
          `${API_URL}/labor/jobsheet/${freshJobsheet.id}`,
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

      const response = await fetch(`${API_URL}/jobsheets/payments`, {
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
         const updatedTotalPaid = [...jobsheetPayments, {
        amount: parseFloat(paymentAmount)
      }].reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
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
        if (updatedTotalPaid >= subtotal && currentJobsheet.state !== "completed") {
          await updateJobsheetStatus(currentJobsheet.id, "completed");
          setNotification({
            show: true,
            message: "Payment complete. Jobsheet status updated to Completed.",
            type: "success",
          });
        }
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
  const updateJobsheetStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const getResponse = await fetch(`${API_URL}/jobsheets/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!getResponse.ok) return;
      const jobsheetData = await getResponse.json();
  
      await fetch(`${API_URL}/jobsheets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicle_id: jobsheetData.vehicle_id,
          customer_id: jobsheetData.customer_id,
          state: newStatus
        }),
      });
      
      // Update local state
      fetchJobsheets(searchTerm, statusFilter);
    } catch (error) {
      console.error("Error updating jobsheet status:", error);
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
      const url = `${API_URL}/jobsheets/payments/jobsheet/${jobsheetId}`;
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
        `${API_URL}/jobsheets/payments/${paymentId}`,
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
          `${API_URL}/customers?search=${encodeURIComponent(value)}`,
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
    setEditingJobsheet(jobsheet);
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
        `${API_URL}/jobsheets/${jobsheet.id}/items`,
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
      const response = await fetch(`${API_URL}/jobsheets/items`, {
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

      const responseData = await response.text();
      let errorMessage = responseData;

      try {
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
        `${API_URL}/jobsheets/${jobsheetId}/items`,
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
        `${API_URL}/jobsheets/items/${itemId}`,
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
    const statusCycle = ["pending", "in progress", "completed"];

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

      const getResponse = await fetch(`${API_URL}/jobsheets/${id}`, {
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

      const response = await fetch(`${API_URL}/jobsheets/${id}`, {
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
      const response = await fetch(`${API_URL}/customers`, {
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
      let url = `${API_URL}/vehicles`;
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

  const handleCancel = (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    const token = localStorage.getItem("token");
    if (!token || !currentJobsheet) {
      console.error("No token found or no jobsheet selected");
      return;
    }

    try {
      const getResponse = await fetch(`${API_URL}/jobsheets/${currentJobsheet.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!getResponse.ok) {
        console.error("Error getting jobsheet:", getResponse.status);
        return;
      }
      
      const jobsheetData = await getResponse.json();

      const response = await fetch(`${API_URL}/jobsheets/${currentJobsheet.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicle_id: jobsheetData.vehicle_id,
          customer_id: jobsheetData.customer_id,
          state: "cancelled"
        }),
      });

      if (response.ok) {
        setShowCancelModal(false);
        fetchJobsheets(searchTerm);
        setNotification({
          show: true,
          message: "Jobsheet successfully cancelled",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      } else {
        console.error("Error cancelling jobsheet:", response.status);
        setNotification({
          show: true,
          message: "Error cancelling jobsheet",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 3000);
      }
    } catch (error) {
      console.error("Error cancelling jobsheet:", error);
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
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
          `${API_URL}/inventory?search=${encodeURIComponent(value)}`,
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
        `${API_URL}/labor/jobsheet/${jobsheetId}`,
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
      setTimeout(() => setNotification({ show: false }), 6000);
      return;
    }
  
    // Solo validar el precio si se va a facturar
    if (laborIsBilled && (!laborPrice || parseFloat(laborPrice) <= 0)) {
      setNotification({
        show: true,
        message: "Please enter a valid price for billable labor",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 6000);
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      setIsLoading(true);
  
      // Si no es facturable, establecer explícitamente el precio como 0
      const priceToSend = laborIsBilled ? (laborPrice ? parseFloat(laborPrice) : 0) : 0;
  
      const response = await fetch(`${API_URL}/labor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobsheet_id: currentJobsheet.id,
          description: laborDescription,
          price: priceToSend,
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
          message: `Labor "${laborDescription}" added successfully`,
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 6000);
      } else {
        const errorData = await response.text();
        console.error("Error adding labor:", errorData);
  
        setNotification({
          show: true,
          message: "Error adding labor",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 6000);
      }
    } catch (error) {
      console.error("Error adding labor:", error);
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 6000);
    } finally {
      setIsLoading(false);
    }
  };


  
  const handleUpdateLabor = async (id, updates) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      setIsLoading(true);
  
      // Encontrar la labor actual para verificar sus datos
      const currentLabor = labors.find((labor) => labor.id === id);
      
      // Solo validar precio si se está completando Y está marcada para facturación
      if (updates.is_completed === 1 && !updates.price && currentLabor && currentLabor.is_billed === 1) {
        // Verificar si ya existe un precio
        if (!currentLabor.price || parseFloat(currentLabor.price) <= 0) {
          setNotification({
            show: true,
            message: "Please enter a valid price for billable labor",
            type: "error",
          });
          setTimeout(() => setNotification({ show: false }), 6000);
          return;
        }
      }
  
      const response = await fetch(`${API_URL}/labor/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
  
      if (response.ok) {
        fetchLabors(currentJobsheet.id);
        fetchJobsheets(searchTerm, statusFilter);
  
        setNotification({
          show: true,
          message: "Labor updated successfully",
          type: "success",
        });
        setTimeout(() => setNotification({ show: false }), 6000);
      } else {
        const errorData = await response.text();
        console.error("Error updating labor:", errorData);
  
        setNotification({
          show: true,
          message: "Error updating labor",
          type: "error",
        });
        setTimeout(() => setNotification({ show: false }), 6000);
      }
    } catch (error) {
      console.error("Error updating labor:", error);
      setNotification({
        show: true,
        message: "Error: " + error.message,
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 6000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLaborTracking = async (laborId, notes) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      setIsLoading(true);
      const response = await fetch(`${API_URL}/labor/${laborId}`, {
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

      const response = await fetch(`${API_URL}/labor/${id}`, {
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
    let updates;
    
    // Modificar la función para también resetear el precio cuando se desmarca is_billed
    if (labor.is_billed === 1) {
      // Si estaba marcado y lo vamos a desmarcar, reseteamos el precio a cero
      updates = {
        is_billed: 0,
        price: 0  // Resetear el precio cuando no se va a facturar
      };
    } else {
      // Si no estaba marcado y lo vamos a marcar, solo cambiamos is_billed
      updates = {
        is_billed: 1
      };
    }
    await handleUpdateLabor(labor.id, updates);
  };

  const refreshCurrentJobsheetData = async () => {
    if (!currentJobsheet) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      // Refresca jobsheet
      const response = await fetch(`${API_URL}/jobsheets/${currentJobsheet.id}`, {
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
      const itemsResponse = await fetch(`${API_URL}/jobsheets/${currentJobsheet.id}/items`, {
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
      const laborsResponse = await fetch(`${API_URL}/labor/jobsheet/${currentJobsheet.id}`, {
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
      const paymentsResponse = await fetch(`${API_URL}/jobsheets/payments/jobsheet/${currentJobsheet.id}`, {
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

  // Calcular el total de productos y labores completadas
  const totalItems = jobsheetItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const totalLabors = labors.filter(labor => labor.is_completed === 1).reduce((sum, labor) => sum + parseFloat(labor.price || 0), 0);
  const subtotal = totalItems + totalLabors;

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
  refreshJobsheets={fetchJobsheets}
  editingJobsheet={editingJobsheet}
/>
)}
        




        {showItemsModal && currentJobsheet && (
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
                borderRadius: "12px",
                width: "850px",
                maxHeight: "90vh",
                boxShadow:
                  "0 10px 30px rgba(0,0,0,0.15), 0 1px 8px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "modalFadeIn 0.3s ease",
              }}
            >
              {/* Header Bar with improved styling */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 24px",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  backgroundColor: "#5932EA",
                  color: "white",
                }}
              >
                <div>
                  <h2
                    style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}
                  >
                    Manage Items
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      opacity: "0.8",
                      fontSize: "14px",
                    }}
                  >
                    Job Sheet #{currentJobsheet.id} •{" "}
                    {currentJobsheet.customer_name || "Customer"}
                  </p>
                </div>
                <button
                  onClick={() => setShowItemsModal(false)}
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

              {/* Main content area - split layout */}
              <div style={{ display: "flex", height: "calc(90vh - 160px)" }}>
                {/* Left panel - Current items */}
                <div
                  style={{
                    width: "55%",
                    padding: "20px 24px",
                    borderRight: "1px solid rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#333",
                      }}
                    >
                      Current Items
                    </h3>
                    <div
                      style={{
                        backgroundColor: "#f0f8ff",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        color: "#5932EA",
                        fontSize: "14px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 12V16"
                          stroke="#5932EA"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#5932EA"
                          strokeWidth="2"
                        />
                      </svg>
                      {jobsheetItems.length} items · $
                      {jobsheetItems
                        .reduce(
                          (sum, item) =>
                            sum + parseFloat(item.price) * item.quantity,
                          0
                        )
                        .toFixed(2)}
                    </div>
                  </div>

                  <div
                    style={{
                      overflowY: "auto",
                      flexGrow: 1,
                      backgroundColor:
                        jobsheetItems.length > 0 ? "transparent" : "#f9fafc",
                      borderRadius: jobsheetItems.length > 0 ? "0" : "8px",
                    }}
                  >
                    {jobsheetItems.length === 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "60px 20px",
                          color: "#8c8c8c",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "70px",
                            height: "70px",
                            backgroundColor: "#F5F5F5",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "16px",
                          }}
                        >
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
                              stroke="#AAAAAA"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7"
                              stroke="#AAAAAA"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M12 12V16"
                              stroke="#AAAAAA"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M9 14H15"
                              stroke="#AAAAAA"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "16px",
                            fontWeight: "500",
                          }}
                        >
                          No items added yet
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            maxWidth: "260px",
                          }}
                        >
                          Use the search on the right to find and add items to
                          this job sheet
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: "4px" }}>
                        {jobsheetItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: "12px",
                              padding: "12px",
                              borderRadius: "8px",
                              backgroundColor: "white",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                              border: "1px solid rgba(0,0,0,0.05)",
                              transition: "transform 0.2s, box-shadow 0.2s",
                              position: "relative",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform =
                                "translateY(-1px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 6px rgba(0,0,0,0.08)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 1px 3px rgba(0,0,0,0.08)";
                            }}
                          >
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                backgroundColor: "#f0f0ff",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: "#5932EA",
                                fontSize: "18px",
                                fontWeight: "600",
                              }}
                            >
                              {item.name.charAt(0).toUpperCase()}
                            </div>

                            <div
                              style={{
                                marginLeft: "14px",
                                flexGrow: 1,
                                width: "calc(100% - 180px)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "15px",
                                  fontWeight: "600",
                                  color: "#333",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {item.name}
                              </div>
                              <div
                                style={{
                                  fontSize: "14px",
                                  color: "#888",
                                  marginTop: "2px",
                                }}
                              >
                                ${parseFloat(item.price).toFixed(2)} per unit
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                marginLeft: "8px",
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#f9fafc",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                }}
                              >
                                {item.quantity}
                              </div>
                              <div
                                style={{
                                  margin: "0 12px",
                                  fontSize: "15px",
                                  fontWeight: "600",
                                  color: "#5932EA",
                                }}
                              >
                                $
                                {(
                                  parseFloat(item.price) * item.quantity
                                ).toFixed(2)}
                              </div>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
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
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#ffd6d6";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "#fff0f0";
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} size="sm" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Total area */}
                        <div
                          style={{
                            marginTop: "20px",
                            padding: "16px",
                            borderRadius: "8px",
                            backgroundColor: "#f8f9ff",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            border: "1px solid rgba(89, 50, 234, 0.1)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ color: "#666", fontSize: "14px" }}>
                              Subtotal
                            </div>
                            <div
                              style={{ fontWeight: "500", fontSize: "14px" }}
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
                            </div>
                          </div>
                          <div
                            style={{
                              marginTop: "12px",
                              display: "flex",
                              justifyContent: "space-between",
                              paddingTop: "12px",
                              borderTop: "1px dashed rgba(0,0,0,0.1)",
                            }}
                          >
                            <div
                              style={{
                                color: "#333",
                                fontSize: "16px",
                                fontWeight: "600",
                              }}
                            >
                              Total
                            </div>
                            <div
                              style={{
                                color: "#5932EA",
                                fontWeight: "600",
                                fontSize: "16px",
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
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right panel - Add new items */}
                <div
                  style={{
                    width: "45%",
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    backgroundColor: "#fafbfc",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    Add Items
                  </h3>

                  {/* Search bar with improved styling */}
                  <div style={{ position: "relative", marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "white",
                        border: "1px solid #e0e0e0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        borderRadius: "8px",
                        padding: "0 8px",
                        transition: "all 0.2s",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#5932EA";
                        e.currentTarget.style.boxShadow =
                          "0 0 0 3px rgba(89, 50, 234, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e0e0e0";
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0,0,0,0.05)";
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faSearch}
                        style={{
                          color: "#5932EA",
                          margin: "0 10px",
                        }}
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search inventory by name or SKU..."
                        value={inventorySearchTerm}
                        onChange={handleInventorySearch}
                        onFocus={() => setShowInventoryResults(true)}
                        style={{
                          flex: 1,
                          border: "none",
                          outline: "none",
                          padding: "12px 0",
                          fontSize: "14px",
                          backgroundColor: "transparent",
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
                            fontSize: "14px",
                            color: "#999",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: "6px",
                          }}
                        >
                          ×
                        </button>
                      )}
                      {isLoading && (
                        <div
                          style={{
                            width: "18px",
                            height: "18px",
                            border: "2px solid rgba(89, 50, 234, 0.1)",
                            borderLeft: "2px solid #5932EA",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            marginRight: "10px",
                          }}
                        ></div>
                      )}
                    </div>

                    {/* Search results */}
                    {showInventoryResults && filteredInventory.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 8px)",
                          left: 0,
                          right: 0,
                          backgroundColor: "white",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          maxHeight: "300px",
                          overflowY: "auto",
                          zIndex: 10,
                          boxShadow:
                            "0 6px 16px -8px rgba(0,0,0,0.1), 0 9px 28px 0 rgba(0,0,0,0.05)",
                        }}
                      >
                        {filteredInventory.map((item, index) => (
                          <div
                            key={item.id}
                            className="inventory-item"
                            tabIndex="0"
                            onClick={() => handleSelectInventoryItem(item)}
                            style={{
                              padding: "12px 16px",
                              cursor: "pointer",
                              borderBottom:
                                index < filteredInventory.length - 1
                                  ? "1px solid #f0f0f0"
                                  : "none",
                              transition: "background-color 0.2s",
                              display: "flex",
                              alignItems: "center",
                              outline: "none",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "#f5f5f5")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor = "transparent")
                            }
                          >
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                backgroundColor: "#5932EA10",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: "12px",
                                color: "#5932EA",
                                fontWeight: "600",
                                fontSize: "16px",
                              }}
                            >
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{ fontWeight: "500", fontSize: "14px" }}
                              >
                                {item.name}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: "2px",
                                }}
                              >
                                <div
                                  style={{ fontSize: "14px", color: "#666" }}
                                >
                                  <span>SKU: {item.sku || "N/A"}</span>
                                  <span
                                    style={{
                                      marginLeft: "12px",
                                      color:
                                        item.stock > 0 ? "#2e7d32" : "#d32f2f",
                                      padding: "1px 6px",
                                      backgroundColor:
                                        item.stock > 0 ? "#e8f5e9" : "#ffebee",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: "500",
                                    }}
                                  >
                                    {item.stock > 0
                                      ? `${item.stock} in stock`
                                      : "No stock"}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    color: "#5932EA",
                                    fontSize: "14px",
                                  }}
                                >
                                  ${parseFloat(item.sale).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty search results */}
                    {showInventoryResults &&
                      inventorySearchTerm &&
                      filteredInventory.length === 0 &&
                      !isLoading && (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 8px)",
                            left: 0,
                            right: 0,
                            padding: "20px",
                            backgroundColor: "white",
                            border: "1px solid #e0e0e0",
                            borderRadius: "8px",
                            color: "#666",
                            fontSize: "14px",
                            textAlign: "center",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          <div style={{ marginBottom: "8px" }}>
                            <svg
                              width="36"
                              height="36"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M15.5 15.5L19 19"
                                stroke="#AAAAAA"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="11"
                                cy="11"
                                r="6"
                                stroke="#AAAAAA"
                                strokeWidth="2"
                              />
                              <path
                                d="M8 11H14"
                                stroke="#AAAAAA"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <p style={{ margin: "0", fontWeight: "500" }}>
                            No results found
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              color: "#888",
                              fontSize: "14px",
                            }}
                          >
                            We couldn't find any products that match "
                            {inventorySearchTerm}"
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Selected item preview */}
                  {newItem.product_id ? (
                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "white",
                        borderRadius: "8px",
                        border: "1px solid #e0e4ff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        animation: "fadeIn 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            backgroundColor: "#f0f0ff",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            color: "#5932EA",
                            fontSize: "18px",
                            fontWeight: "600",
                          }}
                        >
                          {newItem.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ marginLeft: "14px", flex: 1 }}>
                          <div style={{ fontWeight: "600", fontSize: "16px" }}>
                            {newItem.name}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#5932EA",
                              marginTop: "4px",
                            }}
                          >
                            ${parseFloat(newItem.price).toFixed(2)} per unit
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "#f8f9ff",
                          padding: "12px 16px",
                          borderRadius: "6px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "14px",
                              color: "#666",
                              marginBottom: "6px",
                            }}
                          >
                            Quantity
                          </label>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <button
                              onClick={() =>
                                setNewItem({
                                  ...newItem,
                                  quantity: Math.max(1, newItem.quantity - 1),
                                })
                              }
                              style={{
                                width: "30px",
                                height: "30px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #ddd",
                                borderRadius: "4px 0 0 4px",
                                cursor: "pointer",
                                fontSize: "16px",
                              }}
                            >
                              −
                            </button>

                            <input
                              type="number"
                              value={newItem.quantity}
                              min="1"
                              onChange={(e) =>
                                setNewItem({
                                  ...newItem,
                                  quantity: parseInt(e.target.value) || 1,
                                })
                              }
                              style={{
                                width: "50px",
                                textAlign: "center",
                                padding: "5px 0",
                                border: "1px solid #ddd",
                                borderLeft: "none",
                                borderRight: "none",
                                outline: "none",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            />

                            <button
                              onClick={() =>
                                setNewItem({
                                  ...newItem,
                                  quantity: newItem.quantity + 1,
                                })
                              }
                              style={{
                                width: "30px",
                                height: "30px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#f0f0f0",
                                border: "1px solid #ddd",
                                borderRadius: "0 4px 4px 0",
                                cursor: "pointer",
                                fontSize: "16px",
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              marginBottom: "6px",
                              textAlign: "right",
                            }}
                          >
                            Total
                          </div>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#5932EA",
                              fontSize: "16px",
                            }}
                          >
                            $
                            {(
                              parseFloat(newItem.price) * newItem.quantity
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleAddItem}
                        style={{
                          marginTop: "16px",
                          width: "100%",
                          padding: "12px",
                          backgroundColor: "#5932EA",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#4321C9")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#5932EA")
                        }
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderLeft: "2px solid white",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }}
                          ></div>
                        ) : (
                          <>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 5V19"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M5 12H19"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                            Add to Job Sheet
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          setNewItem({
                            name: "",
                            quantity: 1,
                            price: 0,
                            product_id: null,
                          })
                        }
                        style={{
                          marginTop: "8px",
                          width: "100%",
                          padding: "8px",
                          backgroundColor: "transparent",
                          color: "#666",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "30px 20px",
                        backgroundColor: "white",
                        borderRadius: "8px",
                        border: "1px dashed #ddd",
                      }}
                    >
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          backgroundColor: "#f5f5fc",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "16px",
                        }}
                      >
                        <svg
                          width="30"
                          height="30"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z"
                            stroke="#5932EA"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3.27002 6.96002L12 12L20.73 6.96002"
                            stroke="#5932EA"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 22.08V12"
                            stroke="#5932EA"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "16px",
                          fontWeight: "500",
                          color: "#333",
                        }}
                      >
                        Select an item to add
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#888",
                          textAlign: "center",
                          maxWidth: "240px",
                        }}
                      >
                        Use the search box above to find products in your
                        inventory
                      </p>
                    </div>
                  )}

                  {/* Notification */}
                  {notification.show && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "20px",
                        right: "20px",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor:
                          notification.type === "success"
                            ? "#f0fff6"
                            : "#fff0f0",
                        border: `1px solid ${
                          notification.type === "success"
                            ? "#b7f0d1"
                            : "#ffccc7"
                        }`,
                        color:
                          notification.type === "success"
                            ? "#389e0d"
                            : "#cf1322",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        maxWidth: "280px",
                        zIndex: 1100,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        animation: "slideIn 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor:
                            notification.type === "success"
                              ? "#d9f7be"
                              : "#ffccc7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {notification.type === "success" ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20 6L9 17L4 12"
                              stroke="#389e0d"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M18 6L6 18"
                              stroke="#cf1322"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M6 6L18 18"
                              stroke="#cf1322"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: "500", fontSize: "14px" }}>
                          {notification.type === "success"
                            ? "Success"
                            : "Error"}
                        </div>
                        <div style={{ fontSize: "14px", marginTop: "2px" }}>
                          {notification.message}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions */}
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                  display: "flex",
                  justifyContent: "flex-end",
                  backgroundColor: "#fafbfc",
                }}
              >
                <button
                  onClick={() => setShowItemsModal(false)}
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

              {/* CSS Keyframes */}
              <style jsx>{`
                @keyframes modalFadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
                @keyframes slideIn {
                  from {
                    transform: translateX(20px);
                    opacity: 0;
                  }
                  to {
                    transform: translateX(0);
                    opacity: 1;
                  }
                }
              `}</style>
            </div>
          </div>
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
                        <div style={{ fontSize: "22px", fontWeight: "700", color: "#0277BD", display: "flex", alignItems: "baseline" }}>
  ${subtotal.toFixed(2)}
  <span style={{ fontSize: "14px", fontWeight: "400", color: "#777", marginLeft: "5px" }}>+ taxes</span>
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
                              currentJobsheet.amount_paid >= currentJobsheet.total_amount
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
                        >
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1-7.94-7.94l-3.76 3.76z"></path>
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
                          const totalItems = jobsheetItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

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
        boxShadow: "0 10px 30px rgba(0,0,0,0.15), 0 1px 8px rgba(0,0,0,0.12)",
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
          background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
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
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <FontAwesomeIcon icon={faTools} style={{ fontSize: '24px' }}/>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
              Labor & Services Management
            </h2>
          </div>
          <p style={{ margin: "4px 0 0 0", opacity: "0.9", fontSize: "14px" }}>
            Job Sheet #{currentJobsheet.id} • {currentJobsheet.customer_name || "Customer"} • {currentJobsheet.vehicle_model || "Vehicle"}
          </p>
        </div>
        <button
          onClick={() => setShowLaborModal(false)}
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

      {/* Contenido principal - Vista dividida */}
      <div style={{ display: "flex", height: "calc(92vh - 140px)" }}>
        {/* Panel izquierdo - Lista de tareas */}
        <div
          style={{
            width: "60%",
            borderRight: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            maxHeight: "calc(92vh - 140px)",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "600",
                color: "#333",
              }}
            >
              Labor Tasks List
            </h3>
            <div
              style={{
                backgroundColor: "#fff3e0",
                padding: "6px 12px",
                borderRadius: "6px",
                color: "#FF9800",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 8V12L15 15" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="#FF9800" strokeWidth="2" />
              </svg>
              {labors.length} tasks
            </div>
          </div>

          {labors.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                color: "#8c8c8c",
                textAlign: "center",
                backgroundColor: "#fafafa",
                borderRadius: "10px",
                border: "1px dashed #ddd",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  backgroundColor: "#fff3e0",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <FontAwesomeIcon icon={faTools} style={{ fontSize: '30px', color: '#FF9800' }} />
              </div>
              <p style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "500" }}>
                No labor tasks added yet
              </p>
              <p style={{ margin: 0, fontSize: "14px", maxWidth: "260px" }}>
                Use the form on the right to add labor or service tasks to this job sheet
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {labors.map(labor => (
                <div
                  key={labor.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    border: `1px solid ${labor.is_completed === 1 ? "#c8e6c9" : "#e0e0e0"}`,
                    padding: "16px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    position: "relative",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                  }}
                >
                  {/* Status badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: labor.is_completed === 1 ? "#e8f5e9" : "#fff3e0",
                      color: labor.is_completed === 1 ? "#2e7d32" : "#e65100",
                      border: `1px solid ${labor.is_completed === 1 ? "#c8e6c9" : "#ffe0b2"}`,
                    }}
                  >
                    {labor.is_completed === 1 ? "Completed" : "Pending"}
                  </div>
                  
                  {/* Header */}
                  <div style={{ marginRight: "70px", marginBottom: "10px" }}>
                    <div style={{ fontWeight: "600", fontSize: "16px", color: "#333" }}>
                      {labor.description}
                    </div>
                    <div style={{ fontSize: "13px", color: "#757575", marginTop: "4px" }}>
                      {labor.completed_at ? `Completed: ${new Date(labor.completed_at).toLocaleDateString()}` : "Not completed yet"}
                    </div>
                  </div>

                  {/* Price & Technical Notes */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start", 
                    marginTop: "10px" 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", color: "#757575", marginBottom: "4px" }}>
                        Technical Notes
                      </div>
                      <div style={{ 
                        fontSize: "14px", 
                        color: "#444",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        maxHeight: "60px",
                        overflowY: "auto"
                      }}>
                        {labor.tracking_notes || "No technical notes available"}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: "16px", marginBottom: "8px" }}>
  <button
    onClick={(e) => {
      // Show confirmation only when unbilling
      if (labor.is_billed === 1) {
        e.preventDefault();
        setLaborToUnbill(labor);
        setShowBillingConfirmModal(true);
        return;
      }
      handleToggleLaborBilled(labor);
    }}
    title={labor.is_billed === 1 ? "Haz clic para quitar de la facturación" : "Haz clic para incluir en la facturación"}
    style={{
      width: "100%",
      padding: "14px 16px",
      borderRadius: "10px",
      backgroundColor: labor.is_billed === 1 ? "#e3f2fd" : "#f5f5f5",
      border: `1px solid ${labor.is_billed === 1 ? "#bbdefb" : "#e0e0e0"}`,
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      transition: "all 0.2s ease",
      color: labor.is_billed === 1 ? "#1976d2" : "#9e9e9e",
      fontWeight: "500",
      fontSize: "15px"
    }}
  >
    {/* Lado izquierdo - Etiqueta de facturación */}
    <div style={{ display: "flex", alignItems: "center" }}>
      <FontAwesomeIcon 
        icon={faMoneyBillWave} 
        style={{ 
          fontSize: '18px',
          marginRight: "12px"
        }} 
      />
      <span>{labor.is_billed === 1 ? "Included in billing" : "Not billed"}</span>
    </div>
    
    {/* Lado derecho - Precio o indicador */}
    {labor.is_billed === 1 ? (
      editingLaborId === labor.id ? (
        <div 
          style={{ 
            position: "relative",
            width: "120px",
            height: "34px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            overflow: "hidden"
          }}
          onClick={(e) => e.stopPropagation()} 
        >
          <span style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#1976d2",
            fontSize: "15px",
            zIndex: 2
          }}>$</span>
          <input
            type="number"
            value={editedLaborPrice}
            onChange={(e) => setEditedLaborPrice(e.target.value)}
            onBlur={() => {
              handleSaveEditedLabor();
              setEditingLaborId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveEditedLabor();
                setEditingLaborId(null);
              }
            }}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={{
              width: "100%",
              height: "100%",
              padding: "0 8px 0 24px",
              fontSize: "16px",
              border: "none",
              backgroundColor: "transparent",
              outline: "none",
              fontWeight: "600",
              color: "#1976d2"
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <div 
          style={{ 
            fontWeight: "600",
            fontSize: "16px",
            color: labor.is_completed === 1 ? "#2e7d32" : "#FF9800",
            cursor: "pointer",
            padding: "6px 12px",
            backgroundColor: "rgba(255,255,255,0.5)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          onClick={(e) => {
            e.stopPropagation();
            setEditingLaborId(labor.id);
            setEditedLaborPrice(labor.price || "0");
          }}
        >
          ${parseFloat(labor.price || 0).toFixed(2)}
          <FontAwesomeIcon 
            icon={faEdit} 
            style={{ 
              fontSize: '14px',
              opacity: 0.6
            }} 
          />
        </div>
      )
    ) : (
      <div
        style={{
          backgroundColor: "#9e9e9e",
          color: "white",
          padding: "4px 10px",
          borderRadius: "4px",
          fontSize: "13px",
          fontWeight: "500"
        }}
      >
        Tap to add
      </div>
    )}
  </button>
</div>
                  
                  {/* Action buttons */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "flex-end", 
                    gap: "8px", 
                    marginTop: "12px", 
                    borderTop: "1px solid #eee",
                    paddingTop: "12px"
                  }}>
                    <button
                      onClick={() => {
                        setEditingTrackingLaborId(labor.id);
                        setLaborTrackingNotes(labor.tracking_notes || "");
                      }}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#e3f2fd",
                        color: "#1976d2",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: "500"
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} size="sm" />
                      Notes
                    </button>

                    <button
                      onClick={() => handleToggleLaborCompleted(labor)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: labor.is_completed === 1 ? "#ffebee" : "#e8f5e9",
                        color: labor.is_completed === 1 ? "#d32f2f" : "#2e7d32",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: "500"
                      }}
                    >
                      <FontAwesomeIcon icon={labor.is_completed === 1 ? faTools : faCheck} size="sm" />
                      {labor.is_completed === 1 ? "Mark Incomplete" : "Complete"}
                    </button>

                    <button
                      onClick={() => handleDeleteLabor(labor.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#ffebee",
                        color: "#d32f2f",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: "500"
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                      Delete
                    </button>
                  </div>

                  {/* Edit tracking notes form */}
                  {editingTrackingLaborId === labor.id && (
                    <div style={{
                      marginTop: "12px",
                      borderTop: "1px solid #eee",
                      paddingTop: "12px"
                    }}>
                      <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#333" }}>
                        Edit Technical Notes
                      </div>
                      <textarea
                        value={laborTrackingNotes}
                        onChange={(e) => setLaborTrackingNotes(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                          minHeight: "80px",
                          fontSize: "14px",
                          resize: "vertical",
                          boxSizing: "border-box"
                        }}
                        placeholder="Enter technical notes for this labor task..."
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                        <button
                          onClick={() => setEditingTrackingLaborId(null)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#f5f5f5",
                            color: "#666",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px"
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateLaborTracking(labor.id, laborTrackingNotes)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#1976d2",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px"
                          }}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho - Formulario para añadir */}
        <div
          style={{
            width: "40%",
            padding: "20px",
            backgroundColor: "#fafbfc",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "16px",
              fontWeight: "600",
              color: "#333",
            }}
          >
            Add New Labor / Service
          </h3>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #eee",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Labor Description
              </label>
              <input
                type="text"
                value={laborDescription}
                onChange={(e) => setLaborDescription(e.target.value)}
                placeholder="e.g., Oil change, Brake system repair, etc."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Solo mostrar el campo de precio si se va a facturar */}
{laborIsBilled ? (
  <div style={{ marginBottom: "16px" }}>
    <label>Labor Price ($)</label>
    <div style={{ position: "relative" }}>
      <span>$</span>
      <input
        type="number"
        value={laborPrice}
        onChange={(e) => setLaborPrice(e.target.value)}
        placeholder="0.00"
        step="0.01"
        min="0"
      />
    </div>
  </div>
) : null}

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Technical Notes
              </label>
              <textarea
                value={laborTrackingNotes}
                onChange={(e) => setLaborTrackingNotes(e.target.value)}
                placeholder="Enter technical details or instructions for this labor task..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                  outline: "none",
                  minHeight: "100px",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "8px 0",
                }}
              >
                <input
                  type="checkbox"
                  id="labor-billed"
                  checked={laborIsBilled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setLaborIsBilled(isChecked);
                    // Si se desmarca, resetear el precio a vacío
                    if (!isChecked) {
                      setLaborPrice("");
                    }
                  }}
                  style={{ 
                    marginRight: "8px",
                    width: "16px",
                    height: "16px",
                    cursor: "pointer"
                  }}
                />
                <label
                  htmlFor="labor-billed"
                  style={{ fontSize: "14px", color: "#555", cursor: "pointer" }}
                >
                  Include in billing (add to invoice)
                </label>
              </div>
            </div>

            <button
              onClick={handleAddLabor}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#FF9800",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(255, 152, 0, 0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#F57C00"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#FF9800"}
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
                  <FontAwesomeIcon icon={faPlus} />
                  Add Labor Task
                </>
              )}
            </button>
          </div>

          {/* Labor Statistics Panel */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #eee",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#333" }}>
              Labor Summary
            </h4>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ 
                padding: "12px", 
                borderRadius: "10px",
                backgroundColor: "#e8f5e9",
                border: "1px solid #c8e6c9"
              }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>
                  Completed Tasks
                </div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#2e7d32" }}>
                  {labors.filter(l => l.is_completed === 1).length}
                </div>
              </div>
              
              <div style={{ 
                padding: "12px", 
                borderRadius: "10px",
                backgroundColor: "#fff3e0",
                border: "1px solid #ffe0b2"
              }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>
                  Pending Tasks
                </div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#e65100" }}>
                  {labors.filter(l => l.is_completed !== 1).length}
                </div>
              </div>
              
              <div style={{ 
                padding: "12px", 
                borderRadius: "10px",
                backgroundColor: "#f3e5f5",
                border: "1px solid #e1bee7",
                gridColumn: "1 / -1"
              }}>
                <div style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>
                  Total Labor Value
                </div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#6a1b9a" }}>
                  $
                  {labors
                    .reduce(
                      (sum, labor) => sum + parseFloat(labor.price || 0),
                      0
                    )
                    .toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notification */}
          {notification.show && (
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                right: "24px",
                width: "300px",
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: notification.type === "success" ? "#e8f5e9" : "#ffebee",
                border: `1px solid ${notification.type === "success" ? "#c8e6c9" : "#ffcdd2"}`,
                color: notification.type === "success" ? "#2e7d32" : "#c62828",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                animation: "fadeIn 0.3s ease",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ 
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: notification.type === "success" ? "#c8e6c9" : "#ffcdd2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <FontAwesomeIcon 
                  icon={notification.type === "success" ? faCheck : faExclamationCircle} 
                  style={{ fontSize: '12px', color: notification.type === "success" ? "#2e7d32" : "#c62828" }} 
                />
              </div>
              <div>
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                  {notification.type === "success" ? "Success" : "Error"}
                </div>
                <div>{notification.message}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          justifyContent: "flex-end",
          backgroundColor: "#fafbfc",
        }}
      >
        <button
          onClick={() => setShowLaborModal(false)}
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
{showCancelModal && (
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
      <h2 style={{margin: 0, marginBottom: 16, fontSize: 20, color: '#FF9800'}}>Confirm Cancellation</h2>
      <p style={{margin: 0, marginBottom: 24, color: '#444', textAlign: 'center'}}>
        Are you sure you want to cancel this jobsheet?<br/>
        This will mark it as cancelled but preserve all records.
      </p>
      <div style={{display: 'flex', gap: 16}}>
        <button
          onClick={() => setShowCancelModal(false)}
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
          No, Keep Active
        </button>
        <button
          onClick={handleConfirmCancel}
          style={{
            padding: '10px 18px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Yes, Cancel Jobsheet
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
