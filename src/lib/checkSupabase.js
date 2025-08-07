import { supabase } from './supabase';

/**
 * Checks if Supabase connection is working properly
 * @returns {Promise<boolean>} True if Supabase is connected, false otherwise
 */
export const checkSupabaseConnection = async () => {
  if (!supabase) return false;
  
  try {
    // Try a simple query to check connection
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    // If no error occurred, connection is working
    if (!error) {
      console.log('Supabase connection is working');
      return true;
    }
    
    console.error('Error connecting to Supabase:', error);
    return false;
  } catch (e) {
    console.error('Exception when checking Supabase connection:', e);
    return false;
  }
};

/**
 * Checks if Supabase storage is properly configured
 * @returns {Promise<boolean>} True if storage is working, false otherwise
 */
export const checkSupabaseStorage = async () => {
  if (!supabase) return false;
  
  try {
    // List buckets to check if storage is working
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking Supabase storage:', error);
      return false;
    }
    
    // Check if avatars bucket exists
    const avatarBucketExists = buckets && buckets.some(bucket => bucket.name === 'avatars');
    
    console.log('Supabase storage is working', avatarBucketExists ? 
      'and avatars bucket exists' : 
      'but avatars bucket does not exist');
    
    return true;
  } catch (e) {
    console.error('Exception when checking Supabase storage:', e);
    return false;
  }
};