import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ModuleRegistry } from '@ag-grid-community/core';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const JobsheetView = () => {
  const [jobsheets, setJobsheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [currentJobsheet, setCurrentJobsheet] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const gridRef = useRef(null);
  const searchTimeout = useRef(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const customerSearchTimeout = useRef(null);
  // Form data state for creating/editing jobsheets
  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    description: '',
    status: 'pending',
    date_created: new Date().toISOString().split('T')[0]
  });
  

  // Column definitions for AG Grid
  const columnDefs = [
    { 
      headerName: 'ID', 
      field: 'id', 
      width: 80,
      headerClass: 'custom-header-sumary' 
    },
    { 
      headerName: 'Customer', 
      field: 'customer_name',
      headerClass: 'custom-header-sumary'
    },
    { 
      headerName: 'Model', 
      field: 'vehicle_model', 
      headerClass: 'custom-header-sumary' 
    },
    { 
      headerName: 'VEH', 
      field: 'license_plate',
      headerClass: 'custom-header-sumary'
    },
    { 
      headerName: 'Status', 
      field: 'status',
      headerClass: 'custom-header-sumary',
      // Use cellRenderer instead of cellRendererFramework and just return the formatted string
      cellRenderer: (params) => {
        const status = params.value || 'pending';
        return status.charAt(0).toUpperCase() + status.slice(1);
      }
    },
    { 
      headerName: 'Payment Status', 
      field: 'payment_status',
      headerClass: 'custom-header-sumary',
      // Use cellRenderer instead of cellRendererFramework and just return the string
      cellRenderer: (params) => {
        const status = params.value || 'Unpaid';
        return status;
      }
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 120,
      headerClass: 'custom-header-sumary',
      cellRenderer: (params) => {
        // Return a simple string with HTML that AG Grid will convert to DOM elements
        return `
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="edit-btn" style="border: none; background: none; cursor: pointer; color: #5932EA;">
              <i class="fa fa-edit"></i>
            </button>
            <button class="delete-btn" style="border: none; background: none; cursor: pointer; color: #d32f2f;">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        `;
      },
      // Add a callback to handle the button clicks after the cell is rendered
      onCellClicked: (params) => {
        const target = params.event.target;
        
        // Check if edit button was clicked
        if (target.classList.contains('edit-btn') || 
            target.classList.contains('fa-edit') ||
            target.parentNode.classList.contains('edit-btn')) {
          handleEdit(params.data);
        }
        
        // Check if delete button was clicked
        if (target.classList.contains('delete-btn') || 
            target.classList.contains('fa-trash') ||
            target.parentNode.classList.contains('delete-btn')) {
          handleDelete(params.data);
        }
      }
    }
  ];

  // Default column definition
  const defaultColDef = {
    resizable: true,
    sortable: true,
    suppressMenu: true
  };

  // Grid ready event handler
  const onGridReady = (params) => {
    gridRef.current = params.api;
  };

  // Fetch jobsheets with optional search parameter
  const fetchJobsheets = useCallback(async (search = '') => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      setLoading(false);
      return;
    }
  
    try {
      let url = 'http://localhost:3000/jobsheets';
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
        const jobsheetData = await response.json();
        
        // Process the data to include customer name and vehicle info
        const processedJobsheets = await Promise.all(jobsheetData.map(async (jobsheet) => {
          // Get customer information
          const customerResponse = await fetch(`http://localhost:3000/customers/${jobsheet.customer_id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Get vehicle information
          const vehicleResponse = await fetch(`http://localhost:3000/vehicles/${jobsheet.vehicle_id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          const customer = customerResponse.ok ? await customerResponse.json() : null;
          const vehicle = vehicleResponse.ok ? await vehicleResponse.json() : null;
          
          return {
            ...jobsheet,
            customer_name: customer ? 
            (customer.name || 
            `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
            'Unknown Customer') : 'Unknown',
            vehicle_model: vehicle ? 
            ((vehicle.make ? vehicle.make + ' ' : '') + 
             (vehicle.model || '')) || 'Unknown' 
            : 'Unknown',
            license_plate: vehicle ? vehicle.plate : 'Unknown',
            payment_status: getPaymentStatus(jobsheet)
          };
        }));
        
        setJobsheets(processedJobsheets);
      } else {
        console.error('Error fetching jobsheets:', response.status);
      }
    } catch (error) {
      console.error('Error fetching jobsheets:', error);
    } finally {
      setLoading(false);
    }
  }, []);
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
      if (value.trim() === '') {
        setFilteredCustomers([]);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }
      
      try {
        // Use the correct endpoint - this matches what your backend expects
        const response = await fetch(`http://localhost:3000/customers?search=${encodeURIComponent(value)}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const results = await response.json();
          console.log('Customer search results:', results);
          setFilteredCustomers(results);
          
          // Make sure the results dropdown is shown
          setShowCustomerResults(true);
        } else {
          console.error('Error searching customers:', response.status);
          
          // Fallback: filter locally from already loaded customers
          const searchTermLower = value.toLowerCase();
          const filtered = customers.filter(customer => {
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
            return fullName.includes(searchTermLower);
          });
          setFilteredCustomers(filtered);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        
        // Fallback: filter locally from already loaded customers
        const searchTermLower = value.toLowerCase();
        const filtered = customers.filter(customer => {
          const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
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
      vehicle_id: '' // Reset vehicle when customer changes
    });
    
    // Handle different customer object structures
    let customerDisplayName = 'Unknown Customer';
    
    // Try to get the name based on possible object structures
    if (customer.name) {
      // If customer has a single name field
      customerDisplayName = customer.name;
    } else if (customer.first_name || customer.last_name) {
      // If customer has separate first_name/last_name fields
      customerDisplayName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    
    // Set the display name
    setSelectedCustomerName(customerDisplayName);
    setShowCustomerResults(false);
    setCustomerSearchTerm('');
    
    // Fetch vehicles for this customer
    fetchVehicles(customer.id);
    
    // Log for debugging
    console.log('Selected customer:', customer);
  };
  
  // Update your handleEdit function to set the selected customer name
  const handleEdit = (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setFormData({
      customer_id: jobsheet.customer_id,
      vehicle_id: jobsheet.vehicle_id,
      description: jobsheet.description || '',
      status: jobsheet.status || 'pending',
      date_created: jobsheet.date_created?.split('T')[0] || new Date().toISOString().split('T')[0]
    });
    
    // Set selected customer name
    setSelectedCustomerName(jobsheet.customer_name || '');
    
    // Fetch vehicles for this customer
    fetchVehicles(jobsheet.customer_id);
    setShowModal(true);
  };
  
  // Update handleOpenNewModal to clear selected customer
  const handleOpenNewModal = () => {
    setCurrentJobsheet(null);
    setFormData({
      customer_id: '',
      vehicle_id: '',
      description: '',
      status: 'pending',
      date_created: new Date().toISOString().split('T')[0]
    });
    setSelectedCustomerName('');
    setCustomerSearchTerm('');
    setShowModal(true);
  };
  // Get payment status based on jobsheet data
  const getPaymentStatus = (jobsheet) => {
    if (!jobsheet.total_amount) return 'No Items';
    if (!jobsheet.amount_paid) return 'Unpaid';
    if (jobsheet.amount_paid >= jobsheet.total_amount) return 'Paid';
    const percentage = Math.round((jobsheet.amount_paid / jobsheet.total_amount) * 100);
    return `Partial (${percentage}%)`;
  };

  // Fetch customers for dropdown
  const fetchCustomers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }
  
    try {
      const response = await fetch('http://localhost:3000/customers', {
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
    }
  };

  // Fetch vehicles for dropdown
  const fetchVehicles = async (customerId = null) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }
  
    try {
      let url = 'http://localhost:3000/vehicles';
      if (customerId) {
        url += `?customer_id=${customerId}`;
      }
  
      const response = await fetch(url, {
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

  // Initial data fetch
  useEffect(() => {
    fetchJobsheets();
    fetchCustomers();
    fetchVehicles();
  }, [fetchJobsheets]);

  // Search handler with debounce
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set new timeout
    searchTimeout.current = setTimeout(() => {
      fetchJobsheets(value);
    }, 500);
  };

  // Handle customer change in form - to filter vehicles by customer
  const handleCustomerChange = (e) => {
    const customerId = e.target.value;
    setFormData({
      ...formData,
      customer_id: customerId,
      vehicle_id: '' // Reset vehicle selection when customer changes
    });
    
    // Fetch vehicles for this customer
    fetchVehicles(customerId);
  };

  // Handle all other form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };





  const handleDelete = (jobsheet) => {
    setCurrentJobsheet(jobsheet);
    setShowDeleteModal(true);
  };

  // Save jobsheet (create or update)
  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }
    
    try {
      let url = 'http://localhost:3000/jobsheets';
      let method = 'POST';
      
      if (currentJobsheet) {
        url += `/${currentJobsheet.id}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowModal(false);
        fetchJobsheets(searchTerm);
      } else {
        console.error('Error saving jobsheet:', response.status);
        alert('Error saving jobsheet');
      }
    } catch (error) {
      console.error('Error saving jobsheet:', error);
      alert('Error saving jobsheet');
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    const token = localStorage.getItem('token');
    if (!token || !currentJobsheet) {
      console.error('No token found or no jobsheet selected');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/jobsheets/${currentJobsheet.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setShowDeleteModal(false);
        fetchJobsheets(searchTerm);
      } else {
        console.error('Error deleting jobsheet:', response.status);
        alert('Error deleting jobsheet');
      }
    } catch (error) {
      console.error('Error deleting jobsheet:', error);
      alert('Error deleting jobsheet');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h2 className="texto-modulos">Job Sheets</h2>
      
      {/* Search and Add button row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        alignItems: 'center' 
      }}>
        <div style={{ 
          position: 'relative', 
          width: '300px' 
        }}>
          <input
            type="text"
            placeholder="Search jobsheets..."
            value={searchTerm}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '10px 35px 10px 15px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
          <FontAwesomeIcon
            icon={faSearch}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: loading ? '#4321C9' : 'gray',
              cursor: 'pointer'
            }}
          />
        </div>
        <button
          onClick={handleOpenNewModal}
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
          Add Job Sheet
        </button>
      </div>

      {/* Grid with loading indicator */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div 
          className="ag-theme-alpine inventory-view" 
          style={{ 
            width: '100%', 
            height: '100%',
            overflowX: 'hidden',
            overflowY: 'auto',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.3s ease'
          }}>
          <AgGridReact
            ref={gridRef}
            rowData={jobsheets}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            modules={[ClientSideRowModelModule]}
            pagination={true}
            paginationPageSize={12}
            headerHeight={30}
            rowHeight={35}
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
            }} />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '500px',
            padding: '20px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0 }}>
                {currentJobsheet ? 'Edit Job Sheet' : 'Create New Job Sheet'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
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

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Customer Selection */}
              <div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
    Customer:
  </label>
  <div style={{ position: 'relative' }}>
    {selectedCustomerName ? (
      <div style={{ 
        marginBottom: '10px', 
        padding: '8px 12px', 
        borderRadius: '4px', 
        backgroundColor: '#f0f4ff',
        border: '1px solid #d0d8ff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: '500' }}>{selectedCustomerName}</span>
        <button
          onClick={() => {
            setSelectedCustomerName('');
            setFormData({...formData, customer_id: '', vehicle_id: ''});
            setVehicles([]);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#666'
          }}
        >
          ×
        </button>
      </div>
    ) : (
      <>
        <input
  type="text"
  placeholder="Search customers by name..."
  value={customerSearchTerm}
  onChange={handleCustomerSearch}
  onFocus={() => setShowCustomerResults(true)}
  onBlur={(e) => {
    // Delay hiding results to allow for clicking on a result
    setTimeout(() => setShowCustomerResults(false), 200);
  }}
  style={{
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd'
  }}
/>
        
        {showCustomerResults && filteredCustomers.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 10,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            {filteredCustomers.map(customer => (
  <div
    key={customer.id}
    onClick={() => handleSelectCustomer(customer)}
    style={{
      padding: '8px 12px',
      cursor: 'pointer',
      borderBottom: '1px solid #eee',
      transition: 'background-color 0.2s'
    }}
    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
  >
    {customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer'}
  </div>
))}
          </div>
        )}
      </>
    )}
  </div>
</div>
              
              {/* Vehicle Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Vehicle:
                </label>
                <select
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                  disabled={!formData.customer_id}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.plate})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Status:
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              {/* Date Created */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Date:
                </label>
                <input
                  type="date"
                  name="date_created"
                  value={formData.date_created}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
              
              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Description:
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  marginRight: '10px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#5932EA',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {currentJobsheet ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '400px',
            padding: '20px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0 }}>Confirm Delete</h3>
            <p>Are you sure you want to delete this job sheet? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default JobsheetView;