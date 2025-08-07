import React, { useState, useEffect } from 'react';
import AreaChartComponent from './charts/AreaChart';
import LineChartComponent from './charts/LineChart';
import StatsCard from './StatsCard';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { supabase } from '../lib/supabase';
import { checkSupabaseConnection, runDataMigration } from '../lib/dbSetup';
import { setupSupabaseData } from '../lib/supabaseSetup';

const Dashboard = () => {
  const { user, currentUser } = useAuth();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [taskCompletionData, setTaskCompletionData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  // Check if user is admin - using both methods for compatibility
  const isAdmin = (currentUser?.user_metadata?.role === 'admin' || user?.role === 'admin');

  // Format current datetime
  useEffect(() => {
    const now = new Date();
    const options = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    setLastUpdated(now.toLocaleDateString('en-US', options));
  }, []);

  // Check Supabase connection and fetch data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Check Supabase connection
        const connectionResult = await checkSupabaseConnection();
        setConnectionStatus(connectionResult);
        
        if (!connectionResult.connected) {
          throw new Error('Not connected to Supabase');
        }
        
        // Try to fetch stats
        let statsData;
        try {
          const { data, error } = await supabase
            .from('stats')
            .select('*');
          
          if (error) throw error;
          statsData = data;
        } catch (statsError) {
          console.warn('Stats table might not exist yet:', statsError);
          // We'll use mock data below if this fails
        }
        
        // Try to fetch task completion stats
        let taskCompletionStats;
        try {
          const { data, error } = await supabase
            .from('task_completion_stats')
            .select('*')
            .order('month');
          
          if (error) throw error;
          taskCompletionStats = data;
        } catch (taskStatsError) {
          console.warn('Task completion stats table might not exist yet:', taskStatsError);
          // We'll use mock data below if this fails
        }
        
        // Fetch maintenance tasks - This should work as we set up this table
        const { data: maintenanceTasks, error: tasksError } = await supabase
          .from('maintenance_tasks')
          .select('*')
          .order('date_reported', { ascending: false })
          .limit(5);
        
        if (tasksError) throw tasksError;
        
        // Use the data we got, or fallback to mock data for missing pieces
        if (statsData && taskCompletionStats && maintenanceTasks) {
          // Transform stats data to match component props
          const formattedStats = statsData.map(stat => ({
            title: stat.title,
            value: stat.value,
            change: stat.change,
            trend: stat.trend,
            icon: {
              path: stat.icon_path,
              bgColor: stat.icon_bg_color
            }
          }));
          
          setStats(formattedStats);
          setTaskCompletionData(taskCompletionStats);
          setTasks(maintenanceTasks);
        } else {
          // Load mock data for what we couldn't get
          const { 
            airfieldStats, 
            maintenanceTasks: mockTasks, 
            taskCompletionStats: mockCompletionStats 
          } = await import('../data/airfieldData');
          
          setStats(airfieldStats);
          setTaskCompletionData(mockCompletionStats);
          setTasks(maintenanceTasks || mockTasks.slice(0, 5));
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        // If Supabase fetch fails, load mock data as fallback
        const { 
          airfieldStats, 
          maintenanceTasks: mockTasks, 
          taskCompletionStats: mockCompletionStats 
        } = await import('../data/airfieldData');
        
        setStats(airfieldStats);
        setTaskCompletionData(mockCompletionStats);
        setTasks(mockTasks.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);
  
  // Handler to run data migration
  const handleMigration = async () => {
    try {
      setMigrationStatus({ status: 'loading', message: 'Running data migration...' });
      const result = await runDataMigration();
      setMigrationStatus({ 
        status: result.success ? 'success' : 'error', 
        message: result.message 
      });
      
      // Refresh the page after successful migration
      if (result.success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setMigrationStatus({ 
        status: 'error', 
        message: `Migration failed: ${error.message}` 
      });
    }
  };
  
  // Handler to set up initial users and data in Supabase
  const handleUserSetup = async () => {
    try {
      setMigrationStatus({ status: 'loading', message: 'Setting up initial users and data...' });
      const result = await setupSupabaseData();
      setMigrationStatus({ 
        status: result.success ? 'success' : 'error', 
        message: result.message 
      });
      
      // Refresh the page after successful setup
      if (result.success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setMigrationStatus({ 
        status: 'error', 
        message: `User setup failed: ${error.message}` 
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Airfield Maintenance Dashboard</h1>
          <p className="text-lg text-indigo-600 dark:text-indigo-400">Welcome back, {currentUser?.name || user?.email?.split('@')[0] || 'User'}!</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Last updated: {lastUpdated}</div>
      </div>
      
      {/* Supabase Connection Status - Only visible to admins */}
      {isAdmin && connectionStatus && (
        <div className={`p-4 rounded-lg ${connectionStatus.connected ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-100' : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100'} flex items-center justify-between`}>
          <div>
            <p className="font-medium">{connectionStatus.connected ? 'Connected to Supabase' : 'Not connected to Supabase'}</p>
            <p className="text-sm">{connectionStatus.message}</p>
          </div>
          
          {connectionStatus.connected && (
            <div className="flex space-x-2">
              <button 
                onClick={handleUserSetup}
                disabled={migrationStatus?.status === 'loading'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrationStatus?.status === 'loading' ? 'Setting up...' : 'Setup Users and Data'}
              </button>
              <button 
                onClick={handleMigration}
                disabled={migrationStatus?.status === 'loading'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrationStatus?.status === 'loading' ? 'Migrating Data...' : 'Migrate Mock Data to Supabase'}
              </button>
              <button 
                onClick={async () => {
                  try {
                    setMigrationStatus({ status: 'loading', message: 'Adding shift support to database...' });
                    const response = await fetch('/workspace/airfield/setup-user-shifts-schema.sql');
                    const sqlScript = await response.text();
                    const { error } = await supabase.rpc('exec_sql', { sql: sqlScript });
                    
                    if (error) throw error;
                    
                    setMigrationStatus({ 
                      status: 'success', 
                      message: 'User shifts schema successfully updated in Supabase!' 
                    });
                    
                    // Refresh after success
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  } catch (error) {
                    setMigrationStatus({ 
                      status: 'error', 
                      message: `Failed to update shifts schema: ${error.message}` 
                    });
                  }
                }}
                disabled={migrationStatus?.status === 'loading'}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrationStatus?.status === 'loading' ? 'Updating Schema...' : 'Add Shift Support'}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Migration Status - Only visible to admins */}
      {isAdmin && migrationStatus && (
        <div className={`p-4 rounded-lg ${
          migrationStatus.status === 'success' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-100' : 
          migrationStatus.status === 'error' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100' :
          'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-100'
        }`}>
          <p className="font-medium">
            {migrationStatus.status === 'success' ? 'Migration Successful' : 
             migrationStatus.status === 'error' ? 'Migration Failed' : 'Migration in Progress'}
          </p>
          <p className="text-sm">{migrationStatus.message}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatsCard 
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
                icon={stat.icon}
              />
            ))}
          </div>
          
          {/* Active Runways Status */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Active Runways</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Runway</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Inspection</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Conditions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">Runway 30R</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Today, 08:30</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Good</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">Runway 12L</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Limited</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Today, 07:20</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Minor Repairs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Recent Tasks and Activity */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Recent Maintenance Tasks</h2>
              <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">View all</a>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Task</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned To</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tasks.length > 0 ? tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        {task.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.location || `${task.area} - ${task.location}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                              task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : 
                              task.priority === 'medium' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}
                        >
                          {task.priority && task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                              task.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.assigned_to || task.assignedTo}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Recent Notifications</h2>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                <li className="py-3">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <span className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <svg className="h-5 w-5 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">Critical issue reported on Runway 30R</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                </li>
                <li className="py-3">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <span className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <svg className="h-5 w-5 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">Task #MT007 marked as completed</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">4 hours ago</p>
                    </div>
                  </div>
                </li>
                <li className="py-3">
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <span className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">New preventive maintenance scheduled</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Yesterday</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;