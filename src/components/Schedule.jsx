import React, { useState } from 'react';
import { maintenanceTasks, shifts } from '../data/airfieldData';
import { useAuth } from '../context/AuthContext';
import UploadExcelModal from './UploadExcelModal';

// Extended shift options
const EXTENDED_SHIFTS = [
  { id: 'shiftA', name: 'Shift A' },
  { id: 'shiftB', name: 'Shift B' },
  { id: 'shiftC', name: 'Shift C' },
  { id: 'shiftD', name: 'Shift D' }
];

const Schedule = () => {
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importedTasks, setImportedTasks] = useState([]);
  const { currentUser } = useAuth();

  // Check if user is admin
  const isAdmin = currentUser?.user_metadata?.role === 'admin';

  // Generate dates for week/month view
  const generateDates = () => {
    const dates = [];
    const firstDay = new Date(currentDate);
    
    if (viewMode === 'week') {
      // Set to Monday of current week
      const day = firstDay.getDay();
      const diff = firstDay.getDate() - day + (day === 0 ? -6 : 1);
      firstDay.setDate(diff);
      
      // Generate 7 days (Monday to Sunday)
      for (let i = 0; i < 7; i++) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() + i);
        dates.push(date);
      }
    } else if (viewMode === 'month') {
      // Set to first day of month
      firstDay.setDate(1);
      
      // Get the month's total days
      const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);
      const daysInMonth = lastDay.getDate();
      
      // Generate all days in the month
      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() + i);
        dates.push(date);
      }
    }
    
    return dates;
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowTaskForm(true);
  };
  
  const handleCloseForm = () => {
    setShowTaskForm(false);
    setSelectedTask(null);
  };
  
  // Handle imported Excel data
  const handleImportData = (importData) => {
    const { shift, data } = importData;
    
    try {
      const newTasks = data.map((row, index) => {
        // Convert Excel dates to JavaScript Date objects if needed
        let taskDate;
        if (row.Date) {
          // Check if the date is in Excel numeric format
          if (typeof row.Date === 'number') {
            taskDate = new Date(Math.round((row.Date - 25569) * 86400 * 1000));
          } else {
            // Try to parse string date
            taskDate = new Date(row.Date);
          }
        } else {
          // If no date specified, use current date
          taskDate = new Date();
        }

        // Determine which shift to assign based on the row or assigned shift
        let assignedShift = row.Shift || shift;

        return {
          id: `import-${Date.now()}-${index}`,
          description: row.Description || row.Task || row.MaintenanceTask || 'Maintenance Task',
          area: row.Area || row.Location || 'General',
          location: row.Location || row.Area || 'General Area',
          priority: row.Priority?.toLowerCase() || 'medium',
          status: row.Status || 'Pending',
          assignedTo: row.AssignedTo || row.Assignee || EXTENDED_SHIFTS.find(s => s.id === assignedShift)?.name || 'Unassigned',
          type: row.Type || 'preventive',
          scheduledDate: taskDate.toISOString().split('T')[0],
          shift: assignedShift,
          date: taskDate,
          formattedDate: taskDate.toISOString().split('T')[0]
        };
      });

      // Update state with the imported tasks
      setImportedTasks([...importedTasks, ...newTasks]);
      
      // Success notification
      alert(`Successfully processed ${newTasks.length} maintenance tasks and assigned to ${EXTENDED_SHIFTS.find(s => s.id === shift)?.name}.`);
      
    } catch (error) {
      console.error('Error processing Excel data:', error);
      alert('Error processing Excel data. Please check the format.');
    }
  };

  // Convert tasks to schedule-friendly format
  const getScheduledTasks = () => {
    // Combine original tasks with imported tasks
    const allTasks = [...maintenanceTasks, ...importedTasks];

    return allTasks.map(task => {
      const dateStr = task.scheduledDate || task.dateReported;
      return {
        ...task,
        date: new Date(dateStr),
        formattedDate: dateStr
      };
    });
  };
  
  const tasks = getScheduledTasks();
  const dates = generateDates();
  
  // Format the view title (e.g., "July 2025" or "July 8-14, 2025")
  const formatViewTitle = () => {
    if (viewMode === 'month') {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
    } else if (viewMode === 'week') {
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      const startMonth = startDate.getMonth();
      const endMonth = endDate.getMonth();
      
      if (startMonth === endMonth) {
        return `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(startDate)} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
      } else {
        return `${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(startDate)} ${startDate.getDate()} - ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(endDate)} ${endDate.getDate()}, ${startDate.getFullYear()}`;
      }
    }
  };
  
  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.formattedDate);
      return taskDate.getDate() === date.getDate() && 
             taskDate.getMonth() === date.getMonth() && 
             taskDate.getFullYear() === date.getFullYear();
    });
  };
  
  // Determine if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white dark-mode-heading">Preventive Maintenance Schedule</h1>
      
      {/* Calendar Controls */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex space-x-2">
          <button 
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm rounded-md ${viewMode === 'week' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            Week
          </button>
          <button 
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 text-sm rounded-md ${viewMode === 'month' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            Month
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button onClick={handlePrevious} className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">{formatViewTitle()}</h2>
          <button onClick={handleNext} className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setSelectedDate(new Date());
              setShowTaskForm(true);
            }}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Schedule
            </button>
          )}
        </div>
      </div>
      
      {/* Calendar View */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Day Labels */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 text-center bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={i} className="py-2 font-medium text-gray-500 dark:text-gray-300">
                {day}
              </div>
            ))}
          </div>
        )}
        
        {/* Calendar Grid */}
        <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'} divide-x divide-y dark:divide-gray-600`}>
          {dates.map((date, i) => {
            const dateStr = date.getDate();
            const tasksForDate = getTasksForDate(date);
            
            return (
              <div 
                key={i} 
                className={`min-h-[120px] p-2 ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${isToday(date) ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {dateStr}
                  </span>
                  {viewMode === 'month' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  {tasksForDate.slice(0, 3).map((task, idx) => (
                    <div 
                      key={idx}
                      className={`text-xs p-1 rounded ${
                        task.priority === 'critical' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                        task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' :
                        task.priority === 'medium' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' : 
                        'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                        setShowTaskForm(true);
                      }}
                    >
                      <div className="font-medium truncate">{task.description}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{task.location}</div>
                      {task.shift && (
                        <div className="text-xs mt-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 px-1 rounded inline-block">
                          {EXTENDED_SHIFTS.find(s => s.id === task.shift)?.name || task.shift}
                        </div>
                      )}
                    </div>
                  ))}
                  {tasksForDate.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{tasksForDate.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                {selectedTask ? 'Task Details' : 'Schedule New Task'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedTask ? (
                // View Task Details
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Area</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.area}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">{selectedTask.priority}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.status}</p>
                    </div>
                    {selectedTask.shift && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Assigned Shift</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {EXTENDED_SHIFTS.find(s => s.id === selectedTask.shift)?.name || selectedTask.shift}
                        </p>
                      </div>
                    )}
                    {selectedTask.fitting && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Fitting</p>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.fitting}</p>
                        </div>
                        {selectedTask.fittingNumber && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Fitting Number</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.fittingNumber}</p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">{selectedTask.type}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{selectedTask.description}</p>
                  </div>
                  
                  <div className="mt-6 flex space-x-4">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                      Edit Task
                    </button>
                    
                    {selectedTask.status !== 'Completed' && (
                      <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // New Task Form
                <form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Type</label>
                      <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="corrective">Corrective Maintenance</option>
                        <option value="preventive">Preventive Maintenance</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Area</label>
                      <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Select Area</option>
                        <option value="taxiway">Taxiway</option>
                        <option value="runway">Runway</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule Date</label>
                      <input 
                        type="date"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" 
                        defaultValue={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shift</label>
                      <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {EXTENDED_SHIFTS.map((shift) => (
                          <option key={shift.id} value={shift.id}>{shift.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                      <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                      <input 
                        type="text"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" 
                        placeholder="Enter name or team"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea 
                      rows="3"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      placeholder="Describe the maintenance task..."
                    ></textarea>
                  </div>
                  
                  <div className="mt-6">
                    <button 
                      type="button"
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Schedule Task
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Excel Upload Modal */}
      <UploadExcelModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
        onImport={handleImportData} 
      />
    </div>
  );
};

export default Schedule;