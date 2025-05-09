import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash, faPlus, faTimes, faPrint, 
  faArrowLeft, faSearch, faExclamationCircle, 
  faCheckCircle, faCar, faSave, faUser, faStore
} from "@fortawesome/free-solid-svg-icons";
import Invoice from "../components/invoice";

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

  const effectiveJobsheetId = internalJobsheetId || propJobsheetId;
  const effectiveIsNew = internalIsNew && !internalJobsheetId;

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
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const updateData = {
        ...jobsheet,
        customer_id: selectedCustomerId
      };
      
      const response = await fetch(`${API_URL}/jobsheets/${effectiveJobsheetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        await loadJobsheetData();
        setShowCustomerModal(false);
        setSelectedCustomer(null);
        setSelectedCustomerId(null);
        showNotification("Customer assigned successfully", "success");
      } else {
        const errorText = await response.text();
        let errorMessage = "Failed to update customer";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {}
        showNotification(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      showNotification("Error updating customer: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLicensePlateSearch = async (e) => {
    const value = e.target.value;
    setLicensePlate(value);
    setNewVehicleDetails({
      ...newVehicleDetails,
      plate: value
    });

    if (value.toLowerCase().includes('walk')) {
      setPlateSearchResults([]);
      return;
    }

    if (value.length >= 2) {
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

  const handleSelectVehicle = (vehicle) => {
    const plateValue = vehicle.plate || vehicle.license_plate || "";
    setLicensePlate(plateValue);
    setPlateSearchResults([]);
    handleCreateJobsheet(vehicle.id);
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
    if (!vehicleId) {
      showNotification("No vehicle selected", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const jobsheetData = {
        vehicle_id: vehicleId,
        customer_id: null, 
        state: "pending",
        description: "",
        service_notes: ""
      };
  
      const response = await fetch(`${API_URL}/jobsheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jobsheetData),
      });
  
      if (response.ok) {
        const newJobsheet = await response.json();
        showNotification("Jobsheet created successfully", "success");
        
        setTimeout(() => {
          if (refreshJobsheets) refreshJobsheets();
          setInternalIsNew(false);
          setInternalJobsheetId(newJobsheet.id);
          loadJobsheetData(newJobsheet.id);
        }, 500);
      } else {
        const errorData = await response.text();
        showNotification("Error creating jobsheet: " + errorData, "error");
      }
    } catch (error) {
      showNotification("Error creating jobsheet: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalkInJobsheet = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const jobsheetData = {
        vehicle_id: null,
        customer_id: null,
        state: "pending",
        description: "Walk-in Sale",
        service_notes: ""
      };
  
      const response = await fetch(`${API_URL}/jobsheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jobsheetData),
      });
  
      if (response.ok) {
        const newJobsheet = await response.json();
        showNotification("Walk-in jobsheet created successfully", "success");
        
        setTimeout(() => {
          if (refreshJobsheets) refreshJobsheets();
          setInternalIsNew(false);
          setInternalJobsheetId(newJobsheet.id);
          loadJobsheetData(newJobsheet.id);
        }, 500);
      } else {
        const errorData = await response.text();
        showNotification("Error creating walk-in jobsheet: " + errorData, "error");
      }
    } catch (error) {
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
    
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      const idToUse = id || effectiveJobsheetId;
      
      const response = await fetch(`${API_URL}/jobsheets/${idToUse}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.ok) {
        const jobsheetData = await response.json();
        setJobsheet(jobsheetData);
        setLicensePlate(jobsheetData.license_plate || jobsheetData.plate || "");
  
        await Promise.all([
          fetchItems(token, idToUse),
          fetchLabors(token, idToUse),
          fetchPayments(token, idToUse)
        ]);
      } else {
        console.error("Failed to load jobsheet:", response.status);
        showNotification("Error loading jobsheet data", "error");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showNotification("Error loading jobsheet data", "error");
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
    let taxableAmount = itemsTotal;

    labors
      .filter(l => l.is_completed === 1 && l.is_billed === 1)
      .forEach(labor => {
        const price = parseFloat(labor.price || 0);
        const categoryName = getLaborCategoryName(labor.workflow_type);
        laborBreakdown[categoryName] = (laborBreakdown[categoryName] || 0) + price;
        
        if (labor.workflow_type === "1") {
          taxableAmount += price;
        }
      });
    
    const totalLaborAndWorkflowCosts = Object.values(laborBreakdown).reduce((sum, val) => sum + val, 0);
    const subtotal = itemsTotal + totalLaborAndWorkflowCosts;
    const tax = taxableAmount * (taxRate / 100);
    const total = subtotal + tax;
    const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    return {
      items: itemsTotal,
      laborBreakdown,
      subtotal,
      taxableAmount,
      tax,
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
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      if (!effectiveJobsheetId) {
        showNotification("Cannot add item: No active jobsheet", "error");
        return;
      }
      
      const quantity = parseInt(newItemQuantity) || 1;
      if (quantity <= 0) {
        showNotification("Quantity must be at least 1", "error");
        return;
      }
  
      const itemData = {
        jobsheet_id: effectiveJobsheetId,
        product_id: selectedProductForAdding.id,
        quantity: quantity,
        price: selectedProductForAdding.sale,
        description: selectedProductForAdding.description || selectedProductForAdding.name
      };
  
      const response = await fetch(`${API_URL}/jobsheets/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });
  
      if (response.ok) {
        await fetchItems(token);
        setInventorySearchTerm("");
        setSearchResults([]);
        setNewItemQuantity(1);
        setSelectedProductForAdding(null);
        showNotification("Item added successfully", "success");
      } else {
        const errorText = await response.text();
        handleApiError(errorText, "Failed to add item");
      }
    } catch (error) {
      handleApiError(error, "Error adding item");
    }
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

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/jobsheets/items/${itemToUpdate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          quantity: newQuantity,
          price: itemToUpdate.price
        }),
      });

      if (response.ok) {
        await fetchItems(token);
        showNotification("Quantity updated successfully", "success");
      } else {
        const errorText = await response.text();
        handleApiError(errorText, "Failed to update quantity");
      }
    } catch (error) {
      handleApiError(error, "Error updating quantity");
    } finally {
      setEditingCell({ itemId: null, field: null });
      setEditValue("");
    }
  };

  const handleAddLabor = async (description, price, workflowTypeId = "1") => {
    if (isReadOnly) {
      showNotification(`This order is ${jobsheet?.state} and cannot be modified.`, "error");
      return;
    }
    if (!description && workflowTypeId === "1") { // Solo requerir descripción para labor genérico
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

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const laborData = {
        jobsheet_id: effectiveJobsheetId,
        description: description || WORKFLOW_KEYWORDS[Object.keys(WORKFLOW_KEYWORDS).find(key => WORKFLOW_KEYWORDS[key].id === workflowTypeId)]?.defaultDescription || "Service Charge",
        price: parseFloat(price),
        is_completed: 1, // Por defecto se marca como completado y facturable
        is_billed: 1,
        workflow_type: workflowTypeId,
      };

      const response = await fetch(`${API_URL}/labor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(laborData),
      });

      if (response.ok) {
        await fetchLabors(token); // Asumiendo que tienes fetchLabors para refrescar
        showNotification(`${laborData.description} added successfully.`, "success");
        // Resetear campos específicos del modo
        setInventorySearchTerm(""); // Limpiar búsqueda para salir del modo labor/workflow
        setActiveInputMode("search"); // Volver al modo búsqueda
        setNewMiscName("");
        setNewMiscPrice("");
        setCurrentWorkflowKeywordInfo(null);
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || "Failed to add labor/service.", "error");
      }
    } catch (error) {
      console.error("Error adding labor/service:", error);
      showNotification("Error adding labor/service.", "error");
    }
  };


  const handleDeleteItem = async (itemId) => {
    if (isReadOnly) {
      showNotification(`This order is ${jobsheet?.state} and cannot be modified`, "error");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const response = await fetch(`${API_URL}/jobsheets/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.ok) {
        await fetchItems(token);
        showNotification("Item removed successfully", "success");
      } else {
        console.error("Failed to delete item:", response.status);
        
        try {
          const errorText = await response.text();
          console.error("Error details:", errorText);
        } catch (e) {
        }
        
        showNotification(`Failed to remove item (${response.status})`, "error");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      showNotification("Error removing item", "error");
    }
  };

  const handleDeleteLabor = async (laborId) => {
    if (isReadOnly) {
      showNotification(`This order is ${jobsheet?.state} and cannot be modified`, "error");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/labor/${laborId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchLabors(token);
        showNotification("Labor service removed successfully", "success");
      } else {
        console.error("Failed to delete labor:", response.status);
        showNotification("Failed to remove labor service", "error");
      }
    } catch (error) {
      console.error("Error deleting labor:", error);
      showNotification("Error removing labor service", "error");
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
            <p>Date: ${jobsheet?.created_at ? new Date(jobsheet.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
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
                <td>Subtotal:</td>
                <td class="text-right">$${totals.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>GST (${taxRate}% on $${totals.taxableAmount.toFixed(2)}):</td>
                <td class="text-right">$${totals.tax.toFixed(2)}</td>
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
                    <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
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

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const paymentData = {
        jobsheet_id: effectiveJobsheetId,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0]
      };

      const response = await fetch(`${API_URL}/jobsheets/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        await fetchPayments(token);
        setPaymentAmount("");
        showNotification("Payment added successfully", "success");
      } else {
        console.error("Failed to add payment:", response.status);
        showNotification("Failed to add payment", "error");
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      showNotification("Error adding payment", "error");
    }
  };

  useEffect(() => {
    const updateJobsheetStatusIfPaid = async () => {
      if (jobsheet && !isLoading) { 
        const totals = calculateTotals();
        
        if (totals.balance <= 0 && 
            totals.subtotal > 0 && 
            jobsheet.state !== "completed") {
          try {
            const token = localStorage.getItem("token");
            if (!token) return;
            
            const updateData = {
              ...jobsheet,
              state: "completed"
            };
            
            const response = await fetch(`${API_URL}/jobsheets/${effectiveJobsheetId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(updateData),
            });
            
            if (response.ok) {
              setJobsheet(prevJobsheet => ({...prevJobsheet, state: "completed"}));
              showNotification("Order marked as completed as it is fully paid", "success");
            } else {
              const errorText = await response.text();
              console.error("Failed to update jobsheet state to completed:", errorText);
              showNotification("Could not automatically update order status.", "error");
            }
          } catch (error) {
            console.error("Error updating jobsheet status:", error);
            showNotification("Error automatically updating order status.", "error");
          }
        }
      }
    };
    
    updateJobsheetStatusIfPaid();
  }, [jobsheet, items, labors, payments, isLoading, effectiveJobsheetId, API_URL, taxRate]);

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

  const isReadOnly = effectiveJobsheetId && (jobsheet?.state === "completed" || jobsheet?.state === "cancelled");

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
        padding: "20px",
        overflow: "hidden"
      }}>
        <div style={{
          backgroundColor: "#5932EA",
          color: "white",
          padding: "12px 20px",
          margin: "-20px -20px 20px -20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <h2 style={{ margin: 0, fontSize: "16px" }}>New Jobsheet</h2>
          </div>
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

          {licensePlate.toLowerCase().includes('walk') && (
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
                fontSize: "14px",
                marginTop: "10px"
              }}
            >
              Create Walk-in Sale
            </button>
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
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px" }}>
              {effectiveJobsheetId ? `Jobsheet #${jobsheet?.id || ''}` : 'New Jobsheet'}
            </h2>
            <div style={{ fontSize: "12px", marginTop: "4px", display: "flex", gap: "15px", alignItems: "center" }}>
              <span>Date: {jobsheet?.created_at ? new Date(jobsheet.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
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
      {/* Sección de búsqueda de productos y cantidad (modo 'search') */}
      {activeInputMode === 'search' && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: selectedProductForAdding ? "1fr auto auto" : "1fr auto", 
          gap: "8px", 
          marginBottom: "10px",
          alignItems: "center"
        }}>
          <input
            type="text"
            value={inventorySearchTerm}
            onChange={handleSearch}
            placeholder={selectedProductForAdding ? `Selected: ${selectedProductForAdding.name}` : "Search product or type 'labor', 'insurance', etc."}
            style={{ 
              padding: "8px", 
              borderRadius: "4px",
              border: selectedProductForAdding ? "1px solid #5932EA" : "1px solid #ddd",
              backgroundColor: selectedProductForAdding ? "#f0f7ff" : "white",
            }}
          />
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
              width: "70px",
              textAlign: "center",
              backgroundColor: 'white',
            }}
          />
          {selectedProductForAdding && (
            <button
              onClick={handleAddItemToJobsheet}
              style={{
                padding: "8px 12px",
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
              <FontAwesomeIcon icon={faPlus} size="sm" />
              Add
            </button>
          )}
        </div>
      )}

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

      {/* Sección para añadir Labor (modo 'labor') */}
      {activeInputMode === 'labor' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Labor Description"
            value={newMiscName}
            onChange={(e) => setNewMiscName(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
          />
          <input
            type="number"
            placeholder="Price"
            value={newMiscPrice}
            onChange={(e) => setNewMiscPrice(e.target.value)}
            min="0"
            step="0.01"
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd", width: "100px" }}
          />
          <button
            onClick={() => handleAddLabor(newMiscName, newMiscPrice, "1")}
            style={{ padding: "8px 12px", backgroundColor: "#5932EA", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Add Labor
          </button>
        </div>
      )}

      {/* Sección para añadir Workflow Específico (modo 'workflowSpecific') */}
      {activeInputMode === 'workflowSpecific' && currentWorkflowKeywordInfo && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Description"
            value={newMiscName} // Ya está pre-llenado con currentWorkflowKeywordInfo.defaultDescription
            onChange={(e) => setNewMiscName(e.target.value)} // Permitir edición si es necesario
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }}
          />
          <input
            type="number"
            placeholder="Amount"
            value={newMiscPrice}
            onChange={(e) => setNewMiscPrice(e.target.value)}
            min="0"
            step="0.01"
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd", width: "100px" }}
          />
          <button
            onClick={() => handleAddLabor(newMiscName, newMiscPrice, currentWorkflowKeywordInfo.id)}
            style={{ padding: "8px 12px", backgroundColor: "#5932EA", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Add {currentWorkflowKeywordInfo.defaultDescription.split(" ")[0]} {/* Ej: "Add Deposit" */}
          </button>
        </div>
      )}
      
      {/* Input de búsqueda principal, solo visible si no estamos en modo labor/workflow */}
      {(activeInputMode !== 'labor' && activeInputMode !== 'workflowSpecific') && inventorySearchTerm && !selectedProductForAdding && searchResults.length === 0 && (
         <div style={{ padding: "8px", textAlign: "center", color: "#777", backgroundColor:"#f9f9f9", borderRadius:"4px", marginBottom:"10px" }}>
              Type 'labor', 'deposit', 'insurance', 'nu hp', 'road tax' for specific charges, or search products.
         </div>
      )}
       {/* Mensaje para limpiar la búsqueda y volver al modo normal */}
       {(activeInputMode === 'labor' || activeInputMode === 'workflowSpecific') && (
          <div style={{textAlign: "right", marginBottom:"10px"}}>
              <button 
                  onClick={() => {
                      setInventorySearchTerm("");
                      setActiveInputMode("search");
                      setNewMiscName("");
                      setNewMiscPrice("");
                      setCurrentWorkflowKeywordInfo(null);
                  }}
                  style={{
                      background: "none", 
                      border: "none", 
                      color: "#5932EA", 
                      cursor: "pointer", 
                      fontSize: "12px"
                  }}
              >
                  Clear and search products
              </button>
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
                <span>GST ({taxRate}% on ${totals.taxableAmount.toFixed(2)}):</span>
                <span>${totals.tax.toFixed(2)}</span>
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
                          {new Date(payment.payment_date).toLocaleDateString()}
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