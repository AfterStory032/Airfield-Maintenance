import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MaintenanceLogger from './components/MaintenanceLogger';
import Schedule from './components/Schedule';
import HandoverNotes from './components/HandoverNotes';
import AutocadMap from './components/AutocadMap';
import UserManagement from './components/UserManagement';
import RoleManagementTool from './components/RoleManagementTool';
import AuthDebugger from './components/AuthDebugger';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Login from './components/Login';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';

// Protected route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return null; // Or a loading spinner
  }
  
  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

const MainLayout = () => {
  const [currentShift, setCurrentShift] = useState('morning');
  const { darkMode } = useDarkMode();
  const location = useLocation();
  
  // Extract the current page from the URL path
  const currentPath = location.pathname.substring(1) || 'dashboard';

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <Header currentShift={currentShift} setCurrentShift={setCurrentShift} />
      <div className="flex flex-1">
        <Sidebar activePage={currentPath} />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/maintenance" element={<MaintenanceLogger />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/handover" element={<HandoverNotes currentShift={currentShift} />} />
            <Route path="/autocad" element={<AutocadMap />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/role-management" element={<RoleManagementTool />} />
            <Route path="/auth-debug" element={<AuthDebugger />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
};

const MainApp = () => {
  const { loading, isAuthenticated } = useAuth();
  const { darkMode } = useDarkMode();
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;