import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Typography, TextField, Alert } from '@mui/material';
import { debugUserAuth, checkUserByEmail } from '../lib/debugAuth';
import { useAuth } from '../context/AuthContext';

const AuthDebugger = () => {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [emailToCheck, setEmailToCheck] = useState('');
  const [error, setError] = useState(null);

  const runAuthDebug = async () => {
    try {
      setError(null);
      const data = await debugUserAuth();
      setResults(data);
      console.log("Debug results:", data);
    } catch (err) {
      setError(err.message);
      console.error("Debug error:", err);
    }
  };

  const checkEmail = async () => {
    try {
      setError(null);
      const data = await checkUserByEmail(emailToCheck);
      setResults(data);
      console.log("Email check results:", data);
    } catch (err) {
      setError(err.message);
      console.error("Check email error:", err);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Authentication Debugger
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Currently Logged In User:
            </Typography>
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
              {user ? JSON.stringify(user, null, 2) : "Not logged in"}
            </pre>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={runAuthDebug}
            sx={{ mb: 3 }}
          >
            Debug Current User Auth Data
          </Button>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Check User by Email:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Email to check"
                value={emailToCheck}
                onChange={(e) => setEmailToCheck(e.target.value)}
                fullWidth
              />
              <Button 
                variant="contained" 
                onClick={checkEmail}
              >
                Check
              </Button>
            </Box>
          </Box>

          {results && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Debug Results:
              </Typography>
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthDebugger;