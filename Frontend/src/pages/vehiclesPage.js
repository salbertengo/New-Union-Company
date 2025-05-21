import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactDOM from "react-dom";
import { 
  faTools,
  faMotorcycle, 
  faPlus, 
  faHistory, 
  faCalendarAlt,
  faTimes,
  faStar,
  faClipboardList,
  faEdit,
  faCheck,
  faSearch,
  faBars
}  from '@fortawesome/free-solid-svg-icons';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ClientSideRowModelModule } from 'ag-grid-community';
import SideBar from './Sidebar';
import { 
  ActionButton, 
  ActionButtonsContainer 
} from '../components/common/ActionButtons';
const VehiclesPage = () => {
  // Main states
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [formData, setFormData] = useState({
    model: '',
    plate: '',
    customer_id: '',
  });
  const [serviceHistory, setServiceHistory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchType, setSearchType] = useState('vehicle'); // 'vehicle' or 'customer'
  const [showCommonModels, setShowCommonModels] = useState(false);
  const [showJobsheetModal, setShowJobsheetModal] = useState(false);
  const [completeJobsheet, setCompleteJobsheet] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;
  // Reference for AG Grid table
  const gridRef = useRef(null);
const [isMobile, setIsMobile] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [selectedCustomer, setSelectedCustomer] = useState(null);
const [toast, setToast] = useState({
  visible: false,
  message: '',
  type: 'success', // success, error, warning, info
});

const [formChanged, setFormChanged] = useState(false);
const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);



  // Filter vehicles based on search term
 const filteredVehicles = vehicles.filter(vehicle => {
    let matchesSearch = true;
    if (searchTerm !== '') {
      if (searchType === 'vehicle') {
        // Search by vehicle data
        matchesSearch = 
          vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase()) 
      } else if (searchType === 'customer') {
        // Search by customer name
        matchesSearch = 
          vehicle.customer_name && 
          vehicle.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      }
    }
    return matchesSearch;
  });

  // Column definitions for AG Grid
  const columnDefs = [
    {
      headerName: 'Motorcycle',
      field: 'model',
      flex: 1,
      minWidth: 120,
      cellRenderer: params => {
        if (!params.data) return '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            <div>
              <div style={{ fontWeight: '500', color: '#292D32' }}> {params.data.model}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              </div>
            </div>
          </div>
        );
      },
      headerClass: "custom-header-inventory",
    },
    {
      headerName: 'License Plate',
      field: 'plate',
      width: 120,
      cellRenderer: params => {
        if (!params.data) return '';
        // Simply return the plate text in uppercase
        return <div>{(params.value || "").toUpperCase()}</div>;
      },
      headerClass: "custom-header-inventory",
    },
    {
      headerName: 'Customer',
      field: 'customer_name',
      width: 180,
      cellRenderer: params => {
        if (!params.data) return '';
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '8px'
          }}>

            <span>{params.value || 'No customer'}</span>
          </div>
        );
      },
      headerClass: "custom-header-inventory",
    },
    {
      headerName: 'Last Service',
      field: 'last_service',
      width: 150,
      cellRenderer: params => {
        // First check if we really have a value - be extra strict
        if (!params.data || !params.value || params.value === 'null' || params.value === '') {
          return (
            <div style={{
              color: '#9E9E9E',
              fontSize: '13px',
              fontStyle: 'italic'
            }}>
              No services
            </div>
          );
        }
        
        // Make sure we properly parse and format the date
        try {
          const dateObj = new Date(params.value);
          // Very strict validation to ensure it's a real date from the past
          const now = new Date();
          if (!isNaN(dateObj.getTime()) && dateObj <= now && dateObj.getFullYear() > 2000) {
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#5932EA', fontSize: '12px' }} />
                <span>{dateObj.toLocaleDateString()}</span>
              </div>
            );
          } else {
            // Invalid date - show no services
            return (
              <div style={{
                color: '#9E9E9E',
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                No services
              </div>
            );
          }
        } catch (e) {
          console.error("Error parsing date:", e);
          return (
            <div style={{
              color: '#9E9E9E',
              fontSize: '13px',
              fontStyle: 'italic'
            }}>
              No services
            </div>
          );
        }
      },
      headerClass: "custom-header-inventory",
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 160,
      cellRenderer: params => {
        if (!params.data) return '';
        return (
          <ActionButtonsContainer>
            <ActionButton
              icon={faHistory}
              onClick={() => handleViewServiceHistory(params.data)}
              tooltip="View Service History"
              type="primary"
            />
            <ActionButton
              icon={faEdit}
              onClick={() => handleEditVehicle(params.data)}
              tooltip="Edit Motorcycle"
              type="default"
            />

          </ActionButtonsContainer>
        );
      },
      headerClass: "custom-header-inventory",
    }
  ];


const getColumnDefs = () => {
    const baseColumns = [
      {
        headerName: 'Motorcycle',
        field: 'model',
        flex: 1.5,
        minWidth: isMobile ? 150 : 180,
        cellRenderer: params => {
          if (!params.data) return '';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: '500', color: '#292D32', fontSize: isMobile ? '15px' : 'inherit' }}>
                  {params.data.model}
                </div>
              </div>
            </div>
          );
        },
        headerClass: "custom-header-inventory",
      },
      {
        headerName: 'License Plate',
        field: 'plate',
        width: isMobile ? 100 : 120,
        cellRenderer: params => {
          if (!params.data) return '';
          return <div>{(params.value || "").toUpperCase()}</div>;
        },
        headerClass: "custom-header-inventory",
      }
    ];

    // En modo móvil vertical, reducimos las columnas
  if (isMobile && isVertical && window.innerWidth < 668) {
      return [
        ...baseColumns,
        {
          headerName: 'Actions',
          field: 'actions',
          width: 100,
          cellRenderer: params => {
            if (!params.data) return '';
            return (
              <ActionButtonsContainer>
                <ActionButton
                  icon={faHistory}
                  onClick={() => handleViewServiceHistory(params.data)}
                  tooltip="View History"
                  type="primary"
                />
                <ActionButton
                  icon={faEdit}
                  onClick={() => handleEditVehicle(params.data)}
                  tooltip="Edit"
                  type="default"
                />
              </ActionButtonsContainer>
            );
          },
          headerClass: "custom-header-inventory",
        }
      ];
    }

    // En modo escritorio o tablet horizontal, mostramos todas las columnas
    return [
      ...baseColumns,
      {
        headerName: 'Customer',
        field: 'customer_name',
        width: 180,
        cellRenderer: params => {
          if (!params.data) return '';
          return (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{params.value || 'No customer'}</span>
            </div>
          );
        },
        headerClass: "custom-header-inventory",
      },
      {
        headerName: 'Last Service',
        field: 'last_service',
        width: 150,
        cellRenderer: params => {
          if (!params.data || !params.value || params.value === 'null' || params.value === '') {
            return (
              <div style={{
                color: '#9E9E9E',
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                No services
              </div>
            );
          }
          
          try {
            const dateObj = new Date(params.value);
            const now = new Date();
            if (!isNaN(dateObj.getTime()) && dateObj <= now && dateObj.getFullYear() > 2000) {
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#5932EA', fontSize: '12px' }} />
                  <span>{dateObj.toLocaleDateString()}</span>
                </div>
              );
            } else {
              return (
                <div style={{
                  color: '#9E9E9E',
                  fontSize: '13px',
                  fontStyle: 'italic'
                }}>
                  No services
                </div>
              );
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            return (
              <div style={{
                color: '#9E9E9E',
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                No services
              </div>
            );
          }
        },
        headerClass: "custom-header-inventory",
      },
      {
        headerName: 'Actions',
        field: 'actions',
        width: 160,
        cellRenderer: params => {
          if (!params.data) return '';
          return (
            <ActionButtonsContainer>
              <ActionButton
                icon={faHistory}
                onClick={() => handleViewServiceHistory(params.data)}
                tooltip="View Service History"
                type="primary"
              />
              <ActionButton
                icon={faEdit}
                onClick={() => handleEditVehicle(params.data)}
                tooltip="Edit Motorcycle"
                type="default"
              />
            </ActionButtonsContainer>
          );
        },
        headerClass: "custom-header-inventory",
      }
    ];
  };
  // Load data on component mount
  useEffect(() => {
    fetchVehicles();
    fetchCustomers();
  }, []);
 useEffect(() => {
    const checkDeviceAndOrientation = () => {
      const isMobileDevice = window.innerWidth <= 1024; // Considera tablets
      const isVerticalOrientation = window.innerHeight > window.innerWidth;
      
      setIsMobile(isMobileDevice);
      setIsVertical(isVerticalOrientation);
      
      // En dispositivos grandes, la sidebar siempre está visible
      // En móviles/tablets, está cerrada por defecto
      setSidebarOpen(!isMobileDevice);
    };
    
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
    };
  }, []);


const showToast = (message, type = 'success') => {
  setToast({
    visible: true,
    message,
    type
  });
  
  setTimeout(() => {
    setToast(prev => ({...prev, visible: false}));
  }, 3000);
};
  const fetchVehicles = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      setLoading(false);
      return;
    }
  
    try {
      // First fetch all jobsheets once
      let allJobsheets = [];
      try {
        const jobsheetsResponse = await fetch(`${API_URL}/jobsheets`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (jobsheetsResponse.ok) {
          allJobsheets = await jobsheetsResponse.json();
          console.log("Fetched all jobsheets for last service dates:", allJobsheets.length);
        }
      } catch (error) {
        console.error('Error fetching all jobsheets:', error);
      }
      
      // Then fetch and process vehicles
      const response = await fetch(`${API_URL}/vehicles`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
  
      const data = await response.json();
      const vehiclesWithCustomerInfo = await Promise.all(
        data.map(async (vehicle) => {
          let enhancedVehicle = { 
            ...vehicle,
            customer_name: 'No customer',
            last_service: null 
          };
          
          // Process customer info as before
          if (vehicle.customer_id) {
            try {
              const customerResponse = await fetch(`${API_URL}/customers/${vehicle.customer_id}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (customerResponse.ok) {
                const customer = await customerResponse.json();
                
                // Determine the customer name based on available fields
                if (customer.first_name || customer.last_name) {
                  enhancedVehicle.customer_name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                } else if (customer.name) {
                  enhancedVehicle.customer_name = customer.name;
                } else {
                  enhancedVehicle.customer_name = `Customer #${customer.id}`;
                }
              }
            } catch (error) {
              console.error(`Error fetching customer for vehicle ${vehicle.id}:`, error);
            }
          }
          
          // Filter jobsheets for this vehicle and find the most recent one
          const vehicleJobsheets = allJobsheets.filter(
            jobsheet => Number(jobsheet.vehicle_id) === Number(vehicle.id)
          );
          
          // Sort by created_at (newest first)
          vehicleJobsheets.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
          });
          
          // Set the last service date from the most recent jobsheet
          if (vehicleJobsheets.length > 0) {
            const dateStr = vehicleJobsheets[0].created_at;
            console.log(`Vehicle ${vehicle.id} - Last service date: ${dateStr}`);
            
            if (dateStr) {
              const dateObj = new Date(dateStr);
              if (!isNaN(dateObj.getTime())) {
                enhancedVehicle.last_service = dateObj.toISOString();
              }
            }
          }
          
          return enhancedVehicle;
        })
      );
      
      setVehicles(vehiclesWithCustomerInfo);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };
const handleCustomerSearch = async (e) => {
  const value = e.target.value;
  setCustomerSearch(value);
  
  if (value.length < 2) {
    setSearchResults([]);
    return;
  }
  
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_URL}/customers?search=${encodeURIComponent(value)}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setSearchResults(data);
    }
  } catch (error) {
    console.error('Error searching customers:', error);
  }
};

const selectCustomer = (customer) => {
  setSelectedCustomer(customer);
  setCustomerSearch(''); // Clear the search input
  setSearchResults([]); // Clear the search results
  setFormData({
    ...formData,
    customer_id: customer.id // Set the customer_id in the form data
  });
};
  const fetchCustomers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/customers`, {
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

  const handleViewServiceHistory = async (vehicle) => {
    setCurrentVehicle(vehicle);
    setLoading(true);
    setServiceHistory([]);
    
    const token = localStorage.getItem('token');
    
    try {
      // First fetch all jobsheets (since the endpoint isn't filtering correctly)
      const response = await fetch(`${API_URL}/jobsheets`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  
        }
      });
    
      if (response.ok) {
        const allJobsheets = await response.json();
        console.log("Fetched all jobsheets:", allJobsheets);
        
        // Filter the jobsheets client-side to match the current vehicle ID
        const vehicleJobsheets = allJobsheets.filter(
          jobsheet => Number(jobsheet.vehicle_id) === Number(vehicle.id)
        );
        
        console.log(`Filtered ${vehicleJobsheets.length} jobsheets for vehicle ID:`, vehicle.id);
        
        if (vehicleJobsheets.length > 0) {
          // Rest of your existing code for fetching labors
          const enhancedJobsheets = await Promise.all(vehicleJobsheets.map(async jobsheet => {
            try {
              const laborResponse = await fetch(`${API_URL}/labor/jobsheet/${jobsheet.id}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (laborResponse.ok) {
                const labors = await laborResponse.json();
                return { ...jobsheet, labors };
              }
              return { ...jobsheet, labors: [] };
            } catch (error) {
              console.error(`Error fetching labors for jobsheet ${jobsheet.id}:`, error);
              return { ...jobsheet, labors: [] };
            }
          }));
          
          setServiceHistory(enhancedJobsheets);
        } else {
          setServiceHistory([]);
        }
      } else {
        console.error(`Error fetching jobsheets: ${response.status}`);
        alert(`Failed to load service history. Server responded with: ${response.status}`);
        setServiceHistory([]);
      }
    } catch (error) {
      console.error('Error fetching jobsheets:', error);
      alert("Failed to load service history. Network error occurred.");
      setServiceHistory([]);
    } finally {
      setLoading(false);
      setShowServiceModal(true);
    }
  };
  // Search vehicles by customer name
  const searchVehiclesByCustomer = async (customerName) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // First search for customers matching the name
      const customersResponse = await fetch(`${API_URL}/customers?search=${encodeURIComponent(customerName)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!customersResponse.ok) {
        throw new Error(`Error: ${customersResponse.status}`);
      }
      
      const customersData = await customersResponse.json();
      
      if (customersData.length === 0) {
        setVehicles([]);
        setLoading(false);
        return;
      }
      
      // Get IDs of matching customers
      const customerIds = customersData.map(customer => customer.id);
      
      // Get vehicles for all those customers
      let allVehicles = [];
      
      for (const id of customerIds) {
        const vehiclesResponse = await fetch(`${API_URL}/vehicles?customer_id=${id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          const customer = customersData.find(c => c.id === id);
            
          // Determine customer name based on data structure
          let customerName = 'No customer';
          if (customer) {
            if (customer.first_name || customer.last_name) {
              customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
            } else if (customer.name) {
              customerName = customer.name;
            }
          }
            
          const vehiclesWithCustomer = vehiclesData.map(vehicle => ({
            ...vehicle,
            customer_name: customerName
          }));
            
          allVehicles = [...allVehicles, ...vehiclesWithCustomer];
        }
      }
      
      setVehicles(allVehicles);
    } catch (error) {
      console.error('Error searching vehicles by customer:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
const handleSearch = async (e) => {
  const value = e.target.value;
  setSearchTerm(value);
  
  if (value.length < 2) {
    // If search term is too short, just load all vehicles
    fetchVehicles();
    return;
  }
  
  setLoading(true);
  const token = localStorage.getItem('token');
  
  try {
    // Search in both vehicles and customers
    const [vehiclesResponse, customersResponse] = await Promise.all([
      fetch(`${API_URL}/vehicles?search=${encodeURIComponent(value)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }),
      fetch(`${API_URL}/customers?search=${encodeURIComponent(value)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    ]);
    
    if (vehiclesResponse.ok && customersResponse.ok) {
      const vehiclesData = await vehiclesResponse.json();
      const customersData = await customersResponse.json();
      
      // First, add the vehicles from direct search
      let resultVehicles = [...vehiclesData];
      
      // Then, get vehicles associated with matching customers
      if (customersData.length > 0) {
        const customerIds = customersData.map(customer => customer.id);
        
        // Get vehicles for each matching customer
        for (const id of customerIds) {
          const custVehiclesResponse = await fetch(`${API_URL}/vehicles?customer_id=${id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (custVehiclesResponse.ok) {
            const custVehiclesData = await custVehiclesResponse.json();
            
            // Find the customer info for these vehicles
            const customer = customersData.find(c => c.id === id);
            let customerName = 'No customer';
            if (customer) {
              if (customer.first_name || customer.last_name) {
                customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
              } else if (customer.name) {
                customerName = customer.name;
              }
            }
            
            // Add customer name to each vehicle
            const vehiclesWithCustomer = custVehiclesData.map(vehicle => ({
              ...vehicle,
              customer_name: customerName
            }));
            
            // Add these vehicles to results, avoiding duplicates
            for (const vehicle of vehiclesWithCustomer) {
              if (!resultVehicles.some(v => v.id === vehicle.id)) {
                resultVehicles.push(vehicle);
              }
            }
          }
        }
      }
      
      setVehicles(resultVehicles);
    }
  } catch (error) {
    console.error('Error searching:', error);
  } finally {
    setLoading(false);
  }
};


const handleOpenNewModal = () => {
  setCurrentVehicle(null);
  setSelectedCustomer(null);
  setFormData({
    model: '',
    plate: '',
    customer_id: '',
  });
  setShowModal(true);
};

  const handleEditVehicle = (vehicle) => {
  setCurrentVehicle(vehicle);
  
  // Find the customer if there's a customer_id
  if (vehicle.customer_id) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_URL}/customers/${vehicle.customer_id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.ok) return response.json();
      throw new Error('Failed to fetch customer');
    })
    .then(customer => {
      setSelectedCustomer(customer);
    })
    .catch(error => {
      console.error('Error fetching customer:', error);
    });
  } else {
    setSelectedCustomer(null);
  }
  
  setFormData({
    model: vehicle.model || '',
    plate: vehicle.plate || '',
    customer_id: vehicle.customer_id || '',
  });
  
  setShowModal(true);
};


  const handleCreateJobsheet = async (vehicle) => {
    setCurrentVehicle(vehicle);
    setCompleteJobsheet(null); // Reset at the beginning
    
    // If this is for updating an existing jobsheet, first fetch it
    if (vehicle.last_service) {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      try {
        // Get jobsheets for this vehicle
        const response = await fetch(`${API_URL}/jobsheets?vehicle_id=${vehicle.id}&_sort=date_created&_order=desc&_limit=1`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const jobsheets = await response.json();
          if (jobsheets.length > 0) {
            const jobsheetData = jobsheets[0];
            
            // Also fetch labor tasks for this jobsheet
            try {
              const laborResponse = await fetch(`${API_URL}/labor/jobsheet/${jobsheetData.id}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (laborResponse.ok) {
                const labors = await laborResponse.json();
                
                // Set complete jobsheet data with labors
                setCompleteJobsheet({
                  ...jobsheetData,
                  labors,
                  customer_name: vehicle.customer_name
                });
              }
            } catch (error) {
              console.error(`Error fetching labors for jobsheet:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching jobsheet:', error);
      } finally {
        setLoading(false);
      }
    }
    
    // Always show the modal - either with complete data or as a new jobsheet
    setShowJobsheetModal(true);
  };

 const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData({
    ...formData,
    [name]: value
  });
  setFormChanged(true); // Mark form as changed
};

const handleModalClose = () => {
  if (formChanged) {
    setShowCloseConfirmation(true);
  } else {
    setShowModal(false);
  }
};
  const handleSave = async () => {
  setLoading(true);
  const token = localStorage.getItem('token');
  
  try {
    // Enhanced client-side validations
    if (!formData.model || !formData.model.trim()) {
      throw new Error("Model is required");
    }
    
    if (!formData.plate || !formData.plate.trim()) {
      throw new Error("License plate is required");
    }
    
    // Also check for customer
    if (!formData.customer_id) {
      throw new Error("Please select a customer");
    }
    
    const vehicleData = {
      ...formData,
      type: 'motorcycle' // Always motorcycle
    };
    
    let response;
    if (currentVehicle) {
      // Update existing vehicle
      response = await fetch(`${API_URL}/vehicles/${currentVehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vehicleData)
      });
    } else {
      // Create new vehicle
      response = await fetch(`${API_URL}/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vehicleData)
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save: ${errorText}`);
    }
    
    // Show success toast
    showToast(currentVehicle ? 'Motorcycle updated successfully' : 'Motorcycle added successfully', 'success');
    
    // Reload data
    fetchVehicles();
    setShowModal(false);
  } catch (error) {
    console.error('Error saving vehicle:', error);
    showToast(error.message, 'error');
  } finally {
    setLoading(false);
  }
};
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'in_progress':
        return { bg: '#FFF8E1', text: '#F57C00' };
      case 'pending':
        return { bg: '#f0f0ff', text: '#5932EA' };
      case 'cancelled':
        return { bg: '#FFEBEE', text: '#C62828' };
      default:
        return { bg: '#F5F5F5', text: '#666666' };
    }
  };
  
  const getStatusName = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };



  

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#D9D9D9',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Barra lateral - Ahora responsiva */}
      <div
        style={{
          width: isMobile ? (sidebarOpen ? '250px' : '0px') : '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'width 0.3s ease',
          overflow: 'hidden', // Importante para ocultar contenido cuando width=0
          position: isMobile ? 'fixed' : 'relative',
          zIndex: 1000,
          height: '100%'
        }}
      >
        <SideBar 
          isMobile={isMobile} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />
      </div>

      {/* Contenedor principal */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          boxSizing: 'border-box',
          marginLeft: isMobile ? 0 : '0px',
          transition: 'margin-left 0.3s ease',
          height: '100%',
          overflow: 'auto', // Permite scroll cuando sea necesario
          WebkitOverflowScrolling: 'touch' // Scroll suave en iOS
        }}
      >
        {/* Contenedor de la tabla de vehículos */}
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '30px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            padding: isMobile ? '16px' : '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile && isVertical ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile && isVertical ? 'stretch' : 'center',
              marginBottom: isMobile ? '15px' : '10px',
              gap: isMobile ? '10px' : '0'
            }}
          >
            {isMobile && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px' 
              }}>
                <h2 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px' }}>Motorcycles</h2>
                {isMobile && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#5932EA',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FontAwesomeIcon icon={faBars} size="lg" />
                  </button>
                )}
              </div>
            )}

            {!isMobile && <h2 style={{ margin: 0, fontSize: '18px' }}>Motorcycles</h2>}

            {/* Moved search and add button to a consistent position */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile && isVertical ? 'column' : 'row', 
              gap: '10px',
              alignItems: isMobile && isVertical ? 'stretch' : 'center',
            }}>
              <div style={{ 
                position: 'relative',
                width: isMobile && isVertical ? '100%' : '250px',
              }}>
                <input
                  type="text"
                  placeholder="Search motorcycles or customers..."
                  value={searchTerm}
                  onChange={handleSearch}
                  style={{
                    padding: isMobile ? '12px 35px 12px 12px' : '10px 30px 10px 12px',
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#F9FBFF',
                    fontSize: isMobile ? '16px' : '14px',
                    boxSizing: 'border-box',
                    outline: 'none'
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
                    cursor: 'pointer',
                    fontSize: isMobile ? '18px' : '14px'
                  }}
                />
              </div>

              <button
                onClick={handleOpenNewModal}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                 style={{
                  padding: isMobile ? '14px 20px' : '10px 20px',
                  backgroundColor: isHovered ? '#4321C9' : '#5932EA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: isMobile ? '16px' : 'inherit',
                  width: isMobile && isVertical ? '100%' : 'auto',
                  justifyContent: isMobile && isVertical ? 'center' : 'flex-start'
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add Motorcycle</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <div 
              className="ag-theme-alpine inventory-view touch-enabled-grid" 
              style={{ 
                width: '100%', 
                height: '100%',
                overflowX: 'auto',
                overflowY: 'auto',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.3s ease',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={filteredVehicles}
                columnDefs={getColumnDefs()}
                defaultColDef={{
                  resizable: false,
                  sortable: true,
                  flex: 1,
                  suppressMenu: true,
                  minWidth: isMobile ? 120 : 100,
                  cellClass: isMobile ? 'touch-cell' : ''
                }}
                modules={[ClientSideRowModelModule]}
                pagination={true}
                paginationPageSize={isMobile ? 7 : 12}
                headerHeight={isMobile ? 50 : 30}
                rowHeight={isMobile ? 65 : 50}
                suppressSizeToFit={false}
                suppressHorizontalScroll={false}
              />
            </div>
                    {loading && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(0, 0, 0, 0.1)',
                    borderLeft: '4px solid #4321C9',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                ></div>
              </div>
            )}
          </div>

          {/* Modal for motorcycle details edit/create */}
          {showModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
                backdropFilter: "blur(5px)",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  width: "520px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  overflow: "hidden",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
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
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <FontAwesomeIcon icon={faMotorcycle} style={{ fontSize: '24px' }}/>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                          {currentVehicle ? "Edit Motorcycle" : "Add Motorcycle"}
                        </h2>
                      </div>
                      <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
                        {currentVehicle 
                          ? ` ${currentVehicle.model} (${currentVehicle.year})`
                          : "Add a new motorcycle to the system"}
                      </p>
                    </div>
                    <button
                        onClick={(e) => {
                          e.stopPropagation();
    handleModalClose();
                        }}
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
                        position: "relative",
                        zIndex: 10,   
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
                    >
                      ×
                    </button>
                  </div>
                </div>

             <div style={{ padding: "24px 30px" }}>
  <div style={{ display: "grid", gap: "20px" }}>
    {/* Fix spacing between inputs */}
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
      gap: "30px"  // Increased gap for better separation
    }}>
      <div>
        <label style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#333"
        }}>
          Model
        </label>
        <input
          type="text"
          name="model"
          value={formData.model}
          onChange={handleInputChange}
          placeholder="e.g. GN125, GN150"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid #e0e0e0",
            fontSize: "14px",
            backgroundColor: "#f9faff",
            outline: "none",
            boxSizing: "border-box"  // Added to prevent overflow
          }}
        />
      </div>
      
      <div>
        <label style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#333"
        }}>
          License Plate
        </label>
        <input
          type="text"
          name="plate"
          value={formData.plate}
          onChange={handleInputChange}
          placeholder="e.g. AB1234C"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid #e0e0e0",
            fontSize: "14px",
            backgroundColor: "#f9faff",
            outline: "none",
            boxSizing: "border-box"  // Added to prevent overflow
          }}
        />
      </div>
    </div>

    <div>
        <label style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#333"
        }}>
          Owner (Customer)
        </label>
        <div style={{ 
          position: "relative",
          zIndex: 1050 // Ensure dropdown is above other modal elements
        }}>
          <input
            type="text"
            name="customerSearch"
            value={customerSearch}
            onChange={handleCustomerSearch}
            placeholder="Search customer by name"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid #e0e0e0",
              fontSize: "14px",
              backgroundColor: "#f9faff",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              maxHeight: "200px",
              overflowY: "auto",
              backgroundColor: "white",
              border: "1px solid #e0e0e0",
              borderRadius: "0 0 10px 10px",
              zIndex: 1050,
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
            }}>
              {searchResults.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                    hoverBackgroundColor: "#f9faff"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f9faff"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  {customer.first_name && customer.last_name 
                    ? `${customer.first_name} ${customer.last_name}`
                    : customer.name || `Customer #${customer.id}`}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedCustomer && (
          <div style={{
            marginTop: "8px",
            padding: "8px 12px",
            backgroundColor: "#f0f0ff",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#5932EA"
          }}>
            Selected: {selectedCustomer.first_name && selectedCustomer.last_name 
              ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
              : selectedCustomer.name || `Customer #${selectedCustomer.id}`}
          </div>
        )}
      </div>
    </div>


  <div style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "30px"
  }}>
                    <button
                        onClick={(e) => {
                          e.stopPropagation();
                              handleModalClose();

                        }}
                      style={{
                        padding: "12px 20px",
                        backgroundColor: "#f5f5f5",
                        color: "#333",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s"
                        
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e5e5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: "12px 24px",
                        backgroundColor: "#5932EA",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "600",
                        boxShadow: "0 2px 6px rgba(89, 50, 234, 0.3)",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                      disabled={loading}
                    >
                      {loading ? (
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderTop: "2px solid white",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        ></div>
                      ) : (
                        <FontAwesomeIcon icon={faPlus} />
                      )}
                      {currentVehicle ? "Update Motorcycle" : "Save Motorcycle"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
{showCloseConfirmation && (
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
      zIndex: 1100, // Higher than modal
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        width: isMobile ? "85%" : "400px",
        overflow: "hidden",
        animation: "modalFadeIn 0.3s ease",
      }}
    >
      <div style={{ padding: "24px 30px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>Discard Changes?</h3>
        <p style={{ margin: "0 0 20px 0", color: "#666" }}>
          You have unsaved changes. Are you sure you want to close without saving?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            onClick={() => setShowCloseConfirmation(false)}
            style={{
              padding: "10px 16px",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowCloseConfirmation(false);
              setShowModal(false);
              setFormChanged(false);
            }}
            style={{
              padding: "10px 16px",
              backgroundColor: "#D32F2F",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {toast.visible && (
  <div
    style={{
      position: 'fixed',
      bottom: isMobile ? '40px' : '20px',
      right: '20px',
      zIndex: 2000,
      minWidth: '250px',
      maxWidth: isMobile ? '90%' : '400px',
      backgroundColor: toast.type === 'error' ? '#D32F2F' : '#34A853',
      color: 'white',
      padding: isMobile ? '16px 24px' : '12px 24px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      animation: 'slideIn 0.3s ease'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: isMobile ? '36px' : '24px',
        height: isMobile ? '36px' : '24px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <FontAwesomeIcon 
          icon={toast.type === 'error' ? faTimes : faCheck} 
          style={{ fontSize: isMobile ? '16px' : '12px' }}
        />
      </div>
      <span style={{ fontWeight: '500', fontSize: isMobile ? '16px' : '14px' }}>{toast.message}</span>
    </div>
    <button
      onClick={() => setToast(prev => ({...prev, visible: false}))}
      style={{
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        fontSize: isMobile ? '24px' : '18px',
        opacity: 0.7,
        transition: 'opacity 0.2s',
        width: isMobile ? '44px' : '24px',
        height: isMobile ? '44px' : '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0
      }}
      onMouseOver={(e) => e.currentTarget.style.opacity = 1}
      onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
    >
      ×
    </button>
  </div>
)}

          {/* Service History Modal */}
         {showServiceModal && currentVehicle && (
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
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        width: isMobile ? "95%" : "800px", // Reduce width on mobile
        maxWidth: isMobile ? "500px" : "800px", // Further limit width on mobile
        maxHeight: "85vh",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "modalFadeIn 0.3s ease",
      }}
    >
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
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                        <FontAwesomeIcon icon={faClipboardList} style={{ fontSize: '24px' }}/>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                          Service History
                        </h2>
                      </div>
                      <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
                        {currentVehicle && ` ${currentVehicle.model} - ${currentVehicle.plate}`}
                      </p>
                    </div>
                    <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent event bubbling
                          setShowServiceModal(false);
                        }}
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
                        position: "relative", 
                        zIndex: 10,          
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.3)")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div 
                  style={{ 
                    padding: "24px 30px",
                    overflow: "auto",
                    flexGrow: 1
                  }}
                >
                  {serviceHistory.length === 0 ? (
                    <div style={{ 
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "60px 20px",
                      color: "#8c8c8c",
                      textAlign: "center",
                    }}>
                      <div style={{
                        width: "70px",
                        height: "70px",
                        backgroundColor: "#f0f0ff",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "20px",
                        color: "#5932EA",
                        fontSize: "24px"
                      }}>
                        <FontAwesomeIcon icon={faClipboardList} />
                      </div>
                      <h3 style={{ 
                        margin: "0 0 10px 0",
                        fontWeight: "500",
                        color: "#444",
                        fontSize: "18px"
                      }}>
                        No job sheets found
                      </h3>
                      <p style={{
                        margin: "0",
                        fontSize: "15px",
                        maxWidth: "450px",
                        lineHeight: "1.5"
                      }}>
                        This motorcycle doesn't have any service history records yet. 
                        Create a new job sheet to start tracking repairs and maintenance.
                      </p>
                      
                      <button
                        onClick={() => {
                          setShowServiceModal(false);
                          setShowJobsheetModal(true);
                        }}
                        style={{
                          marginTop: "24px",
                          padding: "12px 20px",
                          backgroundColor: "#5932EA",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 2px 6px rgba(89, 50, 234, 0.2)",
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                        Create Job Sheet
                      </button>
                    </div>
                  ) : (
                    <div>
                      {serviceHistory.map((job, index) => (
                        <div 
                          key={job.id}
                          style={{
                            marginBottom: "20px",
                            borderRadius: "12px",
                            border: "1px solid #eee",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                            backgroundColor: "white",
                            overflow: "hidden"
                          }}
                        >
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            padding: "16px 20px",
                            borderBottom: "1px solid #f0f0f0",
                            backgroundColor: "#f9f9fc"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{
                                width: "40px",
                                height: "40px",
                                backgroundColor: "#f0f0ff",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#5932EA",
                              }}>
                                <FontAwesomeIcon icon={faClipboardList} />
                              </div>
                              <div>
                                <h3 style={{ 
                                  margin: 0, 
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  color: "#333"
                                }}>
                                  Job Sheet #{job.id}
                                </h3>
                                <div style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>
                                  Created: {new Date(job.date_created || job.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{
                                backgroundColor: getStatusColor(job.state).bg,
                                color: getStatusColor(job.state).text,
                                padding: "6px 10px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "500"
                              }}>
                                {getStatusName(job.state)}
                              </span>
                              <div style={{ 
                                fontSize: "16px", 
                                fontWeight: "700",
                                color: "#00C853",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                ${parseFloat(job.total_amount || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ padding: "16px 20px" }}>
                            {/* Labor tasks section */}
                            {job.labors && job.labors.length > 0 && (
                              <div style={{ marginBottom: "16px" }}>
                                <div style={{ 
                                  fontSize: "14px", 
                                  fontWeight: "600", 
                                  marginBottom: "10px",
                                  color: "#555",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}>
                                  <FontAwesomeIcon icon={faTools} style={{ color: "#5932EA", fontSize: "12px" }} />
                                  Services Performed
                                </div>
                                <div style={{ 
                                  backgroundColor: "#f9fafc",
                                  borderRadius: "8px",
                                  marginBottom: "10px"
                                }}>
                                  {job.labors.map((labor, idx) => (
                                    <div 
                                      key={labor.id}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "10px 16px",
                                        borderBottom: idx < job.labors.length - 1 ? "1px solid #f0f0f0" : "none"
                                      }}
                                    >
                                      <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                      }}>
                                        {labor.is_completed === 1 && (
                                          <div style={{
                                            width: "16px",
                                            height: "16px",
                                            borderRadius: "50%",
                                            backgroundColor: "#E8F5E9",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#00C853",
                                            fontSize: "10px"
                                          }}>
                                            <FontAwesomeIcon icon={faCheck} />
                                          </div>
                                        )}
                                        <span>{labor.description}</span>
                                      </div>
                                      <div style={{ 
                                        fontWeight: "500",
                                        color: "#5932EA" 
                                      }}>
                                        ${parseFloat(labor.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #eee",
                  display: "flex",
                  justifyContent: "flex-end"
                }}>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowServiceModal(false)}}
                    style={{
                      padding: "10px 24px",
                      backgroundColor: "#5932EA",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      boxShadow: "0 2px 6px rgba(89, 50, 234, 0.2)",
                      position: "relative",
                      zIndex: 10,   
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4321C9"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5932EA"}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            
          )}
          

          <style>{`
            @keyframes slideIn {
    from { transform: translateX(30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
           @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            
            /* Estilos para dispositivos táctiles */
            .touch-enabled-grid {
              -webkit-overflow-scrolling: touch !important;
              overflow-scrolling: touch !important;
              scroll-behavior: smooth !important;
              overscroll-behavior: contain !important;
            }
            
            .touch-cell {
              padding: 16px 8px !important;
            }
            
            /* Estilos para AG Grid */
            .ag-theme-alpine {
              --ag-header-height: ${isMobile ? "50px" : "30px"};
              --ag-row-height: ${isMobile ? "65px" : "50px"};
              --ag-header-foreground-color: #333;
              --ag-header-background-color: #F9FBFF;
              --ag-odd-row-background-color: #fff;
              --ag-row-border-color: rgba(0, 0, 0, 0.1);
              --ag-cell-horizontal-padding: ${isMobile ? "16px" : "12px"};
              --ag-borders: none;
              --ag-font-size: ${isMobile ? "15px" : "14px"};
              --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            

    
            @media (pointer: coarse) {
              ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              
              ::-webkit-scrollbar-thumb {
                background-color: rgba(89, 50, 234, 0.5);
                border-radius: 6px;
              }
              
              ::-webkit-scrollbar-track {
                background-color: rgba(0, 0, 0, 0.05);
              }
              
              .ag-theme-alpine .ag-header-cell {
                padding: 0 5px !important;
              }
              
              .ag-theme-alpine .ag-cell {
                padding: 10px 5px !important;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default VehiclesPage;

