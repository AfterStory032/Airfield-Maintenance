import { supabase } from './supabase';
import * as airfieldData from '../data/airfieldData';

/**
 * Migrate mock data to Supabase database
 * This should be run only once when setting up the application
 */
export const migrateDataToSupabase = async () => {
  try {
    console.log('Starting data migration to Supabase...');
    
    // Check if data already exists in the database
    const { data: existingUsers } = await supabase
      .from('users')
      .select('count')
      .single();
      
    if (existingUsers && existingUsers.count > 0) {
      console.log('Data already migrated. Skipping migration.');
      return { success: true, message: 'Data already exists in the database' };
    }
    
    // Migrate users
    if (airfieldData.users && airfieldData.users.length > 0) {
      const formattedUsers = airfieldData.users.map(user => ({
        id: crypto.randomUUID(),
        username: user.username || user.email.split('@')[0],
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }));
      
      const { error: usersError } = await supabase
        .from('users')
        .insert(formattedUsers);
        
      if (usersError) {
        console.error('Error migrating users:', usersError);
      } else {
        console.log(`Migrated ${formattedUsers.length} users`);
      }
    }
    
    // Migrate shifts
    if (airfieldData.shifts && airfieldData.shifts.length > 0) {
      const formattedShifts = airfieldData.shifts.map(shift => ({
        id: shift.id,
        name: shift.name,
        start_time: shift.startTime || '00:00',
        end_time: shift.endTime || '12:00'
      }));
      
      const { error: shiftsError } = await supabase
        .from('shifts')
        .insert(formattedShifts);
        
      if (shiftsError) {
        console.error('Error migrating shifts:', shiftsError);
      } else {
        console.log(`Migrated ${formattedShifts.length} shifts`);
      }
    }
    
    // Migrate maintenance tasks
    if (airfieldData.maintenanceTasks && airfieldData.maintenanceTasks.length > 0) {
      const formattedTasks = airfieldData.maintenanceTasks.map(task => ({
        id: task.id,
        type: task.type || 'corrective',
        area: task.area,
        location: task.location,
        fitting: task.fitting || null,
        fitting_number: task.fittingNumber || null,
        description: task.description,
        status: task.status,
        priority: task.priority || 'medium',
        date_reported: task.dateReported,
        completed_date: task.completedDate || null,
        reported_by: task.reportedBy || task.assignedTo,
        assigned_to: task.assignedTo
      }));
      
      const { error: tasksError } = await supabase
        .from('maintenance_tasks')
        .insert(formattedTasks);
        
      if (tasksError) {
        console.error('Error migrating maintenance tasks:', tasksError);
      } else {
        console.log(`Migrated ${formattedTasks.length} maintenance tasks`);
      }
    }
    
    // Migrate handover notes and their tasks
    if (airfieldData.handoverNotes && airfieldData.handoverNotes.length > 0) {
      for (const note of airfieldData.handoverNotes) {
        const noteId = crypto.randomUUID();
        
        // Insert the handover note
        const { error: noteError } = await supabase
          .from('handover_notes')
          .insert({
            id: noteId,
            shift: note.shift.toLowerCase(),
            date: note.date,
            author: note.author,
            content: note.content
          });
          
        if (noteError) {
          console.error('Error migrating handover note:', noteError);
          continue;
        }
        
        // Insert the note's tasks
        if (note.tasks && note.tasks.length > 0) {
          const formattedTasks = note.tasks.map(task => ({
            handover_id: noteId,
            task_id: task.id,
            status: task.status,
            description: task.description
          }));
          
          const { error: tasksError } = await supabase
            .from('handover_tasks')
            .insert(formattedTasks);
            
          if (tasksError) {
            console.error('Error migrating handover tasks:', tasksError);
          }
        }
      }
      console.log(`Migrated ${airfieldData.handoverNotes.length} handover notes`);
    }
    
    console.log('Data migration completed successfully');
    return { success: true, message: 'Data migration completed successfully' };
  } catch (error) {
    console.error('Error during data migration:', error);
    return { success: false, message: `Error during data migration: ${error.message}` };
  }
};

// Function to check if we're connected to Supabase
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('shifts').select('count').single();
    
    if (error) {
      throw error;
    }
    
    return {
      connected: true,
      message: 'Successfully connected to Supabase'
    };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return {
      connected: false,
      message: `Failed to connect to Supabase: ${error.message}`
    };
  }
};

// Helper function to run data migration from a button click
export const runDataMigration = async () => {
  const result = await migrateDataToSupabase();
  return result;
};