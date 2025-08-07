/**
 * Authentication Debugging Utilities
 * These functions help with debugging authentication-related issues
 */

import { supabase } from './supabase';
import { users } from '../data/airfieldData';

/**
 * Get complete authentication information for debugging
 * Includes current session, localStorage data, and other relevant info
 * @returns {Object} Authentication debug information
 */
export const getCompleteAuthInfo = async () => {
  try {
    // Get current Supabase session
    const { data: session, error } = await supabase.auth.getSession();
    
    // Get localStorage auth data
    const localUser = localStorage.getItem('user');
    const parsedLocalUser = localUser ? JSON.parse(localUser) : null;
    
    // Get admin override status
    const adminOverride = localStorage.getItem('admin_override');
    
    return {
      supabaseSession: session,
      sessionError: error,
      localStorageUser: parsedLocalUser,
      adminOverride: adminOverride === 'true',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error in getCompleteAuthInfo:', err);
    return {
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Debug user authentication status
 * @param {string} userId - The user ID to check
 * @returns {Object} User authentication debug info
 */
export const debugUserAuth = (userId) => {
  try {
    // Find the user in our mock data
    const user = users.find(u => u.id === userId);
    
    // Get admin override status
    const adminOverride = localStorage.getItem('admin_override');
    
    return {
      userFound: !!user,
      userData: user ? {
        id: user.id,
        role: user.role,
        permissions: user.permissions,
      } : null,
      adminOverride: adminOverride === 'true',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Check if a user exists by email
 * @param {string} email - The email to check
 * @returns {Object|null} The user if found, null otherwise
 */
export const checkUserByEmail = (email) => {
  try {
    // Find the user in our mock data
    return users.find(u => u.email === email) || null;
  } catch (err) {
    console.error('Error in checkUserByEmail:', err);
    return null;
  }
};