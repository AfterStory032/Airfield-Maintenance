import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { supabase } from '../lib/supabase';
import { fetchHandoverNotes, createHandoverNote, fetchShifts } from '../lib/supabaseUtils';

const HandoverNotes = ({ currentShift }) => {
  const { currentUser } = useAuth();
  const { darkMode } = useDarkMode();
  const [allNotes, setAllNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [taskId, setTaskId] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState('In Progress');
  const [tasks, setTasks] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch shifts
        const { data: shiftsData, error: shiftsError } = await fetchShifts();
        if (shiftsError) throw shiftsError;
        setShifts(shiftsData);
        
        // Fetch handover notes
        const { data: notesData, error: notesError } = await fetchHandoverNotes();
        if (notesError) throw notesError;
        
        // Fetch the associated tasks for each note
        const notesWithTasks = await Promise.all(
          notesData.map(async (note) => {
            const { data: tasks, error: tasksError } = await supabase
              .from('handover_tasks')
              .select(`
                handover_id,
                task_id,
                status,
                description,
                maintenance_tasks(id, type, description)
              `)
              .eq('handover_id', note.id);
            
            if (tasksError) {
              console.error('Error fetching tasks for note:', tasksError);
              return { ...note, tasks: [] };
            }
            
            // Format tasks for display
            const formattedTasks = tasks.map(task => ({
              id: task.task_id,
              status: task.status,
              description: task.description || (task.maintenance_tasks?.description || '')
            }));
            
            return { ...note, tasks: formattedTasks };
          })
        );
        
        setAllNotes(notesWithTasks);
        setFilteredNotes(notesWithTasks);
      } catch (error) {
        console.error('Error loading handover notes data:', error);
        // If Supabase fetch fails, use mock data as fallback
        const { handoverNotes, shifts: mockShifts } = await import('../data/airfieldData');
        setAllNotes(handoverNotes);
        setFilteredNotes(handoverNotes);
        setShifts(mockShifts);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let results = [...allNotes];
    
    // Apply shift filter
    if (filterShift) {
      results = results.filter(note => 
        note.shift.toLowerCase() === filterShift.toLowerCase()
      );
    }
    
    // Apply date range filter
    if (filterDateFrom) {
      results = results.filter(note => 
        new Date(note.date) >= new Date(filterDateFrom)
      );
    }
    
    if (filterDateTo) {
      results = results.filter(note => 
        new Date(note.date) <= new Date(filterDateTo)
      );
    }
    
    // Apply search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(note => 
        note.content.toLowerCase().includes(lowerSearchTerm) || 
        note.author.toLowerCase().includes(lowerSearchTerm) || 
        note.tasks?.some(task => 
          task.id.toLowerCase().includes(lowerSearchTerm) || 
          task.description.toLowerCase().includes(lowerSearchTerm)
        )
      );
    }
    
    setFilteredNotes(results);
  }, [allNotes, searchTerm, filterShift, filterDateFrom, filterDateTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newNote.trim()) return;
    
    try {
      // Get shift name from current shift if provided
      const shiftName = shifts.find(s => s.id === currentShift)?.name.split(' ')[0] || 'Current';
      
      // Prepare handover note data
      const handoverNoteData = {
        shift: currentShift || shifts[0]?.id,
        date: selectedDate,
        author: currentUser.username,
        content: newNote
      };
      
      // Use supabaseUtils to create handover note with tasks
      const { data: newNote, error } = await createHandoverNote(
        handoverNoteData, 
        tasks.map(task => ({
          id: task.id,
          status: task.status,
          description: task.description
        }))
      );
      
      if (error) throw error;
      
      // Format the new note like the others for state update
      const formattedNote = {
        ...newNote[0],
        tasks: [...tasks]
      };
      
      // Update local state
      const updatedNotes = [formattedNote, ...allNotes];
      setAllNotes(updatedNotes);
      setFilteredNotes(updatedNotes);
      
      // Reset form
      setNewNote('');
      setTasks([]);
      
      setSuccessMessage('Handover note added successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error submitting handover note:', error);
      setSuccessMessage('Failed to save handover note. Please try again.');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
  };
  
  const addTask = () => {
    if (!taskId.trim() || !taskDescription.trim()) return;
    
    const newTask = {
      id: taskId,
      status: taskStatus,
      description: taskDescription
    };
    
    setTasks([...tasks, newTask]);
    setTaskId('');
    setTaskDescription('');
    setTaskStatus('In Progress');
  };
  
  const removeTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterShift('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} dark-mode-heading`}>Handover Notes</h1>
      
      {/* Create Note Form */}
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-sm`}>
        <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Create New Handover Note</h2>
        
        {successMessage && (
          <div className={`mb-4 p-4 ${
            successMessage.includes('Failed') 
              ? (darkMode ? 'bg-red-800 border-red-600 text-red-100' : 'bg-red-100 border-red-500 text-red-700')
              : (darkMode ? 'bg-green-800 border-green-600 text-green-100' : 'bg-green-100 border-green-500 text-green-700')
            } border-l-4`}>
            <p>{successMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Note Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Note Content</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows="4"
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
              placeholder="Enter your shift handover notes here..."
              required
            ></textarea>
          </div>
          
          {/* Add Tasks Section */}
          <div className="mt-6">
            <h3 className={`text-md font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Related Tasks</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ticket ID</label>
                <input
                  type="text"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
                  placeholder="e.g., T-1234"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <div className="mt-1 flex">
                  <input
                    type="text"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className={`block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-l-md`}
                    placeholder="Brief task description"
                  />
                  <button
                    type="button"
                    onClick={addTask}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            
            {/* Task List */}
            {tasks.length > 0 && (
              <div className="mt-2 mb-4">
                <ul className={`divide-y ${darkMode ? 'divide-gray-600 border-gray-600' : 'divide-gray-200 border-gray-200'} border rounded-md`}>
                  {tasks.map((task, index) => (
                    <li key={index} className={`p-3 flex justify-between items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      <div>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{task.id}</span>
                        <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>- {task.description}</span>
                        <span 
                          className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.status === 'Completed' ? (darkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800') : 
                              task.status === 'In Progress' ? (darkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800') : 
                              task.status === 'Scheduled' ? (darkMode ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-800') : 
                              (darkMode ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800')}`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className={darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={!newNote.trim()}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${darkMode ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Submit Handover Note
            </button>
          </div>
        </form>
      </div>
      
      {/* Search and Filters */}
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-sm`}>
        <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>Search & Filter</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in notes, tasks..."
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Shift</label>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            >
              <option value="">All Shifts</option>
              {shifts.map(shift => (
                <option key={shift.id} value={shift.name.toLowerCase()}>{shift.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md`}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={clearFilters}
            className={`px-4 py-2 border text-sm font-medium rounded-md ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Existing Notes */}
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-sm`}>
        <h2 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>
          Previous Handover Notes 
          <span className="ml-2 text-sm font-normal text-gray-500">({filteredNotes.length} results)</span>
        </h2>
        
        {filteredNotes.length === 0 ? (
          <div className={`p-4 rounded-md ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-500'} text-center`}>
            No handover notes found matching your criteria.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredNotes.map((note) => {
              // Find shift name from shifts array
              const shiftName = shifts.find(s => s.id === note.shift)?.name || note.shift;
              
              return (
                <div key={note.id} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {shiftName} Shift - {new Date(note.date).toLocaleDateString()}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>By {note.author}</p>
                    </div>
                    <span className={`${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} px-2 py-1 text-xs rounded-full`}>
                      #{typeof note.id === 'string' && note.id.includes('-') ? note.id.split('-')[0] : note.id}
                    </span>
                  </div>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>{note.content}</p>
                  
                  {/* Related Tasks */}
                  {note.tasks && note.tasks.length > 0 && (
                    <div className="mt-2">
                      <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-700'} mb-2`}>Related Tasks:</h4>
                      <ul className="space-y-1">
                        {note.tasks.map((task, idx) => (
                          <li key={idx} className="text-sm">
                            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{task.id}</span>: {task.description}{" "}
                            <span 
                              className={`px-1.5 py-0.5 text-xs rounded-full 
                                ${task.status === 'Completed' ? (darkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800') : 
                                  task.status === 'In Progress' ? (darkMode ? 'bg-blue-800 text-blue-100' : 'bg-blue-100 text-blue-800') : 
                                  task.status === 'Scheduled' ? (darkMode ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-800') : 
                                  (darkMode ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800')}`}
                            >
                              {task.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HandoverNotes;