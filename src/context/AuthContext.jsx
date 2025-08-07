import React, { createContext, useState, useEffect, useContext } from 'react';
import { loginWithEmailPassword, getCurrentUser, logout as supabaseLogout } from '../lib/supabaseAuth';
import { ensureAdminRights } from '../lib/adminOverride';

// Create Auth Context
export const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          // Apply admin rights override if needed
          const userWithCorrectRights = ensureAdminRights(currentUser);
          setUser(userWithCorrectRights);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setError("Failed to verify authentication status");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if username is an email
      const isEmail = username.includes('@');
      const email = isEmail ? username : `${username}@airport.com`;
      
      // Try to log in with Supabase
      const user = await loginWithEmailPassword(email, password);
      
      if (user) {
        // Apply admin rights override if needed
        const userWithCorrectRights = ensureAdminRights(user);
        setUser(userWithCorrectRights);
        return userWithCorrectRights;
      }
      return null;
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid username or password");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await supabaseLogout();
      setUser(null);
      return true;
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to logout");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update user function
  const updateUser = (userData) => {
    setUser(prev => ({
      ...prev,
      ...userData
    }));
  };

  // Auth context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    setUser: updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth
export const useAuth = () => useContext(AuthContext);
