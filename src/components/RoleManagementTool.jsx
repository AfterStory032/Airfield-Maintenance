import React, { useState, useEffect } from 'react';
import { updateUserRole, updateUserShift } from '../lib/userManagement';
import { supabase } from '../lib/supabase';
import { Box, Button, Container, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CircularProgress, Alert, Snackbar, Grid } from '@mui/material';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'shift_leader', label: 'Shift Leader' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'technician', label: 'Technician' },
  { value: 'viewer', label: 'Viewer' }
];

const SHIFTS = [
  { value: 'A', label: 'Shift A' },
  { value: 'B', label: 'Shift B' },
  { value: 'C', label: 'Shift C' },
  { value: 'D', label: 'Shift D' },
  { value: 'Regular', label: 'Regular' }
];

export default function RoleManagementTool() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [currentUser, setCurrentUser] = useState(null);

  // Function to load all users
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current user for permission check
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Get auth session for API call
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        setError('Authentication required to load users');
        setLoading(false);
        return;
      }

      // Skip edge functions entirely and get users directly from database
      console.log("Skipping edge functions and loading users directly");
      
      // Try to get the current user's info first - this works with both regular and admin access
      const { data: { user: currentUserData } } = await supabase.auth.getUser();
      
      // Create a basic array with at least the current user
      let users = [];
      
      if (currentUserData) {
        users.push({
          id: currentUserData.id,
          username: currentUserData.email?.split('@')[0] || 'unknown',
          name: currentUserData.user_metadata?.name || currentUserData.email?.split('@')[0] || 'unknown',
          email: currentUserData.email || 'unknown',
          role: currentUserData.user_metadata?.role || 'viewer',
        });
      }
      
      // If user is admin, try to get all users using the existing getAllUsers function
      if (currentUserData?.user_metadata?.role === 'admin') {
        try {
          // Import getAllUsers function from userManagement.js
          const { getAllUsers } = await import('../lib/userManagement');
          
          // Use the bypass edge function option to get users directly from database
          const allUsers = await getAllUsers({ 
            bypassEdgeFunction: true,
            fallbackToMock: true 
          });
          
          if (allUsers && allUsers.length > 0) {
            users = allUsers;
            console.log("Got all users from getAllUsers function:", users.length);
          } else {
            console.warn("Could not fetch all users, limiting to current user only");
          }
        } catch (err) {
          console.error("Error using getAllUsers function:", err);
          setError("Admin access is limited. Only showing your user.");
        }
      } else {
        setError("You don't have admin access. Only showing your user.");
      }
      
      // Map users to our format
      const mappedUsers = usersData.users.map(user => ({
        id: user.id,
        username: user.email?.split('@')[0] || 'unknown',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'unknown',
        email: user.email || 'unknown',
        role: user.user_metadata?.role || 'viewer',
      }));
      
      // Get shifts from the dedicated table
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('app_cb8217b8f2_user_shifts')
        .select('*');
      
      // Create a map of userId to shift
      const shiftMap = {};
      if (!shiftsError && shiftsData) {
        shiftsData.forEach(shiftRecord => {
          shiftMap[shiftRecord.user_id] = shiftRecord.shift;
        });
      } else {
        console.warn("Could not fetch shifts:", shiftsError);
      }
      
      // Merge shift data with user data
      const usersWithShifts = mappedUsers.map(user => ({
        ...user,
        shift: shiftMap[user.id] || 'Regular'
      }));
      
      setUsers(usersWithShifts);
      console.log('Users loaded directly:', usersWithShifts.length);
      return;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      if (data.success && Array.isArray(data.users)) {
        // Get shifts from the new dedicated table
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
          const usersWithShifts = data.users.map(user => ({
            ...user,
            shift: shiftMap[user.id] || user.shift || 'Regular'
          }));
          
          setUsers(usersWithShifts);
          console.log('Users loaded with shifts:', usersWithShifts.length);
        } else {
          // If shifts query fails, just use the original data
          console.warn("Failed to get shifts data:", shiftsError);
          setUsers(data.users);
          console.log('Users loaded (without shifts):', data.users.length);
        }
        
        // Show warning if limited view
        if (data.limited) {
          setError(`Limited view: ${data.error}`);
        }
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError(`Failed to load users: ${error.message}`);
      
      // Fallback to just showing the current user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const singleUser = {
            id: user.id,
            username: user.email?.split('@')[0] || 'unknown',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'unknown',
            email: user.email || 'unknown',
            role: user.user_metadata?.role || 'viewer',
          };
          
          setUsers([singleUser]);
          setError('Limited to viewing your own user. You may not have admin rights.');
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load users when component mounts
  useEffect(() => {
    loadUsers();
  }, []);

  // Check if current user has admin role - shift leaders no longer have permission
  const isAdmin = currentUser?.user_metadata?.role === 'admin';
  const canManageRoles = isAdmin; // Only admins can manage roles now

  // Function to handle role change
  const handleRoleChange = async (userId, newRole, shift = null) => {
    try {
      setLoading(true);
      
      // First make a deep copy of the users array
      const updatedUsers = JSON.parse(JSON.stringify(users));
      
      // Find the user to update
      const userIndex = updatedUsers.findIndex(user => user.id === userId);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Update user role
      const { success, error } = await updateUserRole(userId, newRole, null);
      
      if (!success) {
        throw new Error(error || 'Failed to update role');
      }
      
      // Update local state
      updatedUsers[userIndex].role = newRole;
      setUsers(updatedUsers);
      
      // Show success notification
      setNotification({
        open: true, 
        message: `Role updated successfully for ${updatedUsers[userIndex].email}`, 
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error updating role:', error);
      setNotification({
        open: true, 
        message: `Error updating role: ${error.message}`, 
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle shift change
  const handleShiftChange = async (userId, newShift) => {
    try {
      setLoading(true);
      
      // First make a deep copy of the users array
      const updatedUsers = JSON.parse(JSON.stringify(users));
      
      // Find the user to update
      const userIndex = updatedUsers.findIndex(user => user.id === userId);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Update directly in the database first to avoid edge function issues
      const { error: upsertError } = await supabase
        .from('app_cb8217b8f2_user_shifts')
        .upsert({ 
          user_id: userId,
          shift: newShift,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id'
        });
        
      if (upsertError) {
        throw new Error(upsertError.message || 'Failed to update shift in database');
      }
      
      // Only try the function if direct update worked
      try {
        // Also try to update with the function (non-blocking)
        updateUserShift(userId, newShift).catch(e => 
          console.warn("Background shift update via function failed:", e)
        );
      } catch (functionError) {
        console.warn("Error calling shift update function:", functionError);
        // We already updated directly, so we can continue
      }
      
      // Update local state immediately after direct DB update
      updatedUsers[userIndex].shift = newShift;
      setUsers(updatedUsers);
      
      // Show success notification
      setNotification({
        open: true, 
        message: `Shift updated successfully for ${updatedUsers[userIndex].email}`, 
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error updating shift:', error);
      setNotification({
        open: true, 
        message: `Error updating shift: ${error.message}`, 
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // If user cannot manage roles, show message
  if (currentUser && !canManageRoles) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Role Management
          </Typography>
          <Alert severity="warning">
            You don't have permission to manage user roles. This feature is restricted to administrators only.
          </Alert>
        </Paper>
      </Container>
    );
  }

  // Determine which roles this user can assign based on their role
  const getAssignableRoles = () => {
    if (isAdmin) {
      // Admins can assign any role
      return ROLES;
    }
    return []; // No assignable roles for other users
  };

  // Get the list of roles this user can assign
  const assignableRoles = getAssignableRoles();

  // Check if a particular user is modifiable by the current user
  const canModifyUser = (userRole) => {
    if (isAdmin) {
      // Admins can modify any user
      return true;
    }
    return false;
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Role Management
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Button 
          variant="contained" 
          onClick={loadUsers} 
          disabled={loading}
          sx={{ mb: 2 }}
        >
          Refresh Users
        </Button>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.shift || 'Regular'}</TableCell>
                    <TableCell>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <FormControl size="small" fullWidth>
                            <InputLabel id={`role-select-${user.id}`}>Change Role</InputLabel>
                            <Select
                              labelId={`role-select-${user.id}`}
                              value=""
                              label="Change Role"
                              onChange={(e) => handleRoleChange(user.id, e.target.value, null)}
                              disabled={loading || !canModifyUser(user.role)}
                            >
                              {assignableRoles.map((role) => (
                                <MenuItem 
                                  key={role.value} 
                                  value={role.value}
                                  disabled={role.value === user.role}
                                >
                                  {role.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl size="small" fullWidth>
                            <InputLabel id={`shift-select-${user.id}`}>Change Shift</InputLabel>
                            <Select
                              labelId={`shift-select-${user.id}`}
                              value=""
                              label="Change Shift"
                              onChange={(e) => handleShiftChange(user.id, e.target.value)}
                              disabled={loading || !canModifyUser(user.role)}
                            >
                              {SHIFTS.map((shift) => (
                                <MenuItem 
                                  key={shift.value} 
                                  value={shift.value}
                                  disabled={shift.value === user.shift}
                                >
                                  {shift.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}