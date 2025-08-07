import { supabase } from './supabase';

/**
 * Get user avatar from user_profiles table or fallback sources
 * @param {string} userId - The user's UUID
 * @returns {Promise<string|null>} - URL or base64 of the avatar, or null if not found
 */
export const getUserAvatar = async (userId) => {
  try {
    if (!userId) return null;
    
    // Try to get from user_profiles table first
    const { data: profileData, error: profileError } = await supabase
      .from('app_cb8217b8f2_user_profiles')
      .select('avatar')
      .eq('id', userId)
      .single();
    
    if (!profileError && profileData?.avatar) {
      console.log('Retrieved avatar from user_profiles table');
      return profileData.avatar;
    }
    
    // Try to get directly from auth.users table if the column exists
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('avatar')
        .eq('id', userId)
        .single();
      
      if (!userError && userData?.avatar) {
        console.log('Retrieved avatar from users table');
        return userData.avatar;
      }
    } catch (err) {
      console.log('Unable to query users table for avatar, might not exist:', err.message);
    }
    
    // Fallback to default avatar
    return `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 10) + 1}`;
  } catch (error) {
    console.error('Error getting user avatar:', error);
    return null;
  }
};