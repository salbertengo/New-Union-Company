import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SideBar from './Sidebar';
import { AgGridReact } from 'ag-grid-react';
import { ClientSideRowModelModule } from 'ag-grid-community';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserShield, faSearch, faPlus, faEdit, faTrashAlt, faTimes, faCheck, faKey, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { ActionButton, ActionButtonsContainer } from '../components/common/ActionButtons';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mechanic');
  const [searchTerm, setSearchTerm] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const gridRef = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  const API_URL = process.env.REACT_APP_API_URL;
  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/jobsheets');
    } else {
      fetchUsers();
    }
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ text: 'Failed to load users: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNewModal = () => {
    setCurrentUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('mechanic');
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setCurrentUser(user);
    setName(user.name);
    setUsername(user.username);
    setPassword(''); // Don't show password when editing
    setRole(user.role);
    setShowModal(true);
  };

  const handleOpenDeleteModal = (user) => {
    setCurrentUser(user);
    setShowDeleteModal(true);
  };

  const handleOpenPasswordModal = (user) => {
    setCurrentUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSave = async () => {
    // Simple validation
    if (!name || !username || (!currentUser && !password)) {
      setMessage({ text: 'Please fill all required fields', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = currentUser 
        ? `${API_URL}/users/${currentUser.id}` 
        : `${API_URL}/auth/register`;
      
      const method = currentUser ? 'PUT' : 'POST';
      const body = currentUser 
        ? JSON.stringify({ name, username, role }) 
        : JSON.stringify({ name, username, password, role });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      // Success
      setMessage({ 
        text: currentUser 
          ? `User ${username} updated successfully` 
          : `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`, 
        type: 'success' 
      });
      
      // Close modal and refresh data
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      setMessage({ text: `User ${currentUser.username} deleted successfully`, type: 'success' });
      setShowDeleteModal(false);
      fetchUsers();
    } catch (error) {
      setMessage({ text: 'Failed to delete user: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser || !newPassword) {
      setMessage({ text: 'Please enter a new password', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/${currentUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      if (!response.ok) throw new Error('Failed to update password');
      
      setMessage({ text: `Password updated for ${currentUser.username}`, type: 'success' });
      setShowPasswordModal(false);
    } catch (error) {
      setMessage({ text: 'Failed to update password: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onGridReady = (params) => {
    params.api.sizeColumnsToFit();
  };

  // Column definitions for AG Grid
  const columnDefs = [
    {
      headerName: 'User',
      field: 'name',
      flex: 1.5,
      minWidth: 220,
      cellRenderer: params => {
        if (!params.data) return '';
        return (
          <div className="cell-with-icon">
            <div className="icon-container">
              <FontAwesomeIcon icon={params.data.role === 'admin' ? faUserShield : faUser} />
            </div>
            <div>
              <div className="text-primary">{params.data.name}</div>
              <div className="text-secondary">{params.data.username}</div>
            </div>
          </div>
        );
      },
      headerClass: "custom-header",
    },
    {
      headerName: 'Role',
      field: 'role',
      width: 150,
      cellRenderer: params => {
        if (!params.data) return '';
        const isAdmin = params.data.role === 'admin';
        return (
          <div style={{
            backgroundColor: isAdmin ? '#EDE7F6' : '#E8F5E9',
            color: isAdmin ? '#5932EA' : '#2E7D32',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            display: 'inline-block',
            textTransform: 'capitalize'
          }}>
            {params.data.role}
          </div>
        );
      },
      headerClass: "custom-header",
    },
    {
      headerName: 'Created',
      field: 'created_at',
      width: 150,
      cellRenderer: params => {
        if (!params.data || !params.data.created_at) return '';
        const date = new Date(params.data.created_at);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      },
      headerClass: "custom-header",
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
              icon={faKey}
              onClick={() => handleOpenPasswordModal(params.data)}
              tooltip="Change Password"
              type="warning"
            />
            <ActionButton
              icon={faEdit}
              onClick={() => handleOpenEditModal(params.data)}
              tooltip="Edit User"
              type="default"
            />
            <ActionButton
              icon={faTrashAlt}
              onClick={() => handleOpenDeleteModal(params.data)}
              tooltip="Delete User"
              type="danger"
            />
          </ActionButtonsContainer>
        );
      },
      headerClass: "custom-header",
    }
  ];

  const defaultColDef = {
    resizable: false,
    sortable: true,
    suppressMenu: true,
    flex: 1,
    cellStyle: {
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '12px',
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#333'
    },
    headerClass: 'custom-header'
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
      <div
        style={{
          width: '220px',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <SideBar />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '30px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '18px' }}>User Management</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                }}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={handleSearch}
                    style={{
                      padding: '5px 30px 5px 10px',
                      width: '216px',
                      borderRadius: '10px',
                      border: '1px solid white',
                      backgroundColor: '#F9FBFF',
                      height: '25px',
                    }}
                  />
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: loading ? '#4321C9' : 'gray',
                      cursor: 'pointer',
                    }}
                  />
                </div>
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
                  transition: 'background-color 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add User</span>
              </button>
              
              <button
                onClick={handleLogout}
                style={{
                  padding: '10px 15px',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e5e5';
                  e.currentTarget.style.color = '#333';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.color = '#666';
                }}
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {message.text && (
            <div 
              style={{
                padding: '12px 16px',
                marginBottom: '16px',
                borderRadius: '8px',
                backgroundColor: message.type === 'error' ? '#FEF2F2' : '#ECFDF5',
                color: message.type === 'error' ? '#991B1B' : '#065F46',
                border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#A7F3D0'}`
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ flex: 1, position: 'relative' }}>
            <div 
              className="ag-theme-alpine inventory-view" 
              style={{ 
                width: '100%', 
                height: '100%',
                overflowX: 'hidden',
                overflowY: 'auto',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={filteredUsers}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                modules={[ClientSideRowModelModule]}
                pagination={true}
                paginationPageSize={12}
                headerHeight={30}
                rowHeight={50}
                suppressSizeToFit={true}
                suppressHorizontalScroll={true}
                onGridReady={onGridReady}
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

          {/* Add/Edit User Modal */}
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
                        <FontAwesomeIcon icon={currentUser?.role === 'admin' ? faUserShield : faUser} style={{ fontSize: '24px' }}/>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
                          {currentUser ? "Edit User" : "Add New User"}
                        </h2>
                      </div>
                      <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
                        {currentUser 
                          ? `Update information for ${currentUser.name}`
                          : "Add a new user to the system"}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
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
                    <div>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: "10px",
                          border: "1px solid #e0e0e0",
                          fontSize: "14px",
                          backgroundColor: "#f9faff",
                          outline: "none",
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
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: "10px",
                          border: "1px solid #e0e0e0",
                          fontSize: "14px",
                          backgroundColor: "#f9faff",
                          outline: "none",
                        }}
                      />
                    </div>

                    {!currentUser && (
                      <div>
                        <label style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333"
                        }}>
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          style={{
                            width: "100%",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            border: "1px solid #e0e0e0",
                            fontSize: "14px",
                            backgroundColor: "#f9faff",
                            outline: "none",
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        Role
                      </label>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "10px"
                      }}>
                        {['mechanic', 'admin'].map((r) => (
                          <div 
                            key={r}
                            onClick={() => setRole(r)}
                            style={{
                              padding: "16px",
                              borderRadius: "10px",
                              border: `1px solid ${role === r ? "#5932EA" : "#e0e0e0"}`,
                              backgroundColor: role === r ? "#f5f3ff" : "white",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              transition: "all 0.2s ease",
                            }}
                            onMouseOver={(e) => {
                              if (role !== r) {
                                e.currentTarget.style.backgroundColor = "#f9f9f9";
                                e.currentTarget.style.borderColor = "#d0d0d0";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (role !== r) {
                                e.currentTarget.style.backgroundColor = "white";
                                e.currentTarget.style.borderColor = "#e0e0e0";
                              }
                            }}
                          >
                            <FontAwesomeIcon 
                              icon={r === 'admin' ? faUserShield : faUser} 
                              style={{ 
                                color: role === r ? "#5932EA" : "#666",
                                fontSize: "18px" 
                              }}
                            />
                            <div>
                              <div style={{
                                fontSize: "14px",
                                fontWeight: role === r ? "600" : "500",
                                color: role === r ? "#5932EA" : "#333",
                                textTransform: "capitalize"
                              }}>
                                {r}
                              </div>
                              <div style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "2px"
                              }}>
                                {r === 'admin' ? 'Full system access' : 'Limited permissions'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginTop: "30px"
                  }}>
                    <button
                      onClick={() => setShowModal(false)}
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
                    >
                      <FontAwesomeIcon icon={currentUser ? faCheck : faPlus} />
                      {currentUser ? "Update User" : "Add User"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && currentUser && (
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
                  width: "400px",
                  overflow: "hidden",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #FF4D4F 0%, #D32F2F 100%)",
                    padding: "20px 24px",
                    color: "white",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Delete User</h3>
                </div>
                
                <div style={{ padding: "20px 24px" }}>
                  <p style={{ margin: "0 0 20px 0", fontSize: "14px", lineHeight: "1.5" }}>
                    Are you sure you want to delete the user <strong>{currentUser.name}</strong> ({currentUser.username})?
                    <br /><br />
                    This will remove all user data and cannot be undone.
                  </p>
                  
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#f5f5f5",
                        color: "#333",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e5e5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#FF4D4F",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 6px rgba(255, 77, 79, 0.3)",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#D32F2F"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#FF4D4F"}
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Password Change Modal */}
          {showPasswordModal && currentUser && (
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
                  width: "400px",
                  overflow: "hidden",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  animation: "modalFadeIn 0.3s ease",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
                    padding: "20px 24px",
                    color: "white",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Change Password</h3>
                </div>
                
                <div style={{ padding: "20px 24px" }}>
                  <p style={{ margin: "0 0 20px 0", fontSize: "14px", lineHeight: "1.5" }}>
                    Set a new password for user <strong>{currentUser.name}</strong> ({currentUser.username})
                  </p>
                  
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333"
                    }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "10px",
                        border: "1px solid #e0e0e0",
                        fontSize: "14px",
                        backgroundColor: "#f9faff",
                        outline: "none",
                      }}
                      autoFocus
                    />
                  </div>
                  
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#f5f5f5",
                        color: "#333",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e5e5"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleChangePassword}
                      style={{
                        padding: "10px 16px",
                        backgroundColor: "#FF9800",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 6px rgba(255, 152, 0, 0.3)",
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#F57C00"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#FF9800"}
                    >
                      Update Password
                    </button>
                  </div>
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
            
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            
            /* Uniform styles for AG Grid */
            .ag-theme-alpine {
              --ag-header-height: 30px;
              --ag-row-height: 50px;
              --ag-header-foreground-color: #333;
              --ag-header-background-color: #F9FBFF;
              --ag-odd-row-background-color: #fff;
              --ag-row-border-color: rgba(0, 0, 0, 0.1);
              --ag-cell-horizontal-padding: 12px;
              --ag-borders: none;
              --ag-font-size: 14px;
              --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            
            .ag-theme-alpine .ag-header {
              border-bottom: 1px solid #5932EA;
            }
            
            .ag-theme-alpine .ag-cell {
              display: flex;
              align-items: center;
            }
            
            .custom-header {
              background-color: #F9FBFF !important;
              font-weight: 600 !important;
              color: #333 !important;
              border-bottom: 1px solid #5932EA !important;
              text-align: left !important;
              padding-left: 12px !important;
            }

            /* Estilos para celdas con iconos */
            .cell-with-icon {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .icon-container {
              width: 36px;
              height: 36px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #f0f0ff;
              color: #5932EA;
              flex-shrink: 0;
            }

            .text-primary {
              font-weight: 500;
              color: #292D32;
              font-size: 14px;
            }

            .text-secondary {
              font-size: 12px;
              color: #666;
              margin-top: 2px;
            }
            `}
          </style>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;