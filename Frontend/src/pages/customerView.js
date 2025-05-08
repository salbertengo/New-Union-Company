import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ClientSideRowModelModule } from 'ag-grid-community';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faMotorcycle, 
  faSearch,
  faCar,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Action button components
const ActionButtonsContainer = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
    {children}
  </div>
);

const ActionButton = ({ icon, onClick, tooltip, type }) => (
  <button
    onClick={onClick}
    title={tooltip}
    style={{
      backgroundColor: type === 'primary' ? '#5932EA' : type === 'danger' ? '#ff4d4f' : '#f0f0f0',
      color: type === 'primary' || type === 'danger' ? 'white' : '#444',
      border: 'none',
      borderRadius: '4px',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.backgroundColor = 
        type === 'primary' ? '#4321C9' : 
        type === 'danger' ? '#ff1f1f' : 
        '#e0e0e0';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.backgroundColor = 
        type === 'primary' ? '#5932EA' : 
        type === 'danger' ? '#ff4d4f' : 
        '#f0f0f0';
    }}
  >
    <FontAwesomeIcon icon={icon} />
  </button>
);

// Toast notification component
const ToastNotification = ({ message, type, onClose }) => (
  <div
    style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: type === 'success' ? '#52c41a' : '#ff4d4f',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1000,
      minWidth: '300px',
      animation: 'slideIn 0.3s ease',
    }}
  >
    <div>{message}</div>
    <button
      onClick={onClose}
      style={{
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        marginLeft: '10px',
      }}
    >
      <FontAwesomeIcon icon={faTimes} />
    </button>
    <style>{`
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </div>
);

// Main CustomerView component
const CustomersView = () => {
  // State
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Refs
  const gridRef = useRef(null);
  const vehicleGridRef = useRef(null);
  const searchTimeout = useRef(null);
  
  // Constants
  const API_URL = process.env.REACT_APP_API_URL;

  // Grid configurations
  const defaultColDef = {
    resizable: true,
    sortable: true,
    suppressMenu: true,
    flex: 1,
  };

  const customerColumnDefs = [
    { 
      headerName: 'Name', 
      field: 'name', 
      flex: 2,
      width: 180,
      sortable: true,
      headerClass: 'custom-header-inventory',
      cellRenderer: params => (
        <div style={{ 
          fontWeight: '500', 
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {params.value}
        </div>
      )
    },
    { 
      headerName: 'Phone', 
      field: 'phone', 
      flex: 1,
      width: 120,
      sortable: true,
      headerClass: 'custom-header-inventory',
      cellRenderer: params => (
        <div style={{ color: '#555' }}>
          {params.value || '-'}
        </div>
      )
    },
    { 
      headerName: 'Email', 
      field: 'email', 
      flex: 2,
      width: 180,
      sortable: true,
      headerClass: 'custom-header-inventory',
      cellRenderer: params => (
        <div style={{ color: '#555' }}>
          {params.value || '-'}
        </div>
      )
    },
    { 
      headerName: 'Address', 
      field: 'address', 
      flex: 2,
      width: 220,
      sortable: true,
      headerClass: 'custom-header-inventory',
      cellRenderer: params => (
        <div style={{ color: '#555' }}>
          {params.value || '-'}
        </div>
      )
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 120,
      sortable: false,
      filter: false,
      cellRenderer: params => (
        <ActionButtonsContainer>
          <ActionButton
            icon={faEdit}
            onClick={() => handleEditCustomer(params.data)}
            tooltip="Edit Customer"
            type="default"
          />
          <ActionButton
            icon={faMotorcycle}
            onClick={() => handleViewVehicles(params.data)}
            tooltip="View Vehicles"
            type="primary"
          />
        </ActionButtonsContainer>
      ),
      headerClass: 'custom-header-inventory'
    }
  ];

  const vehicleColumnDefs = [
    { 
      headerName: 'License Plate', 
      field: 'plate', 
      flex: 1,
      width: 120,
      sortable: true,
      cellRenderer: params => (
        <div style={{ 
          fontWeight: '500', 
          color: '#333'
        }}>
          {params.value?.toUpperCase() || ''}
        </div>
      )
    },
    { 
      headerName: 'Model', 
      field: 'model', 
      flex: 2,
      width: 200,
      sortable: true
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 120,
      sortable: false,
      cellRenderer: params => (
        <ActionButtonsContainer>
          <ActionButton
            icon={faEdit}
            onClick={() => handleEditVehicle(params.data)}
            tooltip="Edit Vehicle"
            type="default"
          />
          <ActionButton
            icon={faTrash}
            onClick={() => handleDeleteVehicle(params.data.id)}
            tooltip="Delete Vehicle"
            type="danger"
          />
        </ActionButtonsContainer>
      )
    }
  ];

  // Fetch functions
  const fetchCustomers = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

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

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showNotification('Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchVehicles = async (customerId) => {
    if (!customerId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/vehicles?customer_id=${customerId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      showNotification('Error loading vehicles', 'error');
    }
  };

  // Event handlers
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

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleViewVehicles = async (customer) => {
    setSelectedCustomer(customer);
    await fetchVehicles(customer.id);
    setShowVehiclesModal(true);
  };

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      await fetchVehicles(selectedCustomer.id);
      showNotification('Vehicle deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      showNotification('Error deleting vehicle', 'error');
    }
  };

  const handleSaveCustomer = async (customer) => {
    try {
      const token = localStorage.getItem('token');
      const method = customer.id ? 'PUT' : 'POST';
      const url = customer.id ? `${API_URL}/customers/${customer.id}` : `${API_URL}/customers`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      setShowCustomerModal(false);
      await fetchCustomers(searchTerm);
      showNotification(
        customer.id ? 'Customer updated successfully' : 'Customer created successfully', 
        'success'
      );
    } catch (error) {
      console.error('Error saving customer:', error);
      showNotification('Error saving customer', 'error');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer? This will also delete all associated vehicles.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      setShowCustomerModal(false);
      await fetchCustomers(searchTerm);
      showNotification('Customer deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting customer:', error);
      showNotification('Error deleting customer', 'error');
    }
  };

  const handleSaveVehicle = async (vehicle) => {
    try {
      if (!vehicle.customer_id) {
        console.error("Missing customer_id in vehicle data");
        showNotification("Error: Missing customer association", "error");
        return;
      }
      
      const token = localStorage.getItem('token');
      const method = vehicle.id ? 'PUT' : 'POST';
      const url = vehicle.id ? `${API_URL}/vehicles/${vehicle.id}` : `${API_URL}/vehicles`;
      
      // Use the customer_id from the form data directly
      const vehicleData = {
        plate: vehicle.plate,
        model: vehicle.model,
        customer_id: vehicle.customer_id // Use from the form data
      };
      
      console.log("Sending vehicle data:", vehicleData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vehicleData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error details:", errorData);
        throw new Error(`Server error: ${errorData.message || response.status}`);
      }
      
      setShowVehicleModal(false);
      await fetchVehicles(vehicle.customer_id);
      showNotification(
        vehicle.id ? 'Vehicle updated successfully' : 'Vehicle created successfully', 
        'success'
      );
    } catch (error) {
      console.error('Error saving vehicle:', error);
      showNotification(`Error saving vehicle: ${error.message}`, 'error');
    }
  };

  // Helper functions
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  // Effects
  useEffect(() => {
    fetchCustomers();
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [fetchCustomers]);

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
      {/* Header section with search and add button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Customers</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search customers..."
              style={{
                padding: '5px 30px 5px 10px',
                width: '216px',
                borderRadius: '10px',
                border: '1px solid #e0e0e0',
                backgroundColor: '#F9FBFF',
                height: '25px',
                fontSize: '14px'
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
                color: loading ? '#4321C9' : '#6E6E6E',
              }}
            />
          </div>
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setShowCustomerModal(true);
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#5932EA',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4321C9'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5932EA'}
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Customers Grid */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div 
          className="ag-theme-alpine inventory-view" 
          style={{ 
            width: '100%', 
            flex: 1,
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
            domLayout={'autoHeight'}
            onGridReady={(params) => {
              gridRef.current = params.api;
              gridRef.current.sizeColumnsToFit();
            }}
            suppressRowClickSelection={true}
            rowSelection="single"
          />
        </div>
        
        {/* Loading spinner */}
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

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setShowCustomerModal(false)}
          onSave={handleSaveCustomer}
          onDelete={handleDeleteCustomer}
        />
      )}

      {/* Vehicles Modal */}
      {showVehiclesModal && selectedCustomer && (
        <VehiclesModal
          customer={selectedCustomer}
          vehicles={vehicles}
          onClose={() => setShowVehiclesModal(false)}
          onAddVehicle={() => {
            setSelectedVehicle(null);
            setShowVehicleModal(true);
          }}
          onEditVehicle={handleEditVehicle}
          onDeleteVehicle={handleDeleteVehicle}
          vehicleColumnDefs={vehicleColumnDefs}
          defaultColDef={defaultColDef}
        />
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <VehicleModal
          vehicle={selectedVehicle}
          customerId={selectedCustomer?.id}
          onClose={() => setShowVehicleModal(false)}
          onSave={handleSaveVehicle}
        />
      )}

      {/* Notification toast */}
      {notification.show && (
        <ToastNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
    </div>
  );
};

// Customer Modal Component
const CustomerModal = ({ customer, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  
  useEffect(() => {
    if (customer) {
      setFormData({
        id: customer.id,
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    }
  }, [customer]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Customer name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '500px',
          maxWidth: '95%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5932EA 0%, #4321C9 100%)',
            padding: '24px 30px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
              {customer ? 'Edit Customer' : 'New Customer'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="name" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}
            >
              Name*
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="phone" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              value={formData.phone}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="email" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="address" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}
            >
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Footer with buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '20px',
            borderTop: '1px solid #eee',
            paddingTop: '20px'
          }}>
            {customer && (
              <button
                type="button"
                onClick={() => onDelete(customer.id)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#FFEBEE',
                  color: '#D32F2F',
                  border: '1px solid #FFCDD2',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFD8D6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFEBEE';
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
                Delete
              </button>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              marginLeft: customer ? 'auto' : 0
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9e9e9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#5932EA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4321C9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#5932EA';
                }}
              >
                <FontAwesomeIcon icon={customer ? faCheck : faPlus} />
                {customer ? 'Update Customer' : 'Create Customer'}
              </button>
            </div>
          </div>
        </form>
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
      `}</style>
    </div>
  );
};

// Vehicles Modal Component
const VehiclesModal = ({ 
  customer, 
  vehicles, 
  onClose, 
  onAddVehicle, 
  onEditVehicle,
  onDeleteVehicle,
  vehicleColumnDefs,
  defaultColDef
}) => {
  const gridRef = useRef(null);
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '700px',
          maxWidth: '95%',
          maxHeight: '90vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5932EA 0%, #4321C9 100%)',
            padding: '24px 30px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
                Vehicles
              </h2>
              <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
                {customer.name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column',
          overflowY: 'auto',
          flex: '1 1 auto',
        }}>
          {/* Add Vehicle Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={onAddVehicle}
              style={{
                padding: '10px 20px',
                backgroundColor: '#5932EA',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4321C9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5932EA'}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Vehicle
            </button>
          </div>

          {/* Vehicles Grid */}
          <div style={{ flex: 1, minHeight: '300px' }}>
            {vehicles.length === 0 ? (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#f9fafc',
                borderRadius: '8px',
                color: '#666'
              }}>
                <FontAwesomeIcon icon={faMotorcycle} style={{ fontSize: '24px', marginBottom: '10px', opacity: 0.5 }} />
                <p style={{ margin: '10px 0 0' }}>No vehicles found for this customer.</p>
              </div>
            ) : (
              <div className="ag-theme-alpine" style={{ height: '300px', width: '100%' }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={vehicles}
                  columnDefs={vehicleColumnDefs}
                  defaultColDef={defaultColDef}
                  modules={[ClientSideRowModelModule]}
                  headerHeight={40}
                  rowHeight={50}
                  domLayout={'autoHeight'}
                  onGridReady={(params) => {
                    gridRef.current = params.api;
                  }}
                  suppressRowClickSelection={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '15px 20px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e9e9e9'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          >
            Close
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
      `}</style>
    </div>
  );
};

// Vehicle Modal Component
const VehicleModal = ({ vehicle, customerId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: null,
    plate: '',
    model: '',
    customer_id: null
  });
  
  useEffect(() => {
    if (vehicle) {
      setFormData({
        id: vehicle.id,
        plate: vehicle.plate || '',
        model: vehicle.model || '',
        customer_id: vehicle.customer_id || customerId
      });
    } else {
      setFormData({
        id: null,
        plate: '',
        model: '',
        customer_id: customerId
      });
    }
  }, [vehicle, customerId]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.plate || !formData.model) {
      alert('Plate and model are required');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '450px',
          maxWidth: '95%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5932EA 0%, #4321C9 100%)',
            padding: '24px 30px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
              {vehicle ? 'Edit Vehicle' : 'New Vehicle'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="plate" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}
            >
              License Plate*
            </label>
            <input
              id="plate"
              name="plate"
              type="text"
              value={formData.plate}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="model" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}
            >
              Model*
            </label>
            <input
              id="model"
              name="model"
              type="text"
              value={formData.model}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Hidden field for customer_id */}
          <input 
            type="hidden" 
            name="customer_id" 
            value={formData.customer_id} 
          />
          
          {/* Footer with buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            marginTop: '20px',
            borderTop: '1px solid #eee',
            paddingTop: '20px'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9e9e9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#5932EA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#4321C9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#5932EA';
                }}
              >
                <FontAwesomeIcon icon={vehicle ? faCheck : faPlus} />
                {vehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </form>
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
      `}</style>
    </div>
  );
};

export default CustomersView;