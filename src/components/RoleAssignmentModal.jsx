import React, { useState } from 'react';
import { userRoles } from '../data/airfieldData';
import { updateUserRole } from '../lib/userManagement';

const RoleAssignmentModal = ({ user, onClose, onRoleUpdated }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Use the updateUserRole helper function
      const { success, error } = await updateUserRole(user.id, selectedRole);
      
      if (!success) throw new Error(error || "Failed to update user role");
      
      setSuccess(true);
      
      // Notify parent component that the role was updated
      if (onRoleUpdated) {
        onRoleUpdated(user.id, selectedRole);
      }
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error("Error updating user role:", err);
      setError(err.message || "Failed to update user role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800">
            Assign Role - {user.name}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 mb-4 bg-green-100 border-l-4 border-green-500 text-green-700">
            <p>Role updated successfully!</p>
          </div>
        )}
        
        <form onSubmit={handleUpdateRole}>
          <div className="mb-4">
            <label htmlFor="userRole" className="block text-sm font-medium text-gray-700 mb-2">
              Select Role
            </label>
            <select
              id="userRole"
              value={selectedRole}
              onChange={handleRoleChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {userRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                isSubmitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isSubmitting ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;