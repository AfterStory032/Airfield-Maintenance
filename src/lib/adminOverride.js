/**
 * Admin Override Utilities
 * These functions help manage the admin override functionality
 */

/**
 * Check if a user has admin override enabled
 * @param {Object} user - The user object (not used in function body but kept for API consistency)
 * @returns {boolean} - Whether the user has admin override
 */
export const hasAdminOverride = () => {
  // Check localStorage for admin override flag
  const adminOverride = localStorage.getItem('admin_override');
  return adminOverride === 'true';
};

/**
 * Force admin rights for a user
 * @param {Object} user - The user object to enhance with admin rights
 * @returns {Object} - The enhanced user object with admin rights
 */
export const forceAdminRights = (user) => {
  if (!user) return null;
  
  // Create a new object to avoid modifying the original
  const enhancedUser = {
    ...user,
    role: 'admin',
    permissions: ['all']
  };
  
  return enhancedUser;
};

/**
 * Ensure admin rights are applied if override is enabled
 * This is useful on page loads or when checking permissions
 * @param {Object} user - The user object
 * @returns {Object} - The user object with admin rights if override is enabled
 */
export const ensureAdminRights = (user) => {
  if (hasAdminOverride()) {
    return forceAdminRights(user);
  }
  return user;
};

/**
 * Remove admin override
 * @returns {void}
 */
export const removeAdminOverride = () => {
  localStorage.removeItem('admin_override');
};