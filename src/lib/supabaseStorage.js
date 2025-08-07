import { supabase } from './supabase';

// Create a bucket for avatars if it doesn't exist
export const initializeStorage = async () => {
  try {
    // Check if avatars bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const avatarBucketExists = buckets.some(bucket => bucket.name === 'avatars');
    
    // Create avatars bucket if it doesn't exist
    if (!avatarBucketExists) {
      const { data, error } = await supabase.storage.createBucket('avatars', {
        public: true, // Make avatars publicly accessible
      });
      
      if (error) {
        console.error('Error creating avatars bucket:', error);
      } else {
        console.log('Avatars bucket created successfully:', data);
      }
    } else {
      console.log('Avatars bucket already exists');
    }
    
    // Update RLS policies to allow users to upload their own avatars
    const { error } = await supabase.rpc('setup_avatar_storage_policies');
    if (error && !error.message.includes('function does not exist')) {
      console.error('Error setting up avatar storage policies:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return false;
  }
};

// Get avatar URL from storage
export const getAvatarUrl = async (avatarPath) => {
  try {
    if (!avatarPath) return null;
    
    // If it's already a full URL, just return it
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    
    // Remove 'avatars/' prefix if it exists
    const path = avatarPath.replace('avatars/', '');
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
      
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Error getting avatar URL:', error);
    return null;
  }
};

// Convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Upload an avatar for a user and return the base64 string
export const uploadAvatar = async (file, userId) => {
  try {
    if (!file || !userId) {
      throw new Error('File and userId are required');
    }
    
    console.log(`Processing avatar for user ${userId}`);
    
    // Check if Supabase is available
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }
    
    // Convert image to base64
    const base64Image = await fileToBase64(file);
    console.log('Successfully converted image to base64');
    
    // Store the base64 image string in the user_profiles table
    const { error: upsertError } = await supabase
      .from('app_cb8217b8f2_user_profiles')
      .upsert({ 
        id: userId,
        avatar: base64Image,
        avatar_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false
      });
      
    if (upsertError) {
      console.error('Error saving base64 image to user_profiles table:', upsertError);
      throw new Error(`Failed to save avatar: ${upsertError.message}`);
    }
    
    console.log('Successfully saved base64 avatar to user record');
    
    // Return the base64 string
    return base64Image;
  } catch (error) {
    console.error('Error processing avatar:', error);
    // Re-throw with more descriptive message
    throw new Error(`Avatar upload failed: ${error.message}`);
  }
};