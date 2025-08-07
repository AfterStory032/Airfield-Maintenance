import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as airfieldData from './src/data/airfieldData.js';

// Initialize the Supabase client with the URL and API key
const supabaseUrl = 'https://oxevsbsomwmdopguggbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZXZzYnNvbXdtZG9wZ3VnZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjE5MzUsImV4cCI6MjA2ODIzNzkzNX0.ng3Cm9lYE5NuKOADLoI4ORbnJxrZXZhV0Q5D6dYxIj0';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migrate mock data to Supabase database directly (no schema creation)
 */
async function migrateUsers() {
  console.log('Migrating users...');
  
  // Skip if no users
  if (!airfieldData.users || airfieldData.users.length === 0) {
    console.log('No users to migrate');
    return;
  }
  
  try {
    // Process each user
    for (const user of airfieldData.users) {
      const userId = user.id || uuidv4();
      console.log(`Processing user: ${user.username}`);
      
      // Try inserting user directly (if table exists)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          password: user.password || null
        });
        
      if (userError) {
        console.error(`Error inserting user ${user.username}:`, userError);
      } else {
        console.log(`User ${user.username} inserted successfully`);
        
        // Try inserting permissions if any
        if (user.permissions && user.permissions.length > 0) {
          for (const permission of user.permissions) {
            const { error: permError } = await supabase
              .from('permissions')
              .insert({
                user_id: userId,
                permission: permission
              });
              
            if (permError) {
              console.error(`Error inserting permission for user ${user.username}:`, permError);
            }
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating users:', error);
    return false;
  }
}

/**
 * Attempt to directly sign up users to Supabase Auth
 */
async function registerUsers() {
  console.log('Registering users in Supabase Auth...');
  
  // Skip if no users
  if (!airfieldData.users || airfieldData.users.length === 0) {
    console.log('No users to register');
    return;
  }
  
  try {
    // Process each user that has password
    for (const user of airfieldData.users) {
      if (!user.password) {
        console.log(`Skipping user ${user.username} - no password provided`);
        continue;
      }
      
      console.log(`Registering user: ${user.username}`);
      
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            username: user.username,
            name: user.name,
            role: user.role || 'user'
          }
        }
      });
      
      if (error) {
        console.error(`Error registering user ${user.username}:`, error);
      } else {
        console.log(`User ${user.username} registered successfully`, data);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error registering users:', error);
    return false;
  }
}

// Run the migrations
console.log('Starting user migration process...');

// First try to insert users into the users table
migrateUsers().then(usersResult => {
  // Then try to register users with auth
  registerUsers().then(authResult => {
    console.log('Migration completed');
    
    // Check if users exist
    supabase.from('users').select('*').then(({ data, error }) => {
      if (error) {
        console.error('Error checking users after migration:', error);
      } else {
        console.log(`Found ${data ? data.length : 0} users in database`);
        if (data && data.length > 0) {
          data.forEach(user => {
            console.log(`- ${user.username} (${user.name}), role: ${user.role}`);
          });
        }
      }
    });
  });
});
