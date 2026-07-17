import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobLevel: string;
  status: string;
  country: {
    name: string;
    currencyCode: string;
  };
  department: {
    name: string;
  };
  currentSalary: {
    amountUsd: string | number;
    currency: string;
  } | null;
}

interface EmployeeListResponse {
  data: EmployeeListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function formatUsd(value: string | number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value));
}

function App() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await fetch('/api/employees?limit=200');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: EmployeeListResponse = await response.json();
        setEmployees(payload.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employees');
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((employee) => employee.department.name))).sort();
  }, [employees]);

  const countries = useMemo(() => {
    return Array.from(new Set(employees.map((employee) => employee.country.name))).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        query.length === 0 ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.employeeCode.toLowerCase().includes(query);

      const matchesDepartment =
        departmentFilter === 'ALL' || employee.department.name === departmentFilter;

      const matchesCountry = countryFilter === 'ALL' || employee.country.name === countryFilter;

      return matchesSearch && matchesDepartment && matchesCountry;
    });
  }, [countryFilter, departmentFilter, employees, search]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f1ea', py: 5 }}>
      <Container maxWidth="xl">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #d8d1c4' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="h3" component="h1" gutterBottom>
                ACME Salary Management
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Employee Directory and Compensation Overview
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap">
              <Chip label={`${employees.length} loaded`} color="primary" variant="outlined" />
              <Chip label={`${filteredEmployees.length} visible`} color="success" variant="outlined" />
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 4, mb: 3 }}>
            <TextField
              fullWidth
              label="Search employees"
              placeholder="Name, email, or employee code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="department-filter-label">Department</InputLabel>
              <Select
                labelId="department-filter-label"
                value={departmentFilter}
                label="Department"
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
                <MenuItem value="ALL">All departments</MenuItem>
                {departments.map((department) => (
                  <MenuItem key={department} value={department}>
                    {department}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel id="country-filter-label">Country</InputLabel>
              <Select
                labelId="country-filter-label"
                value={countryFilter}
                label="Country"
                onChange={(event) => setCountryFilter(event.target.value)}
              >
                <MenuItem value="ALL">All countries</MenuItem>
                {countries.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6 }}>
              <CircularProgress size={24} />
              <Typography>Loading employees...</Typography>
            </Box>
          )}

          {error && !loading && (
            <Alert severity="error">Failed to load employee data: {error}</Alert>
          )}

          {!loading && !error && (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5ded2' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Current Salary</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>
                          {employee.firstName} {employee.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {employee.employeeCode} • {employee.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{employee.department.name}</TableCell>
                      <TableCell>
                        {employee.country.name} ({employee.country.currencyCode})
                      </TableCell>
                      <TableCell>{employee.jobLevel}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={employee.status}
                          color={employee.status === 'ACTIVE' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatUsd(employee.currentSalary?.amountUsd ?? null)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography color="text.secondary">No employees match the current filters.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default App;
