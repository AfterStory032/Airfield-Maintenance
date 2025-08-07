import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';

const Sidebar = ({ activePage }) => {
  const { user, isAuthenticated } = useAuth();
  const { darkMode } = useDarkMode();
  const location = useLocation();
  
  const menuItems = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      permission: null // Everyone can access
    },
    { 
      id: 'maintenance', 
      name: 'Maintenance', 
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      permission: 'view_tasks'
    },
    { 
      id: 'autocad', 
      name: 'AutoCAD Map', 
      icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      permission: 'view_maps'
    },
    { 
      id: 'schedule', 
      name: 'Preventive Maintenance Schedule', 
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      permission: null
    },
    { 
      id: 'handover', 
      name: 'Handover Notes', 
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      permission: null
    },
    { 
      id: 'reports', 
      name: 'Reports', 
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      permission: 'generate_reports'
    },
    { 
      id: 'users', 
      name: 'User Management', 
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      permission: 'all' // Admin only
    },
    { 
      id: 'auth-debug', 
      name: 'Auth Debugger', 
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      permission: 'all' // Admin only - debugging tool
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      permission: null
    },
  ];

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (item.permission === null) return true; // Everyone can access
    if (user && user.role === 'admin') return true; // Admin can access everything
    // For simplicity, let's assume all authenticated users can access everything except admin features
    return item.permission !== 'all';
  });

  return (
    <aside className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm w-64 hidden md:block border-r`}>
      <div className="p-6">
        {user && (
          <div className={`flex items-center mb-6 pb-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="mr-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {user.email?.split('@')[0] || 'User'}
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} capitalize`}>
                {user.role || 'user'}
              </p>
            </div>
          </div>
        )}

        <nav className="mt-4">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/${item.id === 'dashboard' ? '' : item.id}`}
                  className={`flex items-center px-4 py-3 text-sm rounded-md ${
                    activePage === item.id || (activePage === '' && item.id === 'dashboard')
                      ? darkMode 
                        ? 'bg-indigo-700 text-white' 
                        : 'bg-indigo-100 text-indigo-800'
                      : darkMode
                        ? 'text-gray-200 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 mr-3 ${
                      activePage === item.id || (activePage === '' && item.id === 'dashboard')
                        ? darkMode 
                          ? 'text-white' 
                          : 'text-indigo-600'
                        : darkMode
                          ? 'text-gray-400'
                          : 'text-gray-500'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;