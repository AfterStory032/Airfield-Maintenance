import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as airfieldData from './src/data/airfieldData.js';

// Initialize the Supabase client with the URL and API key
const supabaseUrl = 'https://oxevsbsomwmdopguggbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZXZzYnNvbXdtZG9wZ3VnZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjE5MzUsImV4cCI6MjA2ODIzNzkzNX0.ng3Cm9lYE5NuKOADLoI4ORbnJxrZXZhV0Q5D6dYxIj0';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migrate mock data to Supabase database
 */
async function migrateDataToSupabase() {
  try {
    console.log('Starting data migration to Supabase...');
    
    // Create tables if they don't exist
    await createTables();
    
    // Migrate users
    await migrateUsers();
    
    // Migrate areas
    await migrateAreas();
    
    // Migrate shifts
    await migrateShifts();
    
    // Migrate maintenance tasks
    await migrateTasks();
    
    // Migrate handover notes
    await migrateHandoverNotes();
    
    // Check final status
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('*');
      
    if (finalError) {
      console.error('Error checking final state:', finalError);
      return { success: false, message: `Error during final check: ${finalError.message}` };
    }
    
    console.log(`Final state: ${finalUsers ? finalUsers.length : 0} users in the database`);
    if (finalUsers && finalUsers.length > 0) {
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

async function createTables() {
  console.log('Creating database tables if they don\'t exist...');
  
  // Users table
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'technician', 'inspector', 'viewer')),
      avatar TEXT,
      password TEXT
    );
  `;
  
  // Permissions table
  const createPermissionsTable = `
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) NOT NULL,
      permission TEXT NOT NULL
    );
  `;
  
  // Shifts table
  const createShiftsTable = `
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );
  `;
  
  // Areas table
  const createAreasTable = `
    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `;
  
  // Maintenance tasks table
  const createMaintenanceTasksTable = `
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('corrective', 'preventive', 'predictive', 'safety', 'regulatory')),
      area TEXT NOT NULL,
      location TEXT NOT NULL,
      fitting TEXT,
      fitting_number TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Scheduled')),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      date_reported TEXT NOT NULL,
      completed_date TEXT,
      scheduled_date TEXT,
      reported_by TEXT NOT NULL,
      assigned_to TEXT NOT NULL
    );
  `;
  
  // Handover notes table
  const createHandoverNotesTable = `
    CREATE TABLE IF NOT EXISTS handover_notes (
      id UUID PRIMARY KEY,
      shift TEXT NOT NULL,
      date TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `;
  
  // Handover tasks table
  const createHandoverTasksTable = `
    CREATE TABLE IF NOT EXISTS handover_tasks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      handover_id UUID REFERENCES handover_notes(id) NOT NULL,
      task_id TEXT REFERENCES maintenance_tasks(id) NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `;
  
  // Create each table
  const tables = [
    { name: 'users', sql: createUsersTable },
    { name: 'permissions', sql: createPermissionsTable },
    { name: 'shifts', sql: createShiftsTable },
    { name: 'areas', sql: createAreasTable },
    { name: 'maintenance_tasks', sql: createMaintenanceTasksTable },
    { name: 'handover_notes', sql: createHandoverNotesTable },
    { name: 'handover_tasks', sql: createHandoverTasksTable }
  ];
  
  for (const table of tables) {
    console.log(`Creating ${table.name} table if it doesn't exist...`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      if (error) {
        console.error(`Error creating ${table.name} table:`, error);
      } else {
        console.log(`${table.name} table created or already exists`);
      }
    } catch (err) {
      console.error(`Exception creating ${table.name} table:`, err);
    }
  }
}

async function migrateUsers() {
  console.log('Migrating users...');
  if (!airfieldData.users || airfieldData.users.length === 0) {
    console.log('No users to migrate');
    return;
  }
  
  for (const user of airfieldData.users) {
    const userId = uuidv4();
    console.log(`Processing user: ${user.username}`);
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', user.username)
      .maybeSingle();
      
    if (existingUser) {
      console.log(`User ${user.username} already exists, skipping...`);
      continue;
    }
    
    // Insert user
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        avatar: user.avatar || null,
        password: user.password || null
      });
      
    if (insertError) {
      console.error(`Error inserting user ${user.username}:`, insertError);
    } else {
      console.log(`User ${user.username} inserted successfully`);
      
      // Add permissions for the user
      if (user.permissions && user.permissions.length > 0) {
        const permissions = user.permissions.map(permission => ({
          user_id: userId,
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
}

async function migrateAreas() {
  console.log('Migrating areas...');
  if (!airfieldData.areas || airfieldData.areas.length === 0) {
    console.log('No areas to migrate');
    return;
  }
  
  for (const area of airfieldData.areas) {
    const { error: areaError } = await supabase
      .from('areas')
      .insert({
        id: area.id,
        name: area.name
      })
      .onConflict('id')
      .ignore();
      
    if (areaError) {
      console.error(`Error inserting area ${area.name}:`, areaError);
    } else {
      console.log(`Area ${area.name} inserted or already exists`);
    }
  }
}

async function migrateShifts() {
  console.log('Migrating shifts...');
  if (!airfieldData.shifts || airfieldData.shifts.length === 0) {
    console.log('No shifts to migrate');
    return;
  }
  
  for (const shift of airfieldData.shifts) {
    const { error: shiftError } = await supabase
      .from('shifts')
      .insert({
        id: shift.id,
        name: shift.name,
        start_time: '00:00',
        end_time: '12:00'
      })
      .onConflict('id')
      .ignore();
      
    if (shiftError) {
      console.error(`Error inserting shift ${shift.name}:`, shiftError);
    } else {
      console.log(`Shift ${shift.name} inserted or already exists`);
    }
  }
}

async function migrateTasks() {
  console.log('Migrating maintenance tasks...');
  if (!airfieldData.maintenanceTasks || airfieldData.maintenanceTasks.length === 0) {
    console.log('No maintenance tasks to migrate');
    return;
  }
  
  for (const task of airfieldData.maintenanceTasks) {
    const { error: taskError } = await supabase
      .from('maintenance_tasks')
      .insert({
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
      })
      .onConflict('id')
      .ignore();
      
    if (taskError) {
      console.error(`Error inserting task ${task.id}:`, taskError);
    } else {
      console.log(`Task ${task.id} inserted or already exists`);
    }
  }
}

async function migrateHandoverNotes() {
  console.log('Migrating handover notes...');
  if (!airfieldData.handoverNotes || airfieldData.handoverNotes.length === 0) {
    console.log('No handover notes to migrate');
    return;
  }
  
  for (const note of airfieldData.handoverNotes) {
    const noteId = uuidv4();
    
    // Insert handover note
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
      console.error(`Error inserting handover note:`, noteError);
      continue;
    } else {
      console.log(`Handover note for ${note.date} by ${note.author} inserted successfully`);
    }
    
    // Insert associated tasks
    if (note.tasks && note.tasks.length > 0) {
      for (const task of note.tasks) {
        const { error: taskError } = await supabase
          .from('handover_tasks')
          .insert({
            handover_id: noteId,
            task_id: task.id,
            status: task.status,
            description: task.description
          });
          
        if (taskError) {
          console.error(`Error inserting handover task ${task.id}:`, taskError);
        } else {
          console.log(`Handover task ${task.id} inserted successfully`);
        }
      }
    }
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
