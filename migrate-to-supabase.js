import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import * as airfieldData from './src/data/airfieldData.js';

// Initialize the Supabase client with the URL and API key
const supabaseUrl = 'https://oxevsbsomwmdopguggbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZXZzYnNvbXdtZG9wZ3VnZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjE5MzUsImV4cCI6MjA2ODIzNzkzNX0.ng3Cm9lYE5NuKOADLoI4ORbnJxrZXZhV0Q5D6dYxIj0';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create database schema from SQL file
 */
async function setupDatabaseSchema() {
  try {
    console.log('Setting up database schema...');
    
    // Read schema SQL from file
    const schemaSQL = fs.readFileSync('./setup-supabase-schema.sql', 'utf8');
    
    // Split SQL by semicolons to execute each statement separately
    // This is a workaround since Supabase REST API has limitations with multiple statements
    const sqlStatements = schemaSQL
      .replace(/BEGIN;|COMMIT;/g, '')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i] + ';';
      console.log(`Executing SQL statement ${i + 1}/${sqlStatements.length}...`);
      
      try {
        // Execute each statement separately
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.error('Statement was:', statement);
          // Continue with next statement instead of stopping
        }
      } catch (stmtError) {
        console.error(`Exception executing statement ${i + 1}:`, stmtError);
        // Continue with next statement
      }
    }
    
    console.log('Database schema setup completed');
    return true;
  } catch (error) {
    console.error('Error setting up database schema:', error);
    return false;
  }
}

/**
 * Migrate mock data to Supabase database
 */
async function migrateDataToSupabase() {
  try {
    console.log('Starting data migration to Supabase...');
    
    // Check if data already exists in the database
    let { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('count');
      
    if (checkError) {
      console.error('Error checking for existing users:', checkError);
      console.log('Attempting to create schema first...');
      
      const schemaCreated = await setupDatabaseSchema();
      if (!schemaCreated) {
        console.error('Failed to create schema. Aborting migration.');
        return { success: false, message: 'Failed to create schema' };
      }
      
      // Try checking for users again
      ({ data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('count'));
        
      if (checkError) {
        console.error('Still cannot access users table after schema creation:', checkError);
        return { success: false, message: 'Cannot access users table after schema creation' };
      }
    }
    
    if (existingUsers && existingUsers.length > 0 && existingUsers[0].count > 0) {
      console.log('Data already exists in the database. Count:', existingUsers[0].count);
      console.log('Proceeding with migration to ensure all data is present...');
    }
    
    // Migrate users
    if (airfieldData.users && airfieldData.users.length > 0) {
      console.log('Migrating users...');
      const formattedUsers = airfieldData.users.map(user => ({
        id: uuidv4(), 
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        avatar: user.avatar || null,
        password: user.password || null  // Store password for development only
      }));
      
      for (const user of formattedUsers) {
        console.log(`Processing user: ${user.username}`);
        
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('username', user.username)
          .maybeSingle();
          
        if (existingUser) {
          console.log(`User ${user.username} already exists, updating...`);
          const { error: updateError } = await supabase
            .from('users')
            .update(user)
            .eq('username', user.username);
            
          if (updateError) {
            console.error(`Error updating user ${user.username}:`, updateError);
          } else {
            console.log(`User ${user.username} updated successfully`);
          }
        } else {
          console.log(`User ${user.username} does not exist, inserting...`);
          const { error: insertError } = await supabase
            .from('users')
            .insert([user]);
            
          if (insertError) {
            console.error(`Error inserting user ${user.username}:`, insertError);
          } else {
            console.log(`User ${user.username} inserted successfully`);
          }
        }
        
        // Add permissions for the user
        if (user.permissions && user.permissions.length > 0) {
          const { error: deleteError } = await supabase
            .from('permissions')
            .delete()
            .eq('user_id', user.id);
            
          if (deleteError) {
            console.warn(`Error deleting permissions for user ${user.username}:`, deleteError);
          }
          
          const permissions = user.permissions.map(permission => ({
            user_id: user.id,
            permission
          }));
          
          const { error: permError } = await supabase
            .from('permissions')
            .insert(permissions);
            
          if (permError) {
            console.error(`Error inserting permissions for user ${user.username}:`, permError);
          } else {
            console.log(`Added ${permissions.length} permissions for user ${user.username}`);
          }
        }
      }
    }
    
    // Migrate areas
    if (airfieldData.areas && airfieldData.areas.length > 0) {
      console.log('Migrating areas...');
      const formattedAreas = airfieldData.areas.map(area => ({
        id: area.id,
        name: area.name
      }));
      
      for (const area of formattedAreas) {
        const { error: areaError } = await supabase
          .from('areas')
          .upsert([area], { onConflict: 'id' });
          
        if (areaError) {
          console.error(`Error upserting area ${area.name}:`, areaError);
        }
      }
      console.log(`Migrated ${formattedAreas.length} areas`);
    }
    
    // Migrate shifts
    if (airfieldData.shifts && airfieldData.shifts.length > 0) {
      console.log('Migrating shifts...');
      const formattedShifts = airfieldData.shifts.map(shift => ({
        id: shift.id,
        name: shift.name,
        start_time: shift.startTime || '00:00',
        end_time: shift.endTime || '12:00'
      }));
      
      for (const shift of formattedShifts) {
        const { error: shiftError } = await supabase
          .from('shifts')
          .upsert([shift], { onConflict: 'id' });
          
        if (shiftError) {
          console.error(`Error upserting shift ${shift.name}:`, shiftError);
        }
      }
      console.log(`Migrated ${formattedShifts.length} shifts`);
    }
    
    // Migrate maintenance tasks
    if (airfieldData.maintenanceTasks && airfieldData.maintenanceTasks.length > 0) {
      console.log('Migrating maintenance tasks...');
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
        scheduled_date: task.scheduledDate || null,
        reported_by: task.reportedBy || task.assignedTo,
        assigned_to: task.assignedTo
      }));
      
      for (const task of formattedTasks) {
        const { error: taskError } = await supabase
          .from('maintenance_tasks')
          .upsert([task], { onConflict: 'id' });
          
        if (taskError) {
          console.error(`Error upserting task ${task.id}:`, taskError);
        }
      }
      console.log(`Migrated ${formattedTasks.length} maintenance tasks`);
    }
    
    // Migrate handover notes and their tasks
    if (airfieldData.handoverNotes && airfieldData.handoverNotes.length > 0) {
      console.log('Migrating handover notes...');
      for (const note of airfieldData.handoverNotes) {
        const noteId = note.id ? note.id.toString() : uuidv4();
        
        // Insert the handover note
        const { error: noteError } = await supabase
          .from('handover_notes')
          .upsert([{
            id: noteId,
            shift: note.shift.toLowerCase(),
            date: note.date,
            author: note.author,
            content: note.content
          }], { onConflict: 'id' });
          
        if (noteError) {
          console.error(`Error upserting handover note ${noteId}:`, noteError);
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
          
          for (const task of formattedTasks) {
            const { error: taskError } = await supabase
              .from('handover_tasks')
              .upsert([task], { onConflict: ['handover_id', 'task_id'] });
              
            if (taskError) {
              console.error(`Error upserting handover task:`, taskError);
            }
          }
        }
      }
      console.log(`Migrated ${airfieldData.handoverNotes.length} handover notes`);
    }
    
    // Check the final status
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('*');
      
    if (finalError) {
      console.error('Error checking final state:', finalError);
      return { success: false, message: `Error during final check: ${finalError.message}` };
    }
    
    console.log(`Final state: ${finalUsers.length} users in the database`);
    if (finalUsers.length > 0) {
      console.log('Sample users:');
      finalUsers.forEach(user => {
        console.log(`- ${user.username} (${user.email}), role: ${user.role}`);
      });
    }
    
    console.log('Data migration completed successfully');
    return { success: true, message: 'Data migration completed successfully', users: finalUsers };
  } catch (error) {
    console.error('Error during data migration:', error);
    return { success: false, message: `Error during data migration: ${error.message}` };
  }
}

// Run the migration
console.log('Starting migration process...');

migrateDataToSupabase().then(result => {
  console.log('Migration result:', result);
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
