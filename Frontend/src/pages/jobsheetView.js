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
  faMoneyBillWave,
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import "@fortawesome/fontawesome-svg-core/styles.css";
import JobsheetDetailView from '../pages/jobsheetDetailView';
import Joyride, { STATUS } from 'react-joyride';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const JobsheetView = () => {
  // Basic states
  const [jobsheets, setJobsheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [setVehicles] = useState([]);
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
    state: "pending",
    date_created: new Date().toISOString().split("T")[0],
  });

  // States for tour guidance
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]); // Tour step definitions

  // JobsheetDetailView control states
  const [showJobsheetDetail, setShowJobsheetDetail] = useState(false);
  const [selectedJobsheetId, setSelectedJobsheetId] = useState(null);

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
      headerClass: "custom-header-sumary",
    },
    {
      headerName: "Customer",
      field: "customer_name",
      width: 140,
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
        return <div>{params.value || ""}</div>;
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
        const state = params.data.state || "in progress";
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
      headerName: "Total Amount",
      field: "total_amount",
      width: 160,
      headerClass: "custom-header-sumary",
      cellRenderer: (params) => {
        if (!params.data) return '';
        
        // Use total_amount if it exists and is not 0, otherwise show 0
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
            {/* Using direct styles instead of ActionButtonsContainer for simplicity */}
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

  const onGridReady = (params) => {
    gridRef.current = params.api;
  };

  // Function to open JobsheetDetailView as a modal instead of full page
  const handleOpenJobsheetDetail = (jobsheetId) => {
    setSelectedJobsheetId(jobsheetId);
    setShowJobsheetDetail(true);
  };
  
  // Function to close JobsheetDetailView
  const handleCloseJobsheetDetail = () => {
    setShowJobsheetDetail(false);
    setSelectedJobsheetId(null);
    // Refresh data after closing detail view
    fetchJobsheets(searchTerm, statusFilter);
  };
  
  // Function to refresh jobsheets after changes
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
      // If there's a search term, try loading all for local filtering
      if (search && search.trim() !== "") {
        await fetchJobsheetsForLocalSearch(status, search);
        return;
      }

      // For requests without search, use the normal endpoint
      let url = `${API_URL}/jobsheets`;
      if (status && status !== "all") {
        url += `?state=${encodeURIComponent(status)}`;
      }

      console.log("Requesting URL:", url);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const jobsheetData = await response.json();
        console.log("Data received:", jobsheetData);
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
  }, [API_URL]);

  // Function to load jobsheets and perform local search
  const fetchJobsheetsForLocalSearch = async (status, searchTerm) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Load all jobsheets, optionally filtered by state
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

        // Filter locally by search term
        const searchTermLower = searchTerm.toLowerCase();
        const filtered = allJobsheets.filter((js) => {
          // Search in ID
          if (js.id.toString().includes(searchTermLower)) return true;

          // Search in customer name
          if (js.customer_name?.toLowerCase().includes(searchTermLower))
            return true;

          // Search in vehicle model or plate
          if (js.vehicle_model?.toLowerCase().includes(searchTermLower))
            return true;
          if (js.license_plate?.toLowerCase().includes(searchTermLower))
            return true;

          return false;
        });

        console.log(
          `Local search: found ${filtered.length} of ${allJobsheets.length} jobsheets`
        );
        setJobsheets(filtered);
      }
    } catch (error) {
      console.error("Error in local search:", error);
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
        }}
      >
        {statusFilter === "all" ? "All States" : statusFilter}
      </button>
    );
  };

  const handleStatusChange = async (id, currentStatus) => {
    // Define status cycle
    const statusCycle = ["in progress"];
    if (currentStatus === "completed") {
      setNotification({
        show: true,
        message: "Completed jobs cannot be reverted to another status",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      return;
    }
    if (currentStatus === "cancelled") {
      setNotification({
        show: true,
        message: "Cancelled jobs cannot be reverted to another status",
        type: "error",
      });
      setTimeout(() => setNotification({ show: false }), 3000);
      return;
    }
    const currentIndex = statusCycle.indexOf(currentStatus);

    // Calculate next state (go back to start if at the end)
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
          "Error getting jobsheet data:",
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
        console.log("State successfully updated!");
        fetchJobsheets(searchTerm, statusFilter);
      } else {
        const errorText = await response.text();
        console.error("Error updating state:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error updating state:", error);
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
    setShowJobsheetDetail(true);
  };

  // Modified function to open JobsheetDetailView for creating a new jobsheet
  const handleOpenNewModal = () => {
    // Set selectedJobsheetId to null to indicate we want to create a new jobsheet
    setSelectedJobsheetId(null);
    setShowJobsheetDetail(true);
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
          position: "relative", // Add this to ensure modals position correctly relative to this container
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
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Job Sheet
            </button>
          </div>
        </div>

        {/* Grid with same style as InventoryView */}
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
        
        {/* JobsheetDetailView as a modal overlay - Modified to handle both new and existing jobsheets */}
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
            <div
              style={{
                position: "absolute",
                top: "60px", // Leave space for navbar
                left: "50px",
                right: "50px",
                bottom: "50px",
                backgroundColor: "#f0f2f5",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                overflow: "hidden",
                animation: "modalFadeIn 0.3s ease"
              }}
            >
              <JobsheetDetailView
                jobsheetId={selectedJobsheetId} // This can be null for a new jobsheet
                onClose={handleCloseJobsheetDetail}
                refreshJobsheets={handleRefreshJobsheets}
                isModal={true}
                isNew={selectedJobsheetId === null} // Add this prop to indicate it's a new jobsheet
              />
            </div>
          </div>
        )}

        {/* Cancellation confirmation modal */}
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

        {/* Notification */}
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
      </div>
    </>
  );
};

export default JobsheetView;