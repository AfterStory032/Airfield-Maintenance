import React, { useState, useEffect } from 'react';
import { userRoles } from '../data/airfieldData';
import { supabase } from '../lib/supabase';
import { getAllUsers, updateUserRole } from '../lib/userManagement';
import { useAuth } from '../context/AuthContext';
import { forceAdminRights, hasAdminOverride } from '../lib/adminOverride';
import { getCompleteAuthInfo } from '../lib/debugAuth';
import ProfileEditor from './profile/ProfileEditor';

const UserManagement = () => {
  const { user, setUser } = useAuth();
  const [currentUsers, setCurrentUsers] = useState([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'technician',
    shift: 'A',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Handle toggling admin mode
  const toggleAdminMode = () => {
    if (!adminModeEnabled) {
      // Enable admin mode
      const adminUser = forceAdminRights(user);
      setUser(adminUser);
      localStorage.setItem('admin_override', 'true');
      setAdminModeEnabled(true);
    } else {
      // Disable admin mode
      localStorage.removeItem('admin_override');
      setAdminModeEnabled(false);
      // Reload the page to reset the user state
      window.location.reload();
    }
  };

  useEffect(() => {
    // Check if admin mode is enabled in localStorage on component mount
    const adminOverride = localStorage.getItem('admin_override');
    if (adminOverride === 'true' && !adminModeEnabled) {
      const adminUser = forceAdminRights(user);
      setUser(adminUser);
      setAdminModeEnabled(true);
    } else {
      // Set initial state based on user permissions
      setAdminModeEnabled(hasAdminOverride(user));
    }
    
    // Fetch users from Supabase when component mounts or admin mode changes
    fetchUsers();
  }, []);

  // Check if the user has admin permissions
  const isAdmin = user?.role === 'admin' || user?.permissions?.includes('all') || hasAdminOverride(user);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get users directly from Supabase through the API
      const users = await getAllUsers({
        bypassEdgeFunction: adminModeEnabled || isAdmin
      });
      
      setCurrentUsers(users);
      
      // Set success message if admin mode was just enabled
      if (adminModeEnabled && !localStorage.getItem('admin_message_shown')) {
        setSuccessMessage('Admin mode enabled. You now have full access to user management.');
        localStorage.setItem('admin_message_shown', 'true');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setSuccessMessage(`Error fetching users: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!editingUser) { // Only validate password for new users
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Check if Supabase is available
        if (!supabase) {
          throw new Error("Supabase connection is not available");
        }
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            name: formData.name,
            role: formData.role,
            shift: formData.shift
          }
        });
        
        if (authError) throw new Error(authError.message || "Failed to create user in Supabase Auth");
        
        // Create user profile in the database
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            name: formData.name,
            role: formData.role,
            avatar: `https://i.pravatar.cc/150?img=${currentUsers.length + 5}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (dbError) throw new Error(dbError.message || "Failed to create user profile");
        
        // Add user shift to the shifts table
        const { error: shiftError } = await supabase
          .from('app_cb8217b8f2_user_shifts')
          .insert({
            user_id: authData.user.id,
            shift: formData.shift,
            updated_at: new Date().toISOString()
          });
        
        if (shiftError) console.warn("Failed to add user shift:", shiftError);
        
        // Refresh user list
        await fetchUsers();
        
        setSuccessMessage('User added successfully to Supabase!');
        resetForm();
        setShowAddUserForm(false);
      } catch (error) {
        console.error("Error adding user:", error);
        setSuccessMessage(`Error: ${error.message || "Failed to add user"}`);
      }
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }
  };
  
  const handleEditUser = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // If Supabase is connected, update in the database
        if (supabase) {
          const { success, error } = await updateUserRole(
            editingUser.id, 
            formData.role, 
            formData.shift
          );
          
          if (!success) {
            throw new Error(error || "Failed to update user in database");
          }
        }
        
        // Update in local state
        const updatedUsers = currentUsers.map(user => {
          if (user.id === editingUser.id) {
            return {
              ...user,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              shift: formData.shift,
            };
          }
          return user;
        });
        
        setCurrentUsers(updatedUsers);
        setSuccessMessage('User updated successfully in Supabase and local state!');
        resetForm();
        setShowEditUserForm(false);
        setEditingUser(null);
        
      } catch (error) {
        console.error("Error updating user:", error);
        setSuccessMessage(`Error: ${error.message}`);
      }
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
  };
  
  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        if (!supabase) {
          throw new Error("Supabase connection is not available");
        }

        // Get the current session for authentication
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        if (!token) {
          throw new Error("No active session found");
        }

        // First, remove from the shifts table
        const { error: shiftError } = await supabase
          .from('app_cb8217b8f2_user_shifts')
          .delete()
          .eq('user_id', userId);

        if (shiftError) {
          console.warn("Error removing user shift:", shiftError);
        }

        // Remove from users table
        const { error: usersError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (usersError) {
          console.warn("Error removing user from database:", usersError);
        }

        // Delete the user from Supabase Auth via admin API call
        const response = await fetch(
          `${supabase.supabaseUrl}/functions/v1/app_de8b393e2913418682a1f3ac5249efa2_delete_user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
          }
        );

        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to delete user from authentication system");
        }

        // Refresh the user list
        await fetchUsers();
        
        setSuccessMessage('User deleted successfully from Supabase!');
      } catch (error) {
        console.error("Error deleting user:", error);
        setSuccessMessage(`Error: ${error.message || "Failed to delete user"}`);
        
        // Refresh the user list to ensure we have the latest data
        await fetchUsers();
      }
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }
  };
  
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      shift: user.shift || 'A',
      password: '',
      confirmPassword: '',
    });
    setShowEditUserForm(true);
  };
  
  const handleAssignRole = (user) => {
    // For now, we'll just use the edit modal for role assignment
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      shift: user.shift || 'A',
      password: '',
      confirmPassword: '',
    });
    setShowEditUserForm(true);
  };

  const handleEditProfilePicture = (user) => {
    setEditingUser(user);
    setShowProfileEditor(true);
  };
  
  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      role: 'technician',
      shift: 'A',
      password: '',
      confirmPassword: '',
    });
    setErrors({});
  };

  // Render user list item
  const renderUserRow = (user) => (
    <tr key={user.id}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 relative group">
            <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200 cursor-pointer" 
              onClick={() => handleEditProfilePicture(user)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {user.name}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 capitalize">
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {user.shift || "Regular Duty"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.username}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button 
          onClick={() => handleAssignRole(user)}
          className="text-green-600 hover:text-green-900 mr-3"
        >
          Assign Role
        </button>
        <button 
          onClick={() => handleEditProfilePicture(user)}
          className="text-purple-600 hover:text-purple-900 mr-3"
        >
          Change Avatar
        </button>
        <button 
          onClick={() => handleEdit(user)}
          className="text-indigo-600 hover:text-indigo-900 mr-3"
        >
          Edit
        </button>
        <button 
          onClick={() => handleDelete(user.id)}
          className="text-red-600 hover:text-red-900"
        >
          Delete
        </button>
      </td>
    </tr>
  );

  // Render User Table
  const renderUserTable = () => (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shift
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentUsers.map(renderUserRow)}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Add User Form Modal
  const renderAddUserForm = () => (
    showAddUserForm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Add New User
            </h3>
            <button 
              onClick={() => setShowAddUserForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleAddUser}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.username ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {userRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="shift" className="block text-sm font-medium text-gray-700">
                  Shift
                </label>
                <select
                  id="shift"
                  name="shift"
                  value={formData.shift}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                  <option value="D">Shift D</option>
                  <option value="Regular">Regular Duty</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddUserForm(false)}
                className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  // Render Edit User Form Modal
  const renderEditUserForm = () => (
    showEditUserForm && editingUser && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              Edit User: {editingUser.name}
            </h3>
            <button 
              onClick={() => {
                setShowEditUserForm(false);
                setEditingUser(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleEditUser}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Username cannot be changed</p>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {userRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="shift" className="block text-sm font-medium text-gray-700">
                  Shift
                </label>
                <select
                  id="shift"
                  name="shift"
                  value={formData.shift}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                  <option value="D">Shift D</option>
                  <option value="Regular">Regular Duty</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowEditUserForm(false);
                  setEditingUser(null);
                }}
                className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">User & Role Management</h1>
        <div className="flex space-x-3">
          {/* Admin status indicator */}
          <div className={`px-3 py-2 rounded-md text-sm font-medium ${isAdmin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            Status: {isAdmin ? 'Admin' : 'Non-Admin'} 
            {adminModeEnabled && <span className="ml-1">(Override)</span>}
          </div>
          
          {/* Admin toggle button */}
          <button
            onClick={toggleAdminMode}
            className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              adminModeEnabled 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {adminModeEnabled ? 'Disable Admin Override' : 'Enable Admin Override'}
          </button>
          
          {/* Refresh button */}
          <button 
            onClick={fetchUsers}
            className="px-4 py-2 border rounded-md shadow-sm text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          {/* Add user button */}
          <button 
            onClick={() => {
              resetForm();
              setShowAddUserForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add User
          </button>
        </div>
      </div>
      
      {successMessage && (
        <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* Basic info panel */}
      <div className="p-4 bg-gray-50 rounded-md text-xs">
        <div className="flex justify-between">
          <span>Current Role: <strong>{user?.role || 'Unknown'}</strong></span>
          <button 
            onClick={fetchUsers}
            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded"
          >
            Refresh Users
          </button>
        </div>
      </div>
      
      {/* User List */}
      {renderUserTable()}

      {/* Modals */}
      {renderAddUserForm()}
      {renderEditUserForm()}

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor onClose={() => setShowProfileEditor(false)} />
      )}
    </div>
  );
};

export default UserManagement;