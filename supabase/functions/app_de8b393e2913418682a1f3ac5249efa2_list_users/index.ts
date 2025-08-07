import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 204 });
  }
  
  try {
    // Generate request ID for logging
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing list users request`);
    
    // Get the authorization token from headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] No authorization header provided`);
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Verify the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error(`[${requestId}] Invalid token:`, userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized access' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Check if user has admin or shift_leader role to view users
    const isAdmin = user.user_metadata?.role === 'admin';
    const isShiftLeader = user.user_metadata?.role === 'shift_leader';
    
    if (!isAdmin && !isShiftLeader) {
      console.error(`[${requestId}] User ${user.id} attempted to list users but has insufficient permissions`);
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to view users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    console.log(`[${requestId}] Fetching all users`);
    
    // Get all users from auth.users with admin privileges
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error(`[${requestId}] Failed to fetch auth users:`, authError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch users: ${authError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Also get users from the public.users table for any additional attributes
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*');
    
    if (dbError) {
      console.error(`[${requestId}] Failed to fetch database users:`, dbError);
      // Continue with auth users only
    }
    
    // Merge user data from auth and database
    const mergedUsers = authUsers.users.map(authUser => {
      // Find matching user in database records
      const dbUser = dbUsers?.find(u => u.id === authUser.id);
      
      // Get the display name from various possible sources
      const name = authUser.user_metadata?.name || 
                  authUser.user_metadata?.full_name || 
                  (dbUser?.name) || 
                  authUser.email?.split('@')[0] || 
                  'Unknown User';
                  
      // Extract role from metadata
      const role = authUser.user_metadata?.role || dbUser?.role || 'viewer';
      
      // Extract shift from metadata or database
      const shift = authUser.user_metadata?.shift || dbUser?.shift || 'Regular';
      
      return {
        id: authUser.id,
        email: authUser.email,
        name: name,
        role: role,
        shift: shift,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        app_metadata: authUser.app_metadata,
        user_metadata: authUser.user_metadata
      };
    });
    
    console.log(`[${requestId}] Successfully retrieved ${mergedUsers.length} users`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        users: mergedUsers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});