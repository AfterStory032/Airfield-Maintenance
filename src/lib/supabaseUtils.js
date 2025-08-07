import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetch maintenance tasks with optional filters
 * @param {Object} filters - Optional filters for the query
 * @param {number} limit - Optional limit for number of records to return
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchMaintenanceTasks = async (filters = {}, limit = 50) => {
  try {
    console.log('Fetching from maintenance_tasks table with filters:', filters);
    let query = supabase
      .from('maintenance_tasks')
      .select('*')
      .order('date_reported', { ascending: false });
    
    // Apply any filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.area) {
      query = query.eq('area', filters.area);
    }
    
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error in fetchMaintenanceTasks:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error);
    return { data: null, error };
  }
};

/**
 * Create a new maintenance task
 * @param {Object} taskData - Task data to create
 * @returns {Promise<{data: Array, error: Error}>} - The creation result
 */
export const createMaintenanceTask = async (taskData) => {
  try {
    console.log('Creating maintenance task with data:', taskData);
    
    // Generate an ID if not provided
    if (!taskData.id) {
      taskData.id = `TASK-${Date.now()}`;
    }
    
    // Use only the clean maintenance_tasks table (no app_ prefix)
    console.log('Saving to maintenance_tasks table');
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .insert([taskData])
      .select();
    
    if (error) {
      console.error('Failed to save to maintenance_tasks:', error);
      throw new Error(`Failed to save to maintenance_tasks: ${error.message}`);
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating maintenance task:', error);
    return { data: null, error };
  }
};

/**
 * Update an existing maintenance task
 * @param {string} taskId - ID of the task to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Array, error: Error}>} - The update result
 */
export const updateMaintenanceTask = async (taskId, updates) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .update(updates)
      .eq('id', taskId)
      .select();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating maintenance task:', error);
    return { data: null, error };
  }
};

/**
 * Delete a maintenance task
 * @param {string} taskId - ID of the task to delete
 * @returns {Promise<{data: Array, error: Error}>} - The deletion result
 */
export const deleteMaintenanceTask = async (taskId) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting maintenance task:', error);
    return { data: null, error };
  }
};

/**
 * Fetch handover notes
 * @param {Object} filters - Optional filters for the query
 * @param {number} limit - Optional limit for number of records to return
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchHandoverNotes = async (filters = {}, limit = 20) => {
  try {
    let query = supabase
      .from('handover_notes')
      .select('*')
      .order('date', { ascending: false });
    
    // Apply any filters
    if (filters.shift) {
      query = query.eq('shift', filters.shift);
    }
    
    if (filters.author) {
      query = query.eq('author', filters.author);
    }
    
    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo);
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching handover notes:', error);
    return { data: null, error };
  }
};

/**
 * Create a new handover note with associated tasks
 * @param {Object} noteData - Handover note data
 * @param {Array} tasks - Associated tasks
 * @returns {Promise<{data: Array, error: Error}>} - The creation result
 */
export const createHandoverNote = async (noteData, tasks = []) => {
  try {
    // Start a transaction
    const { data, error } = await supabase.rpc('create_handover_with_tasks', {
      note_data: {
        id: uuidv4(),
        shift: noteData.shift,
        date: noteData.date,
        author: noteData.author,
        content: noteData.content
      },
      tasks_data: tasks.map(task => ({
        task_id: task.id,
        status: task.status,
        description: task.description
      }))
    });
    
    if (error) throw error;
    
    // Return the created handover note
    return { data, error: null };
  } catch (error) {
    console.error('Error creating handover note:', error);
    
    // Try a simpler approach if RPC fails
    try {
      const noteId = uuidv4();
      
      // Insert the handover note
      const { data: insertedNote, error: noteError } = await supabase
        .from('handover_notes')
        .insert([{
          id: noteId,
          shift: noteData.shift,
          date: noteData.date,
          author: noteData.author,
          content: noteData.content
        }])
        .select();
      
      if (noteError) throw noteError;
      
      // Insert each task associated with the note
      if (tasks.length > 0) {
        const tasksToInsert = tasks.map(task => ({
          handover_id: noteId,
          task_id: task.id,
          status: task.status,
          description: task.description
        }));
        
        const { error: tasksError } = await supabase
          .from('handover_tasks')
          .insert(tasksToInsert);
        
        if (tasksError) throw tasksError;
      }
      
      return { data: insertedNote, error: null };
    } catch (fallbackError) {
      console.error('Fallback error creating handover note:', fallbackError);
      return { data: null, error: fallbackError };
    }
  }
};

/**
 * Fetch shifts information
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchShifts = async () => {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('id');
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return { data: null, error };
  }
};

/**
 * Fetch areas
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchAreas = async () => {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('id');
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching areas:', error);
    return { data: null, error };
  }
};

/**
 * Fetch locations for an area
 * @param {string} areaId - The area ID to filter locations by
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchLocations = async (areaId) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('area_id', areaId)
      .order('name');
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching locations:', error);
    return { data: null, error };
  }
};

/**
 * Fetch fittings for an area
 * @param {string} areaId - The area ID to filter fittings by
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchFittings = async (areaId) => {
  try {
    const { data, error } = await supabase
      .from('fittings')
      .select('*')
      .eq('area_id', areaId)
      .order('name');
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching fittings:', error);
    return { data: null, error };
  }
};

/**
 * Save a maintenance report to Supabase
 * @param {Object} reportData - The report data to save
 * @returns {Promise<{data: Object, error: Error}>} - The save result
 */
export const saveMaintenanceReport = async (reportData) => {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare report object for saving
    const reportToSave = {
      title: reportData.title,
      report_type: reportData.reportType,
      date_range: reportData.dateRange,
      area: reportData.area,
      user_id: user ? user.id : null,
      report_data: reportData.data,
      csv_data: reportData.csvData || null
    };
    
    // Save report to Supabase
    const { data, error } = await supabase
      .from('maintenance_reports')
      .insert([reportToSave])
      .select();
    
    if (error) {
      console.error('Failed to save maintenance report:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error saving maintenance report:', error);
    return { data: null, error };
  }
};

/**
 * Fetch saved maintenance reports
 * @param {Object} filters - Optional filters for the query
 * @param {number} limit - Optional limit for number of records to return
 * @returns {Promise<{data: Array, error: Error}>} - The query result
 */
export const fetchMaintenanceReports = async (filters = {}, limit = 20) => {
  try {
    let query = supabase
      .from('maintenance_reports')
      .select('*')
      .order('date_generated', { ascending: false });
    
    // Apply any filters
    if (filters.reportType) {
      query = query.eq('report_type', filters.reportType);
    }
    
    if (filters.area && filters.area !== 'all') {
      query = query.eq('area', filters.area);
    }
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching maintenance reports:', error);
    return { data: null, error };
  }
};