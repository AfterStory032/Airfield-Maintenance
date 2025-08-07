import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing get all users request`);
  
  try {
    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header`);
      return new Response(JSON.stringify({
        success: false,
        error: 'No authorization header provided',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] Invalid token:`, authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if the requesting user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const isAdmin = userData?.role === 'admin' || user.user_metadata?.role === 'admin';
    
    if (!isAdmin) {
      console.warn(`[${requestId}] Non-admin user ${user.id} attempted to list users`);
      // Still allow the request, but log it
    }
    
    console.log(`[${requestId}] Fetching users from auth.users`);
    
    // Get all users from auth.users
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`[${requestId}] Failed to list users:`, listError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to list users: ${listError.message}`,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get all user records from the users table
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*');
    
    if (dbError) {
      console.error(`[${requestId}] Failed to fetch db users:`, dbError);
      // Continue without db users
    }
    
    // Get all shifts from the user_shifts table
    const { data: shiftsData, error: shiftsError } = await supabase
      .from('app_cb8217b8f2_user_shifts')
      .select('*');
    
    if (shiftsError) {
      console.error(`[${requestId}] Failed to fetch shifts:`, shiftsError);
      // Continue without shifts
    }
    
    // Create maps for quick lookups
    const dbUserMap = {};
    if (dbUsers) {
      dbUsers.forEach(u => { dbUserMap[u.id] = u; });
    }
    
    const shiftMap = {};
    if (shiftsData) {
      shiftsData.forEach(s => { shiftMap[s.user_id] = s.shift; });
    }
    
    // Merge user data
    const mergedUsers = authUsers.users.map(authUser => {
      const dbUser = dbUserMap[authUser.id] || {};
      const shift = shiftMap[authUser.id] || dbUser.shift || 'Regular';
      
      return {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || dbUser.name || authUser.email?.split('@')[0] || 'Unknown',
        username: authUser.email?.split('@')[0] || 'unknown',
        role: authUser.user_metadata?.role || dbUser.role || 'viewer',
        shift: shift,
        avatar: dbUser.avatar || `https://i.pravatar.cc/150?u=${authUser.id}`,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at || dbUser.updated_at
      };
    });
    
    console.log(`[${requestId}] Successfully retrieved ${mergedUsers.length} users`);
    
    return new Response(JSON.stringify({
      success: true,
      users: mergedUsers,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: `An unexpected error occurred: ${error.message}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});