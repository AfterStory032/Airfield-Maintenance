import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);
const requestId = crypto.randomUUID();

// Define valid shifts
const validShifts = ['A', 'B', 'C', 'D', 'Regular'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
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

  console.log(`[${requestId}] User shift update request received`);

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

    // Only admin users can update shifts
    if (userData.role !== 'admin') {
      console.error(`[${requestId}] Unauthorized: User is not an admin`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Only admin users can update shifts',
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error(`[${requestId}] JSON parse error:`, jsonError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const { userId, shift } = body;

    // Validate required parameters
    if (!userId || !shift) {
      console.error(`[${requestId}] Missing parameters:`, { userId, shift });
      return new Response(JSON.stringify({
        success: false,
        error: 'userId and shift are required',
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Validate shift value
    if (!validShifts.includes(shift)) {
      console.error(`[${requestId}] Invalid shift value:`, shift);
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid shift. Valid shifts are: ${validShifts.join(', ')}`,
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Check if target user exists
    const { data: targetUser, error: targetUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (targetUserError || !targetUser) {
      console.error(`[${requestId}] Target user fetch error:`, targetUserError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Target user not found',
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log(`[${requestId}] Updating shift for user:`, userId);

    // Update the user's shift in the app_cb8217b8f2_user_shifts table
    const { error: shiftUpdateError } = await supabase
      .from('app_cb8217b8f2_user_shifts')
      .upsert({
        user_id: userId,
        shift: shift,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (shiftUpdateError) {
      console.error(`[${requestId}] Shift update error:`, shiftUpdateError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to update user shift: ${shiftUpdateError.message}`,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Update the user's metadata in auth.users
    const existingMetadata = targetUser.user.user_metadata || {};
    const updatedMetadata = { ...existingMetadata, shift };
    
    const { error: metadataUpdateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata,
    });

    if (metadataUpdateError) {
      console.error(`[${requestId}] Metadata update error:`, metadataUpdateError);
      return new Response(JSON.stringify({
        success: false,
        error: `Updated shift in database but failed to update user metadata: ${metadataUpdateError.message}`,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log(`[${requestId}] Successfully updated shift for user:`, userId);

    return new Response(JSON.stringify({
      success: true,
      message: 'User shift updated successfully',
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