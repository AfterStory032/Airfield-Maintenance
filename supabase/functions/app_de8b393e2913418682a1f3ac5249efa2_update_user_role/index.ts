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
    console.log(`[${requestId}] Processing update user role request`);
    
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
    
    // Check if user has admin role
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      console.error(`[${requestId}] User ${user.id} attempted to update roles but is not an admin`);
      return new Response(
        JSON.stringify({ success: false, error: 'Only admins can update user roles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error(`[${requestId}] Failed to parse request body:`, e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { userId, role, shift } = requestData;
    
    if (!userId || !role) {
      console.error(`[${requestId}] Missing required fields in request`);
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId and role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validate role value
    const validRoles = ['admin', 'shift_leader', 'engineer', 'technician', 'viewer'];
    if (!validRoles.includes(role)) {
      console.error(`[${requestId}] Invalid role: ${role}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role value' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validate shift value if provided
    if (shift) {
      const validShifts = ['A', 'B', 'C', 'D', 'Regular'];
      if (!validShifts.includes(shift)) {
        console.error(`[${requestId}] Invalid shift: ${shift}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid shift value' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }
    
    console.log(`[${requestId}] Updating user ${userId} with role ${role} and shift ${shift || 'unchanged'}`);
    
    // Step 1: Update the auth.users metadata with the new role and shift (if provided)
    const userMetadata = {};
    
    // Get the existing user to preserve metadata
    const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(userId);
    
    if (fetchError || !userData) {
      console.error(`[${requestId}] Failed to fetch user:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch user: ${fetchError?.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create new metadata by merging existing with new values
    const existingMeta = userData.user?.user_metadata || {};
    userMetadata.role = role;
    
    if (shift) {
      userMetadata.shift = shift;
    } else if (existingMeta.shift) {
      userMetadata.shift = existingMeta.shift;
    } else {
      userMetadata.shift = 'Regular'; // Default value if not set
    }
    
    // Update auth.users metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { user_metadata: userMetadata }
    );
    
    if (updateError) {
      console.error(`[${requestId}] Failed to update user metadata:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update user: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Step 2: Also update the public.users table to ensure consistency
    const updateData = { 
      role: role,
      updated_at: new Date().toISOString()
    };
    
    // Add shift to update data if provided
    if (shift) {
      updateData.shift = shift;
    }
    
    const { error: dbError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
    
    if (dbError) {
      console.error(`[${requestId}] Failed to update users table:`, dbError);
      // We don't return error here because the auth update was successful
      // Just log the inconsistency
      console.warn(`[${requestId}] Auth user updated but users table update failed. Manual sync may be required.`);
    }
    
    console.log(`[${requestId}] Successfully updated user ${userId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User role updated successfully',
        userId: userId,
        role: role,
        shift: userMetadata.shift
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