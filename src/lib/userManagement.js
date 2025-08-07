import { supabase } from './supabase';

/**
 * Update a user's role in both Supabase Auth and the database using Edge Function
 * 
 * @param {string} userId - The user's UUID
 * @param {string} role - The role to assign to the user (admin, engineer, technician, shift_leader, viewer)
 * @param {string} shift - Optional. The shift assignment for the user (A, B, C, D, Regular)
 * @returns {Promise<{success: boolean, error: string|null}>} - Result of the operation
 */
export async function updateUserRole(userId, role, shift = null) {
  try {
    // Get the current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      console.error("No active session found");
      return { success: false, error: "Authentication required" };
    }
    
    // Prepare the data to update
    const updateData = { userId, role };
    if (shift) {
      updateData.shift = shift;
    }
    
    // Call the Edge Function to update the user's role with admin privileges
    const response = await fetch(
      `${supabase.supabaseUrl}/functions/v1/app_de8b393e2913418682a1f3ac5249efa2_update_user_role`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      }
    );
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error("Error updating user role:", result.error);
      return { success: false, error: result.error || "Failed to update user role" };
    }
    
    // If the Edge Function update worked, also update the shift in the new dedicated table
    try {
      // Call the new shift update edge function
      if (shift) {
        await updateUserShift(userId, shift);
      }
    } catch (shiftError) {
      console.warn("User role updated but shift update failed:", shiftError);
    }
    
    console.log("User role updated successfully:", result.message);
    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error updating user role:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

/**
 * Update a user's shift in the dedicated shifts table using Edge Function
 * 
 * @param {string} userId - The user's UUID
 * @param {string} shift - The shift assignment for the user (A, B, C, D, Regular)
 * @returns {Promise<{success: boolean, error: string|null}>} - Result of the operation
 */
export async function updateUserShift(userId, shift) {
  try {
    // Get the current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      console.error("No active session found");
      return { success: false, error: "Authentication required" };
    }
    
    try {
      // Try using the edge function first
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/app_cb8217b8f2_update_user_shift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId, shift })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update user shift via edge function");
      }
      
      console.log("User shift updated successfully via edge function");
    } catch (edgeFunctionError) {
      console.warn("Edge function failed, falling back to direct database update:", edgeFunctionError);
      
      // Direct database update as fallback
      const { error: upsertError } = await supabase
        .from('app_cb8217b8f2_user_shifts')
        .upsert({ 
          user_id: userId,
          shift: shift,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id'
        });
      
      if (upsertError) {
        console.error("Error updating user shift in database:", upsertError);
        return { success: false, error: upsertError.message || "Failed to update user shift in database" };
      }
    }
    
    console.log("User shift updated successfully");
    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error updating user shift:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

/**
 * Get all users with their roles from Supabase via Edge Function
 * 
 * @param {Object} options - Options for the function
 * @param {Boolean} options.bypassEdgeFunction - Whether to bypass the edge function and use direct Supabase query
 * @returns {Promise<Array>} - Array of user objects
 */
export async function getAllUsers(options = {}) {
  const { bypassEdgeFunction = false } = options;
  
  try {
    // Get the current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    if (!token) {
      console.error("No active session found");
      throw new Error("Authentication required");
    }
    
    // Try to get users directly from the database if we're bypassing the edge function
    if (bypassEdgeFunction) {
      try {
        console.log("Getting users directly from Supabase database");
        // Get users from auth admin API
        const { data, error } = await supabase.rpc('get_all_users');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Get shifts from the dedicated table
          const { data: shiftsData, error: shiftsError } = await supabase
            .from('app_cb8217b8f2_user_shifts')
            .select('*');
          
          if (!shiftsError && shiftsData) {
            // Create a map of userId to shift
            const shiftMap = {};
            shiftsData.forEach(shiftRecord => {
              shiftMap[shiftRecord.user_id] = shiftRecord.shift;
            });
            
            // Merge shift data with user data
            const usersWithShifts = data.map(user => ({
              ...user,
              shift: shiftMap[user.id] || user.shift || 'Regular'
            }));
            
            return formatUserList(usersWithShifts);
          } else {
            return formatUserList(data);
          }
        }
      } catch (dbError) {
        console.error("Direct database access failed:", dbError);
        // Continue to edge function as fallback
      }
    }
    
    // Call our new optimized edge function for user listing
    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/app_4a7057432c_get_all_users`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          // Improve network reliability with these settings
          cache: 'no-cache',
          credentials: 'same-origin'
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch users from API");
      }
      
      return formatUserList(result.users);
    } catch (error) {
      console.error("Error fetching users via edge function:", error);
      
      // If the edge function fails, fall back to a direct database query
      try {
        console.warn("Falling back to direct database query");
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) throw authError;
        
        // Transform the auth users data to match our expected format
        const users = authData.users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
          username: user.email?.split('@')[0] || 'unknown',
          role: user.user_metadata?.role || 'viewer',
          shift: 'Regular', // Default shift
          created_at: user.created_at
        }));
        
        return formatUserList(users);
      } catch (dbError) {
        console.error("Direct database access failed:", dbError);
        throw new Error("Failed to fetch users from Supabase. Please try again later.");
      }
    }
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw error;
  }
}

/**
 * Format a list of user objects from various sources into a consistent format
 * @param {Array} users - Raw user data
 * @returns {Array} - Formatted user objects
 */
function formatUserList(users) {
  return users.map(user => ({
    id: user.id,
    username: user.email?.split('@')[0] || user.username || 'unknown',
    name: user.name || user.email?.split('@')[0] || 'unknown',
    email: user.email || 'unknown',
    role: user.role || 'viewer',
    shift: user.shift || 'Regular',
    avatar: user.avatar || null, // Will be fetched separately using avatarHelper
    // Set permissions based on role
    permissions: user.role === 'admin' ? ['all'] : 
               user.role === 'shift_leader' ? ['view_tasks', 'create_tasks', 'assign_tasks', 'generate_reports', 'view_maps'] :
               user.role === 'engineer' ? ['view_tasks', 'create_tasks', 'edit_tasks', 'view_maps', 'generate_reports'] :
               user.role === 'technician' ? ['view_tasks', 'update_task_status', 'view_maps'] :
               ['view_tasks'] // Default for viewer
  }));
}

// Mock user data removed to fix linting error