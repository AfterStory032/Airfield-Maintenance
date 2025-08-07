import React, { useState } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import ProfileEditor from './profile/ProfileEditor';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  // Local state for form handling
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskAssignments: true,
    criticalIssues: true,
    dailySummary: false,
    maintenanceUpdates: true
  });
  
  const [displaySettings, setDisplaySettings] = useState({
    compactView: false,
    showStatusColors: true,
    largeText: false,
    highContrast: false
  });
  
  const [language, setLanguage] = useState('english');
  const [savedMessage, setSavedMessage] = useState('');

  // Handler for notification settings changes
  const handleNotificationChange = (event) => {
    const { name, checked } = event.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Handler for display settings changes
  const handleDisplayChange = (event) => {
    const { name, checked } = event.target;
    setDisplaySettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Save settings handler
  const handleSaveSettings = (e) => {
    e.preventDefault();
    
    // Save settings to localStorage for persistence
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    localStorage.setItem('displaySettings', JSON.stringify(displaySettings));
    localStorage.setItem('language', language);
    
    setSavedMessage('Settings saved successfully!');
    setTimeout(() => setSavedMessage(''), 3000);
  };
  
  const resetSettings = () => {
    setNotificationSettings({
      emailNotifications: true,
      taskAssignments: true,
      criticalIssues: true,
      dailySummary: false,
      maintenanceUpdates: true
    });
    
    setDisplaySettings({
      compactView: false,
      showStatusColors: true,
      largeText: false,
      highContrast: false
    });
    
    setLanguage('english');
    
    // Also clear from localStorage
    localStorage.removeItem('notificationSettings');
    localStorage.removeItem('displaySettings');
    localStorage.removeItem('language');
    
    setSavedMessage('Settings reset to defaults');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // Load settings from localStorage on component mount
  React.useEffect(() => {
    try {
      const savedNotificationSettings = localStorage.getItem('notificationSettings');
      const savedDisplaySettings = localStorage.getItem('displaySettings');
      const savedLanguage = localStorage.getItem('language');
      
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings));
      }
      
      if (savedDisplaySettings) {
        setDisplaySettings(JSON.parse(savedDisplaySettings));
      }
      
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error("Error loading settings from localStorage", error);
    }
  }, []);

  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg shadow-md p-6`}>
      <h1 className="text-2xl font-bold mb-6">User Settings</h1>
      
      {savedMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{savedMessage}</span>
        </div>
      )}
      
      <form onSubmit={handleSaveSettings}>
        {/* User Profile Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">User Profile</h2>
          <div className="flex items-center mb-6">
            <div className="h-20 w-20 rounded-full mr-4 overflow-hidden relative group cursor-pointer" 
                onClick={() => setShowProfileEditor(true)}>
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.name} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-300 text-gray-600 text-xl font-bold">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-lg font-medium">{user?.name}</p>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{user?.email}</p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} capitalize`}>{user?.role}</p>
              <button 
                type="button" 
                className="mt-2 px-4 py-1 text-sm text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 hover:text-indigo-800 dark:hover:bg-indigo-900 dark:hover:text-indigo-200"
                onClick={() => setShowProfileEditor(true)}
              >
                Change Profile Picture
              </button>
            </div>
          </div>
        </div>
        
        {/* Appearance Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Appearance</h2>
          
          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={darkMode} 
                  onChange={toggleDarkMode}
                />
                <div className={`block w-14 h-8 rounded-full ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${darkMode ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div className="ml-3">
                Dark Mode
              </div>
            </label>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Enable dark mode to reduce eye strain in low-light environments
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="compactView"
                  checked={displaySettings.compactView}
                  onChange={handleDisplayChange}
                />
                <span className="ml-2">Compact View</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="showStatusColors"
                  checked={displaySettings.showStatusColors}
                  onChange={handleDisplayChange}
                />
                <span className="ml-2">Status Color Indicators</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="largeText"
                  checked={displaySettings.largeText}
                  onChange={handleDisplayChange}
                />
                <span className="ml-2">Larger Text Size</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="highContrast"
                  checked={displaySettings.highContrast}
                  onChange={handleDisplayChange}
                />
                <span className="ml-2">High Contrast Mode</span>
              </label>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Interface Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`block w-full md:w-1/3 rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} shadow-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              <option value="english">English</option>
              <option value="arabic">Arabic (العربية)</option>
            </select>
          </div>
        </div>
        
        {/* Notification Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Notification Preferences</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="emailNotifications"
                  checked={notificationSettings.emailNotifications}
                  onChange={handleNotificationChange}
                />
                <span className="ml-2">Email Notifications</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="taskAssignments"
                  checked={notificationSettings.taskAssignments}
                  onChange={handleNotificationChange}
                />
                <span className="ml-2">Task Assignments</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="criticalIssues"
                  checked={notificationSettings.criticalIssues}
                  onChange={handleNotificationChange}
                />
                <span className="ml-2">Critical Issues</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="dailySummary"
                  checked={notificationSettings.dailySummary}
                  onChange={handleNotificationChange}
                />
                <span className="ml-2">Daily Summary Reports</span>
              </label>
            </div>
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-indigo-600 h-5 w-5 rounded"
                  name="maintenanceUpdates"
                  checked={notificationSettings.maintenanceUpdates}
                  onChange={handleNotificationChange}
                />
                <span className="ml-2">Maintenance Updates</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Security Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Security</h2>
          
          <div className="mb-4">
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm font-medium`}
            >
              Change Password
            </button>
          </div>
          
          <div>
            <button
              type="button"
              className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm font-medium`}
            >
              Two-Factor Authentication
            </button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={resetSettings}
            className={`px-6 py-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-sm font-medium`}
          >
            Reset to Default
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            Save Changes
          </button>
        </div>
      </form>

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor onClose={() => setShowProfileEditor(false)} />
      )}
    </div>
  );
};

export default Settings;