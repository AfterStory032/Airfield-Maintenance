// Edge function to sync user roles between Auth and Database
import { createClient } from 'npm:@supabase/supabase-js@2';

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Generate request ID for logging
const requestId = crypto.randomUUID();

Deno.serve(async (req) => {
  // Handle OPTIONS request (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  // Log request details
  console.log(`[${requestId}] ${req.method} request received`);

  // Verify request is POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  // Parse request body
  let userId;
  try {
    const body = await req.json();
    userId = body.userId;

    if (!userId) {
      throw new Error('Missing userId');
    }
  } catch (error) {
    console.error(`[${requestId}] Error parsing request:`, error);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request body' }),
      { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  // Get auth token to verify caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
  
  const token = authHeader.split(' ')[1];
  
  // Verify token and get user ID from token
  try {
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callerUser) {
      throw new Error('Unauthorized: Invalid token');
    }
    
    // Only allow users to sync their own role or admins to sync any role
    const isAdmin = callerUser.user_metadata?.role === 'admin';
    if (callerUser.id !== userId && !isAdmin) {
      throw new Error('Forbidden: Can only sync your own role unless you are an admin');
    }
    
    console.log(`[${requestId}] User ${callerUser.id} is syncing role for user ${userId}`);
  } catch (error) {
    console.error(`[${requestId}] Auth error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Authentication failed' }),
      { 
        status: error.message.includes('Forbidden') ? 403 : 401, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }

  try {
    console.log(`[${requestId}] Syncing role for user ${userId}`);
    
    // Step 1: Get the user details from Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user) {
      throw new Error(`Failed to get user from Auth: ${authError?.message || 'User not found'}`);
    }
    
    const user = authUser.user;
    console.log(`[${requestId}] Found user in Auth: ${user.email}`);
    
    // Get auth role from user metadata
    const authRole = user.user_metadata?.role || 'viewer';
    console.log(`[${requestId}] Auth role: ${authRole}`);
    
    // Step 2: Check if user exists in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();
    
    // If user doesn't exist in db or there's an error other than "not found"
    if (dbError && dbError.code !== 'PGRST116') {
      console.error(`[${requestId}] Database error:`, dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
    
    let effectiveRole = authRole;
    let roleUpdated = false;
    
    // If user exists in database
    if (dbUser) {
      console.log(`[${requestId}] Found user in database with role: ${dbUser.role}`);
      
      // If DB role exists and differs from auth role, update auth metadata
      if (dbUser.role && dbUser.role !== authRole) {
        console.log(`[${requestId}] Updating auth metadata with DB role: ${dbUser.role}`);
        
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { user_metadata: { role: dbUser.role } }
        );
        
        if (updateError) {
          console.error(`[${requestId}] Failed to update auth metadata:`, updateError);
          throw new Error(`Failed to update auth metadata: ${updateError.message}`);
        }
        
        effectiveRole = dbUser.role;
        roleUpdated = true;
        console.log(`[${requestId}] Auth metadata updated successfully`);
      } 
      // If auth role exists and differs from DB role, update DB
      else if (authRole && (!dbUser.role || dbUser.role !== authRole)) {
        console.log(`[${requestId}] Updating DB with auth role: ${authRole}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: authRole })
          .eq('id', userId);
        
        if (updateError) {
          console.error(`[${requestId}] Failed to update database:`, updateError);
          throw new Error(`Failed to update database: ${updateError.message}`);
        }
        
        roleUpdated = true;
        console.log(`[${requestId}] Database updated successfully`);
      }
    } 
    // User doesn't exist in database, create entry if email exists
    else if (user.email) {
      console.log(`[${requestId}] User not found in database, creating new entry`);
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: user.email.split('@')[0],
          name: user.user_metadata?.name || user.email.split('@')[0],
          email: user.email,
          role: authRole
        });
      
      if (insertError) {
        console.error(`[${requestId}] Failed to create user in database:`, insertError);
        // This is not critical, as long as the auth role is set
        console.log(`[${requestId}] Will continue with auth role: ${authRole}`);
      } else {
        console.log(`[${requestId}] User created in database successfully`);
        roleUpdated = true;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        role: effectiveRole, 
        updated: roleUpdated,
        message: roleUpdated ? 'Role synchronized successfully' : 'Role already in sync'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Role sync error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to sync user role' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
});