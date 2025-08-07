import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with the URL and API key
const supabaseUrl = 'https://oxevsbsomwmdopguggbn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZXZzYnNvbXdtZG9wZ3VnZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjE5MzUsImV4cCI6MjA2ODIzNzkzNX0.ng3Cm9lYE5NuKOADLoI4ORbnJxrZXZhV0Q5D6dYxIj0';

// Create and export the Supabase client with optimized network settings
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: { 
      'x-application-name': 'airfield-app',
      'Cache-Control': 'no-cache'
    },
    fetch: fetch
  }
});

// Add function to create a stored procedure for getting users
// This helps avoid network errors by using a direct database call
const createGetAllUsersFunction = async () => {
  try {
    await supabase.rpc('get_all_users');
    console.log('get_all_users function exists');
  } catch (error) {
    if (error.message.includes('function get_all_users() does not exist')) {
      console.log('Creating get_all_users function');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.get_all_users()
          RETURNS SETOF json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            RETURN QUERY
            SELECT json_build_object(
              'id', u.id,
              'email', u.email,
              'name', COALESCE(u.raw_user_meta_data->>'name', u.email),
              'role', COALESCE(u.raw_user_meta_data->>'role', 'viewer'),
              'created_at', u.created_at
            )
            FROM auth.users u
            ORDER BY u.created_at DESC;
          END;
          $$;
        `
      });
      
      if (createError) {
        console.error('Error creating function:', createError);
      } else {
        console.log('get_all_users function created successfully');
      }
    } else {
      console.error('Error checking for get_all_users function:', error);
    }
  }
};

// Initialize the function when this module is imported
createGetAllUsersFunction().catch(console.error);