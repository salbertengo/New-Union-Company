import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faPlus, faTools, faTrash, faUser, 
  faMotorcycle, faCalendarAlt, faTags, 
  faOilCan, faClipboardCheck, faCog, faWrench
} from '@fortawesome/free-solid-svg-icons';


const CreateJobsheetModal = ({ 
  isOpen, 
  onClose, 
  currentJobsheet = null, 
  onSave,
  refreshJobsheets 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    customer_id: "",
    vehicle_id: "",
    state: "pending",
    date_created: new Date().toISOString().split("T")[0],
  });

  // Customer selection state
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const customerSearchTimeout = useRef(null);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    brand: "",
    model: "",
    year: "",
    plate: "",
    color: "",
    type: "motorcycle",
    price: "0.0"
  });

  // New customer creation
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  // Labor tasks
  const [laborTasks, setLaborTasks] = useState([]);
  const [newLabor, setNewLabor] = useState({
    description: "",
    price: ""
  });

  // Other state
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  // Predefined labor tasks for motorcycles
  const predefinedLabors = [
    { description: "Oil Change", icon: faOilCan, color: "#00C853", bgColor: "#E8F5E9" },
    { description: "General Service", icon: faTools, color: "#5932EA", bgColor: "#f0f0ff" },
    { description: "Full Diagnostic", icon: faClipboardCheck, color: "#FF9800", bgColor: "#FFF8E1" },
    { description: "Engine Tune-up", icon: faCog, color: "#E91E63", bgColor: "#FCE4EC" },
    { description: "Brake Service", icon: faWrench, color: "#F44336", bgColor: "#FFEBEE" },
    { description: "Chain Adjustment", icon: faMotorcycle, color: "#3F51B5", bgColor: "#E8EAF6" }
  ];
  // Initialize form data when editing an existing jobsheet
  useEffect(() => {
    if (currentJobsheet) {
      setFormData({
        customer_id: currentJobsheet.customer_id || "",
        vehicle_id: currentJobsheet.vehicle_id || "",
        state: currentJobsheet.state || "pending",
        date_created: currentJobsheet.date_created?.split("T")[0] || new Date().toISOString().split("T")[0],
      });
      setSelectedCustomerName(currentJobsheet.customer_name || "");
      
      // Fetch vehicles for this customer
      if (currentJobsheet.customer_id) {
        fetchVehicles(currentJobsheet.customer_id);
      }
      
      // Fetch labor tasks for this jobsheet
      if (currentJobsheet.id) {
        fetchLabors(currentJobsheet.id);
      }
    } else {
      resetForm();
    }
  }, [currentJobsheet]);

  const resetForm = () => {
    setFormData({
      customer_id: "",
      vehicle_id: "",
      state: "pending",
      date_created: new Date().toISOString().split("T")[0],
    });
    setSelectedCustomerName("");
    setVehicles([]);
    setLaborTasks([]);
    setShowNewCustomerForm(false);
    setNewCustomer({
      name: "",
      email: "",
      phone: "",
      address: ""
    });
    setNewLabor({
      description: "",
      price: ""
    });
  };

  // Customer search and selection
  const handleCustomerSearch = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setShowCustomerResults(true);

    if (customerSearchTimeout.current) {
      clearTimeout(customerSearchTimeout.current);
    }

    customerSearchTimeout.current = setTimeout(async () => {
      if (!value.trim()) {
        setFilteredCustomers([]);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

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
          const data = await response.json();
          setFilteredCustomers(data);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      }
    }, 300);
  };

  const handleSelectCustomer = (customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      vehicle_id: "" // Reset vehicle when customer changes
    });

    let customerDisplayName = customer.name;
    if (!customerDisplayName && (customer.first_name || customer.last_name)) {
      customerDisplayName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    }

    setSelectedCustomerName(customerDisplayName);
    setShowCustomerResults(false);
    setCustomerSearchTerm("");
    fetchVehicles(customer.id);
  };

  // Create new customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.name.trim()) {
      showNotification("Customer name is required", "error");
      return;
    }
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:3000/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCustomer),
      });

      if (response.ok) {
        const customer = await response.json();
        handleSelectCustomer(customer);
        setShowNewCustomerForm(false);
        showNotification("Customer created successfully", "success");
      } else {
        showNotification("Error creating customer", "error");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      showNotification("Error creating customer", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Vehicle form handlers
  const handleNewVehicleChange = (e) => {
    const { name, value } = e.target;
    setNewVehicle(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    
    if (!newVehicle.plate.trim() || !newVehicle.model.trim()) {
      showNotification("License plate and model are required", "error");
      return;
    }
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const response = await fetch("http://localhost:3000/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newVehicle,
          price: newVehicle.price || "0.0",
          customer_id: formData.customer_id
        }),
      });
      
      if (response.ok) {
        const vehicle = await response.json();
        setFormData({
          ...formData,
          vehicle_id: vehicle.id
        });
        setShowNewVehicleForm(false);
        showNotification("Vehicle created successfully", "success");
        
        // Refresh the vehicles list
        fetchVehicles(formData.customer_id);
      } else {
        showNotification("Error creating vehicle", "error");
      }
    } catch (error) {
      console.error("Error creating vehicle:", error);
      showNotification("Error creating vehicle", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vehicles for a customer
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
        setVehicles([]);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
    }
  };

  // Labor tasks management
  const fetchLabors = async (jobsheetId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

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
        setLaborTasks(data);
      } else {
        console.warn(`Failed to fetch labor tasks: ${response.status} ${response.statusText}`);
        setLaborTasks([]);
        showNotification("Could not load labor tasks for this job sheet", "error");
      }
    } catch (error) {
      console.error("Error fetching labors:", error);
      setLaborTasks([]);
    }
  };

  const handleAddLabor = () => {
    if (!newLabor.description.trim()) {
      showNotification("Labor description is required", "error");
      return;
    }

    const labor = {
      id: `temp-${Date.now()}`, // Temporary ID for new items
      description: newLabor.description,
      price: parseFloat(newLabor.price) || 0,
      is_completed: 0
    };

    setLaborTasks([...laborTasks, labor]);
    setNewLabor({ description: "", price: "" });
    showNotification("Labor added", "success");
  };

  const handleAddPredefinedLabor = (predefinedLabor) => {
    const labor = {
      id: `temp-${Date.now()}`,
      description: predefinedLabor.description,
      price: 0,
      is_completed: 0
    };
  
    setLaborTasks([...laborTasks, labor]);
    showNotification(`Added ${predefinedLabor.description}`, "success");
  };

  const handleRemoveLabor = (id) => {
    setLaborTasks(laborTasks.filter(labor => labor.id !== id));
  };

  // Form submission
  const handleSubmit = async () => {
    if (!formData.customer_id) {
      showNotification("Please select a customer", "error");
      return;
    }

    if (!formData.vehicle_id) {
      showNotification("Please select a vehicle", "error");
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      // 1. Save or update jobsheet
      let jobsheetId;
      let url = "http://localhost:3000/jobsheets";
      let method = "POST";

      if (currentJobsheet) {
        url += `/${currentJobsheet.id}`;
        method = "PUT";
        jobsheetId = currentJobsheet.id;
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save jobsheet");
      }

      // If creating a new jobsheet, get the new ID
      if (!currentJobsheet) {
        const jobsheetData = await response.json();
        jobsheetId = jobsheetData.id;
      }

      // 2. Save labor tasks
      if (jobsheetId) {
        for (const labor of laborTasks) {
          // Skip existing labors (they already have non-temp IDs)
          if (!labor.id.toString().startsWith('temp-')) continue;

          await fetch("http://localhost:3000/labor", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              jobsheet_id: jobsheetId,
              description: labor.description,
              price: labor.price,
              is_completed: 0
            }),
          });
        }
      }

      showNotification("Jobsheet saved successfully", "success");
      
      // Refresh jobsheets list and close modal
      if (refreshJobsheets) refreshJobsheets();
      
      // Wait a moment before closing to show the success message
      setTimeout(() => {
        if (onSave) onSave();
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error("Error saving jobsheet:", error);
      showNotification("Error saving jobsheet", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
  };

  const getVehicleDisplayName = (vehicle) => {
    const make = vehicle.make || vehicle.brand || '';
    const model = vehicle.model || '';
    const year = vehicle.year || '';
    const plateNumber = vehicle.plate || '';
    
    let displayName = '';
    
    if (year) displayName += `${year} `;
    if (make) displayName += `${make} `;
    if (model) displayName += model;
    
    if (displayName.trim()) {
      return `${displayName.trim()} - ${plateNumber || "No plate"}`;
    }
    
    return plateNumber ? `Vehicle with plate: ${plateNumber}` : "Unknown vehicle";
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
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
        animation: "fadeIn 0.2s ease",
      }}
      onClick={(e) => {
        // Close modal when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "1100px",
          maxHeight: "90vh",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        {/* Header */}
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
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                {currentJobsheet ? "Edit Job Sheet" : "Create New Job Sheet"}
              </h2>
              <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
                {currentJobsheet 
                  ? `Editing Job Sheet #${currentJobsheet.id}` 
                  : "Enter customer, vehicle information and services"}
              </p>
            </div>
            <button
              onClick={onClose}
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
                zIndex: 10
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {/* Notification */}
          {notification.show && (
            <div 
              style={{
                margin: "15px 20px 0 20px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: notification.type === "success" ? "#E8F5E9" : "#FFEBEE",
                color: notification.type === "success" ? "#2E7D32" : "#C62828",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                animation: "slideDown 0.3s ease",
                border: `1px solid ${notification.type === "success" ? "#A5D6A7" : "#FFCDD2"}`,
              }}
            >
              <div style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {notification.type === "success" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12" stroke="#C62828" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M12 16H12.01" stroke="#C62828" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#C62828" strokeWidth="2"/>
                  </svg>
                )}
              </div>
              {notification.message}
            </div>
          )}

          {/* Combined content */}
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              {/* Left column - Customer & Vehicle */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Customer Selection */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: "8px", color: "#5932EA" }} />
                    Customer
                  </label>

                  {selectedCustomerName ? (
                    <div
                      style={{
                        marginBottom: "10px",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#f0f4ff",
                        border: "1px solid #d0d8ff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "500" }}>{selectedCustomerName}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCustomerName("");
                          setFormData({ ...formData, customer_id: "", vehicle_id: "" });
                          setVehicles([]);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#5932EA",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          position: "relative",
                          marginBottom: showCustomerResults && filteredCustomers.length > 0 ? "0" : "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            border: "1px solid #e0e0e0",
                            borderRadius: "8px",
                            padding: "2px",
                            backgroundColor: "#f9fafc",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "0 12px",
                              color: "#5932EA",
                            }}
                          >
                            <FontAwesomeIcon icon={faSearch} />
                          </div>
                          <input
                            type="text"
                            placeholder="Search customers..."
                            value={customerSearchTerm}
                            onChange={handleCustomerSearch}
                            onFocus={() => setShowCustomerResults(true)}
                            style={{
                              flex: 1,
                              padding: "12px 8px",
                              border: "none",
                              borderRadius: "8px",
                              outline: "none",
                              backgroundColor: "transparent",
                              fontSize: "14px",
                            }}
                          />
                          <button
                            onClick={() => setShowNewCustomerForm(true)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "none",
                              backgroundColor: "#5932EA",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                          >
                            <FontAwesomeIcon icon={faPlus} size="sm" />
                            New Customer
                          </button>
                        </div>

                        {showCustomerResults && filteredCustomers.length > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              backgroundColor: "white",
                              borderRadius: "0 0 8px 8px",
                              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                              zIndex: 10,
                              maxHeight: "200px",
                              overflowY: "auto",
                              border: "1px solid #e0e0e0",
                              borderTop: "none",
                            }}
                          >
                            {filteredCustomers.map((customer) => (
                              <div
                                key={customer.id}
                                onClick={() => handleSelectCustomer(customer)}
                                style={{
                                  padding: "12px 16px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #f0f0f0",
                                  transition: "background-color 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafc")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                <div style={{ fontWeight: "500" }}>
                                  {customer.name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()}
                                </div>
                                {customer.phone && (
                                  <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>
                                    {customer.phone}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* New Customer Form */}
                  {showNewCustomerForm && (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        backgroundColor: "#f9fafc",
                        border: "1px solid #e0e0e0",
                        marginTop: "10px",
                        animation: "fadeIn 0.3s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Create New Customer</h3>
                        <button
                          onClick={() => setShowNewCustomerForm(false)}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "18px",
                            cursor: "pointer",
                            color: "#666",
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <form onSubmit={handleCreateCustomer} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                            Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={newCustomer.name}
                            onChange={handleNewCustomerChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={newCustomer.email}
                              onChange={handleNewCustomerChange}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={newCustomer.phone}
                              onChange={handleNewCustomerChange}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                            Address
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={newCustomer.address}
                            onChange={handleNewCustomerChange}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setShowNewCustomerForm(false)}
                            style={{
                              padding: "10px 16px",
                              background: "none",
                              border: "1px solid #d0d0d0",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                              padding: "10px 16px",
                              backgroundColor: "#5932EA",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: isLoading ? "default" : "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              opacity: isLoading ? 0.7 : 1,
                            }}
                          >
                            {isLoading ? "Creating..." : "Create Customer"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Vehicle Selection */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                    <FontAwesomeIcon icon={faMotorcycle} style={{ marginRight: "8px", color: "#5932EA" }} />
                    Motorcycle
                  </label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleFormChange}
                      disabled={!formData.customer_id}
                      style={{
                        flex: 1,
                        padding: "12px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        backgroundColor: !formData.customer_id ? "#f5f5f5" : "#fff",
                        color: !formData.customer_id ? "#999" : "#333",
                        fontSize: "14px",
                        cursor: !formData.customer_id ? "not-allowed" : "pointer",
                      }}
                    >
                      <option value="">Select motorcycle...</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {getVehicleDisplayName(vehicle)}
                        </option>
                      ))}
                    </select>
                    {formData.customer_id && (
                      <button
                        onClick={() => setShowNewVehicleForm(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "#5932EA",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          height: "44px",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#4321C9")}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#5932EA")}
                      >
                        <FontAwesomeIcon icon={faPlus} size="sm" />
                        New Motorcycle
                      </button>
                    )}
                  </div>
                  {formData.customer_id && vehicles.length === 0 && (
                    <p style={{ margin: "8px 0 0 0", color: "#f5711f", fontSize: "14px", display: "flex", alignItems: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "8px" }}>
                        <path d="M12 8V12" stroke="#f5711f" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M12 16H12.01" stroke="#f5711f" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#f5711f" strokeWidth="2"/>
                      </svg>
                      No motorcycles found for this customer. Please add one.
                    </p>
                  )}

                  {/* New Vehicle Form */}
                  {showNewVehicleForm && (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        backgroundColor: "#f9fafc",
                        border: "1px solid #e0e0e0",
                        marginTop: "10px",
                        animation: "fadeIn 0.3s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Add New Motorcycle</h3>
                        <button
                          onClick={() => setShowNewVehicleForm(false)}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "18px",
                            cursor: "pointer",
                            color: "#666",
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <form onSubmit={handleCreateVehicle} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                              License Plate *
                            </label>
                            <input
                              type="text"
                              name="plate"
                              value={newVehicle.plate}
                              onChange={handleNewVehicleChange}
                              required
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                              Year
                            </label>
                            <input
                              type="text"
                              name="year"
                              value={newVehicle.year}
                              onChange={handleNewVehicleChange}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                              Brand
                            </label>
                            <input
                              type="text"
                              name="brand"
                              value={newVehicle.brand}
                              onChange={handleNewVehicleChange}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                              Model *
                            </label>
                            <input
                              type="text"
                              name="model"
                              value={newVehicle.model}
                              onChange={handleNewVehicleChange}
                              required
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #e0e0e0",
                                borderRadius: "6px",
                                fontSize: "14px",
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                            Color
                          </label>
                          <input
                            type="text"
                            name="color"
                            value={newVehicle.color}
                            onChange={handleNewVehicleChange}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setShowNewVehicleForm(false)}
                            style={{
                              padding: "10px 16px",
                              background: "none",
                              border: "1px solid #d0d0d0",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                              padding: "10px 16px",
                              backgroundColor: "#5932EA",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: isLoading ? "default" : "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              opacity: isLoading ? 0.7 : 1,
                            }}
                          >
                            {isLoading ? "Creating..." : "Create Motorcycle"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Date and Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: "8px", color: "#5932EA" }} />
                      Date
                    </label>
                    <input
                      type="date"
                      name="date_created"
                      value={formData.date_created}
                      onChange={handleFormChange}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                      <FontAwesomeIcon icon={faTags} style={{ marginRight: "8px", color: "#5932EA" }} />
                      Status
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleFormChange}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right column - Labor Tasks */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                    <FontAwesomeIcon icon={faTools} style={{ marginRight: "8px", color: "#5932EA" }} />
                    Labor Tasks
                  </h3>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#5932EA" }}>
                    Total: ${laborTasks.reduce((sum, labor) => sum + parseFloat(labor.price || 0), 0).toFixed(2)}
                  </p>
                </div>

                {/* Predefined labor tasks */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#666" }}>Quick Add Templates</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  {predefinedLabors.map((labor, index) => (
  <button
    key={index}
    onClick={() => handleAddPredefinedLabor(labor)}
    style={{
      padding: "12px",
      backgroundColor: "white",
      borderRadius: "8px",
      border: "1px solid #e0e0e0",
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: "12px"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = labor.bgColor;
      e.currentTarget.style.borderColor = labor.color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "white";
      e.currentTarget.style.borderColor = "#e0e0e0";
    }}
  >
    <div style={{ 
      backgroundColor: labor.bgColor, 
      width: "36px", 
      height: "36px", 
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: labor.color,
      flexShrink: 0
    }}>
      <FontAwesomeIcon icon={labor.icon} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "14px", fontWeight: "500", color: "#333" }}>
        {labor.description}
      </div>
      <div style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
        Price to be set later
      </div>
    </div>
  </button>
))}
                  </div>
                </div>

                {/* Add new labor form */}
                <div
                  style={{
                    backgroundColor: "#f9fafc",
                    padding: "16px",
                    borderRadius: "12px",
                    marginBottom: "20px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "600" }}>Custom Labor Task</h4>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={newLabor.description}
                        onChange={(e) => setNewLabor({ ...newLabor, description: e.target.value })}
                        placeholder="e.g. Oil change, Brake repair..."
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                        Price ($)
                      </label>
                      <input
                        type="number"
                        value={newLabor.price}
                        onChange={(e) => setNewLabor({ ...newLabor, price: e.target.value })}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                      />
                    </div>

                    <div style={{ alignSelf: "flex-end" }}>
                      <button
                        onClick={handleAddLabor}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "#5932EA",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          height: "44px",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#4321C9")}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#5932EA")}
                      >
                        <FontAwesomeIcon icon={faPlus} size="sm" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Labor tasks list */}
                {laborTasks.length > 0 ? (
                  <div style={{ 
                    border: "1px solid #e0e0e0", 
                    borderRadius: "12px", 
                    overflow: "hidden",
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f5f7fa" }}>
                          <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333" }}>Description</th>
                          <th style={{ padding: "12px 20px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: "#333", width: "120px" }}>Price</th>
                          <th style={{ padding: "12px 20px", textAlign: "center", fontSize: "14px", fontWeight: "600", color: "#333", width: "80px" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laborTasks.map((labor, index) => (
                          <tr key={labor.id} style={{ borderTop: index > 0 ? "1px solid #e0e0e0" : "none" }}>
                            <td style={{ padding: "12px 20px", fontSize: "14px" }}>
                              {labor.description}
                            </td>
                            <td style={{ padding: "12px 20px", textAlign: "right", fontSize: "14px", fontWeight: "500" }}>
                              ${parseFloat(labor.price).toFixed(2)}
                            </td>
                            <td style={{ padding: "12px 20px", textAlign: "center" }}>
                              <button
                                onClick={() => handleRemoveLabor(labor.id)}
                                style={{
                                  background: "none",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                  cursor: "pointer",
                                  color: "#f44336",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = "#fff5f5";
                                  e.currentTarget.style.borderColor = "#ffcdd2";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                  e.currentTarget.style.borderColor = "#e0e0e0";
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} size="sm" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "30px 20px",
                      textAlign: "center",
                      backgroundColor: "#f9fafc",
                      borderRadius: "12px",
                      border: "1px dashed #d0d8ff",
                    }}
                  >
                    <FontAwesomeIcon icon={faTools} style={{ fontSize: "24px", color: "#5932EA", opacity: 0.5, marginBottom: "10px" }} />
                    <p style={{ margin: 0, fontSize: "15px", color: "#666" }}>No labor tasks added yet.</p>
                    <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#888" }}>
                      Add tasks using the quick templates or custom form above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            backgroundColor: "#f9fafc",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
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
                e.currentTarget.style.backgroundColor = "#f5f5f5";
                e.currentTarget.style.color = "#555";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#666";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                padding: "10px 24px",
                backgroundColor: "#5932EA",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isLoading ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: "180px",
                opacity: isLoading ? 0.7 : 1,
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = "#4321C9")}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = "#5932EA")}
            >
              {isLoading ? (
                <>
                  <div 
                    style={{
                      width: "16px", 
                      height: "16px", 
                      border: "2px solid rgba(255,255,255,0.3)", 
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} 
                  />
                  Saving...
                </>
              ) : (
                <>
                  {currentJobsheet ? "Update Job Sheet" : "Create Job Sheet"}
                </>
              )}
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
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreateJobsheetModal;