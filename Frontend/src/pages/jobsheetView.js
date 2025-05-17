import React, { useEffect, useState, useRef, useCallback } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { ModuleRegistry } from "@ag-grid-community/core";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faCalendarAlt,
  faTimes,  
  faTrash,
  faSearch,
  faMoneyBillWave,
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import JobsheetDetailView from '../pages/jobsheetDetailView';
import Joyride, { STATUS } from 'react-joyride';
import JobsheetCreationModal from '../components/jobsheetCreationModal';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const JobsheetView = () => {
  // Basic states
  const [jobsheets, setJobsheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [currentJobsheet, setCurrentJobsheet] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const gridRef = useRef(null);
  const searchTimeout = useRef(null);
  const [selectedCustomerSearchTerm, setCustomerSearchTerm] = useState("");
  const [setFilteredCustomers] = useState([]);
  const [setShowCustomerResults] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const customerSearchTimeout = useRef(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingJobsheet, setEditingJobsheet] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;
  const [formData, setFormData] = useState({
    customer_id: "",
    vehicle_id: "",
    description: "",
    state: "in_progress",
    date_created: new Date().toISOString().split("T")[0],
  });
const [showCreationModal, setShowCreationModal] = useState(false);

  // States for tour guidance
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]); // Tourw step definitions

  // JobsheetDetailView control states
  const [showJobsheetDetail, setShowJobsheetDetail] = useState(false);
  const [selectedJobsheetId, setSelectedJobsheetId] = useState(null);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
    }
  };

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Add touch detection state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isVerticalOrientation, setIsVerticalOrientation] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(window.innerWidth > 1024);

  // Detect touch device and orientation
  useEffect(() => {
    const detectDeviceAndOrientation = () => {
      // Check for true desktop view based on width, regardless of touch capability
      const isDesktop = window.innerWidth > 1024;
      setIsDesktopView(isDesktop);
      
      // Only consider it a touch device if it has touch AND is not a desktop size
      const hasTouchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(hasTouchCapability && !isDesktop);
      
      // Set orientation
      setIsVerticalOrientation(window.innerHeight > window.innerWidth);
    };

    detectDeviceAndOrientation();
    window.addEventListener('touchstart', detectDeviceAndOrientation, { once: true });
    window.addEventListener('resize', detectDeviceAndOrientation);

    return () => {
      window.removeEventListener('touchstart', detectDeviceAndOrientation);
      window.removeEventListener('resize', detectDeviceAndOrientation);
    };
  }, []);

  const columnDefs = [
    { 
      headerName: "ID",
      field: "id",
          width: 40, 
    maxWidth: 40, 
    minWidth: 40, 
    flex: 0, 
      suppressMenu: true,
      headerClass: "custom-header-sumary", 
    },
  { 
    headerName: "Created",
    field: "created_at",
    suppressMenu: true,
    headerClass: "custom-header-sumary",
    // Remove fixed width
    cellRenderer: (params) => {
      if (!params.data.created_at) return "—";
      const date = new Date(params.data.created_at);
      return date.toLocaleDateString('en-GB');
    },
    // Add responsive width based on device
    width: isTouchDevice && isVerticalOrientation ? 80 : undefined,
  },
  { 
    headerName: "Plate",
    field: "license_plate",
    suppressMenu: true,
    headerClass: "custom-header-sumary",
    // Adjust to be responsive on mobile devices
    width: isTouchDevice && isVerticalOrientation ? 80 : 120,
    cellRenderer: (params) => {
      if (!params.data) return null;
      return <div>{params.value || ""}</div>;
    },
  },
  {
    headerName: "Customer",
    field: "customer_name",
    width: isTouchDevice && isVerticalOrientation ? 100 : 140,
    suppressMenu: true,
    headerClass: "custom-header-sumary",
  },
  {
  headerName: "State",
  field: "state",
  suppressMenu: true,
  headerClass: "custom-header-sumary",
  cellRenderer: (params) => {
    const state = params.data.state || "in progress";
    let color = "#FF9500";

    if (state === "completed") color = "#00C853";
    else if (state === "in progress") color = "#2979FF";
    else if (state === "cancelled") color = "#F44336";

    return (
      <div style={{
        display: "flex",
        justifyContent: "center", 
        alignItems: "center",
        height: "100%",  // Take full height of cell
        width: "100%"    // Take full width of cell
      }}>
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
      </div>
    );
  },
},
    {
      headerName: "Total Amount",
      field: "total_amount",
      width: 160,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data) return '';
        const totalValue = parseFloat(params.data.total_amount || 0);
        return (
          <div 
            onClick={() => handleOpenJobsheetDetail(params.data.id)} 
            style={{
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              cursor: "pointer",
              padding: "0 12px",
              height: "42px", 
              borderRadius: "8px",
              backgroundColor: "#f0f9ff",
              border: "1px solid #d0e8ff",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#e3f2fd";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f9ff";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
            title="Click to see complete financial details"
          >
            <div style={{ fontWeight: "600", color: "#0277BD", fontSize: "14px" }}>
              ${totalValue.toFixed(2)}
            </div>
            <FontAwesomeIcon 
              icon={faMoneyBillWave} 
              style={{ color: "#0277BD", marginLeft: "8px", fontSize: "12px" }} 
            />
          </div>
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
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            gap: "8px" 
          }}>
            {params.data.state !== "cancelled" && (
              <button
                onClick={() => handleCancel(params.data)}
                title="Cancel Job Sheet"
                style={{
                  backgroundColor: "#ffebee",
                  color: "#d32f2f",
                  border: "none",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

const gridOptions = {
  suppressRowClickSelection: isTouchDevice,
  suppressCellSelection: false,
  suppressMovableColumns: true,
  suppressContextMenu: true,
  rowBuffer: isDesktopView ? 15 : isTouchDevice ? 15 : 10,
  animateRows: true,
  alwaysShowVerticalScroll: isTouchDevice,
  suppressScrollOnNewData: false,
  domLayout: isDesktopView ? 'autoHeight' : isTouchDevice ? 'normal' : 'autoHeight',
  // Add mobile specific options
  suppressHorizontalScroll: isTouchDevice && isVerticalOrientation ? true : false,
  // Force the grid to fit within container width
  autoSizeColumns: isTouchDevice && isVerticalOrientation ? true : false,
};

  const onGridReady = (params) => {
    gridRef.current = params.api;
  };

  const handleOpenJobsheetDetail = (jobsheetId) => {
    setSelectedJobsheetId(jobsheetId);
    setShowJobsheetDetail(true);
  };
  
  const handleCloseJobsheetDetail = () => {
    setShowJobsheetDetail(false);
    setSelectedJobsheetId(null);
    fetchJobsheets(searchTerm, statusFilter);
  };
  
  const handleRefreshJobsheets = () => {
    fetchJobsheets(searchTerm, statusFilter);
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
      if (search && search.trim() !== "") {
        await fetchJobsheetsForLocalSearch(status, search);
        return;
      }

      const startDateFormatted = startDate.toISOString().split('T')[0];
      const endDateFormatted = endDate.toISOString().split('T')[0];

      let url = `${API_URL}/jobsheets?start_date=${startDateFormatted}&end_date=${endDateFormatted}`;
      
      if (status && status !== "all") {
        url += `&state=${encodeURIComponent(status)}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const jobsheetData = await response.json();
        setJobsheets(jobsheetData);
      } else {
        console.error("Server error:", response.status);
        setJobsheets([]);
      }
    } catch (error) {
      console.error("Error in fetchJobsheets:", error);
      setJobsheets([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, startDate, endDate]);

  const fetchJobsheetsForLocalSearch = async (status, searchTerm) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const startDateFormatted = startDate.toISOString().split('T')[0];
      const endDateFormatted = endDate.toISOString().split('T')[0];
      
      let url = `${API_URL}/jobsheets?start_date=${startDateFormatted}&end_date=${endDateFormatted}`;
      
      if (status && status !== "all") {
        url += `&state=${encodeURIComponent(status)}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const allJobsheets = await response.json();

        const searchTermLower = searchTerm.toLowerCase();
        const filtered = allJobsheets.filter((js) => {
          if (js.id.toString().includes(searchTermLower)) return true;
          if (js.customer_name?.toLowerCase().includes(searchTermLower))
            return true;
          if (js.vehicle_model?.toLowerCase().includes(searchTermLower))
            return true;
          if (js.license_plate?.toLowerCase().includes(searchTermLower))
            return true;

          return false;
        });

        setJobsheets(filtered);
      }
    } catch (error) {
      console.error("Error in local search:", error);
    }
  };

  const StatusFilterButton = () => {
    const statuses = [
      "all",
      "in progress",
      "completed",
      "cancelled",
    ];

    const nextStatus = () => {
  const currentIndex = statuses.indexOf(statusFilter);
  const nextIndex = (currentIndex + 1) % statuses.length;
  const newStatus = statuses[nextIndex];
  
  setStatusFilter(newStatus);
  fetchJobsheets(searchTerm, newStatus);
};

    let color = "#666";
    if (statusFilter === "completed") color = "#00C853";
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
          padding: isTouchDevice ? "12px 15px" : "5px 15px",
          height: isTouchDevice ? "46px" : "35px",
          fontSize: isTouchDevice ? "16px" : "14px",
          fontWeight: "500",
          cursor: "pointer",
          textTransform: "capitalize",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {statusFilter === "all" ? "All States" : statusFilter}
      </button>
    );
  };

  const handleStatusChange = async (id, currentStatus) => {
    const statusCycle = ["in progress"];
    if (currentStatus === "completed" || currentStatus === "cancelled") {
      setNotification({
        show: true,
        message: "Completed or cancelled jobs cannot be reverted to another status",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      return;
    }
    const currentIndex = statusCycle.indexOf(currentStatus);
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
        console.error("Error getting jobsheet data:", getResponse.status);
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
        fetchJobsheets(searchTerm, statusFilter);
      } else {
        const errorText = await response.text();
        console.error("Error updating state:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error updating state:", error);
    }
  };

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
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
    
    const initialFetch = async () => {
      await fetchJobsheets(searchTerm, statusFilter);
      fetchCustomers();
      fetchVehicles();
    };
    
    initialFetch();
  }, []); 

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      fetchJobsheets(value, statusFilter);
    }, 500);
  };

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

  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setShowCustomerResults(true);

    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }

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
          setFilteredCustomers(results);
          setShowCustomerResults(true);
        } else {
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
    setFormData({
      ...formData,
      customer_id: customer.id,
      vehicle_id: "",
    });

    let customerDisplayName = "Unknown Customer";

    if (customer.name) {
      customerDisplayName = customer.name;
    } else if (customer.first_name || customer.last_name) {
      customerDisplayName = `${customer.first_name || ""} ${
        customer.last_name || ""
      }`.trim();
    }

    setSelectedCustomerName(customerDisplayName);
    setShowCustomerResults(false);
    setCustomerSearchTerm("");

    fetchVehicles(customer.id);
  };

  const handleEdit = (jobsheet) => {
    setEditingJobsheet(jobsheet);
    setShowJobsheetDetail(true);
  };

  const handleOpenNewModal = () => {
    setShowCreationModal(true);
  };

  const handleJobsheetCreated = (newJobsheetId) => {
    // Close creation modal
    setShowCreationModal(false);
    
    // Open detail view for the newly created jobsheet
    setSelectedJobsheetId(newJobsheetId);
    setShowJobsheetDetail(true);
    
    // Refresh jobsheet list to include the new one
    fetchJobsheets(searchTerm, statusFilter);
  };

  const DateRangeSelector = () => {
    const formatDate = (date) => {
      return date.toLocaleDateString('en-GB');
    };

    return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        style={{
          padding: isTouchDevice ? "12px 15px" : "5px 15px",
          backgroundColor: "#F9FBFF",
          border: "1px solid #e0e0e0",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          height: isTouchDevice ? "46px" : "35px",
          fontSize: isTouchDevice ? "16px" : "14px",
          color: "#333",
          width: "100%",
          justifyContent: "center"
        }}
      >
        <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "#5932EA" }} />
        {formatDate(startDate)} - {formatDate(endDate)}
      </button>

      {showDatePicker && (
        <div style={{
          position: "absolute",
          top: "50px",
          right: isVerticalOrientation ? "auto" : "0",
          left: isVerticalOrientation ? "50%" : "auto",
          transform: isVerticalOrientation ? "translateX(-50%)" : "none",
          zIndex: 1000,
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          padding: isTouchDevice ? "20px" : "15px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: isVerticalOrientation ? (isTouchDevice ? "90%" : "95%") : "280px",
          maxWidth: "500px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, marginBottom: 16, fontSize: isTouchDevice ? 18 : 16 }}>Date Range</h4>
            <button 
              onClick={() => setShowDatePicker(false)}
              style={{ 
                background: "none", 
                border: "none",
                cursor: "pointer",
                fontSize: isTouchDevice ? 22 : 16,
                padding: isTouchDevice ? 10 : 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: isTouchDevice ? 40 : 30,
                height: isTouchDevice ? 40 : 30
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontSize: isTouchDevice ? 16 : 14,
                fontWeight: "500"
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                style={{ 
                  padding: isTouchDevice ? "14px 12px" : "8px", 
                  borderRadius: "6px", 
                  border: "1px solid #ddd",
                  width: "100%",
                  fontSize: isTouchDevice ? 16 : "inherit",
                  minHeight: isTouchDevice ? "48px" : "auto",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "8px", 
                fontSize: isTouchDevice ? 16 : 14,
                fontWeight: "500"
              }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                style={{ 
                  padding: isTouchDevice ? "14px 12px" : "8px", 
                  borderRadius: "6px", 
                  border: "1px solid #ddd",
                  width: "100%",
                  fontSize: isTouchDevice ? 16 : "inherit",
                  minHeight: isTouchDevice ? "48px" : "auto",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            marginTop: "15px", 
            gap: "10px" 
          }}>
            <button
              onClick={() => {
                setStartDate(new Date());
                setEndDate(new Date());
              }}
              style={{
                padding: isTouchDevice ? "14px" : "8px 15px",
                backgroundColor: "#f5f5f5",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: isTouchDevice ? 16 : "inherit",
                flex: "1",
                minHeight: isTouchDevice ? "48px" : "auto"
              }}
            >
              Today Only
            </button>
            <button
              onClick={() => {
                fetchJobsheets(searchTerm, statusFilter);
                setShowDatePicker(false);
              }}
              style={{
                padding: isTouchDevice ? "14px" : "8px 15px",
                backgroundColor: "#5932EA",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: isTouchDevice ? 16 : "inherit",
                flex: "1",
                minHeight: isTouchDevice ? "48px" : "auto",
                fontWeight: "500"
              }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

  return (
    <>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: isDesktopView ? "30px" : isTouchDevice ? "16px" : "24px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          boxSizing: "border-box",
          padding: isDesktopView ? "24px" : isTouchDevice ? "15px" : "20px",
          position: "relative",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isVerticalOrientation ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isVerticalOrientation ? "stretch" : "center",
            marginBottom: isTouchDevice ? "15px" : "15px", // Aumentado para mejor separación
            gap: isTouchDevice ? "10px" : "16px" // Aumentado para mejor separación visual
          }}
        >
          {/* Grupo izquierdo: búsqueda, filtro de fechas y filtro de estados */}
          <div style={{ 
            display: "flex", 
            flexDirection: isVerticalOrientation ? "column" : "row",
            width: isVerticalOrientation ? "100%" : "80%", // En escritorio, deja espacio para el botón
            gap: "10px", 
            alignItems: isVerticalOrientation ? "stretch" : "center",
            flexWrap: isVerticalOrientation ? "nowrap" : "wrap"
          }}>
            {/* Barra de búsqueda */}
            <div style={{ 
              position: "relative", 
              width: isVerticalOrientation ? "100%" : "40%",
              minWidth: isVerticalOrientation ? "auto" : "250px"
            }}>
              <input
                type="text"
                placeholder="Search jobsheets..."
                value={searchTerm}
                onChange={handleSearch}
                style={{
                  padding: isTouchDevice ? "12px 35px 12px 12px" : "5px 30px 5px 10px",
                  width: "100%",
                  borderRadius: "10px",
                  border: "1px solid white",
                  backgroundColor: "#F9FBFF",
                  height: isTouchDevice ? "46px" : "35px", // Altura ajustada para alinear con otros elementos
                  fontSize: isTouchDevice ? "16px" : "14px",
                  boxSizing: "border-box"
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
                  fontSize: isTouchDevice ? "18px" : "inherit"
                }}
              />
            </div>

            {/* Selector de fecha y filtro de estados */}
            <div style={{ 
              display: "flex",
              flexDirection: isVerticalOrientation ? "column" : "row",
              gap: "10px",
              width: isVerticalOrientation ? "100%" : "auto",
              flex: isVerticalOrientation ? "auto" : "1"
            }}>
              {/* DateRangeSelector - con ancho fijo en escritorio */}
              <div style={{ width: isVerticalOrientation ? "100%" : "200px" }}>
                <DateRangeSelector />
              </div>
              
              {/* StatusFilterButton - con ancho fijo en escritorio */}
              <div style={{ width: isVerticalOrientation ? "100%" : "150px" }}>
                <StatusFilterButton />
              </div>
            </div>
          </div>

          {/* Botón Add Job Sheet - siempre a la derecha en escritorio */}
          <div style={{ 
            width: isVerticalOrientation ? "100%" : "auto",
            marginLeft: isVerticalOrientation ? "0" : "auto" // Importante: empuja el botón a la derecha
          }}>
            <button
              onClick={handleOpenNewModal}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                padding: isTouchDevice ? "14px 20px" : "8px 16px",
                backgroundColor: isHovered ? "#4321C9" : "#5932EA",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: isTouchDevice ? "16px" : "14px",
                width: isVerticalOrientation ? "100%" : "auto",
                minWidth: isDesktopView ? "180px" : "auto", // Un poco más grande como pediste
                maxWidth: isDesktopView ? "220px" : "none", // Limita el ancho máximo
                justifyContent: "center",
                height: isTouchDevice ? "auto" : "35px", // Altura fija en escritorio
                whiteSpace: "nowrap"
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Job Sheet
            </button>
          </div>
        </div>

        <div style={{ 
          flex: 1, 
          position: "relative",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y"
        }}>
          <div
            className="ag-theme-alpine inventory-view touch-enabled-grid"
            style={{
              width: "100%",
              height: "100%", 
              overflow: "auto",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.3s ease",
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "-ms-autohiding-scrollbar"
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
    minWidth: isTouchDevice && isVerticalOrientation ? 70 : 100,
    cellClass: isTouchDevice ? 'touch-cell' : '',
    // Add to ensure columns adjust to screen width on mobile
    autoHeight: isTouchDevice && isVerticalOrientation,
  }}
  modules={[ClientSideRowModelModule]}
  pagination={true}
  paginationPageSize={isTouchDevice ? 7 : 12}
  headerHeight={isTouchDevice ? 50 : 30}
  rowHeight={isTouchDevice ? 65 : 50}
  // Change to explicitly fit width on mobile
  suppressSizeToFit={!(isTouchDevice && isVerticalOrientation)}
  suppressHorizontalScroll={isTouchDevice && isVerticalOrientation}
  onGridReady={(params) => {
    onGridReady(params);
    // Add this to force grid to fit available width
    if (isTouchDevice && isVerticalOrientation) {
      setTimeout(() => {
        params.api.sizeColumnsToFit();
      }, 100);
    }
  }}
  gridOptions={gridOptions}
/>
          </div>
        </div>

        {showJobsheetDetail && (
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 2000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {/* Modal container - Mismo tamaño grande para creación y edición */}
            <div
              className="modal-container edit-modal"
              style={{
                position: "absolute",
                top: "60px",
                left: "50px",
                right: "50px",
                bottom: "50px",
                backgroundColor: "#f0f2f5",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                overflow: "hidden"
              }}
            >
              <JobsheetDetailView
                jobsheetId={selectedJobsheetId}
                onClose={handleCloseJobsheetDetail}
                refreshJobsheets={handleRefreshJobsheets}
                isModal={true}
                isNew={selectedJobsheetId === null}
              />
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
{showCreationModal && (
  <div 
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 2000,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "15px" // Añadir padding para todos los dispositivos
    }}
  >
    {/* Contenedor del modal - tamaño reducido para móviles y desktop */}
    <div
      className="modal-container creation-modal"
      style={{
        backgroundColor: "#f0f2f5",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        overflow: "hidden",
        width: isTouchDevice 
          ? (isVerticalOrientation ? "90%" : "80%") // Móvil: 90% en vertical, 80% en horizontal
          : "450px", // Desktop: 450px fijo
        maxWidth: "100%",
        maxHeight: isTouchDevice 
          ? (isVerticalOrientation ? "80%" : "90%") // Móvil: 80% de altura en vertical, 90% en horizontal
          : "90vh", // Desktop: 90% de la altura visible
        display: "flex",
        height: "auto", // Auto para todos los dispositivos
        margin: 0
      }}
    >
      <JobsheetCreationModal
        onClose={() => setShowCreationModal(false)}
        onCreationSuccess={handleJobsheetCreated}
      />
    </div>
  </div>
)}

        {notification.show && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: notification.type === "success" ? "#e8f5e9" : "#ffebee",
              border: `1px solid ${notification.type === "success" ? "#c8e6c9" : "#ffcdd2"}`,
              color: notification.type === "success" ? "#2e7d32" : "#c62828",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              maxWidth: "280px",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: "slideIn 0.3s ease"
            }}
          >
            {notification.message}
          </div>
        )}

        <style>
          {`
            @keyframes modalFadeIn {
              0% { opacity: 0; transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1); }
            }
            
            .modal-container {
              animation: modalFadeIn 0.3s ease;
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
            
            .touch-enabled-grid {
              -webkit-overflow-scrolling: touch !important;
              overflow-scrolling: touch !important;
              scroll-behavior: smooth !important;
              overscroll-behavior: contain !important;
              touch-action: pan-y !important;
            }
            
            .touch-cell {
              padding: 16px 8px !important;
            }
            
            .ag-theme-alpine .ag-header-cell-label {
              padding: 5px 8px !important;
            }
            
            .ag-theme-alpine .ag-paging-button {
              min-width: 40px !important;
              min-height: 40px !important;
              padding: 10px !important;
            }
            
            .ag-theme-alpine .ag-body-viewport {
              -webkit-overflow-scrolling: touch !important;
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
              
              .status-btn {
                min-height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              .ag-theme-alpine {
                user-select: none;
              }
            }
            
            @media screen and (orientation: portrait) {
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
    </>
  );
};

export default JobsheetView;