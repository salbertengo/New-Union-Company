import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash, faPlus, faTimes, faPrint, 
  faArrowLeft, faSearch, faExclamationCircle, 
  faCheckCircle, faCar, faSave, faUser, faStore
} from "@fortawesome/free-solid-svg-icons";

const WORKFLOW_KEYWORDS = {
  "deposit": { id: "2", defaultDescription: "Deposit for Bike Sale" },
  "insurance": { id: "3", defaultDescription: "Insurance Payment" },
  "bq hp": { id: "4", defaultDescription: "BQ HP" },
  "road tax": { id: "5", defaultDescription: "Road Tax" },
  "nu hp": { id: "6", defaultDescription: "NU HP"}
};

const SearchResultItem = ({ item, onSelect }) => (
  <div
    onClick={() => onSelect(item)}
    style={{
      padding: "8px 12px",
      borderBottom: "1px solid #f0f0f0",
      cursor: "pointer",
      backgroundColor: "white"
    }}
    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f9f9f9"}
    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "white"}
  >
    <div style={{ fontWeight: "500", fontSize: "14px" }}>{item.name}</div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "2px" }}>
      <span style={{
        color: parseInt(item.stock) > 0 ? "#2e7d32" : "#c62828",
        fontWeight: "500"
      }}>
        Stock: {item.stock ? Number(item.stock).toFixed(0) : '0'}
      </span>
      {!item.isLabourItem && (
        <span style={{ display: 'flex', gap: '10px' }}>
          <span>Cost: ${parseFloat(item.cost || 0).toFixed(2)}</span>
          <span>Sale: ${parseFloat(item.sale || 0).toFixed(2)}</span>
        </span>
      )}
    </div>
  </div>
);

const JobsheetDetailView = ({ jobsheetId: propJobsheetId, onClose, refreshJobsheets, isModal = false, isNew: propIsNew = false }) => {
  const [internalJobsheetId, setInternalJobsheetId] = useState(propJobsheetId);
  const [internalIsNew, setInternalIsNew] = useState(propIsNew);
  
  const [jobsheet, setJobsheet] = useState(null);
  const [items, setItems] = useState([]);
  const [labors, setLabors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [licensePlate, setLicensePlate] = useState("");
  const [plateSearchResults, setPlateSearchResults] = useState([]);
  const [newVehicleDetails, setNewVehicleDetails] = useState({
    plate: '',
    model: ''
  });
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newMiscName, setNewMiscName] = useState("");
  const [newMiscPrice, setNewMiscPrice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [taxRate, setTaxRate] = useState(9); // Default 9% GST
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerDetails, setNewCustomerDetails] = useState({
    name: "",
    contact: "",
    email: ""
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [activeInputMode, setActiveInputMode] = useState("search"); // 'search', 'labor', 'workflowSpecific'
  const [currentWorkflowKeywordInfo, setCurrentWorkflowKeywordInfo] = useState(null);
  
  const [selectedProductForAdding, setSelectedProductForAdding] = useState(null);
  const [editingCell, setEditingCell] = useState({ itemId: null, field: null });
  const [editValue, setEditValue] = useState("");
  const quantityInputRef = useRef(null);
  
  const printableContentRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL;
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  const effectiveJobsheetId = internalJobsheetId || propJobsheetId;
  const effectiveIsNew = internalIsNew && !internalJobsheetId;
const [deletedItemIds, setDeletedItemIds] = useState([]);
const [deletedLaborIds, setDeletedLaborIds] = useState([]);
const [pendingJobsheetUpdates, setPendingJobsheetUpdates] = useState({});
const [hasPendingChanges, setHasPendingChanges] = useState(false);

// Reset these when jobsheet ID changes
useEffect(() => {
  setDeletedItemIds([]);
  setDeletedLaborIds([]);
  setPendingJobsheetUpdates({});
  setHasPendingChanges(false);
}, [effectiveJobsheetId, effectiveIsNew]);
  const allItems = [...items, ...labors.map(labor => ({
    id: `labor-${labor.id}`,
    name: labor.description || "Labor",
    price: labor.price,
    quantity: 1,
    isLabor: true,
    workflow_type: labor.workflow_type
  }))];

  const notificationTimerRef = useRef(null);

  const showNotification = (message, type) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    
    setNotification({ show: true, message, type });
    
    notificationTimerRef.current = setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
      notificationTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setInventorySearchTerm("");
    setSearchResults([]);
    setActiveInputMode("search");
    setCurrentWorkflowKeywordInfo(null);
    
    return () => {
      setInventorySearchTerm("");
      setSearchResults([]);
      setActiveInputMode("search");
      setCurrentWorkflowKeywordInfo(null);
    };
  }, []);

  const handleApiError = (error, defaultMessage) => {
    console.error(`${defaultMessage}:`, error);
    
    let errorMessage = defaultMessage;
    
    if (typeof error === 'string') {
      try {
        const parsedError = JSON.parse(error);
        errorMessage = parsedError.error || parsedError.message || defaultMessage;
      } catch (e) {
        errorMessage = error || defaultMessage;
      }
    } else if (error && error.message) {
      errorMessage = error.message;
    }
    
    showNotification(errorMessage, "error");
  };

  useEffect(() => {
    setInternalJobsheetId(propJobsheetId);
  }, [propJobsheetId]);
  
  useEffect(() => {
    setInternalIsNew(propIsNew);
  }, [propIsNew]);
  
  useEffect(() => {
    if (effectiveJobsheetId) {
      loadJobsheetData();
    } else {
      setIsLoading(false);
    }
  }, [effectiveJobsheetId, effectiveIsNew]);

  useEffect(() => {
    if (effectiveJobsheetId) {
      setInventorySearchTerm("");
      setActiveInputMode("search"); 
      setCurrentWorkflowKeywordInfo(null);
    }
  }, [effectiveJobsheetId]);
  const handleExitClick = () => {
    if (hasPendingChanges) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };

  // Add this function to handle confirmed exit
  const handleConfirmedExit = () => {
    setShowExitConfirmation(false);
    onClose();
  };

  const fetchItems = async (token, id = null) => {
    const idToUse = id || effectiveJobsheetId;
    try {
      const res = await fetch(`${API_URL}/jobsheets/${idToUse}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        console.error("Failed to load items:", res.status);
      }
    } catch (error) {
      console.error("Error loading items:", error);
    }
  };

  const fetchLabors = async (token, id = null) => {
    const idToUse = id || effectiveJobsheetId;
    try {
      const res = await fetch(`${API_URL}/labor/jobsheet/${idToUse}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLabors(data);
      } else {
        console.error("Failed to load labors:", res.status);
      }
    } catch (error) {
      console.error("Error loading labors:", error);
    }
  };

  const fetchPayments = async (token, id = null) => {
    const idToUse = id || effectiveJobsheetId;
    try {
      const res = await fetch(`${API_URL}/jobsheets/payments/jobsheet/${idToUse}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      } else {
        console.error("Failed to load payments:", res.status);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  const getWorkflowButtonColor = (type) => {
    const colors = {
      "1": "#757575", // General Labor/Repair (Grey 600)
      "2": "#03A9F4", // Deposit for Bike Sale (Light Blue 500)
      "3": "#00ACC1", // Insurance (Cyan 600)
      "4": "#00838F", // HP Payment (Cyan 800)
      "5": "#006064", // Road Tax (Cyan 900)
      "6": "#26A69A"  // HP Payment 2 (Teal 400)
    };
    return colors[type] || "#757575"; // Default to Grey 600
  };

 const handleUpdateJobsheetCustomer = async () => {
  if (!selectedCustomerId) {
    showNotification("No customer selected", "error");
    return;
  }
  
  // Update local jobsheet state for UI feedback
  if (selectedCustomer) {
    setJobsheet(prevJobsheet => ({
      ...prevJobsheet, 
      customer_id: selectedCustomerId,
      customer_name: selectedCustomer.name,
      customer_contact: selectedCustomer.contact,
      customer_email: selectedCustomer.email
    }));
  }
  
  // Track pending update
  setPendingJobsheetUpdates(prev => ({
    ...prev, 
    customer_id: selectedCustomerId
  }));
  
  setHasPendingChanges(true);
  setShowCustomerModal(false);
  showNotification("Customer assigned locally. Click Save & Exit to persist changes.", "info");
};

  const handleLicensePlateSearch = async (e) => {
  const value = e.target.value;
  setLicensePlate(value);
  setNewVehicleDetails({
    ...newVehicleDetails,
    plate: value
  });

  // Check for walk-in keyword but don't return early
  if (value.toLowerCase().includes('walk')) {
    console.log("Detected walk-in request");
    setPlateSearchResults([]);
    // Continue execution to ensure state updates properly
  } else if (value.length >= 2) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/vehicles?search=${encodeURIComponent(value)}`, {
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });

      if (response.ok) {
        const vehicles = await response.json();
        const filteredResults = vehicles.filter(vehicle => {
          const plateValue = vehicle.plate || vehicle.license_plate || "";
          return plateValue.toLowerCase().includes(value.toLowerCase());
        });

        setPlateSearchResults(filteredResults);
      } else {
        console.error("Error searching vehicles:", response.status);
      }
    } catch (error) {
      console.error("Error searching vehicles:", error);
    }
  } else {
    setPlateSearchResults([]);
  }
};

  const handleSelectVehicle = async (vehicle) => {
    if (!vehicle || !vehicle.id) {
      console.error("Invalid vehicle selected:", vehicle);
      showNotification("Invalid vehicle selected", "error");
      return;
    }
    
    const plateValue = vehicle.plate || vehicle.license_plate || "";
    console.log(`Selected vehicle: ID=${vehicle.id}, plate=${plateValue}`);
    
    setLicensePlate(plateValue);
    setPlateSearchResults([]);
    
    try {
      // Asegurar que el ID sea un número si es posible
      const vehicleId = typeof vehicle.id === 'string' && !isNaN(parseInt(vehicle.id, 10)) 
        ? parseInt(vehicle.id, 10) 
        : vehicle.id;
        
      console.log(`Creating jobsheet with vehicle ID: ${vehicleId} (type: ${typeof vehicleId})`);
      
      // Llamar directamente, no con setTimeout
      await handleCreateJobsheet(vehicleId);
    } catch (error) {
      console.error("Error in handleSelectVehicle:", error);
      showNotification(`Error selecting vehicle: ${error.message}`, "error");
    }
  };

  const handleCreateVehicle = async () => {
    if (!newVehicleDetails.plate || !newVehicleDetails.model) {
      showNotification("License plate and model are required", "error");
      return;
    }
  
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      let customerIdToUse = selectedCustomerId;

      if (!customerIdToUse) {
        const customerResponse = await fetch(`${API_URL}/customers?limit=1&search=General%20Customer`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (customerResponse.ok) {
          const customers = await customerResponse.json();
          if (customers && customers.length > 0 && customers[0].name === "General Customer") {
            customerIdToUse = customers[0].id;
          } else {
            const newCustomerResponse = await fetch(`${API_URL}/customers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                name: "General Customer",
                contact: "N/A",
                email: "general@example.com",
                is_active: 1
              })
            });
            
            if (newCustomerResponse.ok) {
              const newCustomer = await newCustomerResponse.json();
              customerIdToUse = newCustomer.id;
            } else {
              throw new Error("Failed to create default customer");
            }
          }
        } else {
          throw new Error("Failed to query for General Customer");
        }
      }
  
      const vehicleData = {
        plate: newVehicleDetails.plate,
        model: newVehicleDetails.model,
        customer_id: customerIdToUse, 
        year: new Date().getFullYear(),
        is_active: 1
      };
  
      const response = await fetch(`${API_URL}/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(vehicleData),
      });
  
      if (response.ok) {
        const newVehicle = await response.json();
        showNotification("Vehicle created successfully", "success");
        handleCreateJobsheet(newVehicle.id);
      } else {
        const errorText = await response.text();
        let errorMessage = "Error creating vehicle";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorText;
        } catch (e) {
          errorMessage = errorText;
        }
        
        console.error("Vehicle creation error:", errorMessage);
        showNotification("Error creating vehicle: " + errorMessage, "error");
      }
    } catch (error) {
      console.error("Exception in vehicle creation:", error);
      showNotification("Error creating vehicle: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJobsheet = async (vehicleId) => {
  console.log("=== handleCreateJobsheet STARTED ===");
  console.log(`Vehicle ID received: ${vehicleId} (${typeof vehicleId})`);
  
  if (!vehicleId) {
    showNotification("No vehicle selected", "error");
    console.log("ERROR: No vehicle ID provided to handleCreateJobsheet");
    return;
  }
  
  setIsLoading(true);
  try {
    // Check API_URL is defined
    if (!API_URL) {
      console.error("API_URL is not defined!", { API_URL });
      showNotification("Configuration error: API URL not defined", "error");
      setIsLoading(false);
      return;
    }
    console.log(`API URL: ${API_URL}`);
    
    // Get token
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found in localStorage");
      showNotification("Authentication error: Please login again", "error");
      setIsLoading(false);
      return;
    }
    console.log("Token retrieved successfully");
    
    // IMPROVED USER ID RETRIEVAL - Try multiple approaches
    let userId = null;
    
    // Approach 1: Try getting from user object in localStorage
    try {
      const userStr = localStorage.getItem("user");
      console.log("Raw user data from localStorage:", userStr);
      
      if (userStr) {
        const userData = JSON.parse(userStr);
        console.log("Parsed user data:", userData);
        
        if (userData && userData.id) {
          userId = userData.id;
          console.log(`Found user ID in user object: ${userId}`);
        }
      }
    } catch (parseError) {
      console.error("Error parsing user data from localStorage:", parseError);
    }
    
    // Approach 2: Try getting from userId in localStorage directly
    if (!userId) {
      const directUserId = localStorage.getItem("userId");
      if (directUserId) {
        userId = directUserId;
        console.log(`Found direct user ID: ${userId}`);
      }
    }
    
    // Approach 3: Try getting from JWT token decode
    if (!userId && token) {
      try {
        // Simple JWT token parsing (gets the payload part)
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const tokenData = JSON.parse(jsonPayload);
          console.log("Token decoded data:", tokenData);
          
          if (tokenData && tokenData.id) {
            userId = tokenData.id;
            console.log(`Extracted user ID from token: ${userId}`);
          } else if (tokenData && tokenData.sub) {
            userId = tokenData.sub;
            console.log(`Using 'sub' from token as user ID: ${userId}`);
          }
        }
      } catch (e) {
        console.error("Error extracting user ID from token:", e);
      }
    }
    
    // Last resort: Use a default technician ID if configured
    if (!userId) {
      const defaultTechId = process.env.REACT_APP_DEFAULT_TECHNICIAN_ID;
      if (defaultTechId) {
        userId = defaultTechId;
        console.log(`Using default technician ID: ${userId}`);
      }
    }
    
    // Final check
    if (!userId) {
      console.error("Could not find user ID in any storage location");
      showNotification("User session not found. Please log in again.", "error");
      setIsLoading(false);
      return;
    }
    console.log(`Using user ID: ${userId}`);

    const jobsheetData = {
      vehicle_id: vehicleId,
      customer_id: null,
      state: "in progress",
      description: "",
      service_notes: "",
      user_id: userId
    };
    
    console.log("Preparing to send request with data:", jobsheetData);
    console.log(`Request URL: ${API_URL}/jobsheets`);
    
    try {
      console.log("Sending fetch request...");
      const response = await fetch(`${API_URL}/jobsheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(jobsheetData),
      });
      
      console.log("Fetch request complete, status:", response.status);
      
      let responseText;
      try {
        responseText = await response.text();
        console.log("Response text:", responseText);
      } catch (textError) {
        console.error("Error getting response text:", textError);
        responseText = "Could not read response";
      }
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
        console.log("Parsed response:", parsedData);
      } catch (e) {
        console.log("Response is not valid JSON:", e);
        parsedData = { error: responseText };
      }
      
      if (response.ok) {
        console.log("Request successful!");
        showNotification("Jobsheet created successfully", "success");
        
        setTimeout(() => {
          if (refreshJobsheets) refreshJobsheets();
          setInternalIsNew(false);
          setInternalJobsheetId(parsedData.id);
          loadJobsheetData(parsedData.id);
        }, 500);
      } else {
        const errorMessage = parsedData.error || `Failed to create jobsheet (${response.status})`;
        console.error("Error creating jobsheet:", errorMessage, parsedData);
        showNotification("Error creating jobsheet: " + errorMessage, "error");
      }
    } catch (fetchError) {
      console.error("Network error in fetch operation:", fetchError);
      showNotification(`Network error: ${fetchError.message || "Could not connect to server"}`, "error");
    }
  } catch (error) {
    console.error("Exception in handleCreateJobsheet:", error);
    showNotification("Error creating jobsheet: " + error.message, "error");
  } finally {
    setIsLoading(false);
    console.log("=== handleCreateJobsheet COMPLETED ===");
  }
};

 const handleWalkInJobsheet = async () => {
  console.log("Creating walk-in jobsheet...");
  setIsLoading(true);
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      showNotification("Authentication error: Please login again", "error");
      return;
    }

    // Get the current user ID from localStorage (try multiple approaches)
    let userId = null;
    
    // Try from user object
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        userId = userData.id;
        console.log("Found user ID:", userId);
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
    
    // Try direct userId
    if (!userId) {
      userId = localStorage.getItem("userId");
      console.log("Using direct userId:", userId);
    }
    
    // Try from token (if JWT)
    if (!userId && token) {
      try {
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const jsonPayload = atob(base64Url);
          const tokenData = JSON.parse(jsonPayload);
          userId = tokenData.id || tokenData.sub;
          console.log("Extracted user ID from token:", userId);
        }
      } catch (e) {
        console.error("Error extracting user ID from token:", e);
      }
    }

    if (!userId) {
      showNotification("User session not found. Please log in again.", "error");
      return;
    }

    console.log("Creating walk-in sale with user ID:", userId);
    
    const jobsheetData = {
      vehicle_id: null,
      customer_id: null,
      state: "in progress",
      description: "Walk-in Sale",
      service_notes: "",
      user_id: userId
    };

    console.log("Sending data:", jobsheetData);

    const response = await fetch(`${API_URL}/jobsheets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(jobsheetData),
    });

    console.log("Response status:", response.status);
    
    if (response.ok) {
      const newJobsheet = await response.json();
      console.log("Jobsheet created:", newJobsheet);
      showNotification("Walk-in jobsheet created successfully", "success");
      
      // Wait a moment before refreshing to ensure server processing completes
      setTimeout(() => {
        if (refreshJobsheets) refreshJobsheets();
        setInternalIsNew(false);
        setInternalJobsheetId(newJobsheet.id);
        loadJobsheetData(newJobsheet.id);
      }, 500);
    } else {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      showNotification("Error creating walk-in jobsheet: " + errorText, "error");
    }
  } catch (error) {
    console.error("Exception creating walk-in jobsheet:", error);
    showNotification("Error creating walk-in jobsheet: " + error.message, "error");
  } finally {
    setIsLoading(false);
  }
};
  
  const loadJobsheetData = async (id = null) => {
    setInventorySearchTerm("");
    setSearchResults([]);
    setNewMiscName(""); 
    setNewMiscPrice(""); 
    setActiveInputMode("search");
    setCurrentWorkflowKeywordInfo(null);
      setDeletedItemIds([]);
  setDeletedLaborIds([]);
  setPendingJobsheetUpdates({});
  setHasPendingChanges(false);
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        showNotification("Authentication error: Please login again", "error");
        setIsLoading(false);
        return;
      }
  
      const idToUse = id || effectiveJobsheetId;
      
      if (!idToUse) {
        console.error("No jobsheet ID to load");
        showNotification("Error: No jobsheet ID specified", "error");
        setIsLoading(false);
        return;
      }

      console.log(`Loading jobsheet with ID: ${idToUse}`);
      
      const response = await fetch(`${API_URL}/jobsheets/${idToUse}`, {
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
      });
  
      if (response.ok) {
        const jobsheetData = await response.json();
        console.log("Jobsheet data loaded:", jobsheetData);
        setJobsheet(jobsheetData);
        setLicensePlate(jobsheetData.license_plate || jobsheetData.plate || "");
  
        await Promise.all([
          fetchItems(token, idToUse),
          fetchLabors(token, idToUse),
          fetchPayments(token, idToUse)
        ]);
        
        showNotification("Jobsheet loaded successfully", "success");
      } else {
        const errorText = await response.text();
        console.error("Failed to load jobsheet:", response.status, errorText);
        showNotification(`Error loading jobsheet: ${response.status}`, "error");
      }
    } catch (error) {
      console.error("Exception in loadJobsheetData:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setInventorySearchTerm("");
      setSearchResults([]);
      setIsLoading(false);
    }
  };
  const getLaborCategoryName = (workflowType) => {
    if (workflowType === "1" || workflowType === 1 || !workflowType) {
      return "General Labor";
    }
    
    const keywordEntry = Object.values(WORKFLOW_KEYWORDS).find(entry => 
      entry.id === workflowType || entry.id === String(workflowType)
    );
    
    if (keywordEntry) {
      return keywordEntry.defaultDescription;
    }
    return "Other Services/Charges";
  };

const calculateTotals = () => {
  const itemsTotal = items.reduce((sum, item) => 
    sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 1)), 0);
  
  const laborBreakdown = {};
  
  labors
    .filter(l => l.is_completed === 1 && l.is_billed === 1)
    .forEach(labor => {
      const price = parseFloat(labor.price || 0);
      const categoryName = getLaborCategoryName(labor.workflow_type);
      laborBreakdown[categoryName] = (laborBreakdown[categoryName] || 0) + price;
    });
  
  const totalLaborCosts = Object.values(laborBreakdown).reduce((sum, val) => sum + val, 0);
  
  // GST se aplica SOLO a los items (productos), no al labor
  const gstIncluded = itemsTotal - (itemsTotal / 1.09);
  
  // Subtotal es la suma de items (con GST incluido) y labor (sin GST)
  const subtotal = itemsTotal + totalLaborCosts;
  
  // Total es igual al subtotal
  const total = subtotal;
  
  const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  
  return {
    items: itemsTotal,
    laborBreakdown,
    subtotal,
    gstIncluded, // GST incluido solo en los productos
    total,
    paid,
    balance: total - paid
  };
};

  const getWorkflowTypeName = (type) => {
    const types = {
      "1": "", 
      "2": "Deposit for Bike Sale",
      "3": "Insurance Payment",
      "4": "HP Payment",
      "5": "Road Tax",
      "6": "HP Payment 2"
    };
    const name = types[type];
    if (name === "") return ""; 
    return name || "Service/Charge";
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setInventorySearchTerm(term);
    setSelectedProductForAdding(null);
    const lowerTerm = term.toLowerCase().trim();

    if (lowerTerm === "labor") {
      setActiveInputMode("labor");
      setNewMiscName("");
      setNewMiscPrice("");
      setSearchResults([]);
      setCurrentWorkflowKeywordInfo(null);
    } else {
      let matchedWorkflow = null;
      for (const keyword in WORKFLOW_KEYWORDS) {
        if (lowerTerm === keyword) {
          matchedWorkflow = WORKFLOW_KEYWORDS[keyword];
          break;
        }
      }

      if (matchedWorkflow) {
        setActiveInputMode("workflowSpecific");
        setCurrentWorkflowKeywordInfo(matchedWorkflow);
        setNewMiscName(matchedWorkflow.defaultDescription);
        setNewMiscPrice("");
        setSearchResults([]);
      } else {
        setActiveInputMode("search");
        setCurrentWorkflowKeywordInfo(null);
        if (term.length >= 2) {
          fetchSearchResults(term);
        } else {
          setSearchResults([]);
        }
      }
    }
  };

  const fetchSearchResults = async (term) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/inventory?search=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        console.error("Error searching inventory:", response.status);
      }
    } catch (error) {
      console.error("Error searching inventory:", error);
    }
  };

  const handleProductSelectedFromSearch = (product) => {
    setSelectedProductForAdding(product);
    setInventorySearchTerm(product.name);
    setSearchResults([]);
    setNewItemQuantity(1);
    if (quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
    setActiveInputMode("search");
  };
  
  const handleAddItemToJobsheet = async () => {
  if (!selectedProductForAdding) {
    showNotification("Please select a product first", "error");
    return;
  }
  if (isReadOnly) {
    showNotification(`This order is ${jobsheet?.state} and cannot be modified`, "error");
    return;
  }
  
  if (!effectiveJobsheetId) {
    showNotification("Cannot add item: No active jobsheet", "error");
    return;
  }
  
  const quantity = parseInt(newItemQuantity) || 1;
  if (quantity <= 0) {
    showNotification("Quantity must be at least 1", "error");
    return;
  }

  // Create a new item with a temporary ID and action flag
  const newItem = {
    id: `temp-item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    jobsheet_id: effectiveJobsheetId,
    product_id: selectedProductForAdding.id,
    name: selectedProductForAdding.name,
    description: selectedProductForAdding.description || selectedProductForAdding.name,
    quantity: quantity,
    price: selectedProductForAdding.sale,
    _action: 'create' // Mark as new item to be created on save
  };

  // Add to local state
  setItems(prevItems => [...prevItems, newItem]);
  setHasPendingChanges(true);
  
  // Reset input fields and selection
  setInventorySearchTerm("");
  setSearchResults([]);
  setNewItemQuantity(1);
  setSelectedProductForAdding(null);
  showNotification("Item added locally. Click Save & Exit to persist changes.", "info");
};

const handleUpdateItemQuantity = async (itemToUpdate) => {
  if (isReadOnly || itemToUpdate.isLabor) return;

  const newQuantity = parseInt(editValue);

  if (isNaN(newQuantity) || newQuantity <= 0) {
    showNotification("Invalid quantity. Must be a number greater than 0.", "error");
    setEditingCell({ itemId: null, field: null });
    setEditValue("");
    return;
  }

  if (newQuantity === itemToUpdate.quantity) {
    setEditingCell({ itemId: null, field: null });
    return;
  }

  // Update the item in local state
  setItems(prevItems => prevItems.map(item => {
    if (item.id === itemToUpdate.id) {
      // If this is a new item (added in this session but not yet saved)
      // we can just update it without marking for update
      if (item._action === 'create') {
        return { ...item, quantity: newQuantity };
      }
      
      // For existing items, mark for update
      return { 
        ...item, 
        quantity: newQuantity,
        _action: 'update' 
      };
    }
    return item;
  }));
  
  setHasPendingChanges(true);
  setEditingCell({ itemId: null, field: null });
  setEditValue("");
  showNotification("Quantity updated locally. Click Save & Exit to persist changes.", "info");
};

 const handleAddLabor = async (description, price, workflowTypeId = "1") => {
  if (isReadOnly) {
    showNotification(`This order is ${jobsheet?.state} and cannot be modified.`, "error");
    return;
  }
  if (!description && workflowTypeId === "1") { // Only require description for generic labor
    showNotification("Labor description is required.", "error");
    return;
  }
  if (!price || parseFloat(price) <= 0) {
    showNotification("A valid price is required.", "error");
    return;
  }
  if (!effectiveJobsheetId) {
    showNotification("Cannot add: No active jobsheet.", "error");
    return;
  }

  // Create new labor with temporary ID and action flag
  const newLabor = {
    id: `temp-labor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    jobsheet_id: effectiveJobsheetId,
    description: description || WORKFLOW_KEYWORDS[Object.keys(WORKFLOW_KEYWORDS).find(key => 
      WORKFLOW_KEYWORDS[key].id === workflowTypeId)]?.defaultDescription || "Service Charge",
    price: parseFloat(price),
    is_completed: 1,
    is_billed: 1,
    workflow_type: workflowTypeId,
    _action: 'create',
    isLabor: true // For compatibility with allItems
  };

  // Add to local state
  setLabors(prevLabors => [...prevLabors, newLabor]);
  setHasPendingChanges(true);
  
  // Reset input fields
  setInventorySearchTerm("");
  setActiveInputMode("search");
  setNewMiscName("");
  setNewMiscPrice("");
  setCurrentWorkflowKeywordInfo(null);
  
  showNotification(`${newLabor.description} added locally. Click Save & Exit to persist changes.`, "info");
};


const handleDeleteItem = async (itemId) => {
  if (isReadOnly) {
    showNotification(`This order is ${jobsheet?.state} and cannot be modified`, "error");
    return;
  }

  const itemToDelete = items.find(item => item.id === itemId);
  
  if (itemToDelete) {
    // Si el ítem es nuevo (no guardado en el servidor)
    if (itemToDelete._action === 'create') {
      // Simplemente eliminar del array local
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } else {
      // Para ítems existentes, seguir ID para eliminación y también eliminar de la UI
      setDeletedItemIds(prev => [...prev, itemId]);
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }
    
    setHasPendingChanges(true);
    showNotification("Item removed locally. Click Save & Exit to persist changes.", "info");
  } else {
    console.error("Item not found for deletion:", itemId);
  }
};

 const handleDeleteLabor = async (laborId) => {
  if (isReadOnly) {
    showNotification(`This order is ${jobsheet?.state} and cannot be modified`, "error");
    return;
  }

  // No quitar el prefijo "labor-" si es parte de un ID temporal
  let originalLaborId = laborId.toString();
  if (!originalLaborId.includes('temp-')) {
    // Solo quitar el prefijo "labor-" si NO es un ID temporal
    originalLaborId = originalLaborId.replace('labor-', '');
  }
  
  console.log("Intentando borrar labor:", { 
    laborId, 
    originalLaborId, 
    todosLosLabors: labors.map(l => ({ id: l.id, tipo: typeof l.id }))
  });
  
  // Buscar con el ID correcto
  const laborToDelete = labors.find(labor => labor.id.toString() === originalLaborId);

  if (laborToDelete) {
    console.log("Labor encontrado, borrando:", laborToDelete);
    
    // Si el elemento es nuevo (no guardado en el servidor)
    if (laborToDelete._action === 'create') {
      // Simplemente eliminar del array local
      setLabors(prevLabors => prevLabors.filter(labor => labor.id !== laborToDelete.id));
    } else {
      // Para labores existentes, seguir ID para eliminación y también eliminar de la UI
      setDeletedLaborIds(prev => [...prev, laborToDelete.id]);
      setLabors(prevLabors => prevLabors.filter(labor => labor.id !== laborToDelete.id));
    }
    
    setHasPendingChanges(true);
    showNotification("Labor removed locally. Click Save to persist changes.", "info");
  } else {
    console.error(
      `Labor not found for deletion: ${laborId} (original: ${originalLaborId})`,
      `Available labors:`, labors.map(l => `${l.id} (${typeof l.id})`)
    );
    showNotification(`Error: No se pudo encontrar el elemento para borrar (ID: ${originalLaborId})`, "error");
  }
};
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      showNotification("Could not open print preview. Please allow popups.", "error");
      return;
    }
    
    const totals = calculateTotals();

    const groupedLaborsForInvoice = labors
      .filter(l => l.is_completed === 1 && l.is_billed === 1)
      .reduce((acc, labor) => {
        const categoryName = getLaborCategoryName(labor.workflow_type);
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(labor);
        return acc;
      }, {});

    let laborInvoiceRows = "";
    const categoryOrderForInvoice = ["General Labor", ...Object.values(WORKFLOW_KEYWORDS).map(kw => kw.defaultDescription), "Other Services/Charges"];

    categoryOrderForInvoice.forEach(categoryName => {
      if (groupedLaborsForInvoice[categoryName] && groupedLaborsForInvoice[categoryName].length > 0) {
        groupedLaborsForInvoice[categoryName].forEach(labor => {
          laborInvoiceRows += `
            <tr>
              <td>${labor.description || categoryName}</td>
              <td class="text-right">1</td>
              <td class="text-right">$${parseFloat(labor.price).toFixed(2)}</td>
              <td class="text-right">$${(parseFloat(labor.price) * 1).toFixed(2)}</td>
            </tr>
          `;
        });
      }
    });
    
    const htmlContent = `
      <html>
        <head>
          <title>Invoice #${jobsheet?.id || ''}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              color: #333;
            }
            .invoice-header {
              text-align: center;
              margin-bottom: 30px;
            }
            .invoice-header h1 {
              margin: 0;
              font-size: 24px;
              color: #444;
            }
            .invoice-header p {
              margin: 5px 0;
              color: #666;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
            }
            .invoice-info div {
              margin-bottom: 15px;
            }
            .invoice-info h3 {
              margin: 0 0 5px 0;
              font-size: 14px;
              color: #888;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 8px 10px;
              text-align: left;
              border-bottom: 1px solid #eee;
            }
            th {
              background-color: #f8f9fa;
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
            }
            .text-right {
              text-align: right;
            }
            .totals {
              width: 300px;
              margin-left: auto;
            }
            .totals table {
              margin-bottom: 0;
            }
            .total-row {
              font-weight: bold;
              background-color: #f8f9fa;
            }
            .payments {
              margin-top: 30px;
            }
            .balance {
              font-weight: bold;
              color: ${totals.balance <= 0 && totals.total > 0 ? 'green' : (totals.total > 0 ? 'red' : '#333')};
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #888;
              font-size: 12px;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>INVOICE</h1>
            <p>New Union Company</p>
            <p>Invoice #${jobsheet?.id || ''}</p>
<p>Date: ${jobsheet?.created_at ? new Date(jobsheet.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</p>
          </div>
          
          <div class="invoice-info">
            <div>
              <h3>VEHICLE</h3>
              <p>
                ${jobsheet?.license_plate || jobsheet?.plate || "No plate"}<br>
                ${jobsheet?.model || ""}
              </p>
            </div>
             <div>
              <h3>CUSTOMER</h3>
              <p>
                ${jobsheet?.customer_name || "N/A"}<br>
                ${jobsheet?.customer_contact || ""}
              </p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description || item.name || "Product"}</td>
                  <td class="text-right">${item.quantity || 1}</td>
                  <td class="text-right">$${parseFloat(item.price).toFixed(2)}</td>
                  <td class="text-right">$${(parseFloat(item.price) * parseInt(item.quantity || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
              
              ${laborInvoiceRows}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                <td>Total (incl. GST):</td>
                <td class="text-right">$${totals.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>GST (${taxRate}%) included:</td>
                <td class="text-right">$${totals.gstIncluded.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td class="text-right">$${totals.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          ${payments.length > 0 ? `
          <div class="payments">
            <h3>Payment Information</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(payment => `
                  <tr>
<td>${new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                    <td>${payment.method.replace('_', ' ')}</td>
                    <td class="text-right">$${parseFloat(payment.amount).toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="2"><strong>Total Paid:</strong></td>
                  <td class="text-right">$${totals.paid.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2"><strong>Balance:</strong></td>
                  <td class="text-right balance">$${Math.max(0, totals.balance).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

 const handleAddPayment = async () => {
  if (isReadOnly) {
    showNotification(`This order is ${jobsheet?.state} and no additional payments can be added`, "error");
    return;
  }
  if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
    showNotification("Please enter a valid payment amount", "error");
    return;
  }
  if (!effectiveJobsheetId) {
    showNotification("Cannot add payment: No active jobsheet.", "error");
    return;
  }

  // Parse the payment amount as float
  const paymentAmountFloat = parseFloat(paymentAmount);

  // Create new payment with temporary ID and action flag
  const newPayment = {
    id: `temp-payment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    jobsheet_id: effectiveJobsheetId,
    amount: paymentAmountFloat,
    method: paymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    _action: 'create'
  };

  // Add to local state
  setPayments(prevPayments => [...prevPayments, newPayment]);
  setHasPendingChanges(true);
  
  // Reset input field
  setPaymentAmount("");
  
  // Calculate new totals including this payment
  const newTotals = calculateTotals({ 
    items, 
    labors, 
    payments: [...payments, newPayment]
  });
  
  if (newTotals.balance <= 0 && newTotals.subtotal > 0 && jobsheet?.state !== "completed") {
    // Don't change the UI to read-only yet, just mark that the jobsheet state will be updated when saved
    setPendingJobsheetUpdates(prev => ({...prev, state: "completed"}));
    showNotification("Full payment received. Order will be marked as completed when you save.", "success");
  } else {
    showNotification("Payment added locally. Click Save to persist changes.", "info");
  }
};

useEffect(() => {
  const updateJobsheetStatusIfPaid = () => {
    if (jobsheet && !isLoading) { 
      const totals = calculateTotals();
      
      if (totals.balance <= 0 && 
          totals.subtotal > 0 && 
          jobsheet.state !== "completed") {
        
        // Don't update the UI state yet - just mark it for update when saved
        setPendingJobsheetUpdates(prev => ({...prev, state: "completed"}));
        setHasPendingChanges(true);
        // Note we're not updating the jobsheet.state here anymore
      }
    }
  };
  
  updateJobsheetStatusIfPaid();
}, [jobsheet, items, labors, payments, isLoading]);

    const handleSaveAndExit = async () => {
  if (!effectiveJobsheetId) {
    showNotification("No active jobsheet to save.", "error");
    return;
  }
  
  setIsLoading(true);
  const token = localStorage.getItem("token");
  if (!token) {
    setIsLoading(false);
    showNotification("Authentication error.", "error");
    return;
  }
  
  let allSavesSuccessful = true;
  const errors = [];
  
  try {
    // 1. First, handle jobsheet updates (customer_id, state, etc.)
    if (Object.keys(pendingJobsheetUpdates).length > 0) {
      console.log("Saving jobsheet updates:", pendingJobsheetUpdates);
      const response = await fetch(`${API_URL}/jobsheets/${effectiveJobsheetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ...jobsheet,
          ...pendingJobsheetUpdates 
        }),
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to update jobsheet details: ${errorText}`);
      }
    }
    
    // 2. Delete items that were removed
    for (const itemId of deletedItemIds) {
      console.log("Deleting item:", itemId);
      const response = await fetch(`${API_URL}/jobsheets/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to delete item ${itemId}: ${errorText}`);
      }
    }
    
    // 3. Delete labors that were removed
    for (const laborId of deletedLaborIds) {
      console.log("Deleting labor:", laborId);
      const response = await fetch(`${API_URL}/labor/${laborId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to delete labor ${laborId}: ${errorText}`);
      }
    }
    
    // 4. Create new items
    const itemsToCreate = items.filter(item => item._action === 'create');
    for (const item of itemsToCreate) {
      console.log("Creating item:", item);
      // Remove temporary properties
      const { _action, id, name, ...itemData } = item;
      
      const response = await fetch(`${API_URL}/jobsheets/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to create item: ${errorText}`);
      }
    }
    
    // 5. Update existing items that were modified
    const itemsToUpdate = items.filter(item => item._action === 'update');
    for (const item of itemsToUpdate) {
      console.log("Updating item:", item);
      const { _action, ...itemData } = item;
      
      const response = await fetch(`${API_URL}/jobsheets/items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: itemData.quantity,
          price: itemData.price
        }),
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to update item: ${errorText}`);
      }
    }
    
    // 6. Create new labors
    const laborsToCreate = labors.filter(labor => labor._action === 'create');
    for (const labor of laborsToCreate) {
      console.log("Creating labor:", labor);
      // Remove temporary properties
      const { _action, id, isLabor, ...laborData } = labor;
      
      const response = await fetch(`${API_URL}/labor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(laborData),
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to create labor: ${errorText}`);
      }
    }
    
    // 7. Create new payments
    const paymentsToCreate = payments.filter(payment => payment._action === 'create');
    for (const payment of paymentsToCreate) {
      console.log("Creating payment:", payment);
      // Remove temporary properties
      const { _action, id, ...paymentData } = payment;
      
      const response = await fetch(`${API_URL}/jobsheets/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        allSavesSuccessful = false;
        const errorText = await response.text();
        errors.push(`Failed to create payment: ${errorText}`);
      }
    }
    
  } catch (error) {
    console.error("Error saving changes:", error);
    allSavesSuccessful = false;
    errors.push(error.message);
  } finally {
    setIsLoading(false);
  }
  
  if (allSavesSuccessful) {
    showNotification("All changes saved successfully", "success");
    // Clear tracking of pending changes
    setDeletedItemIds([]);
    setDeletedLaborIds([]);
    setPendingJobsheetUpdates({});
    setHasPendingChanges(false);
    
    // Refresh local data and exit
    if (refreshJobsheets) refreshJobsheets();
    onClose();
  } else {
    showNotification(`Error saving changes: ${errors.join("; ")}`, "error");
    console.error("Failed to save changes:", errors);
  }
};

  const handleCustomerSearch = async (e) => {
    const term = e.target.value;
    setCustomerSearchTerm(term);

    if (term.length >= 2) {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${API_URL}/customers?search=${encodeURIComponent(term)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const results = await response.json();
          setCustomerSearchResults(results);
        } else {
          console.error("Error searching customers:", response.status);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      }
    } else {
      setCustomerSearchResults([]);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerDetails.name) {
      showNotification("Customer name is required", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({...newCustomerDetails, is_active: 1}),
      });

      if (response.ok) {
        setNewCustomerDetails({ name: "", contact: "", email: "" });
        setShowNewCustomerForm(false);
        showNotification("Customer created successfully. You can now search for them.", "success");
        if (customerSearchTerm) {
          handleCustomerSearch({ target: { value: customerSearchTerm } });
        }
      } else {
        const errorText = await response.text();
        let errorMessage = "Failed to create customer";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {}
        console.error("Failed to create customer:", response.status, errorMessage);
        showNotification(`Failed to create customer: ${errorMessage}`, "error");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      showNotification("Error creating customer: " + error.message, "error");
    }
  };

  const handleUseGeneralCustomer = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/customers?search=General Customer`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const results = await response.json();
        if (results.length > 0) {
          setSelectedCustomer(results[0]);
          setSelectedCustomerId(results[0].id);
          showNotification("General Customer selected", "success");
        } else {
          showNotification("General Customer not found", "error");
        }
      } else {
        console.error("Error searching General Customer:", response.status);
        showNotification("Error searching General Customer", "error");
      }
    } catch (error) {
      console.error("Error searching General Customer:", error);
      showNotification("Error searching General Customer", "error");
    }
  };

const isReadOnly = effectiveJobsheetId && 
                  // Only consider the actual jobsheet.state (server state), not pending updates
                  (jobsheet?.state === "completed" || jobsheet?.state === "cancelled") 
                  // And ensure we're not in the middle of saving a completion state
  if (isLoading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{
        width: "50px", 
        height: "50px", 
        border: "5px solid #f3f3f3",
        borderTop: "5px solid #5932EA",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>;
  }

 if (effectiveIsNew) {
   return (
      <div style={{ // Contenedor principal del modal/vista de página completa
        position: isModal ? "relative" : "fixed",
        top: isModal ? "auto" : 0,
        // Para el caso !isModal (vista de página completa), centramos y hacemos más angosto
        left: isModal ? "auto" : "50%",
        right: isModal ? "auto" : "auto", // Necesario para que left y width controlen la posición
        bottom: isModal ? "auto" : 0,
        transform: isModal ? undefined : "translateX(-50%)",
        
        height: isModal ? "100%" : "100vh", // Usar 100vh para asegurar altura completa en modo fixed
        width: isModal ? "100%" : "80%",    // Ancho base para la vista de página
        maxWidth: isModal ? undefined : "900px", // Ancho máximo para la vista de página

        backgroundColor: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        zIndex: isModal ? 1 : 1000,
        padding: "20px", // El padding se mantiene, el contenido interno se ajustará
        boxSizing: "border-box" // Asegurar que el padding no aumente el tamaño total más allá de width/maxWidth
      }}>
<div style={{ // Encabezado (morado)
  backgroundColor: "#5932EA",
  color: "white",
  padding: "12px 20px",
  margin: "-20px -20px 20px -20px", // Estos márgenes negativos harán que el header ocupe el ancho del padding del padre
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxSizing: "border-box"
}}>
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <button 
      onClick={handleExitClick} 
      style={{
        backgroundColor: "rgba(255,255,255,0.2)",
        border: "none",
        color: "white",
        borderRadius: "50%",
        width: "26px",
        height: "26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      <FontAwesomeIcon icon={faArrowLeft} />
    </button>
    <h2 style={{ margin: 0, fontSize: "16px" }}>New Jobsheet</h2>
  </div>

  {/* Botón X para cerrar */}
  <button 
    onClick={onClose}
    style={{
      backgroundColor: "rgba(255,255,255,0.2)",
      border: "none",
      color: "white",
      borderRadius: "50%",
      width: "26px",
      height: "26px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer"
    }}
  >
    <FontAwesomeIcon icon={faTimes} />
  </button>
</div>


        <div style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "20px"
        }}>
          <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: "500" }}>Vehicle Information</h3>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", color: "#555" }}>
              License Plate
            </label>
            <div style={{ position: "relative", maxWidth: "100%" }}>
              <input
                type="text"
                value={licensePlate}
                onChange={handleLicensePlateSearch}
                placeholder="Input license plate or type 'walk' for walk-in sale"
                style={{ 
                  width: "100%",
                  padding: "10px 10px 10px 35px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box"
                }}
              />
              <FontAwesomeIcon 
                icon={faCar} 
                style={{ 
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#666"
                }}
              />
            </div>
          </div>

          {plateSearchResults.length > 0 && (
            <div style={{
              border: "1px solid #eee",
              borderRadius: "4px",
              marginBottom: "15px",
              maxHeight: "200px",
              overflowY: "auto",
              maxWidth: "100%"
            }}>
              {plateSearchResults.map(vehicle => (
                <div 
                  key={vehicle.id}
                  onClick={() => handleSelectVehicle(vehicle)}
                  style={{
                    padding: "10px 15px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                    backgroundColor: "white",
                    transition: "background-color 0.2s",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f9f9f9"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "white"}
                >
                  <div style={{ fontWeight: "500" }}>{vehicle.plate || vehicle.license_plate}</div>
                  <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
                    {vehicle.model || "Unknown Model"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {licensePlate && !licensePlate.toLowerCase().includes('walk') && plateSearchResults.length === 0 && (
            <div style={{ 
              padding: "15px",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
              marginBottom: "15px",
              maxWidth: "100%"
            }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                Vehicle not found with plate: <strong>{licensePlate}</strong>.
              </p>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "5px", 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  color: "#333" 
                }}>
                  Model *
                </label>
                <input
                  type="text"
                  value={newVehicleDetails.model}
                  onChange={(e) => setNewVehicleDetails({...newVehicleDetails, model: e.target.value})}
                  placeholder="Enter vehicle model (e.g. Honda CBR 150R)"
                  style={{ 
                    width: "100%",
                    padding: "10px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <button
                onClick={handleCreateVehicle}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#5932EA",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  width: "100%"
                }}
              >
                Create Vehicle & Jobsheet
              </button>
            </div>
          )}

          {licensePlate && licensePlate.toLowerCase().includes('walk') && (
  <div style={{
    padding: "15px",
    backgroundColor: "#e8f5e9",
    borderRadius: "4px",
    marginBottom: "15px",
    border: "1px solid #c8e6c9"
  }}>
    <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
      <FontAwesomeIcon icon={faStore} style={{ marginRight: "8px" }} />
      <strong>Walk-in Sale:</strong> Create a jobsheet without vehicle information
    </p>
    <button
      onClick={handleWalkInJobsheet}
      style={{
        width: "100%",
        padding: "10px",
        backgroundColor: "#00C853",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px"
      }}
    >
      Create Walk-in Sale
    </button>
  </div>
)}
        </div>
      </div>
    );
  }

  const totals = effectiveJobsheetId ? calculateTotals() : { items: 0, labor: 0, subtotal: 0, tax: 0, total: 0, paid: 0, balance: 0 };

  return (
    <div style={{
      position: isModal ? "relative" : "fixed",
      top: isModal ? "auto" : 0,
      left: isModal ? "auto" : 0, 
      right: isModal ? "auto" : 0,
      bottom: isModal ? "auto" : 0,
      height: isModal ? "100%" : "auto",
      width: isModal ? "100%" : "auto",
      backgroundColor: "#f0f2f5",
      display: "flex",
      flexDirection: "column",
      zIndex: isModal ? 1 : 1000,
      overflow: "hidden"
    }}>
      <div style={{
        backgroundColor: "#5932EA",
        color: "white",
        padding: "12px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
             onClick={handleExitClick}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              borderRadius: "50%",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px" }}>
              {effectiveJobsheetId ? `Jobsheet #${jobsheet?.id || ''}` : 'New Jobsheet'}
            </h2>
            <div style={{ fontSize: "12px", marginTop: "4px", display: "flex", gap: "15px", alignItems: "center" }}>
  <span>Date: {jobsheet?.created_at ? new Date(jobsheet.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
              <span>Vehicle: {jobsheet?.license_plate || jobsheet?.plate || "No plate"}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        padding: "12px 20px",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #e0e0e0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center",
          minWidth: "200px",
          flex: "1"
        }}>
          <div style={{
            backgroundColor: "#5932EA",
            color: "white",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "10px"
          }}>
            <FontAwesomeIcon icon={faCar} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>Vehicle</div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>
              {jobsheet?.license_plate || jobsheet?.plate || "No license plate recorded"}
            </div>
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "15px",
          flex: "2",
          justifyContent: "flex-end"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center",
            flex: "1",
            maxWidth: "350px"
          }}>
            <div style={{
              backgroundColor: jobsheet?.customer_id ? "#e3f2fd" : "#fff8e1",
              color: jobsheet?.customer_id ? "#1976d2" : "#f57c00",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px"
            }}>
              <FontAwesomeIcon icon={faUser} />
            </div>
            <div style={{ flex: "1", overflow: "hidden" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "2px" }}>Customer</div>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "500",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                {jobsheet?.customer_name || "No customer assigned"}
                {jobsheet?.customer_contact && (
                  <span style={{ 
                    marginLeft: "8px", 
                    color: "#666", 
                    fontWeight: "normal",
                    fontSize: "13px" 
                  }}>
                    | {jobsheet.customer_contact}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => setShowCustomerModal(true)}
              style={{
                backgroundColor: "#5932EA",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "8px 12px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)"
              }}
            >
              <FontAwesomeIcon icon={faUser} size="sm" />
              {jobsheet?.customer_id ? "Change Customer" : "Assign Customer"}
            </button>
          )}
        </div>
      </div>

      <div style={{ 
        padding: "15px", 
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: "1fr 350px",
        gap: "15px",
        flex: 1
      }} ref={printableContentRef}>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>

<div style={{ 
  backgroundColor: "white",
  padding: "15px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",

}}>
  <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600 }}>
    {isReadOnly && <span style={{color: "#2e7d32", marginRight: "8px"}}>✓</span>}
    Add Products/Services/Charges
    {isReadOnly && <span style={{fontSize: "12px", color: "#666", marginLeft: "10px"}}>
      ({jobsheet?.state === "cancelled" ? "Cancelled" : "Completed"} - No Changes Allowed)
    </span>}
  </h3>
  
  {isReadOnly ? (
    <div style={{
      padding: "15px",
      backgroundColor: "#f9f9f9",
      borderRadius: "4px",
      textAlign: "center",
      color: "#666"
    }}>
      This order has been {jobsheet?.state === "cancelled" ? "cancelled" : "completed"} and cannot be modified.
    </div>
  ) : (
    <>
      {/* Botones para diferentes modos de entrada - Reorganizados en el orden solicitado */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: "8px", 
        marginBottom: "15px", 
        padding: "10px",
        backgroundColor: "#f9f9f9",
        borderRadius: "4px"
      }}>
        <button
          onClick={() => {
            setActiveInputMode("search");
            setCurrentWorkflowKeywordInfo(null);
            setInventorySearchTerm("");
            setNewMiscName("");
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: activeInputMode === "search" ? "#5932EA" : "#ffffff",
            color: activeInputMode === "search" ? "white" : "#555",
            border: `1px solid ${activeInputMode === "search" ? "#5932EA" : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke={activeInputMode === "search" ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21L16.65 16.65" stroke={activeInputMode === "search" ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Products
        </button>
        
        {/* 1) Labor */}
        <button
          onClick={() => {
            setActiveInputMode("labor");
            setCurrentWorkflowKeywordInfo(null);
            setNewMiscName("");
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: activeInputMode === "labor" ? "#5932EA" : "#ffffff",
            color: activeInputMode === "labor" ? "white" : "#555",
            border: `1px solid ${activeInputMode === "labor" ? "#5932EA" : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 7H16.5L21 11.5V16.5H19M9 5H5V19H9M9 5C11 5 13.5 6.5 13.5 9.5C13.5 12.5 11 14 9 14M9 5V14M3 9H9M3 14H9" stroke={activeInputMode === "labor" ? "white" : "#555"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Labor
        </button>
        
        {/* 2) Deposit */}
        <button
          onClick={() => {
            setActiveInputMode("workflowSpecific");
            const depositInfo = WORKFLOW_KEYWORDS["deposit"];
            setCurrentWorkflowKeywordInfo(depositInfo);
            setNewMiscName(depositInfo.defaultDescription);
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? getWorkflowButtonColor("2") : "#ffffff",
            color: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? "white" : "#555",
            border: `1px solid ${(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? getWorkflowButtonColor("2") : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 9V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V9" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 6L12 3L15 6" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 3V13" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 13H15" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["deposit"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Deposit
        </button>
        
        {/* 3) Insurance */}
        <button
          onClick={() => {
            setActiveInputMode("workflowSpecific");
            const insuranceInfo = WORKFLOW_KEYWORDS["insurance"];
            setCurrentWorkflowKeywordInfo(insuranceInfo);
            setNewMiscName(insuranceInfo.defaultDescription);
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["insurance"].id) ? getWorkflowButtonColor("3") : "#ffffff",
            color: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["insurance"].id) ? "white" : "#555",
            border: `1px solid ${(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["insurance"].id) ? getWorkflowButtonColor("3") : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7L12 12L21 7L12 2Z" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["insurance"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 12L12 17L21 12" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["insurance"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 17L12 22L21 17" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["insurance"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Insurance
        </button>
        
        {/* 4) BQ HP */}
        <button
          onClick={() => {
            setActiveInputMode("workflowSpecific");
            const hpInfo = WORKFLOW_KEYWORDS["bq hp"];
            setCurrentWorkflowKeywordInfo(hpInfo);
            setNewMiscName(hpInfo.defaultDescription);
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["bq hp"].id) ? getWorkflowButtonColor("4") : "#ffffff",
            color: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["bq hp"].id) ? "white" : "#555",
            border: `1px solid ${(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["bq hp"].id) ? getWorkflowButtonColor("4") : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9H21M7 3V5M17 3V5M6 13H8M10.5 13H12.5M15 13H17M6 17H8M10.5 17H12.5M15 17H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["bq hp"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          BQ HP
        </button>
        
        {/* 5) Road Tax/COE */}
        <button
          onClick={() => {
            setActiveInputMode("workflowSpecific");
            const roadTaxInfo = WORKFLOW_KEYWORDS["road tax"];
            setCurrentWorkflowKeywordInfo(roadTaxInfo);
            setNewMiscName(roadTaxInfo.defaultDescription);
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["road tax"].id) ? getWorkflowButtonColor("5") : "#ffffff",
            color: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["road tax"].id) ? "white" : "#555",
            border: `1px solid ${(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["road tax"].id) ? getWorkflowButtonColor("5") : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 7H14M9 15L6 18H18L15 15M3 3L21 21M17.8 17.8C16.6355 19.1806 14.9352 20 13 20C9.13401 20 6 16.866 6 13C6 11.0648 6.8194 9.36454 8.2 8.2" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["road tax"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.5 9.5C16.4482 10.1268 17 11 17 12C17 13.1045 16.1046 13 15 13C13.8954 13 13 14 13 15" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["road tax"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Road Tax/COE
        </button>
        
        {/* 6) NU HP */}
        <button
          onClick={() => {
            setActiveInputMode("workflowSpecific");
            const nuHpInfo = WORKFLOW_KEYWORDS["nu hp"];
            setCurrentWorkflowKeywordInfo(nuHpInfo);
            setNewMiscName(nuHpInfo.defaultDescription);
            setNewMiscPrice("");
            setSearchResults([]);
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["nu hp"].id) ? getWorkflowButtonColor("6") : "#ffffff",
            color: (activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["nu hp"].id) ? "white" : "#555",
            border: `1px solid ${(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["nu hp"].id) ? getWorkflowButtonColor("6") : "#ddd"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 10H5C3.89543 10 3 10.8954 3 12V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V12C21 10.8954 20.1046 10 19 10Z" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["nu hp"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10V6C7 4.93913 7.42143 3.92172 8.17157 3.17157C8.92172 2.42143 9.93913 2 11 2H13C14.0609 2 15.0783 2.42143 15.8284 3.17157C16.5786 3.92172 17 4.93913 17 6V10" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["nu hp"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 14V18" stroke={(activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo?.id === WORKFLOW_KEYWORDS["nu hp"].id) ? "white" : "#555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          NU HP
        </button>
      </div>
      
      {/* Campo de entrada unificado para todos los modos - Consistente en posición y estilo */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr auto auto", 
        gap: "8px", 
        marginBottom: "15px", 
        alignItems: "center",
        padding: "12px",
        border: "1px solid #e0e0e0",
        borderRadius: "6px",
        backgroundColor: activeInputMode === "search" ? "#ffffff" : 
                         (activeInputMode === "labor" ? "#f9f9f9" : 
                         `${currentWorkflowKeywordInfo ? getWorkflowButtonColor(currentWorkflowKeywordInfo.id) + '10' : "#f9f9f9"}`)
      }}>
        {/* Input principal - Adaptado según el modo activo */}
        {activeInputMode === "search" ? (
          <input
            type="text"
            value={inventorySearchTerm}
            onChange={handleSearch}
            placeholder={selectedProductForAdding ? `Selected: ${selectedProductForAdding.name}` : "Search product..."}
            style={{ 
              padding: "8px 12px", 
              borderRadius: "4px",
              border: selectedProductForAdding ? "1px solid #5932EA" : "1px solid #ddd",
              backgroundColor: selectedProductForAdding ? "#f0f7ff" : "white",
              fontSize: "14px"
            }}
          />
        ) : (
          <input
            type="text"
            placeholder={activeInputMode === "labor" ? "Labor Description" : "Description"}
            value={newMiscName}
            onChange={(e) => setNewMiscName(e.target.value)}
            style={{ 
              padding: "8px 12px", 
              borderRadius: "4px",
              border: "1px solid #ddd",
              backgroundColor: "white",
              fontSize: "14px"
            }}
          />
        )}
        
        {/* Input secundario - Cantidad para productos, precio para otros */}
        {activeInputMode === "search" ? (
          <input
            ref={quantityInputRef}
            type="number"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            placeholder="Qty"
            style={{ 
              padding: "8px", 
              borderRadius: "4px",
              border: selectedProductForAdding ? "1px solid #5932EA" : "1px solid #ddd",
              width: "80px",
              textAlign: "center",
              backgroundColor: "white",
              fontSize: "14px"
            }}
          />
        ) : (
          <input
            type="number"
            placeholder={activeInputMode === "labor" ? "Price" : "Amount"}
            value={newMiscPrice}
            onChange={(e) => setNewMiscPrice(e.target.value)}
            min="0"
            step="0.01"
            style={{ 
              padding: "8px", 
              borderRadius: "4px",
              border: "1px solid #ddd",
              width: "100px",
              backgroundColor: "white",
              fontSize: "14px"
            }}
          />
        )}
        
        {/* Botón de acción - Adaptado según el modo */}
        {activeInputMode === "search" && selectedProductForAdding ? (
          <button
            onClick={handleAddItemToJobsheet}
            style={{
              padding: "8px 12px",
              backgroundColor: "#5932EA",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              height: "36px"
            }}
          >
            <FontAwesomeIcon icon={faPlus} size="sm" />
            Add
          </button>
        ) : activeInputMode === "labor" ? (
          <button
            onClick={() => handleAddLabor(newMiscName, newMiscPrice, "1")}
            style={{
              padding: "8px 12px",
              backgroundColor: "#5932EA",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              height: "36px"
            }}
          >
            <FontAwesomeIcon icon={faPlus} size="sm" />
            Add Labor
          </button>
        ) : activeInputMode === "workflowSpecific" && currentWorkflowKeywordInfo ? (
          <button
            onClick={() => handleAddLabor(newMiscName, newMiscPrice, currentWorkflowKeywordInfo.id)}
            style={{
              padding: "8px 12px",
              backgroundColor: getWorkflowButtonColor(currentWorkflowKeywordInfo.id),
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              height: "36px"
            }}
          >
            <FontAwesomeIcon icon={faPlus} size="sm" />
            Add {currentWorkflowKeywordInfo.defaultDescription.split(" ")[0]}
          </button>
        ) : null}
      </div>
      
      {/* Sección de resultados de búsqueda - Solo para modo de búsqueda */}
      {activeInputMode === 'search' && searchResults.length > 0 && !selectedProductForAdding && (
        <div style={{
          border: "1px solid #eee",
          borderRadius: "4px",
          marginBottom: "10px",
          maxHeight: "200px",
          overflowY: "auto"
        }}>
          {searchResults.map(item => (
            <SearchResultItem 
              key={item.id} 
              item={item} 
              onSelect={handleProductSelectedFromSearch} 
            />
          ))}
        </div>
      )}

      {/* Mensaje informativo */}
      {activeInputMode === 'search' && inventorySearchTerm && !selectedProductForAdding && searchResults.length === 0 && (
        <div style={{ padding: "8px", textAlign: "center", color: "#777", backgroundColor:"#f9f9f9", borderRadius:"4px", marginBottom:"10px" }}>
          No products found with that name.
        </div>
      )}
    </>
  )}
</div>


          <div style={{ 
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600 }}>Items & Services</h3>
            
            {allItems.length > 0 ? (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #eee" }}>
                      <th style={{ textAlign: "left", padding: "8px 6px", color: "#666" }}>Item/Service</th>
                      <th style={{ width: "60px", textAlign: "center", padding: "8px 6px", color: "#666" }}>Qty</th>
                      <th style={{ width: "80px", textAlign: "right", padding: "8px 6px", color: "#666" }}>Price</th>
                      <th style={{ width: "80px", textAlign: "right", padding: "8px 6px", color: "#666" }}>Total</th>
                      <th style={{ width: "40px", padding: "8px 6px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f8f8f8" }}>
                        <td style={{ padding: "8px 6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {item.name}
                          </div>
                        </td>
                        <td 
                          style={{ 
                            textAlign: "center", 
                            padding: "8px 6px", 
                            cursor: (!item.isLabor && !isReadOnly) ? "pointer" : "default",
                            backgroundColor: editingCell.itemId === item.id ? "#e3f2fd" : "transparent"
                          }}
                          onClick={() => {
                            if (!item.isLabor && !isReadOnly) {
                              setEditingCell({ itemId: item.id, field: 'quantity' });
                              setEditValue(item.quantity.toString());
                            }
                          }}
                        >
                          {editingCell.itemId === item.id && editingCell.field === 'quantity' ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleUpdateItemQuantity(item)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateItemQuantity(item);
                                if (e.key === 'Escape') setEditingCell({ itemId: null, field: null });
                              }}
                              style={{ 
                                width: "50px", 
                                textAlign: "center", 
                                padding: "4px", 
                                border: "1px solid #5932EA", 
                                borderRadius: "3px",
                                boxSizing: "border-box"
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 6px" }}>${parseFloat(item.price).toFixed(2)}</td>
                        <td style={{ textAlign: "right", padding: "8px 6px", fontWeight: "500" }}>
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 6px" }}>
                          <button
                            onClick={() => item.isLabor 
                              ? handleDeleteLabor(item.id.replace('labor-', '')) 
                              : handleDeleteItem(item.id)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: isReadOnly ? "#ccc" : "#F44336",
                              cursor: isReadOnly ? "not-allowed" : "pointer",
                              padding: "2px",
                              borderRadius: "3px"
                            }}
                            disabled={isReadOnly}
                          >
                            <FontAwesomeIcon icon={faTrash} size="xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                flex: 1,
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                color: "#888", 
                backgroundColor: "#f9f9f9", 
                borderRadius: "4px",
                padding: "20px"
              }}>
                No items or services added yet
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ 
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600 }}>Financial Summary</h3>
            
            <div style={{ 
              backgroundColor: "#f8f9fa",
              borderRadius: "5px",
              padding: "10px",
              marginBottom: "10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span>Items:</span>
                <span>${totals.items.toFixed(2)}</span>
              </div>
              {Object.entries(totals.laborBreakdown)
                .sort(([catA], [catB]) => {
                  const order = ["General Labor", ...Object.values(WORKFLOW_KEYWORDS).map(kw => kw.defaultDescription), "Other Services/Charges"];
                  const indexA = order.indexOf(catA);
                  const indexB = order.indexOf(catB);
                  if (indexA === -1 && indexB === -1) return catA.localeCompare(catB);
                  if (indexA === -1) return 1;
                  if (indexB === -1) return -1;
                  return indexA - indexB;
                })
                .map(([category, amount]) => {
                if (amount > 0 || (Object.keys(totals.laborBreakdown).length === 1 && category === "General Labor" && amount === 0 && items.length === 0)) {
                  return (
                    <div key={category} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                      <span>{category}:</span>
                      <span>${amount.toFixed(2)}</span>
                    </div>
                  );
                }
                return null;
              })}
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                marginBottom: "6px",
                fontSize: "13px",
                paddingTop: "6px",
                borderTop: "1px dashed #e0e0e0"
              }}>
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                <span>GST:</span>
                <span>${totals.gstIncluded.toFixed(2)}</span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                fontWeight: "600",
                fontSize: "14px",
                paddingTop: "6px",
                borderTop: "1px dashed #e0e0e0"
              }}>
                <span>TOTAL:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: 
                isReadOnly && jobsheet?.state === "cancelled" ? "#ffebee" :
                isReadOnly ? "#e8f5e9" : 
                totals.balance <= 0 ? "#e8f5e9" : 
                totals.paid > 0 ? "#fff8e1" : "#ffebee",
              borderRadius: "5px",
              padding: "10px",
              marginBottom: "10px",
              border: `1px solid ${
                isReadOnly && jobsheet?.state === "cancelled" ? "#ffcdd2" :
                isReadOnly ? "#c8e6c9" : 
                totals.balance <= 0 ? "#c8e6c9" : 
                totals.paid > 0 ? "#ffe0b2" : "#ffcdd2"
              }`
            }}>
              <div style={{ 
                fontWeight: "600", 
                marginBottom: "5px",
                fontSize: "13px",
                color: 
                  isReadOnly && jobsheet?.state === "cancelled" ? "#c62828" :
                  isReadOnly ? "#2e7d32" : 
                  totals.balance <= 0 && totals.total > 0 ? "#2e7d32" : 
                  totals.paid > 0 ? "#ef6c00" : "#c62828"
              }}>
                {isReadOnly && jobsheet?.state === "cancelled" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    Order Cancelled - No Changes Allowed
                  </div>
                ) : isReadOnly ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Order Completed - No Changes Allowed
                  </div>
                ) : totals.total === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#666" }}>
                    No items or services.
                  </div>
                ) : totals.balance <= 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Fully Paid
                  </div>
                ) : totals.paid > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    Partially Paid
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    Payment Pending
                  </div>
                )}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span>Paid:</span>
                <span>${totals.paid.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span>Balance:</span>
                <span>${Math.max(0, totals.balance).toFixed(2)}</span>
              </div>
            </div>
            
         <div style={{
  display: "flex",
  flexDirection: "column",
  gap: "8px"
}}>
  <button 
    onClick={handlePrint}
    style={{
      width: "100%",
      padding: "8px",
      backgroundColor: "#5932EA",
      color: "white",
      border: "none",
      borderRadius: "4px",
      fontSize: "13px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      cursor: "pointer"
    }}
  >
    <FontAwesomeIcon icon={faPrint} size="sm" />
    Print Invoice
  </button>
  
{isReadOnly ? (
    // Read-only mode: only show Exit button
    <button 
      onClick={onClose}
      style={{
        width: "100%",
        padding: "8px",
        backgroundColor: "#757575",
        color: "white",
        border: "none",
        borderRadius: "4px",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        cursor: "pointer",
        marginTop: "5px"
      }}
    >
      <FontAwesomeIcon icon={faArrowLeft} size="sm" />
      Exit
    </button>
  ) : (
    // Editable mode: show unified Save/Exit button that changes label based on pending changes
<button 
onClick={hasPendingChanges ? handleSaveAndExit : handleExitClick}  disabled={isLoading}
  style={{
    width: "100%",
    padding: "8px",
    backgroundColor: hasPendingChanges ? "#00C853" : "#757575",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    cursor: isLoading ? "not-allowed" : "pointer",
    opacity: isLoading ? 0.7 : 1,
    marginTop: "5px"
  }}
>
  {isLoading ? (
    <>
      <FontAwesomeIcon icon={faSave} size="sm" />
      Saving...
    </>
  ) : hasPendingChanges ? (
    <>
      <FontAwesomeIcon icon={faSave} size="sm" />
      Save
    </>
  ) : (
    <>
      <FontAwesomeIcon icon={faArrowLeft} size="sm" />
      Exit
    </>
  )}
</button>
  )}
</div>
          </div>
          
          <div style={{ 
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            opacity: isReadOnly ? 0.6 : 1,
            pointerEvents: isReadOnly ? "none" : "auto"
          }}>
           <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600 }}>
              Add Payment
              {isReadOnly && <span style={{fontSize: "12px", color: "#666", marginLeft: "10px"}}>
                ({jobsheet?.state === "cancelled" ? "Cancelled" : "Completed"} - No Changes Allowed)
              </span>}
            </h3>
            
            {isReadOnly ? (
              <div style={{ 
                backgroundColor: jobsheet?.state === "cancelled" ? "#ffebee" : "#e8f5e9",
                padding: "10px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: jobsheet?.state === "cancelled" ? "#c62828" : "#2e7d32",
                gap: "8px",
                fontSize: "14px"
              }}>
                <FontAwesomeIcon icon={jobsheet?.state === "cancelled" ? faExclamationCircle : faCheckCircle} />
                Order {jobsheet?.state === "cancelled" ? "cancelled" : "completed"} - No more payments needed
              </div>
            ) : totals.balance > 0 ? (
              <>
                <div style={{ 
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginBottom: "10px"
                }}>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => {
                      const value = e.target.value;
                      if (!value || parseFloat(value) <= totals.balance) {
                        setPaymentAmount(value);
                      } else {
                        setPaymentAmount(totals.balance.toString());
                        showNotification(`Maximum amount is $${totals.balance.toFixed(2)}`, "error");
                      }
                    }}
                    placeholder="Amount"
                    min="0"
                    max={totals.balance}
                    step="0.01"
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                  
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
                  >
                    <option value="cash">Cash</option>
                    <option value="paynow">Paynow</option>
                    <option value="nets">Nets</option>
                  </select>
                </div>
                
                <button
                  onClick={handleAddPayment}
                  style={{
                    width: "100%",
                    padding: "8px",
                    backgroundColor: "#00C853",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} size="sm" />
                  Add Payment
                </button>
              </>
            ) : totals.total > 0 ? (
              <div style={{ 
                backgroundColor: "#e8f5e9",
                padding: "10px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "centercenter",
                color: "#2e7d32",
                gap: "8px",
                fontSize: "14px"
              }}>
                <FontAwesomeIcon icon={faCheckCircle} />
                Invoice is fully paid
              </div>
            ) : (
              <div style={{ 
                backgroundColor: "#f9f9f9",
                padding: "10px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                gap: "8px",
                fontSize: "14px"
              }}>
                No items or services to pay for.
              </div>
            )}
          </div>
          
          <div style={{ 
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600 }}>Payment History</h3>
            
            {payments.length > 0 ? (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #eee" }}>
                      <th style={{ textAlign: "left", padding: "6px" }}>Date</th>
                      <th style={{ textAlign: "left", padding: "6px" }}>Method</th>
                      <th style={{ textAlign: "right", padding: "6px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id} style={{ borderBottom: "1px solid #f8f8f8" }}>
                        <td style={{ padding: "6px" }}>
  {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: "6px", textTransform: "capitalize" }}>
                          {payment.method.replace('_', ' ')}
                        </td>
                        <td style={{ textAlign: "right", padding: "6px", color: "#00C853" }}>
                          ${parseFloat(payment.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan="2" style={{ padding: "6px", fontWeight: "500" }}>Total paid:</td>
                      <td style={{ textAlign: "right", padding: "6px", fontWeight: "500", color: "#00C853" }}>
                        ${totals.paid.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                flex: 1,
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                color: "#888", 
                backgroundColor: "#f9f9f9", 
                borderRadius: "4px",
                padding: "20px"
              }}>
                No payments recorded
              </div>
            )}
          </div>
        </div>
      </div>
     
      {notification.show && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          padding: "10px 16px",
          borderRadius: "4px",
          backgroundColor: notification.type === "success" ? "#E8F5E9" : "#FFEBEE",
          border: `1px solid ${notification.type === "success" ? "#C8E6C9" : "#FFCDD2"}`,
          color: notification.type === "success" ? "#2E7D32" : "#C62828",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 1000,
          fontSize: "13px"
        }}>
          {notification.message}
        </div>
      )}

      {showCustomerModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "500px",
            padding: "20px",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
              borderBottom: "1px solid #eee",
              paddingBottom: "10px"
            }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                {jobsheet?.customer_id ? "Change Customer" : "Assign Customer"}
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666"
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
                Search Customers
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={customerSearchTerm || ''}
                  onChange={handleCustomerSearch}
                  placeholder="Search by name, contact or email"
                  style={{ 
                    width: "100%",
                    padding: "10px 10px 10px 35px",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                    fontSize: "14px"
                  }}
                />
                <FontAwesomeIcon 
                  icon={faSearch} 
                  style={{ 
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#666"
                  }}
                />
              </div>
            </div>

            {customerSearchResults.length > 0 && (
              <div style={{
                border: "1px solid #eee",
                borderRadius: "4px",
                marginBottom: "15px",
                maxHeight: "200px",
                overflowY: "auto"
              }}>
                {customerSearchResults.map(customer => (
                  <div 
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    style={{
                      padding: "10px 15px",
                      borderBottom: "1px solid #f0f0f0",
                      cursor: "pointer",
                      backgroundColor: selectedCustomerId === customer.id ? "#f0f7ff" : "white",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = selectedCustomerId === customer.id ? "#f0f7ff" : "#f9f9f9"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = selectedCustomerId === customer.id ? "#f0f7ff" : "white"}
                  >
                    <div style={{ fontWeight: "500" }}>{customer.name}</div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
                      {customer.contact || "No contact"} | {customer.email || "No email"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(selectedCustomer || jobsheet?.customer_id) && (
              <div style={{
                padding: "15px",
                backgroundColor: "#f0f7ff",
                borderRadius: "4px",
                marginBottom: "15px",
                border: "1px solid #d0e0ff"
              }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 500 }}>
                  {selectedCustomer ? "Selected Customer:" : "Current Customer:"}
                </h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "500" }}>
                      {selectedCustomer?.name || jobsheet?.customer_name || "Unknown"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
                      {selectedCustomer?.contact || jobsheet?.customer_contact || "No contact"}
                      {" | "}
                      {selectedCustomer?.email || jobsheet?.customer_email || "No email"}
                    </div>
                  </div>
                  {selectedCustomer && (
                    <button 
                      onClick={() => {
                        setSelectedCustomer(null);
                        setSelectedCustomerId(null);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#5932EA",
                        cursor: "pointer"
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ 
              padding: "10px",
              backgroundColor: "#f9f9f9",
              borderRadius: "4px",
              marginBottom: "15px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}>
              <button
                onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#5932EA",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <FontAwesomeIcon icon={faPlus} size="xs" />
                Create New Customer
              </button>
            </div>

            {showNewCustomerForm && (
              <div style={{
                padding: "15px",
                backgroundColor: "#f9f9f9",
                borderRadius: "4px",
                marginBottom: "15px",
                border: "1px solid #eee"
              }}>
                <h4 style={{ margin: "0 0 15px 0", fontSize: "14px", fontWeight: 500 }}>New Customer Details</h4>
                
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomerDetails.name}
                    onChange={(e) => setNewCustomerDetails({...newCustomerDetails, name: e.target.value})}
                    placeholder="Customer name"
                    style={{ 
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>
                    Contact
                  </label>
                  <input
                    type="text"
                    value={newCustomerDetails.contact}
                    onChange={(e) => setNewCustomerDetails({...newCustomerDetails, contact: e.target.value})}
                    placeholder="Phone number"
                    style={{ 
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomerDetails.email}
                    onChange={(e) => setNewCustomerDetails({...newCustomerDetails, email: e.target.value})}
                    placeholder="Email address"
                    style={{ 
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ddd",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowNewCustomerForm(false)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#f1f1f1",
                      color: "#333",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomer}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#00C853",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Create Customer
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "15px" }}>
              <button
                onClick={() => setShowCustomerModal(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f1f1f1",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Close
              </button>
              <button
                onClick={handleUpdateJobsheetCustomer}
                disabled={!selectedCustomerId}
                style={{
                  padding: "8px 16px",
                  backgroundColor: selectedCustomerId ? "#00C853" : "#e0e0e0",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedCustomerId ? "pointer" : "not-allowed",
                  fontSize: "14px"
                }}
              >
                {jobsheet?.customer_id ? "Update Customer" : "Assign Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
 {showExitConfirmation && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1200
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "400px",
            padding: "20px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", fontWeight: 600 }}>
              Unsaved Changes
            </h3>
            
            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#555" }}>
              You have unsaved changes that will be lost if you exit now.
            </p>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowExitConfirmation(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f1f1f1",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedExit}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#F44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Exit Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printSection, #printSection * {
            visibility: visible;
          }
          #printSection {
            position: absolute;
            left: 0,
            top: 0;
          }
        }
      `}</style>
      
    </div>
    
  );
};

export default JobsheetDetailView;