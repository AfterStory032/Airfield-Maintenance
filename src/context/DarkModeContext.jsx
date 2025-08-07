import React, { createContext, useState, useContext, useEffect } from 'react';

// Create a context for dark mode
const DarkModeContext = createContext();

// Custom hook to use the dark mode context
export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

// Provider component that wraps the app
export const DarkModeProvider = ({ children }) => {
  // Check for saved theme preference or system preference
  const getSavedTheme = () => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      return JSON.parse(savedTheme);
    }
    // If no saved preference, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  // State to track dark mode - default to true for dark mode
  const [darkMode, setDarkMode] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    setDarkMode(getSavedTheme());
  }, []);

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    // Apply or remove dark mode class from document body
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Context value
  const value = {
    darkMode,
    toggleDarkMode
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};

export default DarkModeProvider;