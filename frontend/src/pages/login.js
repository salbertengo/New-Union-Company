import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    // Validation
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      
      if (!success) {
        setError('Invalid username or password');
      }
      // If successful, the redirect will happen automatically via protected routes
    } catch (error) {
      setError('An error occurred during login');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
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
        <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Login</h2>
        
        {error && (
          <div style={{ 
            color: 'white', 
            backgroundColor: '#ff4d4f',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '1rem' 
          }}>
            {error}
          </div>
        )}
        
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          style={{
            padding: '0.75rem',
            margin: '0.5rem 0',
            width: '100%',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            padding: '0.75rem',
            margin: '0.5rem 0',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'default' : 'pointer',
            width: '100%'
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  );
};

export default Login;