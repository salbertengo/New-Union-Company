import React from 'react';
import CustomersView from './customerView';
import SideBar from './Sidebar';

const CustomersPage = ({ onLogout }) => {
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
      {/* Barra lateral */}
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

      {/* Contenedor principal */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
      

        {/* Main Content */}
        <div className="dashboard-content"
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <CustomersView />
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;