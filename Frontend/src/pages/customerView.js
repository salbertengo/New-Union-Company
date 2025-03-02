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

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const CustomerModal = ({ customer, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    id: customer?.id || null,
    name: customer?.name || '',
    address: customer?.address || '',
    phone: customer?.phone || '',
    email: customer?.email || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '450px',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        zIndex: 10000
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
          {formData.id ? 'Edit Customer' : 'Add Customer'}
        </h2>
        <button
          onClick={onClose}
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
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Name*</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              style={{
                width: '100%',
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={{
                width: '100%',
                padding: '5px',
                borderRadius: '10px',
                border: '1px solid white',
                backgroundColor: '#F9FBFF'
              }}
            />
          </div>
        </div>
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#5932EA',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
          >
            Save
          </button>
          {formData.id && (
            <button
              type="button"
              onClick={() => onDelete(formData.id)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
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
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

const CustomersView = () => {
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
      let url = 'http://localhost:3000/customers';
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
      const response = await fetch(`http://localhost:3000/vehicles?customer_id=${customerId}`, {
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
      email: customer?.email || ''
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
        response = await fetch(`http://localhost:3000/customers/${customerData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(customerData)
        });
      } else {
        response = await fetch('http://localhost:3000/customers', {
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
      const response = await fetch(`http://localhost:3000/customers/${editCustomer.id}`, {
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
        response = await fetch(`http://localhost:3000/vehicles/${editVehicle.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(editVehicle)
        });
      } else {
        response = await fetch('http://localhost:3000/vehicles', {
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
      const response = await fetch(`http://localhost:3000/vehicles/${editVehicle.id}`, {
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
      headerName: 'Edit',
      width: 70,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: params => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleOpenCustomerModal(params.data);
          }}
          title="Edit customer"
          style={{
            cursor: 'pointer',
            color: '#3498db',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <FontAwesomeIcon icon={faEdit} style={{ fontSize: '14px' }} />
        </div>
      ),
      headerClass: 'custom-header-inventory'
    },
    {
      headerName: 'Vehicles',
      width: 70,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: params => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleOpenVehiclesModal(params.data);
          }}
          title="View vehicles"
          style={{
            cursor: 'pointer',
            color: '#f39c12',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <FontAwesomeIcon icon={faCar} style={{ fontSize: '14px' }} />
        </div>
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
      {showVehicleModal && editVehicle && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            zIndex: 10000
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
              {editVehicle.id ? 'Edit Vehicle' : 'Add Vehicle'}
            </h2>
            <button
              onClick={() => setShowVehicleModal(false)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>License Plate*</label>
              <input
                type="text"
                value={editVehicle.plate || ''}
                onChange={(e) => handleVehicleInputChange('plate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Model*</label>
              <input
                type="text"
                value={editVehicle.model || ''}
                onChange={(e) => handleVehicleInputChange('model', e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid white',
                  backgroundColor: '#F9FBFF'
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            <button
              onClick={handleSaveVehicle}
              style={{
                padding: '10px 20px',
                backgroundColor: '#5932EA',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease'
              }}
            >
              Save
            </button>
            {editVehicle.id && (
              <button
                onClick={handleDeleteVehicle}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            )}
            <button
              onClick={() => setShowVehicleModal(false)}
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
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersView;