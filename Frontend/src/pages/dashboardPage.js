import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardView from './dashboardView';
import SideBar from './Sidebar';

const DashboardPage = () => {
  const navigate = useNavigate();

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
      {/* Sidebar */}
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

      {/* Main container */}
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
          <DashboardView />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;