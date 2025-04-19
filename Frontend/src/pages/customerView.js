import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import { createPortal } from 'react-dom';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCar, faSearch } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const CustomerModal = ({ customer, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    id: customer?.id || null,
    name: customer?.name || '',
    address: customer?.address || '',
    phone: customer?.phone || '',
    email: customer?.email || ''
  });

  const [tempVehicles, setTempVehicles] = useState(customer?.vehicles || []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, vehicles: tempVehicles });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "550px",
          maxHeight: "90vh",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
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
            aria-hidden="true"
          ></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                {formData.id ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
                {formData.id ? `Editing ${formData.name || 'Customer'}` : "Enter customer details below"}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
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
                zIndex: 10,
                outline: "none",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
              onFocus={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
              onBlur={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px 30px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Customer Information Section */}
            <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                Customer Information
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / 3" }}>
                  <label htmlFor="customer-name" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                    Name *
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      transition: "border-color 0.2s",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="customer-phone" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                    Phone
                  </label>
                  <input
                    id="customer-phone"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      transition: "border-color 0.2s",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label htmlFor="customer-email" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                    Email
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      backgroundColor: "#fff",
                      fontSize: "14px",
                      transition: "border-color 0.2s",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                Address Information
              </h3>
              <div>
                <label htmlFor="customer-address" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                  Address
                </label>
                <input
                  id="customer-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    transition: "border-color 0.2s",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                  onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  placeholder="Enter full address"
                />
              </div>
            </div>

            {/* Vehicles Section - Improved UI/UX */}
            <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
                  Vehicles (Optional)
                </h3>
                <button
                  type="button"
                  onClick={() => setTempVehicles([...tempVehicles, { plate: '', model: '', isNew: true }])}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#EDE7F6",
                    color: "#5932EA",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "background-color 0.2s", // Added transition
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#DFD3F7"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#EDE7F6"}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="#5932EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add Vehicle
                </button>
              </div>
              
              {tempVehicles.length === 0 ? (
                <div style={{ 
                  padding: "16px", 
                  textAlign: "center", 
                  backgroundColor: "#f0f2f5", // Slightly different background for emphasis
                  borderRadius: "8px",
                  color: "#666",
                  fontSize: "14px",
                  border: "1px dashed #d9d9d9" // Dashed border for empty state
                }}>
                  No vehicles added yet. Click 'Add Vehicle' to associate one with this customer.
                </div>
              ) : (
                // Container for the list of vehicles with scroll
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "16px", 
                  maxHeight: "250px", // Keep max height for scroll
                  overflowY: "auto", 
                  paddingRight: "8px" // Add padding for scrollbar space
                }}>
                  {tempVehicles.map((vehicle, index) => (
                    // Individual vehicle item container
                    <div key={index} style={{ 
                      padding: "16px", 
                      backgroundColor: "#fff", 
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      position: "relative",
                      display: "flex",
                      flexDirection: "row", // Ensure horizontal layout for main parts
                      alignItems: "flex-start", // Align items to the top
                      gap: "16px"
                    }}>
                      {/* Singapore Motorcycle License Plate Visualizer */}
                      <div style={{
                        width: "140px", // Keep width
                        height: "50px", // Keep height
                        backgroundColor: "#000",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px 8px",
                        flexShrink: 0, // Prevent shrinking
                        marginTop: "5px" // Align slightly better with inputs
                      }}>
                        <div style={{
                          fontSize: "20px",
                          fontWeight: "bold",
                          fontFamily: "monospace",
                          color: "#FFF",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          textAlign: "center",
                          wordBreak: "break-all" // Prevent overflow if text is too long
                        }}>
                          {vehicle.plate ? vehicle.plate.toUpperCase() : "FZ1234"}
                        </div>
                      </div>
                      
                      {/* Input Fields Container - Using Flex Column */}
                      <div style={{ 
                        flex: 1, // Take remaining space
                        display: "flex", 
                        flexDirection: "column", // Stack inputs vertically
                        gap: "12px" // Space between input groups
                      }}>
                        {/* Plate Number Group */}
                        <div>
                          <label htmlFor={`vehicle-plate-${index}`} style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "#444" }}>
                            Plate Number *
                          </label>
                          <input
                            id={`vehicle-plate-${index}`}
                            type="text"
                            value={vehicle.plate}
                            onChange={(e) => {
                              const newVehicles = [...tempVehicles];
                              newVehicles[index].plate = e.target.value.toUpperCase();
                              setTempVehicles(newVehicles);
                            }}
                            style={{
                              width: "100%", // Full width of its container
                              padding: "10px 12px", // Adjusted padding
                              borderRadius: "6px",
                              border: "1px solid #d9d9d9", // Standard border color
                              backgroundColor: "#fff",
                              fontSize: "14px", // Standard font size
                              transition: "border-color 0.2s, box-shadow 0.2s", // Added box-shadow transition
                              outline: "none",
                              textTransform: "uppercase"
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "#5932EA";
                              e.target.style.boxShadow = "0 0 0 2px rgba(89, 50, 234, 0.2)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#d9d9d9";
                              e.target.style.boxShadow = "none";
                            }}
                            placeholder="FZ1234"
                            maxLength={7}
                            required // Added required attribute
                          />
                        </div>
                        {/* Motorcycle Model Group */}
                        <div>
                          <label htmlFor={`vehicle-model-${index}`} style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "#444" }}>
                            Motorcycle Model *
                          </label>
                          <input
                            id={`vehicle-model-${index}`}
                            type="text"
                            value={vehicle.model}
                            onChange={(e) => {
                              const newVehicles = [...tempVehicles];
                              newVehicles[index].model = e.target.value;
                              setTempVehicles(newVehicles);
                            }}
                            style={{
                              width: "100%", // Full width
                              padding: "10px 12px", // Adjusted padding
                              borderRadius: "6px",
                              border: "1px solid #d9d9d9",
                              backgroundColor: "#fff",
                              fontSize: "14px",
                              transition: "border-color 0.2s, box-shadow 0.2s",
                              outline: "none"
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = "#5932EA";
                              e.target.style.boxShadow = "0 0 0 2px rgba(89, 50, 234, 0.2)";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#d9d9d9";
                              e.target.style.boxShadow = "none";
                            }}
                            placeholder="Honda CBR 150R"
                            required // Added required attribute
                          />
                        </div>
                      </div>
                      
                      {/* Delete Button - Positioned absolutely relative to the item container */}
                      <button
                        type="button"
                        onClick={() => {
                          const newVehicles = [...tempVehicles];
                          newVehicles.splice(index, 1);
                          setTempVehicles(newVehicles);
                        }}
                        aria-label="Remove Vehicle" // Added aria-label
                        style={{
                          position: "absolute", // Position absolutely
                          top: "10px",         // Adjust position
                          right: "10px",        // Adjust position
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          border: "none",
                          background: "#fff0f0",
                          color: "#D32F2F",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "16px",
                          transition: "background-color 0.2s",
                          flexShrink: 0 // Prevent shrinking
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#ffd9d9"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#fff0f0"}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9fafc",
          }}
        >
          {formData.id && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: "12px 20px",
                backgroundColor: "transparent",
                color: "#D32F2F",
                border: "1px solid #FFCDD2",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#FFF5F5";
                e.currentTarget.style.borderColor = "#FFABAB";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#FFCDD2";
              }}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4H3.33333H14" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.33331 4.00016V2.66683C5.33331 2.31321 5.4738 1.97407 5.72385 1.72402C5.9739 1.47397 6.31304 1.33349 6.66665 1.33349H9.33331C9.68693 1.33349 10.0261 1.47397 10.2761 1.72402C10.5262 1.97407 10.6666 2.31321 10.6666 2.66683V4.00016M12.6666 4.00016V13.3335C12.6666 13.6871 12.5262 14.0263 12.2761 14.2763C12.0261 14.5264 11.6869 14.6668 11.3333 14.6668H4.66665C4.31304 14.6668 3.9739 14.5264 3.72385 14.2763C3.4738 14.0263 3.33331 13.6871 3.33331 13.3335V4.00016H12.6666Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.66669 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.33331 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete Customer
            </button>
          )}
          
          <div style={{ display: "flex", gap: "12px", marginLeft: formData.id ? "auto" : "0" }}>
            <button
              onClick={onClose}
              style={{
                padding: "12px 20px",
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
                e.currentTarget.style.backgroundColor = "#f6f6f6";
                e.currentTarget.style.borderColor = "#c0c0c0";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#d0d0d0";
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: "12px 24px",
                backgroundColor: "#5932EA",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: "120px",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
              type="button"
            >
              {formData.id ? "Update Customer" : "Create Customer"}
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
                animation: 'modalFadeIn 0.3s ease',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V14M12 5H7.8C6.11984 5 5.27976 5 4.63803 5.32698C4.07354 5.6146 3.6146 6.07354 3.32698 6.63803C3 7.27976 3 8.11984 3 9.8V14.2C3 15.8802 3 16.7202 3.32698 17.362C3.6146 17.9265 4.07354 18.3854 4.63803 18.673C5.27976 19 6.11984 19 7.8 19H16.2C17.8802 19 18.7202 19 19.362 18.673C19.9265 18.3854 20.3854 17.9265 20.673 17.362C21 16.7202 21 15.8802 21 14.2V9.8C21 8.11984 21 7.27976 20.673 6.63803C20.3854 6.07354 19.9265 5.6146 19.362 5.32698C18.7202 5 17.8802 5 16.2 5H12ZM12 17H12.01" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '18px' }}>
                Delete Customer?
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px' }}>
                This will permanently delete {formData.name} and all associated vehicles. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: 'transparent',
                    color: '#666',
                    border: '1px solid #d0d0d0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete(formData.id);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#D32F2F',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSS Animations */}
        <style jsx="true">{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
};
const CustomersView = () => {
  // State hooks remain the same
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [editVehicle, setEditVehicle] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const gridRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [refreshData, setRefreshData] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef(null);
  const vehicleGridRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL;
  // Definir defaultColDef por separado, como en InventoryView
  const defaultColDef = {
    resizable: true,
    sortable: true,
    suppressMenu: true
  };

  // Manejador de onGridReady para la grid principal
  const onGridReady = (params) => {
    gridRef.current = params.api;
  };

  // Manejador de onGridReady para la grid de vehículos
  const onVehicleGridReady = (params) => {
    vehicleGridRef.current = params.api;
  };

  const fetchCustomers = useCallback(async (search = '') => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      setLoading(false);
      return;
    }
  
    try {
      let url = `${API_URL}/customers`;
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
  
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        console.error('Error fetching customers:', response.status);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVehicles = async (customerId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/vehicles?customer_id=${customerId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      } else {
        console.error('Error fetching vehicles:', response.status);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [fetchCustomers, refreshData]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  
    searchTimeout.current = setTimeout(() => {
      fetchCustomers(value);
    }, 500);
  };

  const handleOpenCustomerModal = (customer = null) => {
    setEditCustomer({
      id: customer?.id || null,
      name: customer?.name || '',
      address: customer?.address || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      vehicles: customer?.vehicles || []
    });
    setShowCustomerModal(true);
  };

  const handleOpenVehiclesModal = async (customer) => {
    setSelectedCustomer(customer);
    await fetchVehicles(customer.id);
    setShowVehiclesModal(true);
  };

  const handleOpenVehicleModal = (vehicle = null) => {
    setEditVehicle(vehicle || { plate: '', model: '', customer_id: selectedCustomer.id });
    setShowVehicleModal(true);
  };

  const handleSaveCustomer = async (customerData) => {
    if (!customerData || !customerData.name) {
      alert('Customer name is required');
      return;
    }
  
    const token = localStorage.getItem('token');
    try {
      let response;
  
      if (customerData.id) {
        response = await fetch(`${API_URL}/customers/${customerData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(customerData)
        });
      } else {
        response = await fetch(`${API_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(customerData)
        });
      }
  
      if (response.ok) {
        setShowCustomerModal(false);
        // Después de cerrar el modal, actualizamos datos sin forzar remontaje
        fetchCustomers(searchTerm);
      } else {
        console.error('Error saving customer:', response.status);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!editCustomer?.id) return;

    const confirmed = window.confirm('Are you sure you want to delete this customer? All associated vehicles will also be deleted.');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/customers/${editCustomer.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShowCustomerModal(false);
        fetchCustomers(searchTerm);
      } else {
        console.error('Error deleting customer:', response.status);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleSaveVehicle = async () => {
    if (!editVehicle || !editVehicle.plate || !editVehicle.model) {
      alert('License Plate and Model are required');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      let response;

      if (editVehicle.id) {
        response = await fetch(`${API_URL}/vehicles/${editVehicle.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editVehicle)
        });
      } else {
        response = await fetch(`${API_URL}/vehicles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editVehicle)
        });
      }

      if (response.ok) {
        setShowVehicleModal(false);
        fetchVehicles(selectedCustomer.id);
      } else {
        console.error('Error saving vehicle:', response.status);
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!editVehicle?.id) return;

    const confirmed = window.confirm('Are you sure you want to delete this vehicle?');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/vehicles/${editVehicle.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShowVehicleModal(false);
        fetchVehicles(selectedCustomer.id);
      } else {
        console.error('Error deleting vehicle:', response.status);
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const handleVehicleInputChange = (field, value) => {
    setEditVehicle(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const customerColumnDefs = useMemo(() => [
    { headerName: 'Name', field: 'name', flex: 2, headerClass: 'custom-header-inventory' },
    { headerName: 'Phone', field: 'phone', flex: 1, headerClass: 'custom-header-inventory' },
    { headerName: 'Email', field: 'email', flex: 2, headerClass: 'custom-header-inventory' },
    { headerName: 'Address', field: 'address', flex: 2, headerClass: 'custom-header-inventory' },
    {
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filter: false,
      cellRenderer: params => (
        <ActionButtonsContainer>
          <ActionButton
            icon={faEdit}
            onClick={() => handleOpenCustomerModal(params.data)}
            tooltip="Edit Customer"
            type="default"
          />
          <ActionButton
            icon={faCar}
            onClick={() => handleOpenVehiclesModal(params.data)}
            tooltip="View Vehicles"
            type="primary"
          />
        </ActionButtonsContainer>
      ),
      headerClass: 'custom-header-inventory'
    },
    {
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filter: false,
      cellRenderer: params => (
        <ActionButtonsContainer>
          <ActionButton
            icon={faEdit}
            onClick={() => handleOpenVehicleModal(params.data)}
            tooltip="Edit Vehicle"
            type="default"
          />
        </ActionButtonsContainer>
      ),
      headerClass: 'custom-header-inventory'
    }
  ], []);
  
  const vehicleColumnDefs = useMemo(() => [
    { headerName: 'License Plate', field: 'plate', flex: 1, headerClass: 'custom-header-inventory' },
    { headerName: 'Model', field: 'model', flex: 2, headerClass: 'custom-header-inventory' },
    {
      headerName: 'Edit',
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: params => (
        <div
          onClick={() => handleOpenVehicleModal(params.data)}
          title="Edit vehicle"
          style={{
            cursor: 'pointer',
            color: '#3498db',
            textAlign: 'center',
            lineHeight: '25px'
          }}
        >
          <FontAwesomeIcon icon={faEdit} style={{ fontSize: '14px' }} />
        </div>
      ),
      headerClass: 'custom-header-inventory'
    }
  ], []);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '30px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        padding: '20px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>Customers</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search customers..."
              style={{
                padding: '5px 30px 5px 10px',
                width: '216px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF',
                height: '25px'
              }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <FontAwesomeIcon 
              icon={faSearch} 
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: loading ? '#4321C9' : 'gray',
                cursor: 'pointer'
              }}
            />
          </div>
          <button
            onClick={() => handleOpenCustomerModal()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: isHovered ? '#4321C9' : '#5932EA',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Customers Grid - siguiendo el estilo de InventoryView */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div 
          className="ag-theme-alpine inventory-view" 
          style={{ 
            width: '100%', 
            height: '100%',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.3s ease'
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={customers}
            columnDefs={customerColumnDefs}
            defaultColDef={defaultColDef}
            modules={[ClientSideRowModelModule]}
            pagination={true}
            paginationPageSize={12}
            headerHeight={30}
            rowHeight={50}
            onGridReady={onGridReady}
          />
        </div>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderLeft: '4px solid #4321C9',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Customer Modal rendered via portal */}
      {showCustomerModal && editCustomer && (
        <CustomerModal 
          customer={editCustomer}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleSaveCustomer}
          onDelete={handleDeleteCustomer}
        />
      )}

      {/* Vehicles Modal */}
      {showVehiclesModal && selectedCustomer && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 9999,
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}
          >
            <h2 style={{ margin: 0 }}>
              Vehicles for {selectedCustomer.name}
            </h2>
            <button
              onClick={() => setShowVehiclesModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                lineHeight: '1'
              }}
            >
              &times;
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => handleOpenVehicleModal()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#5932EA',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Add Vehicle
            </button>
          </div>

          <div className="ag-theme-alpine" style={{ height: '300px', width: '100%' }}>
            {vehicles.length === 0 ? (
              <p>No vehicles registered for this customer.</p>
            ) : (
              <AgGridReact
                ref={vehicleGridRef}
                rowData={vehicles}
                columnDefs={vehicleColumnDefs}
                defaultColDef={defaultColDef}
                modules={[ClientSideRowModelModule]}
                headerHeight={30}
                rowHeight={35}
                onGridReady={onVehicleGridReady}
              />
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowVehiclesModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4321C9',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
{/* Vehicle Edit Modal */}
{showVehicleModal && editVehicle && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease',
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) setShowVehicleModal(false);
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        width: "95%",
        maxWidth: "500px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "modalFadeIn 0.3s ease",
      }}
      onClick={(e) => e.stopPropagation()}
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
          aria-hidden="true"
        ></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
              {editVehicle.id ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
            <p style={{ margin: "4px 0 0 0", opacity: "0.8", fontSize: "14px" }}>
              {editVehicle.id ? `Editing vehicle details` : `Adding vehicle for ${selectedCustomer.name}`}
            </p>
          </div>
          <button
            onClick={() => setShowVehicleModal(false)}
            aria-label="Close modal"
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
              zIndex: 10,
              outline: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
            onFocus={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
            onBlur={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 30px" }}>
        <div style={{ padding: "20px", backgroundColor: "#f9fafc", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
            Vehicle Information
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label htmlFor="vehicle-plate" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                License Plate *
              </label>
              <input
                id="vehicle-plate"
                type="text"
                value={editVehicle.plate || ''}
                onChange={(e) => handleVehicleInputChange('plate', e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  transition: "border-color 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                placeholder="ABC123"
                required
              />
            </div>
            <div>
              <label htmlFor="vehicle-model" style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#444" }}>
                Model *
              </label>
              <input
                id="vehicle-model"
                type="text"
                value={editVehicle.model || ''}
                onChange={(e) => handleVehicleInputChange('model', e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  transition: "border-color 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => e.target.style.borderColor = "#5932EA"}
                onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                placeholder="Honda CR-V 2022"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #e0e0e0",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f9fafc",
        }}
      >
        {editVehicle.id && (
          <button
            onClick={handleDeleteVehicle}
            style={{
              padding: "12px 20px",
              backgroundColor: "transparent",
              color: "#D32F2F",
              border: "1px solid #FFCDD2",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#FFF5F5";
              e.currentTarget.style.borderColor = "#FFABAB";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = "#FFCDD2";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4H3.33333H14" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.33331 4.00016V2.66683C5.33331 2.31321 5.4738 1.97407 5.72385 1.72402C5.9739 1.47397 6.31304 1.33349 6.66665 1.33349H9.33331C9.68693 1.33349 10.0261 1.47397 10.2761 1.72402C10.5262 1.97407 10.6666 2.31321 10.6666 2.66683V4.00016M12.6666 4.00016V13.3335C12.6666 13.6871 12.5262 14.0263 12.2761 14.2763C12.0261 14.5264 11.6869 14.6668 11.3333 14.6668H4.66665C4.31304 14.6668 3.9739 14.5264 3.72385 14.2763C3.4738 14.0263 3.33331 13.6871 3.33331 13.3335V4.00016H12.6666Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66669 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.33331 7.33349V11.3335" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delete Vehicle
          </button>
        )}
        
        <div style={{ display: "flex", gap: "12px", marginLeft: editVehicle.id ? "auto" : "0" }}>
          <button
            onClick={() => setShowVehicleModal(false)}
            style={{
              padding: "12px 20px",
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
              e.currentTarget.style.backgroundColor = "#f6f6f6";
              e.currentTarget.style.borderColor = "#c0c0c0";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = "#d0d0d0";
            }}
          >
            Cancel
          </button>
<button
  onClick={handleSaveVehicle}
  style={{
    padding: "12px 24px",
    backgroundColor: "#5932EA",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    minWidth: "120px",
    transition: "all 0.2s",
  }}
  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
>
  {editVehicle.id ? "Update Vehicle" : "Add Vehicle"}
</button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
  </div>
  </div>
)}
    </div>
  );
};

export default CustomersView;