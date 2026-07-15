import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, CircularProgress, Box } from '@mui/material';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: HealthResponse = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          ACME Salary Management
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Employee Salary Management System
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Backend Connectivity
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} />
              <Typography>Checking backend...</Typography>
            </Box>
          )}

          {error && (
            <Typography color="error">
              ✗ {error}
            </Typography>
          )}

          {health && (
            <Box>
              <Typography color="success.main">
                ✓ Backend is healthy
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, fontFamily: 'monospace' }}>
                Status: {health.status}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                Uptime: {health.uptime.toFixed(2)}s
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default App;
