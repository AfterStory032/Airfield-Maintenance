import { supabase } from './supabase';

/**
 * Create initial users in Supabase with proper permissions
 */
export const setupSupabaseUsers = async () => {
  try {
    console.log('Setting up initial users in Supabase...');
    
    // Check if users already exist
    const { data: existingUsers, error: userCheckError } = await supabase
      .from('users')
      .select('count')
      .single();
      
    if (userCheckError) {
      console.error('Error checking users:', userCheckError);
      return { success: false, message: `Error checking users: ${userCheckError.message}` };
    }
    
    if (existingUsers && existingUsers.count > 0) {
      console.log('Users already exist in the database. Skipping user setup.');
      return { success: true, message: 'Users already exist in the database' };
    }
    
    // Create sample users
    const users = [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        name: 'Administrator',
        email: 'admin@airport.com',
        role: 'admin',
        password: 'Mo3ed032'  // This is for direct mock authentication
      },
      {
        id: crypto.randomUUID(),
        username: 'keshtkar.m',
        name: 'Mohamed Mahdi Mustafa Mohamed Taqi Keshtkar',
        email: 'mohamed.keshtkar@bac.bh',
        role: 'technician',
        password: 'Mo3ed032'  // This is for direct mock authentication
      }
    ];
    
    // Insert users
    const { error: usersError } = await supabase
      .from('users')
      .insert(users);
      
    if (usersError) {
      console.error('Error creating users:', usersError);
      return { success: false, message: `Error creating users: ${usersError.message}` };
    }
    
    // Set up permissions
    const permissions = [
      {
        user_id: users[0].id,
        permission: 'all'
      },
      {
        user_id: users[1].id,
        permission: 'view_tasks'
      },
      {
        user_id: users[1].id,
        permission: 'view_maps'
      }
    ];
    
    const { error: permissionsError } = await supabase
      .from('permissions')
      .insert(permissions);
      
    if (permissionsError) {
      console.error('Error creating permissions:', permissionsError);
      return { success: false, message: `Error creating permissions: ${permissionsError.message}` };
    }
    
    console.log('Successfully created initial users and permissions');
    return { success: true, message: 'Successfully created initial users and permissions' };
  } catch (error) {
    console.error('Error setting up users:', error);
    return { success: false, message: `Error setting up users: ${error.message}` };
  }
};

/**
 * Setup Supabase database with initial data including users and permissions
 */
export const setupSupabaseData = async () => {
  try {
    // Create initial users
    const usersResult = await setupSupabaseUsers();
    if (!usersResult.success) {
      return usersResult;
    }
    
    // Create shifts
    const shifts = [
      { id: 'morning', name: 'Morning Shift', start_time: '06:00', end_time: '18:00' },
      { id: 'night', name: 'Night Shift', start_time: '18:00', end_time: '06:00' }
    ];
    
    const { error: shiftsError } = await supabase
      .from('shifts')
      .insert(shifts)
      .on_conflict('id')
      .merge();
      
    if (shiftsError) {
      console.error('Error creating shifts:', shiftsError);
      return { success: false, message: `Error creating shifts: ${shiftsError.message}` };
    }
    
    // Create areas
    const areas = [
      { id: 'Taxiway', name: 'Taxiway' },
      { id: 'Runway', name: 'Runway' }
    ];
    
    const { error: areasError } = await supabase
      .from('areas')
      .insert(areas)
      .on_conflict('id')
      .merge();
      
    if (areasError) {
      console.error('Error creating areas:', areasError);
      return { success: false, message: `Error creating areas: ${areasError.message}` };
    }
    
    console.log('Successfully set up Supabase with initial data');
    return { success: true, message: 'Successfully set up Supabase with initial data' };
  } catch (error) {
    console.error('Error setting up Supabase data:', error);
    return { success: false, message: `Error setting up Supabase data: ${error.message}` };
  }
};