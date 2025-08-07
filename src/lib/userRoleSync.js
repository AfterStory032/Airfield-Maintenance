/**
 * Utility functions for synchronizing user roles between Supabase Auth metadata and users table
 */
import { supabase } from './supabase';

/**
 * Sync a user's role between Auth metadata and database users table
 * @param {string} userId - The user's UUID
 * @param {string} role - The role to assign
 * @returns {Promise<{success: boolean, error: string|null}>} Result of the operation
 */
export async function syncUserRole(userId, role) {
  try {
    if (!userId || !role) {
      console.error("Missing required parameters: userId or role");
      return { success: false, error: "Missing required parameters" };
    }
    
    // Step 1: Update the role in the users table
    const { error: dbError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);
    
    if (dbError) {
      console.error("Error updating role in database:", dbError);
      throw dbError;
    }
    
    // Step 2: Try to update the user metadata (this may fail if the user doesn't have admin rights)
    try {
      // This may only work for admin users with the right permissions
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { role } }
      );
      
      if (authError) {
        console.warn("Could not update auth metadata directly, will try Edge Function:", authError);
        // We'll continue with the edge function approach
      }
    } catch (metadataError) {
      console.warn("Metadata update error, falling back to Edge Function:", metadataError);
      // This is expected for non-admin users, we'll continue
    }
    
    // Step 3: Call Edge Function to update the role with admin privileges
    // This is a fallback method if direct update fails
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error("No active session found");
      }
      
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/app_de8b393e2913418682a1f3ac5249efa2_update_user_role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId, role })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error("Error from Edge Function:", result.error);
        return { success: false, error: result.error || "Failed to update role via Edge Function" };
      }
      
      console.log("Role synced successfully:", result.message);
      return { success: true, error: null };
    } catch (fetchError) {
      console.error("Error calling Edge Function:", fetchError);
      // If Edge Function fails but DB was updated, we consider it a partial success
      return { 
        success: true, 
        error: "Role was updated in database but not in Auth metadata. Full admin rights may not be applied." 
      };
    }
    
  } catch (error) {
    console.error("Unexpected error in syncUserRole:", error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

/**
 * Check if a user's roles are in sync between Auth metadata and database
 * @param {string} userId - The user's UUID
 * @returns {Promise<{inSync: boolean, dbRole: string|null, authRole: string|null, error: string|null}>}
 */
export async function checkUserRoleSync(userId) {
  try {
    if (!userId) {
      return { inSync: false, dbRole: null, authRole: null, error: "Missing userId parameter" };
    }
    
    // Get user from database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (dbError) {
      console.error("Error fetching user from database:", dbError);
      return { inSync: false, dbRole: null, authRole: null, error: "Database error" };
    }
    
    // Get user from Auth
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error("Error fetching user from Auth:", authError);
      return { 
        inSync: false, 
        dbRole: userData?.role || null, 
        authRole: null, 
        error: "Auth metadata error" 
      };
    }
    
    const dbRole = userData?.role || null;
    const authRole = authData?.user?.user_metadata?.role || null;
    
    return {
      inSync: dbRole === authRole,
      dbRole,
      authRole,
      error: null
    };
  } catch (error) {
    console.error("Error checking role sync:", error);
    return { inSync: false, dbRole: null, authRole: null, error: error.message };
  }
}

/**
 * Force sync roles for all users from database to Auth metadata
 * This is an admin operation that should be used cautiously
 * @returns {Promise<{success: boolean, synced: number, failed: number, errors: Array}>}
 */
export async function syncAllUserRoles() {
  try {
    // Get all users from database
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, role');
    
    if (dbError) {
      console.error("Error fetching users from database:", dbError);
      return { success: false, synced: 0, failed: 0, errors: [dbError.message] };
    }
    
    const results = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    // Sync each user's role
    for (const user of users) {
      try {
        const { success, error } = await syncUserRole(user.id, user.role);
        
        if (success) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push(`User ${user.id}: ${error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${user.id}: ${error.message || "Unknown error"}`);
      }
    }
    
    // If any sync failed, mark the overall operation as partially successful
    if (results.failed > 0) {
      results.success = false;
    }
    
    return results;
  } catch (error) {
    console.error("Error syncing all user roles:", error);
    return { 
      success: false, 
      synced: 0, 
      failed: 0, 
      errors: [error.message || "Unknown error"]
    };
  }
}