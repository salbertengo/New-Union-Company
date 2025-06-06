import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Add this snippet to force a default hash route
if (!window.location.hash) {
  window.location.hash = '#/';
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);