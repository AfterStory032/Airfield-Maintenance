import { supabase } from './supabase';
import { syncUserRole } from './userRoleSync';
import { getAvatarUrl, initializeStorage } from './supabaseStorage';

// Initialize storage when the module loads
initializeStorage().catch(console.error);

// Function to get user avatar URL
async function getUserAvatar(userId) {
  try {
    // Check if the user has an avatar in the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    // If avatar_url exists, convert it to a public URL
    if (data?.avatar_url) {
      return await getAvatarUrl(data.avatar_url);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user avatar:', error);
    return null;
  }
}

// Function to handle direct login with email/password
export async function loginWithEmailPassword(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Get user metadata or use session user
    const user = data.user;
    
    // Sync and get the user's role from both auth and database
    const { role: syncedRole } = await syncUserRole(user.id);
    
    // Use synced role or fallback to auth metadata or default
    const role = syncedRole || user.user_metadata?.role || 'viewer';
    
    // Log the role detection for debugging
    console.log(`Role determined for ${email}: ${role}`);
    console.log(`User metadata:`, user.user_metadata);
    
    // Get user's avatar
    const avatar = await getUserAvatar(user.id);
    
    // Determine permissions based on role
    let permissions = ['view_tasks']; // Default permissions for any authenticated user
    
    // Add role-specific permissions
    if (role === 'admin') {
      permissions = ['all']; // Admin has all permissions
    } else if (role === 'shift_leader') {
      permissions = ['view_tasks', 'create_tasks', 'assign_tasks', 'generate_reports', 'view_maps'];
    } else if (role === 'engineer') {
      permissions = ['view_tasks', 'create_tasks', 'edit_tasks', 'view_maps', 'generate_reports'];
    } else if (role === 'technician') {
      permissions = ['view_tasks', 'update_task_status', 'view_maps'];
    }
    
    // Create a user object with the format expected by the app
    return {
      id: user.id,
      username: user.user_metadata?.username || user.email.split('@')[0],
      name: user.user_metadata?.name || user.email.split('@')[0],
      email: user.email,
      role: role,
      avatar: avatar,
      permissions: permissions
    };
  } catch (error) {
    console.error('Login error:', error.message);
    throw new Error(`Login failed: ${error.message}`);
  }
}

// Function to check if a user is logged in
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Sync and get the user's role from both auth and database
    const { role: syncedRole } = await syncUserRole(user.id);
    
    // Use synced role or fallback to auth metadata or default
    const role = syncedRole || user.user_metadata?.role || 'viewer';
    
    // Log the role detection for debugging
    console.log(`Role determined for ${user.email}: ${role}`);
    console.log(`User metadata:`, user.user_metadata);
    
    // Get user's avatar
    const avatar = await getUserAvatar(user.id);
    
    // Determine permissions based on role
    let permissions = ['view_tasks']; // Default permissions for any authenticated user
    
    // Add role-specific permissions
    if (role === 'admin') {
      permissions = ['all']; // Admin has all permissions
    } else if (role === 'shift_leader') {
      permissions = ['view_tasks', 'create_tasks', 'assign_tasks', 'generate_reports', 'view_maps'];
    } else if (role === 'engineer') {
      permissions = ['view_tasks', 'create_tasks', 'edit_tasks', 'view_maps', 'generate_reports'];
    } else if (role === 'technician') {
      permissions = ['view_tasks', 'update_task_status', 'view_maps'];
    }
    
    // Create a user object with the format expected by the app
    return {
      id: user.id,
      username: user.user_metadata?.username || user.email.split('@')[0],
      name: user.user_metadata?.name || user.email.split('@')[0],
      email: user.email,
      role: role,
      avatar: avatar,
      permissions: permissions
    };
  } catch (error) {
    console.error('Get current user error:', error.message);
    return null;
  }
}

// Function to log out
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Logout error:', error.message);
    throw new Error(`Logout failed: ${error.message}`);
  }
}
