import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Registration() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Valor por defecto
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, role })
      });
      if (!response.ok) throw new Error('Registration failed');

      // Redirige al login después de registrar
      navigate('/login');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5'
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
          width: '300px',
          textAlign: 'center'
        }}
      >
        <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Register</h2>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={handleRegister}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '0.75rem',
            margin: '0.5rem 0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default Registration;