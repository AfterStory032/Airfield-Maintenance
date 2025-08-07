import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { supabase } from '../lib/supabase';
import { fetchMaintenanceTasks, createMaintenanceTask, updateMaintenanceTask } from '../lib/supabaseUtils';

const MaintenanceLogger = () => {
  const { currentUser } = useAuth();
  const { darkMode } = useDarkMode();
  
  // State for daily report
  const [dailyReport, setDailyReport] = useState({
    date: new Date().toISOString().split('T')[0],
    maintenanceType: 'corrective',
    area: '',
    location: '',
    description: '',
    fittings: []
  });
  
  // State for current fitting being added
  const [currentFitting, setCurrentFitting] = useState({
    fitting: '',
    fittingNumber: ''
  });

  const [tasks, setTasks] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Reference data
  const [areas, setAreas] = useState(['Taxiway', 'Runway']);
  const [locations, setLocations] = useState([]);
  const [fittings, setFittings] = useState([]);

  // Load tasks from Supabase
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const { data, error } = await fetchMaintenanceTasks();
        
        if (error) throw error;
        
        if (data) {
          setTasks(data);
        }
      } catch (error) {
        console.error('Error loading maintenance tasks:', error);
        // Fallback to mock data if Supabase fails
        const { maintenanceTasks } = await import('../data/airfieldData');
        setTasks([...maintenanceTasks]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, []);

  // Load location and fitting options based on selected area
  useEffect(() => {
    const loadLocationData = async () => {
      if (!dailyReport.area) {
        setLocations([]);
        setFittings([]);
        return;
      }
      
      try {
        // In a real implementation, fetch from Supabase
        // For now, use our mock data
        const { taxiwayLocations, runwayLocations, taxiwayFittings, runwayFittings } = await import('../data/airfieldData');
        
        if (dailyReport.area === 'Taxiway') {
          setLocations(taxiwayLocations);
          setFittings(taxiwayFittings);
        } else if (dailyReport.area === 'Runway') {
          setLocations(runwayLocations);
          setFittings(runwayFittings);
        }
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };
    
    loadLocationData();
  }, [dailyReport.area]);

  const handleAreaChange = (e) => {
    const newArea = e.target.value;
    setDailyReport({
      ...dailyReport,
      area: newArea,
      location: ''
    });
  };

  const handleLocationChange = (e) => {
    setDailyReport({
      ...dailyReport,
      location: e.target.value
    });
  };

  const handleDescriptionChange = (e) => {
    setDailyReport({
      ...dailyReport,
      description: e.target.value
    });
  };

  const handleMaintenanceTypeChange = (e) => {
    setDailyReport({
      ...dailyReport,
      maintenanceType: e.target.value
    });
  };

  const handleFittingChange = (e) => {
    setCurrentFitting({
      ...currentFitting,
      fitting: e.target.value,
      fittingNumber: ''
    });
  };

  const handleFittingNumberChange = (e) => {
    setCurrentFitting({
      ...currentFitting,
      fittingNumber: e.target.value
    });
  };

  const addFittingToReport = () => {
    if (!currentFitting.fitting) return;

    const newFittings = [...dailyReport.fittings, { ...currentFitting }];
    setDailyReport({
      ...dailyReport,
      fittings: newFittings
    });

    // Reset current fitting
    setCurrentFitting({
      fitting: '',
      fittingNumber: ''
    });
  };

  const removeFittingFromReport = (index) => {
    const updatedFittings = [...dailyReport.fittings];
    updatedFittings.splice(index, 1);
    setDailyReport({
      ...dailyReport,
      fittings: updatedFittings
    });
  };

  const submitDailyReport = async () => {
    // Description is now optional, so only validate area, location, and fittings for corrective maintenance
    if (!dailyReport.area || !dailyReport.location || 
        (dailyReport.maintenanceType === 'corrective' && dailyReport.fittings.length === 0)) {
      setErrorMessage('Please fill all required fields. Description is optional.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    try {
      setLoading(true);
      const now = new Date().toISOString().split('T')[0];
      
      // Prepare task data - note that description is now optional
      // Ensure reported_by is never null
      const taskData = {
        id: `DR-${now}-${Math.floor(Math.random() * 1000)}`,
        type: dailyReport.maintenanceType,
        area: dailyReport.area,
        location: dailyReport.location,
        fitting: dailyReport.fittings.length > 0 ? dailyReport.fittings[0].fitting : null,
        fitting_number: dailyReport.fittings.length > 0 ? dailyReport.fittings[0].fittingNumber : null,
        description: dailyReport.description || '', // Empty string if no description provided
        status: 'Pending',
        priority: dailyReport.maintenanceType === 'corrective' ? 'high' : 'medium',
        date_reported: now,
        reported_by: currentUser?.id || currentUser?.username || currentUser?.name || 'Anonymous User',
        reported_by_name: currentUser?.name || currentUser?.username || 'Anonymous User',
        assigned_to: currentUser?.username || currentUser?.name || 'Unassigned'
      };
      
      console.log('Submitting maintenance task:', taskData);
      
      // Try to create the task in Supabase with direct access
      const { data: newTask, error } = await supabase
        .from('maintenance_tasks')
        .insert(taskData)
        .select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(`Failed to save to Supabase: ${error.message}`);
      }
      
      console.log('Task saved successfully:', newTask);
      
      // Add the new task to our state
      const taskToAdd = Array.isArray(newTask) && newTask.length > 0 ? newTask[0] : {
        ...taskData,
        fittings: dailyReport.fittings
      };
      
      setTasks([taskToAdd, ...tasks]);
      
      // Show success message
      setSuccessMessage('Daily maintenance report saved to Supabase successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // Reset the daily report
      setDailyReport({
        date: new Date().toISOString().split('T')[0],
        maintenanceType: 'corrective',
        area: '',
        location: '',
        description: '',
        fittings: []
      });
    } catch (error) {
      console.error('Error submitting maintenance report:', error);
      setErrorMessage(`Failed to save report to Supabase: ${error.message}`);
      
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompleteTask = async (taskId) => {
    try {
      setLoading(true);
      
      // Try to update task in Supabase
      const { data, error } = await updateMaintenanceTask(taskId, {
        status: 'Completed',
        completed_date: new Date().toISOString().split('T')[0]
      });
      
      if (error) throw error;
      
      // Update in local state regardless
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: 'Completed' } : task
      ));
      
      setSuccessMessage('Task marked as completed!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('Error completing task:', error);
      
      // Update local state anyway as fallback
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: 'Completed' } : task
      ));
      
      setErrorMessage('Failed to update in database, but task is marked completed locally.');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} dark-mode-heading`}>Maintenance Logger</h1>
      
      {/* Daily Maintenance Report Form */}
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-sm`}>
        <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Daily Maintenance Report</h2>
        
        {successMessage && (
          <div className={`mb-4 p-4 ${darkMode ? 'bg-green-800 border-green-600 text-green-100' : 'bg-green-100 border-green-500 text-green-700'} border-l-4`}>
            <p>{successMessage}</p>
          </div>
        )}
        
        {errorMessage && (
          <div className={`mb-4 p-4 ${darkMode ? 'bg-red-800 border-red-600 text-red-100' : 'bg-red-100 border-red-500 text-red-700'} border-l-4`}>
            <p>{errorMessage}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Maintenance Type */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Maintenance Type</label>
            <select
              value={dailyReport.maintenanceType}
              onChange={handleMaintenanceTypeChange}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            >
              <option value="corrective">Corrective Maintenance</option>
              <option value="preventive">Preventive Maintenance</option>
            </select>
          </div>
          
          {/* Area */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Area</label>
            <select
              value={dailyReport.area}
              onChange={handleAreaChange}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            >
              <option value="">Select Area</option>
              {areas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
          
          {/* Location */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location</label>
            <select
              value={dailyReport.location}
              onChange={handleLocationChange}
              disabled={!dailyReport.area}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            >
              <option value="">Select Location</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          
          {/* Date */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Report Date</label>
            <input
              type="date"
              value={dailyReport.date}
              onChange={(e) => setDailyReport({...dailyReport, date: e.target.value})}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            />
          </div>
        </div>
        
        {/* Description - now optional */}
        <div className="mt-6">
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Description <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>(optional)</span>
          </label>
          <textarea
            value={dailyReport.description}
            onChange={handleDescriptionChange}
            rows="3"
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            placeholder="Describe the maintenance task or issue (optional)..."
          ></textarea>
        </div>
        
        {/* Fittings Section */}
        <div className="mt-8">
          <h3 className={`text-md font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>Replaced Fittings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fitting */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Replaced Fitting</label>
              <select
                value={currentFitting.fitting}
                onChange={handleFittingChange}
                disabled={!dailyReport.area}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
              >
                <option value="">Select Fitting</option>
                {fittings.map((fit) => (
                  <option key={fit} value={fit}>{fit}</option>
                ))}
              </select>
            </div>
            
            {/* Fitting Number */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Fitting Number</label>
              <input
                type="text"
                value={currentFitting.fittingNumber}
                onChange={handleFittingNumberChange}
                disabled={!currentFitting.fitting}
                placeholder="e.g., TW-BEL-A2-12"
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
              />
            </div>
            
            {/* Add Fitting Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={addFittingToReport}
                disabled={!currentFitting.fitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Fitting
              </button>
            </div>
          </div>
          
          {/* Fittings List */}
          {dailyReport.fittings.length > 0 && (
            <div className="mt-4">
              <div className={`border ${darkMode ? 'border-gray-700' : 'border-gray-200'} rounded-md overflow-hidden`}>
                <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Fitting</th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Number</th>
                      <th scope="col" className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className={`${darkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
                    {dailyReport.fittings.map((fitting, index) => (
                      <tr key={index} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {fitting.fitting}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {fitting.fittingNumber || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => removeFittingFromReport(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Submit Report Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={submitDailyReport}
            disabled={loading || !dailyReport.area || !dailyReport.location || 
                     (dailyReport.maintenanceType === 'corrective' && dailyReport.fittings.length === 0)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Submit Daily Report'}
          </button>
        </div>
      </div>
      
      {/* Recent Tasks Table */}
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-sm`}>
        <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Recent Maintenance Reports</h2>
        
        {loading && tasks.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>ID</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Type</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Location</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Fittings</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Description</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={`px-6 py-4 text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      No maintenance tasks found.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        #{task.id}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} capitalize`}>
                        {task.type}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {task.area} - {task.location}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {task.fittings ? (
                          <span>{task.fittings.length} fittings</span>
                        ) : (
                          <span>
                            {task.fitting || task.fitting_number}
                            {task.fitting_number && task.fitting && <span className={`block text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{task.fitting_number}</span>}
                          </span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'} max-w-xs truncate`}>
                        {task.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.status === 'Completed' ? 
                              (darkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800') : 
                            task.status === 'In Progress' ? 
                              (darkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800') : 
                            task.status === 'Pending' ? 
                              (darkMode ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800') : 
                              (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className={darkMode ? 'text-indigo-400 hover:text-indigo-300 mr-3' : 'text-indigo-600 hover:text-indigo-900 mr-3'}>
                          View
                        </button>
                        {task.status !== 'Completed' && (
                          <button 
                            onClick={() => handleCompleteTask(task.id)}
                            className={darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceLogger;