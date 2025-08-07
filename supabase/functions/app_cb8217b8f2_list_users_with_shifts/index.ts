import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);
const requestId = crypto.randomUUID();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed',
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  console.log(`[${requestId}] User list request received`);

  try {
    // Get the JWT token from the request and verify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Authorization header',
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${requestId}] Authentication error:`, authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized access',
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log(`[${requestId}] Authenticated user:`, user.id);

    // Check if the user is an admin by querying the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error(`[${requestId}] User data fetch error:`, userError);
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found',
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Only admin users can list all users
    if (userData.role !== 'admin') {
      console.error(`[${requestId}] Unauthorized: User is not an admin`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Only admin users can list all users',
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log(`[${requestId}] Fetching users list`);

    // Get all users from auth.users
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error(`[${requestId}] Auth users fetch error:`, authUsersError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to fetch users: ${authUsersError.message}`,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get all user records from the users table
    const { data: appUsers, error: appUsersError } = await supabase
      .from('users')
      .select('*');

    if (appUsersError) {
      console.error(`[${requestId}] App users fetch error:`, appUsersError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to fetch user records: ${appUsersError.message}`,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get all shifts from the new shifts table
    const { data: userShifts, error: shiftsError } = await supabase
      .from('app_cb8217b8f2_user_shifts')
      .select('*');

    if (shiftsError) {
      console.error(`[${requestId}] User shifts fetch error:`, shiftsError);
      // We'll continue without shifts data if there's an error
    }

    // Create maps for quick lookups
    const appUserMap = {};
    if (appUsers) {
      appUsers.forEach(u => {
        appUserMap[u.id] = u;
      });
    }

    const shiftsMap = {};
    if (userShifts) {
      userShifts.forEach(s => {
        shiftsMap[s.user_id] = s.shift;
      });
    }

    // Merge the data from auth.users with app_users and shifts
    const mergedUsers = authUsers.users.map(authUser => {
      const appUser = appUserMap[authUser.id] || {};
      const shift = shiftsMap[authUser.id] || appUser.shift || 'Regular';
      
      return {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || appUser.name || authUser.email?.split('@')[0] || 'Unknown',
        role: authUser.user_metadata?.role || appUser.role || 'viewer',
        shift: shift,
        avatar: appUser.avatar || null,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at || appUser.updated_at
      };
    });

    console.log(`[${requestId}] Successfully fetched ${mergedUsers.length} users`);

    return new Response(JSON.stringify({
      success: true,
      users: mergedUsers,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: `An unexpected error occurred: ${error.message}`,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});