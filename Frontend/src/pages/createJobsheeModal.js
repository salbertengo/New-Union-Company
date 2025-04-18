import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, faMotorcycle, faPlus, 
  faListCheck, faTools, faSave, faTimes, faCheck, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const CreateJobsheetModal = ({ 
  isOpen, 
  onClose, 
  refreshJobsheets,
  editingJobsheet // <-- NUEVA PROP
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
  
  // Service notes array (unifies customerRequests + diagnostics)
  const [serviceNotes, setServiceNotes] = useState([]);
  // New note text
  const [newNote, setNewNote] = useState('');

  // Ref for plate search
  const plateInputRef = useRef(null);
  const plateSearchTimeout = useRef(null);

  // Oil type selector modal state
  const [showOilTypeSelector, setShowOilTypeSelector] = useState(false);
  const quickBtnStyle = {
    background: '#f0f0ff',
    color: '#5932EA',
    border: 'none',
    borderRadius: 10,
    fontWeight: 500,
    fontSize: 14,
    padding: '10px 8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 1px 2px rgba(89,50,234,0.04)'
  };

  // --- Quick Service Categories and Subcategories ---
  const serviceCategories = [
    {
      name: 'Engine',
      items: [
        'Does not start',
        'Makes noise',
        'Oil leak',
        'Power loss',
        'Stalls',
        'Excessive smoke',
        'Abnormal vibration',
      ]
    },
    {
      name: 'Maintenance',
      items: [
        'Oil change',
        'Air filter replacement',
        'Spark plug replacement',
        'Valve adjustment',
        'General maintenance',
      ]
    },
    {
      name: 'Wheels',
      items: [
        'Front tire replacement',
        'Rear tire replacement',
        'Flat tire',
        'Unbalanced',
        'Wheel noise',
      ]
    },
    {
      name: 'Brakes',
      items: [
        'Poor braking',
        'Brake noise',
        'Spongy brake',
        'Pad replacement',
        'Fluid leak',
      ]
    },
    {
      name: 'Electrical',
      items: [
        'Battery not charging',
        'Lights not working',
        'Electric start failure',
        'Horn failure',
        'Dashboard failure',
      ]
    },
    {
      name: 'Transmission',
      items: [
        'Loose chain',
        'Drive kit replacement',
        'Transmission noise',
        'Gear jumps',
      ]
    },
    {
      name: 'Suspension',
      items: [
        'Suspension oil leak',
        'Hard suspension',
        'Suspension noise',
        'Unbalanced',
      ]
    },
  ];
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Estado para nuevo customer
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [createdCustomerId, setCreatedCustomerId] = useState(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Search motorcycles by plate
  const searchMotorcyclesByPlate = async (plate) => {
    if (!plate || plate.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/vehicles?search=${encodeURIComponent(plate)}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show notification helper
  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 2500);
  };

  // Handle modal close
  const handleClose = () => {
    setStep('plate-search');
    setPlateNumber('');
    setSearchResults([]);
    setSelectedVehicle(null);
    setServiceNotes([]);
    setNewNote('');
    setNotification({ show: false, message: '', type: '' });
    onClose && onClose();
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setStep('confirm');
  };

  // Show form to create vehicle
  const showCreateVehicleForm = () => {
    setNewVehicleDetails({ ...newVehicleDetails, plate: plateNumber }); // siempre setea la patente actual
    setStep('new-vehicle');
  };

  // Crear customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.name) {
      showNotification('Customer name is required', 'error');
      return;
    }
    setCreatingCustomer(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCustomer),
      });
      if (response.ok) {
        const data = await response.json();
        // Asociar el vehículo al nuevo customer
        await fetch(`${API_URL}/vehicles/${selectedVehicle.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...selectedVehicle, customer_id: data.id })
        });
        setSelectedVehicle({ ...selectedVehicle, customer_id: data.id, customer_name: newCustomer.name });
        showNotification('Customer created and associated', 'success');
        setStep('confirm');
      } else {
        const err = await response.json();
        showNotification(err.error || 'Error creating customer', 'error');
      }
    } catch (e) {
      showNotification('Error creating customer', 'error');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Create vehicle
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
        customer_id: 4
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

        // Create an object with the base info
        const vehicle = {
          id: responseData.id || Date.now(),
          plate: newVehicleDetails.plate,
          model: newVehicleDetails.model,
          customer_id: 4
        };
        
        setSelectedVehicle(vehicle);
        showNotification("Motorcycle created successfully", "success");
        setStep('post-vehicle-options'); // Nuevo paso: opciones tras crear moto
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

  // Cambia la lógica: los labors se crean solo después de crear el jobsheet, usando el jobsheet_id real
  // 1. Guarda los requerimientos en serviceNotes (como antes)
  // 2. Al crear el jobsheet, después del POST, crea los labors con el jobsheet_id devuelto

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
        description: filteredNotes.map(n => n.text).join('\n'),
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
        const jobsheet = await response.json();
        // Crear labors para cada requerimiento
        for (const note of filteredNotes) {
          await fetch(`${API_URL}/labor`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              jobsheet_id: jobsheet.id,
              description: note.text,
              price: 0,
              is_completed: false,
              vehicle_id: selectedVehicle.id
            })
          });
        }
        showNotification("Jobsheet created successfully", "success");
        setTimeout(() => {
          if (refreshJobsheets) refreshJobsheets();
          onClose();
        }, 1500);
      } else {
        showNotification("Error creating jobsheet", "error");
      }
    } catch (error) {
      showNotification("Error creating jobsheet", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // addServiceNote y addServiceNoteFromButton solo agregan a serviceNotes, no llaman a createLabor
  const addServiceNote = () => {
    if (newNote.trim()) {
      setServiceNotes(prev => [...prev, { id: Date.now(), text: newNote.trim() }]);
      setNewNote('');
    }
  };

  function addServiceNoteFromButton(text) {
    setServiceNotes(prev => {
      if (prev.some(n => n.text === text)) return prev;
      return [...prev, { id: Date.now() + Math.random(), text }];
    });
  }

  // Delete a note
  const deleteServiceNote = (id) => {
    setServiceNotes(prev => prev.filter(n => n.id !== id));
  };

  // Handle oil change click
  function handleOilChangeClick() {
    setShowOilTypeSelector(true);
  }

  // Select oil type
  function selectOilType(type) {
    addServiceNoteFromButton(`Oil change (${type})`);
    setShowOilTypeSelector(false);
  }

  // Nuevo: Pre-cargar datos si editingJobsheet cambia
  useEffect(() => {
    if (editingJobsheet) {
      setStep('confirm');
      setSelectedVehicle({
        id: editingJobsheet.vehicle_id,
        plate: editingJobsheet.vehicle_plate || editingJobsheet.plate,
        model: editingJobsheet.vehicle_model || editingJobsheet.model,
        customer_id: editingJobsheet.customer_id,
        customer_name: editingJobsheet.customer_name
      });
      setServiceNotes(
        editingJobsheet.description
          ? editingJobsheet.description.split('\n').map((text, i) => ({ id: Date.now() + i, text }))
          : []
      );
      // Si tienes más campos, precárgalos aquí
    }
  }, [editingJobsheet]);

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
                {editingJobsheet ? "Edit Job Sheet" : "Quick Job Reception"}
              </h2>
              <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
                {editingJobsheet
                  ? "You are editing an existing job sheet. Changes will be saved."
                  : step === 'plate-search' && "Enter license plate to find motorcycle"}
                {step === 'new-vehicle' && "Create new motorcycle"}
                {step === 'post-vehicle-options' && "Motorcycle created"}
                {step === 'confirm' && "Confirm motorcycle details"}
                {step === 'service-notes' && "Add service details"}
                {step === 'new-customer' && "Create new customer"}
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
              {/* Search Input simple */}
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
                    onChange={e => { setPlateNumber(e.target.value); searchMotorcyclesByPlate(e.target.value); }}
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

          {/* Step 3: Create New Vehicle */}
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
                  onChange={e => {
                    setNewVehicleDetails({...newVehicleDetails, plate: e.target.value});
                    setPlateNumber(e.target.value); // sincroniza con el input anterior
                  }}
                  placeholder="Enter license plate..."
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
          )}

          {/* Step 4: Post Vehicle Options */}
          {step === 'post-vehicle-options' && selectedVehicle && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>
                Motorcycle created
              </h3>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  {selectedVehicle.plate?.toUpperCase()} - {selectedVehicle.model}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  style={{
                    padding: '12px 15px',
                    backgroundColor: '#5932EA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => setStep('new-customer')}
                >
                  Associate to New Customer
                </button>
                <button
                  style={{
                    padding: '12px 15px',
                    backgroundColor: '#e0e0e0',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                  onClick={() => setStep('confirm')}
                >
                  Continue Without Customer
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Confirm Vehicle */}
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
                    onClick={() => setStep('post-vehicle-options')}
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

          {/* Step 6: Service Notes (Enhanced) */}
          {step === 'service-notes' && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600" }}>
                Service Notes / Problems
              </h3>

              {/* Quick Service Categories & Subcategories */}
              {!selectedCategory ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginBottom: "18px"
                }}>
                  {serviceCategories.map(cat => (
                    <button
                      key={cat.name}
                      type="button"
                      className="quick-btn"
                      style={{ ...quickBtnStyle, fontSize: 16, fontWeight: 600, padding: '18px 8px' }}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <button
                      style={{ ...quickBtnStyle, background: '#eee', color: '#333', marginRight: 10, padding: '8px 14px' }}
                      onClick={() => setSelectedCategory(null)}
                    >
                      ← Back
                    </button>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedCategory.name}</span>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "10px",
                    marginBottom: "18px"
                  }}>
                    {selectedCategory.items.map(item => (
                      <button
                        key={item}
                        type="button"
                        className={`quick-btn${serviceNotes.some(n => n.text === item) ? ' selected' : ''}`}
                        style={quickBtnStyle}
                        onClick={() => {
                          if(item === 'Oil change') handleOilChangeClick();
                          else addServiceNoteFromButton(item);
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Oil type selector modal */}
              {showOilTypeSelector && (
                <div style={{
                  position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.2)', zIndex: 2000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ background: 'white', borderRadius: 12, padding: 24, minWidth: 260, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                    <h4 style={{ margin: 0, marginBottom: 12 }}>Select oil type</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button style={quickBtnStyle} onClick={() => selectOilType('Mineral')}>Mineral</button>
                      <button style={quickBtnStyle} onClick={() => selectOilType('Semi-synthetic')}>Semi-synthetic</button>
                      <button style={quickBtnStyle} onClick={() => selectOilType('Synthetic')}>Synthetic</button>
                    </div>
                    <button style={{ ...quickBtnStyle, marginTop: 18, background: '#eee', color: '#333' }} onClick={() => setShowOilTypeSelector(false)}>Cancel</button>
                  </div>
                </div>
              )}

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

              {/* Service notes as chips, always visible */}
              {serviceNotes.length > 0 && (
                <div style={{
                  marginBottom: "15px",
                  backgroundColor: "#f9fafc",
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "15px",
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  minHeight: 48
                }}>
                  {serviceNotes.map((note, idx) => (
                    <div key={note.id} className={`note-chip${idx === serviceNotes.length-1 ? ' selected' : ''}`}>
                      <FontAwesomeIcon icon={faListCheck} style={{fontSize:14}} />
                      <span>{note.text}</span>
                      <button
                        onClick={() => deleteServiceNote(note.id)}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          color: "#d9534f",
                          cursor: "pointer",
                          fontSize: 16,
                          marginLeft: 2
                        }}
                        title="Remove"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Visual summary before creating Job Sheet */}
              {step === 'service-notes' && selectedVehicle && (
                <div style={{
                  background: '#f0f0ff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18
                }}>
                  <FontAwesomeIcon icon={faMotorcycle} style={{fontSize:32, color:'#5932EA'}} />
                  <div>
                    <div style={{fontWeight:600, fontSize:17}}>{selectedVehicle.plate?.toUpperCase() || 'No Plate'}</div>
                    <div style={{fontSize:15, color:'#444'}}>{selectedVehicle.model}</div>
                  </div>
                  <div style={{marginLeft:'auto', textAlign:'right'}}>
                    <div style={{fontSize:14, color:'#888'}}>Notes:</div>
                    <div style={{fontWeight:500, fontSize:15}}>{serviceNotes.length} added</div>
                  </div>
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

          {/* Step 7: Create New Customer */}
          {step === 'new-customer' && (
            <div style={{ animation: "fadeIn 0.3s", maxWidth: 400 }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px" }}>Create New Customer</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Name*</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 15 }}
                  placeholder="Customer name"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Phone</label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 15 }}
                  placeholder="Phone number"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 15 }}
                  placeholder="Email address"
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>Address</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 15 }}
                  placeholder="Address (optional)"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setStep('post-vehicle-options')}
                  style={{
                    padding: '10px 16px',
                    background: '#eee',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#444',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={creatingCustomer || !newCustomer.name}
                  style={{
                    padding: '10px 16px',
                    background: '#5932EA',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: creatingCustomer || !newCustomer.name ? 'not-allowed' : 'pointer',
                    opacity: creatingCustomer || !newCustomer.name ? 0.7 : 1
                  }}
                >
                  {creatingCustomer ? 'Saving...' : 'Create Customer'}
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
            {step === 'new-vehicle' && 'Step 2: Create new motorcycle'}
            {step === 'post-vehicle-options' && 'Step 3: Motorcycle created'}
            {step === 'confirm' && 'Step 4: Confirm motorcycle'}
            {step === 'service-notes' && 'Step 5: Service details'}
            {step === 'new-customer' && 'Step 6: Create new customer'}
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
          .quick-btn {
            transition: box-shadow 0.18s, transform 0.18s, background 0.18s;
            will-change: transform, box-shadow;
          }
          .quick-btn:hover, .quick-btn:focus {
            transform: scale(1.07);
            box-shadow: 0 4px 16px rgba(89,50,234,0.13);
            background: #e6e6fa;
            outline: none;
          }
          .quick-btn.selected {
            background: #5932EA;
            color: white;
            box-shadow: 0 2px 8px rgba(89,50,234,0.18);
          }
          .note-chip {
            transition: box-shadow 0.18s, background 0.18s;
            box-shadow: 0 1px 4px rgba(89,50,234,0.07);
            background: #f0f0ff;
            color: #5932EA;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            border-radius: 20px;
            padding: 7px 16px;
            font-size: 15px;
            margin-bottom: 0;
          }
          .note-chip.selected {
            background: #5932EA;
            color: white;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreateJobsheetModal;

