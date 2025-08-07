import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, error: authError } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Update login error from auth context
  useEffect(() => {
    if (authError) {
      setLoginError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    if (!username || !password) {
      setLoginError('Username and password are required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Try to login
      const user = await login(username, password);
      
      if (!user) {
        setLoginError('Invalid username or password');
      } else {
        console.log('Login successful:', user);
        // Navigate after successful login
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="w-full max-w-md">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
          <div className="text-center mb-8 flex flex-col items-center">
            <img 
              src="/assets/images/company-logo.jpg" 
              alt="BAC Logo" 
              className="h-16 w-auto mb-4" 
            />
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Airfield Maintenance
            </h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-2`}>
              Bahrain Airport Company
            </p>
          </div>
          
          {loginError && (
            <div className={`${darkMode ? 'bg-red-900 bg-opacity-30 text-red-300' : 'bg-red-50 text-red-800'} p-3 rounded mb-6 text-sm`}>
              <strong>Error:</strong> {loginError}
              {username === 'admin' && password === 'Mo3ed032' && (
                <p className="mt-2">
                  Note: If you're trying to use mock data, make sure the database has been properly initialized.
                </p>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-semibold mb-2`}>
                Username or Email
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  darkMode 
                    ? 'border-gray-700 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter your username or email"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-semibold mb-2`}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  darkMode 
                    ? 'border-gray-700 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button
              type="submit"
              className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
