import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faSearch, faCar, faStore, faTimes } from "@fortawesome/free-solid-svg-icons";

const JobsheetCreationModal = ({ onClose, onCreationSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [licensePlate, setLicensePlate] = useState("");
  const [plateSearchResults, setPlateSearchResults] = useState([]);
  const [newVehicleDetails, setNewVehicleDetails] = useState({
    plate: '',
    model: ''
  });
  
  const API_URL = process.env.REACT_APP_API_URL;
  // Detect if touch device
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const handleLicensePlateSearch = async (e) => {
    const value = e.target.value;
    setLicensePlate(value);
    setNewVehicleDetails({
      ...newVehicleDetails,
      plate: value
    });

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
          const results = await response.json();
          setPlateSearchResults(results);
        } else {
          console.error("Error searching vehicles:", response.status);
          setPlateSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching vehicles:", error);
        setPlateSearchResults([]);
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
      // Ensure the ID is a number if possible
      const vehicleId = typeof vehicle.id === 'string' && !isNaN(parseInt(vehicle.id, 10)) 
        ? parseInt(vehicle.id, 10) 
        : vehicle.id;
        
      console.log(`Creating jobsheet with vehicle ID: ${vehicleId} (type: ${typeof vehicleId})`);
      
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
  
      // Try to use General Customer if no customer is selected
      let customerIdToUse = null;
      const customerResponse = await fetch(`${API_URL}/customers?limit=1&search=General%20Customer`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (customerResponse.ok) {
        const customers = await customerResponse.json();
        if (customers && customers.length > 0) {
          customerIdToUse = customers[0].id;
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
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Use the original error text if parsing fails
          errorMessage = errorText || errorMessage;
        }
        
        console.error("Vehicle creation error:", errorMessage);
        showNotification("Error creating vehicle: " + errorMessage, "error");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Exception in vehicle creation:", error);
      showNotification("Error creating vehicle: " + error.message, "error");
      setIsLoading(false);
    }
  };
const getUserId = () => {
  let userId = null;
  
  // ESTRATEGIA 1: Obtener de localStorage.user
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      if (userData && userData.id) {
        console.log("✅ ID encontrado en localStorage.user");
        return userData.id;
      }
    }
  } catch (e) {
    console.warn("Error al parsear user de localStorage", e);
  }
  
  // ESTRATEGIA 2: Buscar userId directo
  userId = localStorage.getItem("userId");
  if (userId) {
    console.log("✅ ID encontrado directamente en localStorage.userId");
    return userId;
  }
  
  // ESTRATEGIA 3: Extraer del token JWT
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) throw new Error("Formato de token inválido");
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      if (payload.user_id) {
        console.log("✅ ID encontrado en token.user_id");
        return payload.user_id;
      }
      if (payload.sub) {
        console.log("✅ ID encontrado en token.sub");
        return payload.sub;
      }
      if (payload.id) {
        console.log("✅ ID encontrado en token.id");
        return payload.id;
      }
    } catch (e) {
      console.error("Error extrayendo user ID del token:", e);
    }
  }
  
  // ID HARDCODED para desarrollo (solo en entorno dev)
  if (process.env.NODE_ENV === 'development') {
    console.warn("⚠️ USANDO ID FIJO '1' EN DESARROLLO");
    return 1;
  }
  
  console.error("❌ No se pudo obtener el user ID de ninguna fuente");
  return null;
};
  const handleCreateJobsheet = async (vehicleId) => {
  setIsLoading(true);
  try {
    // Get token
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Authentication error: Please login again", "error");
      setIsLoading(false);
      return;
    }
    
    // Obtener userId con nuestra nueva función auxiliar
    const userId = getUserId();

    if (!userId) {
      showNotification("User session not found. Please log in again.", "error");
      console.error("No se pudo obtener el ID del usuario");
      setIsLoading(false);
      return;
    }

    console.log(`Usando ID de usuario: ${userId}`);
    
    const jobsheetData = {
      vehicle_id: vehicleId,
      customer_id: null,
      state: "in progress",
      description: "",
      service_notes: "",
      user_id: userId
    };
      
      const response = await fetch(`${API_URL}/jobsheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(jobsheetData),
      });
      
      if (response.ok) {
        const newJobsheet = await response.json();
        showNotification("Jobsheet created successfully", "success");
        
        // Important: Call the success callback with the new jobsheet ID
        onCreationSuccess(newJobsheet.id);
      } else {
        const errorText = await response.text();
        let errorMessage = "Failed to create jobsheet";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        showNotification("Error creating jobsheet: " + errorMessage, "error");
      }
    } catch (error) {
      console.error("Exception in handleCreateJobsheet:", error);
      showNotification("Error creating jobsheet: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalkInJobsheet = async () => {
  setIsLoading(true);
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Authentication error: Please login again", "error");
      setIsLoading(false);
      return;
    }

    // Obtener userId con nuestra nueva función auxiliar
    const userId = getUserId();

    if (!userId) {
      showNotification("User session not found. Please log in again.", "error");
      console.error("No se pudo obtener el ID del usuario");
      setIsLoading(false);
      return;
    }

    console.log(`Usando ID de usuario para walk-in: ${userId}`);

    const jobsheetData = {
      vehicle_id: null,
      customer_id: null,
      state: "in progress",
      description: "Walk-in Sale",
      service_notes: "",
      user_id: userId
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
        
        // Call success callback with the new jobsheet ID
        onCreationSuccess(newJobsheet.id);
      } else {
        const errorText = await response.text();
        let errorMessage = "Failed to create walk-in jobsheet";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        showNotification("Error creating walk-in jobsheet: " + errorMessage, "error");
      }
    } catch (error) {
      console.error("Exception creating walk-in jobsheet:", error);
      showNotification("Error creating walk-in jobsheet: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column" }}>
        <div style={{
          width: "60px", 
          height: "60px", 
          border: "5px solid #f3f3f3",
          borderTop: "5px solid #5932EA",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "20px"
        }}></div>
        <p>Creating jobsheet...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: "#f0f2f5",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      position: "relative",
      maxWidth: isTouchDevice ? "100%" : "600px", // Limitar ancho en desktop
      margin: isTouchDevice ? "0" : "0 auto", // Centrar en desktop
    }}>
      <div style={{ 
        backgroundColor: "#5932EA",
        color: "white",
        padding: isTouchDevice ? "8px 12px" : "12px 20px",
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

        {/* Close button */}
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
        padding: "20px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        overflowY: "auto"
      }}>
        <div style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
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
                placeholder="Input license plate"
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

          {/* Walk-in Sale button - always visible */}
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

          {licensePlate && plateSearchResults.length === 0 && (
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
                  cursor: "pointer"
                }}
              >
                Create Vehicle & Jobsheet
              </button>
            </div>
          )}
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
    </div>
  );
};

export default JobsheetCreationModal;