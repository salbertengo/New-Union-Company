import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faMotorcycle, faPlus, 
  faListCheck, faTools, faSave, faTimes, faCheck
} from '@fortawesome/free-solid-svg-icons';

const CreateJobsheetModal = ({ 
  isOpen, 
  onClose, 
  refreshJobsheets 
}) => {
  // Main states
  const [step, setStep] = useState('plate-search'); 
  const [plateNumber, setPlateNumber] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const API_URL = process.env.REACT_APP_API_URL;
  // New vehicle details
  const [newVehicleDetails, setNewVehicleDetails] = useState({
    plate: '',
    model: '',
  });

  // Control for temporary vehicle
  const [isTemporaryVehicle, setIsTemporaryVehicle] = useState(false);
  
  // Service notes array (unifica customerRequests + diagnostics)
  const [serviceNotes, setServiceNotes] = useState([]);
  // Nuevo texto de nota
  const [newNote, setNewNote] = useState('');

  // Ref para búsqueda de placa
  const plateInputRef = useRef(null);
  const plateSearchTimeout = useRef(null);

  // Efecto para enfocar el input de placa al abrir
  useEffect(() => {
    if (isOpen && plateInputRef.current) {
      plateInputRef.current.focus();
    }
  }, [isOpen]);

  // Notificaciones simples
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Limpieza al cerrar modal
  const handleClose = () => {
    setStep('plate-search');
    setPlateNumber('');
    setSearchResults([]);
    setSelectedVehicle(null);
    setNewVehicleDetails({ plate: '', model: '' });
    setIsTemporaryVehicle(false);
    setServiceNotes([]);
    setNewNote('');
    onClose();
  };

  // Búsqueda de placa
  const handlePlateSearch = (e) => {
    const value = e.target.value;
    setPlateNumber(value);

    if (plateSearchTimeout.current) {
      clearTimeout(plateSearchTimeout.current);
    }

    if (value.trim().length >= 2) {
      plateSearchTimeout.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          const response = await fetch(
            `${API_URL}/vehicles?search=${encodeURIComponent(value)}`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data);
          } else {
            console.error("Search failed with status:", response.status);
            setSearchResults([]);
          }
        } catch (error) {
          console.error("Error searching vehicles:", error);
          showNotification("Error searching vehicles", "error");
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  // Seleccionar vehículo de la lista
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setStep('confirm');
  };

  // Mostrar formulario para crear vehículo
  const showCreateVehicleForm = () => {
    setNewVehicleDetails({ ...newVehicleDetails, plate: plateNumber });
    setStep('new-vehicle');
  };

  // Crear vehículo
  const handleCreateVehicle = async (assignCustomerLater = false) => {
    if (!newVehicleDetails.plate || !newVehicleDetails.model) {
      showNotification("License plate and model are required", "error");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const vehicleData = {
        plate: newVehicleDetails.plate,
        model: newVehicleDetails.model,
        customer_id: isTemporaryVehicle || assignCustomerLater ? null : 1
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
        const responseData = await response.json();

        // Creamos un objeto con la info base
        const vehicle = {
          id: responseData.id || Date.now(),
          plate: newVehicleDetails.plate,
          model: newVehicleDetails.model,
          customer_id: isTemporaryVehicle || assignCustomerLater ? null : 1
        };
        
        setSelectedVehicle(vehicle);
        showNotification("Motorcycle created successfully", "success");
        setStep('confirm');
      } else {
        try {
          const errorData = await response.json();
          console.error("Vehicle creation error:", errorData);
          showNotification(errorData.error || "Error creating motorcycle", "error");
        } catch (jsonError) {
          showNotification("Error creating motorcycle", "error");
        }
      }
    } catch (error) {
      console.error("Error creating vehicle:", error);
      showNotification("Error creating motorcycle", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Agregar nota a la lista
  const addServiceNote = () => {
    if (newNote.trim()) {
      setServiceNotes(prev => [...prev, { id: Date.now(), text: newNote.trim() }]);
      setNewNote('');
    }
  };

  // Eliminar una nota
  const deleteServiceNote = (id) => {
    setServiceNotes(prev => prev.filter(n => n.id !== id));
  };

  // Crear el jobsheet
  const handleCreateJobsheet = async () => {
    if (!selectedVehicle) {
      showNotification("Please select or create a motorcycle first", "error");
      return;
    }
    const filteredNotes = serviceNotes.filter(n => n.text.trim());

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const jobsheetData = {
        vehicle_id: selectedVehicle.id,
        customer_id: selectedVehicle.customer_id || null,
        state: "pending",
        // Enviamos el texto de las notas como "description"
        description: filteredNotes.map(n => n.text).join('\n'),
        // Dejar vacío service_notes o adaptarlo a tu lógica
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
        showNotification("Jobsheet created successfully", "success");
        setTimeout(() => {
          if (refreshJobsheets) refreshJobsheets();
          onClose();
        }, 1500);
      } else {
        showNotification("Error creating jobsheet", "error");
      }
    } catch (error) {
      console.error("Error creating jobsheet:", error);
      showNotification("Error creating jobsheet", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          width: "800px",
          maxHeight: "90vh",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #5932EA 0%, #4321C9 100%)",
            padding: "20px 24px",
            color: "white",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
                Quick Job Reception
              </h2>
              <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
                {step === 'plate-search' && "Enter license plate to find motorcycle"}
                {step === 'new-vehicle' && "Create new motorcycle"}
                {step === 'confirm' && "Confirm motorcycle details"}
                {step === 'service-notes' && "Add service details"}
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>

          {/* STEP NAVIGATION BAR */}
          <div style={{ 
            display: "flex", 
            marginTop: "15px",
            gap: "8px"
          }}>
            <div 
              onClick={() => setStep('plate-search')}
              style={{ 
                flex: 1, 
                height: "6px", 
                backgroundColor: step === 'plate-search' ? "white" : "rgba(255,255,255,0.3)", 
                borderRadius: "3px",
                cursor: "pointer",
                position: "relative"
              }}
            >
              <div style={{
                position: "absolute",
                top: "10px", 
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.8)",
                fontSize: "11px",
                fontWeight: "500",
                whiteSpace: "nowrap"
              }}>Find</div>
            </div>
            <div 
              onClick={() => selectedVehicle && setStep('confirm')}
              style={{ 
                flex: 1, 
                height: "6px", 
                backgroundColor: step === 'confirm' ? "white" : "rgba(255,255,255,0.3)",
                borderRadius: "3px",
                cursor: selectedVehicle ? "pointer" : "default",
                opacity: selectedVehicle ? 1 : 0.6,
                position: "relative"
              }}
            >
              <div style={{
                position: "absolute",
                top: "10px", 
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.8)",
                fontSize: "11px",
                fontWeight: "500",
                whiteSpace: "nowrap"
              }}>Confirm</div>
            </div>
            <div 
              onClick={() => selectedVehicle && setStep('service-notes')}
              style={{ 
                flex: 1, 
                height: "6px", 
                backgroundColor: step === 'service-notes' ? "white" : "rgba(255,255,255,0.3)",
                borderRadius: "3px",
                cursor: selectedVehicle ? "pointer" : "default",
                opacity: selectedVehicle ? 1 : 0.6,
                position: "relative"
              }}
            >
              <div style={{
                position: "absolute",
                top: "10px", 
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.8)",
                fontSize: "11px",
                fontWeight: "500",
                whiteSpace: "nowrap"
              }}>Service</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ 
          padding: "20px 24px",
          overflowY: "auto",
          flex: 1
        }}>
          {/* Notification */}
          {notification.show && (
            <div 
              style={{
                marginBottom: "15px",
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
              {notification.message}
            </div>
          )}

          {/* Step 1: License Plate Search */}
          {step === 'plate-search' && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <div style={{ 
                display: "flex",
                alignItems: "center",
                marginBottom: "20px"
              }}>
                <div style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#f0f0ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#5932EA",
                  marginRight: "15px"
                }}>
                  <FontAwesomeIcon icon={faMotorcycle} size="lg" />
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Find by License Plate</h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                    Enter the motorcycle's license plate to begin
                  </p>
                </div>
              </div>
              
              {/* Search Input */}
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#f9fafc",
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "12px 15px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}>
                  <FontAwesomeIcon icon={faSearch} style={{ color: "#5932EA", marginRight: "12px" }} />
                  <input
                    ref={plateInputRef}
                    type="text"
                    value={plateNumber}
                    onChange={handlePlateSearch}
                    placeholder="Enter license plate..."
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "16px",
                      fontWeight: "500",
                      backgroundColor: "transparent"
                    }}
                  />
                  {isLoading && (
                    <div style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid rgba(89,50,234,0.1)",
                      borderLeftColor: "#5932EA",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite"
                    }}></div>
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 ? (
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #eee",
                  overflow: "hidden",
                  marginBottom: "20px"
                }}>
                  <h4 style={{
                    margin: 0,
                    padding: "10px 15px",
                    backgroundColor: "#f9fafc",
                    borderBottom: "1px solid #eee",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}>Found Motorcycles</h4>
                  {searchResults.map(vehicle => (
                    <div 
                      key={vehicle.id}
                      onClick={() => handleSelectVehicle(vehicle)}
                      style={{
                        padding: "15px",
                        borderBottom: "1px solid #f0f0f0",
                        cursor: "pointer",
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = "#f9fafc"}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <div style={{ fontWeight: "600", fontSize: "15px" }}>
                        {vehicle.plate ? vehicle.plate.toUpperCase() : "No plate"} - 
                        {vehicle.model ? vehicle.model : ""}
                      </div>
                      <div style={{ 
                        display: "flex",
                        alignItems: "center",
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "#666"
                      }}>
                        {vehicle.customer_name ? (
                          <>
                            <span style={{ fontWeight: "500" }}>Owner:</span>
                            <span style={{ marginLeft: "5px" }}>{vehicle.customer_name}</span>
                          </>
                        ) : (
                          <span style={{ color: "#ff7043" }}>No customer assigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : plateNumber.length >= 2 ? (
                <div style={{
                  backgroundColor: "#fff8e1",
                  borderRadius: "12px",
                  border: "1px solid #ffe082",
                  padding: "15px",
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "20px"
                }}>
                  <div style={{
                    backgroundColor: "#fff3e0",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ff8f00",
                    marginRight: "12px"
                  }}>
                    <FontAwesomeIcon icon={faMotorcycle} />
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "15px" }}>
                      No motorcycles found
                    </h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                      Create a new record for license plate "{plateNumber.toUpperCase()}"
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px"
              }}>
                <button
                  onClick={() => setPlateNumber('')}
                  disabled={!plateNumber}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "transparent",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#666",
                    cursor: plateNumber ? "pointer" : "default",
                    opacity: plateNumber ? 1 : 0.5
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={showCreateVehicleForm}
                  disabled={!plateNumber}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: "#5932EA",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: plateNumber ? "pointer" : "default",
                    opacity: plateNumber ? 1 : 0.5,
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#4321C9"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "#5932EA"}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Create New Motorcycle
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create New Vehicle */}
          {step === 'new-vehicle' && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>
                New Motorcycle Details
              </h3>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "5px", 
                  fontSize: "14px", 
                  fontWeight: "500" 
                }}>
                  License Plate*
                </label>
                <input
                  type="text"
                  value={newVehicleDetails.plate}
                  onChange={e => setNewVehicleDetails({...newVehicleDetails, plate: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "15px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "16px"
                  }}
                />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "5px", 
                  fontSize: "14px", 
                  fontWeight: "500" 
                }}>
                  Model*
                </label>
                <input
                  type="text"
                  value={newVehicleDetails.model}
                  onChange={e => setNewVehicleDetails({...newVehicleDetails, model: e.target.value})}
                  placeholder="CB500, YZF-R6, etc."
                  style={{
                    width: "100%",
                    padding: "15px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "16px"
                  }}
                />
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  onClick={() => setStep('plate-search')}
                  style={{
                    padding: "12px 15px",
                    backgroundColor: "transparent",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#666",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Back
                </button>
                
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => {
                      setIsTemporaryVehicle(true);
                      handleCreateVehicle(true);
                    }}
                    style={{
                      padding: "12px 15px",
                      backgroundColor: "#e0e0e0",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#d0d0d0"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "#e0e0e0"}
                  >
                    Create Without Customer
                  </button>
                  <button
                    onClick={() => handleCreateVehicle()}
                    style={{
                      padding: "12px 15px",
                      backgroundColor: "#5932EA",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#4321C9"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "#5932EA"}
                  >
                    Create & Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm Vehicle */}
          {step === 'confirm' && selectedVehicle && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <div style={{
                marginBottom: "20px",
                backgroundColor: "#f9fafc",
                borderRadius: "12px",
                border: "1px solid #e0e0e0",
                padding: "15px",
                display: "flex",
                alignItems: "center"
              }}>
                <div style={{
                  backgroundColor: "#f0f0ff",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#5932EA",
                  marginRight: "15px",
                  fontSize: "20px",
                  fontWeight: "bold"
                }}>
                  {selectedVehicle.plate ? selectedVehicle.plate.charAt(0).toUpperCase() : "?"}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 5px 0", fontSize: "18px", fontWeight: "600" }}>
                    {selectedVehicle.plate ? selectedVehicle.plate.toUpperCase() : "No License Plate"}
                  </h3>
                  
                  <div style={{ color: "#444", fontSize: "14px" }}>
                    {selectedVehicle.model || ""}
                  </div>
                  
                  {selectedVehicle.customer_name ? (
                    <div style={{ 
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#555",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{ fontWeight: "500", marginRight: "5px" }}>Owner:</span> 
                      {selectedVehicle.customer_name}
                    </div>
                  ) : (
                    <div style={{ 
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#ff7043",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      No customer assigned
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setStep('plate-search');
                    setSelectedVehicle(null);
                  }}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "#555",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Change
                </button>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "15px"
                }}>
                  <button
                    onClick={() => setStep('plate-search')}
                    style={{
                      padding: "12px 15px",
                      backgroundColor: "transparent",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#666",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('service-notes')}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#5932EA",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "background-color 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "#4321C9"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "#5932EA"}
                  >
                    Continue
                    <FontAwesomeIcon icon={faListCheck} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Service Notes (Simplified) */}
          {step === 'service-notes' && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600" }}>
                Service Notes / Problems
              </h3>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "5px", 
                  fontSize: "14px", 
                  fontWeight: "500" 
                }}>
                  Add a note or problem:
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') addServiceNote(); }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      fontSize: "14px"
                    }}
                    placeholder="Describe the issue..."
                  />
                  <button
                    onClick={addServiceNote}
                    disabled={!newNote.trim()}
                    style={{
                      padding: "12px 15px",
                      backgroundColor: newNote.trim() ? "#5932EA" : "#ccc",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: newNote.trim() ? "pointer" : "default"
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              </div>

              {serviceNotes.length > 0 && (
                <div style={{
                  marginBottom: "15px",
                  backgroundColor: "#f9fafc",
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "15px"
                }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", fontWeight: "600" }}>
                    Added Notes:
                  </h4>
                  {serviceNotes.map((note, idx) => (
                    <div key={note.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      padding: "8px 12px",
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "1px solid #eee"
                    }}>
                      <span style={{ fontSize: "14px" }}>{idx + 1}. {note.text}</span>
                      <button
                        onClick={() => deleteServiceNote(note.id)}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          color: "#d9534f",
                          cursor: "pointer"
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Buttons to go back or create */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px"
              }}>
                <button
                  onClick={() => setStep('confirm')}
                  style={{
                    padding: "12px 15px",
                    backgroundColor: "transparent",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#666",
                    transition: "background-color 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateJobsheet}
                  style={{
                    padding: "12px 15px",
                    backgroundColor: "#28a745", 
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = "#218838"}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = "#28a745"}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div style={{
                      width: "18px",
                      height: "18px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderLeftColor: "white",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite"
                    }}></div>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} />
                      Create Job Sheet
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #eee",
          padding: "15px 24px",
          backgroundColor: "#f9fafc",
          display: "flex"
        }}>
          <div style={{
            fontSize: "13px",
            color: "#666",
            display: "flex",
            alignItems: "center",
            flex: 1
          }}>
            {step === 'plate-search' && 'Step 1: Find motorcycle'}
            {step === 'new-vehicle' && 'Step 1: Create new motorcycle'}
            {step === 'confirm' && 'Step 2: Confirm motorcycle'}
            {step === 'service-notes' && 'Step 3: Service details'}
          </div>
        </div>

        {/* Global Keyframes */}
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

