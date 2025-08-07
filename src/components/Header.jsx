import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import ProfileEditor from './profile/ProfileEditor';

const Header = ({ currentShift, setCurrentShift }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const shifts = [
    { id: 'morning', name: 'Morning Shift' },
    { id: 'night', name: 'Night Shift' },
  ];

  const handleProfileClick = () => {
    setShowProfileEditor(true);
    setShowProfileMenu(false);
  };

  return (
    <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <img 
                src="/assets/images/company-logo.jpg" 
                alt="BAC Logo" 
                className="h-8 w-auto mr-3" 
              />
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Airfield Maintenance
              </h1>
            </div>
          </div>
          {user && (
            <div className="flex items-center">
              {/* Shift Selector */}
              <div className="mr-4">
                <label 
                  htmlFor="shift" 
                  className={`text-sm mb-1 block font-medium ${
                    darkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  Current Shift
                </label>
                <select
                  id="shift"
                  name="shift"
                  className={`block w-full pl-3 pr-10 py-2 text-base border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-400 focus:border-indigo-400' 
                      : 'bg-white border-gray-300 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500'
                  } focus:outline-none sm:text-sm rounded-md`}
                  value={currentShift}
                  onChange={(e) => setCurrentShift(e.target.value)}
                >
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                className={`p-1 rounded-full ${
                  darkMode 
                    ? 'text-gray-200 hover:text-white bg-gray-700 hover:bg-gray-600' 
                    : 'text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                <span className="sr-only">View notifications</span>
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              
              {/* Dark Mode Toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`ml-3 p-1 rounded-full ${
                  darkMode 
                    ? 'text-yellow-300 hover:text-yellow-200 bg-gray-700 hover:bg-gray-600' 
                    : 'text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Profile dropdown */}
              <div className="ml-3 relative">
                <div>
                  <button
                    type="button"
                    className="rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    id="user-menu"
                    aria-expanded="false"
                    aria-haspopup="true"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt="Profile" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
                
                {/* Dropdown menu */}
                {showProfileMenu && (
                  <div
                    className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ring-1 ${
                      darkMode 
                        ? 'bg-gray-800 ring-gray-600' 
                        : 'bg-white ring-black ring-opacity-5'
                    } focus:outline-none z-10`}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu"
                  >
                    <div className={`px-4 py-2 text-sm border-b ${
                      darkMode 
                        ? 'text-white border-gray-700' 
                        : 'text-gray-800 border-gray-200'
                    }`}>
                      <p className="font-medium">{user.email?.split('@')[0] || 'User'}</p>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{user.email}</p>
                    </div>
                    <button
                      type="button"
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      role="menuitem"
                      onClick={handleProfileClick}
                    >
                      Edit Profile Picture
                    </button>
                    <a
                      href="#"
                      className={`block px-4 py-2 text-sm ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      role="menuitem"
                    >
                      Settings
                    </a>
                    <button
                      type="button"
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        darkMode 
                          ? 'text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      role="menuitem"
                      onClick={logout}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor onClose={() => setShowProfileEditor(false)} />
      )}
    </header>
  );
};

export default Header;