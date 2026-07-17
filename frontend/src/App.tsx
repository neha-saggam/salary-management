import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
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

interface AnalyticsSummary {
  totalEmployees: number;
  averageSalaryUsd: number;
  medianSalaryUsd: number;
  minSalaryUsd: number;
  maxSalaryUsd: number;
  totalPayrollUsd: number;
  departmentCount: number;
  countryCount: number;
}

interface BreakdownRow {
  employeeCount: number;
  averageSalaryUsd: number;
  totalPayrollUsd: number;
  departmentName?: string;
  countryName?: string;
  jobLevel?: string;
}

function formatUsd(value: string | number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value));
}

function toPatchPayload(draft: EmployeeListItem, original: EmployeeListItem) {
  const payload: Record<string, string> = {};

  if (draft.firstName !== original.firstName) payload.firstName = draft.firstName;
  if (draft.lastName !== original.lastName) payload.lastName = draft.lastName;
  if (draft.email !== original.email) payload.email = draft.email;
  if (draft.jobLevel !== original.jobLevel) payload.jobLevel = draft.jobLevel;
  if (draft.status !== original.status) payload.status = draft.status;

  return payload;
}

function App() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EmployeeListItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [departmentBreakdown, setDepartmentBreakdown] = useState<BreakdownRow[]>([]);
  const [countryBreakdown, setCountryBreakdown] = useState<BreakdownRow[]>([]);
  const [levelBreakdown, setLevelBreakdown] = useState<BreakdownRow[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

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

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [summaryRes, deptRes, countryRes, levelRes] = await Promise.all([
          fetch('/api/salary-analytics/summary'),
          fetch('/api/salary-analytics/by-department'),
          fetch('/api/salary-analytics/by-country'),
          fetch('/api/salary-analytics/by-level')
        ]);

        if (!summaryRes.ok || !deptRes.ok || !countryRes.ok || !levelRes.ok) {
          throw new Error('Unable to load analytics');
        }

        const [summaryPayload, deptPayload, countryPayload, levelPayload] = await Promise.all([
          summaryRes.json(),
          deptRes.json(),
          countryRes.json(),
          levelRes.json()
        ]);

        setSummary(summaryPayload as AnalyticsSummary);
        setDepartmentBreakdown(Array.isArray(deptPayload) ? (deptPayload as BreakdownRow[]) : []);
        setCountryBreakdown(Array.isArray(countryPayload) ? (countryPayload as BreakdownRow[]) : []);
        setLevelBreakdown(Array.isArray(levelPayload) ? (levelPayload as BreakdownRow[]) : []);
        setAnalyticsError(null);
      } catch (err) {
        setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics');
      }
    };

    loadAnalytics();
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

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployee) {
      setEditDraft(selectedEmployee);
      setSaveError(null);
      setSaveSuccess(null);
    }
  }, [selectedEmployee]);

  const handleSave = async () => {
    if (!selectedEmployee || !editDraft) return;

    const payload = toPatchPayload(editDraft, selectedEmployee);
    if (Object.keys(payload).length === 0) {
      setSaveSuccess('No changes to save.');
      setSaveError(null);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Update failed (${response.status})`);
      }

      const updated = (await response.json()) as Partial<EmployeeListItem> & { id: string };
      const merged = { ...selectedEmployee, ...updated } as EmployeeListItem;
      setEmployees((prev) => prev.map((emp) => (emp.id === merged.id ? merged : emp)));
      setEditDraft(merged);
      setSaveSuccess('Employee updated successfully.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to update employee');
    } finally {
      setSaving(false);
    }
  };

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
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: '1px solid #e5ded2', flex: 1.5 }}
              >
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
                      <TableRow
                        key={employee.id}
                        hover
                        selected={employee.id === selectedEmployeeId}
                        onClick={() => setSelectedEmployeeId(employee.id)}
                        sx={{ cursor: 'pointer' }}
                      >
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

              <Paper elevation={0} sx={{ border: '1px solid #e5ded2', p: 3, flex: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Employee Detail / Edit
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {!selectedEmployee || !editDraft ? (
                  <Typography color="text.secondary">Select an employee from the table to view and edit details.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {saveError && <Alert severity="error">{saveError}</Alert>}
                    {saveSuccess && <Alert severity="success">{saveSuccess}</Alert>}

                    <TextField
                      label="First name"
                      value={editDraft.firstName}
                      onChange={(event) =>
                        setEditDraft((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))
                      }
                    />
                    <TextField
                      label="Last name"
                      value={editDraft.lastName}
                      onChange={(event) =>
                        setEditDraft((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))
                      }
                    />
                    <TextField
                      label="Email"
                      value={editDraft.email}
                      onChange={(event) =>
                        setEditDraft((prev) => (prev ? { ...prev, email: event.target.value } : prev))
                      }
                    />

                    <FormControl>
                      <InputLabel id="edit-level-label">Job level</InputLabel>
                      <Select
                        labelId="edit-level-label"
                        label="Job level"
                        value={editDraft.jobLevel}
                        onChange={(event) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, jobLevel: String(event.target.value) } : prev
                          )
                        }
                      >
                        {['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((level) => (
                          <MenuItem key={level} value={level}>
                            {level}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <InputLabel id="edit-status-label">Status</InputLabel>
                      <Select
                        labelId="edit-status-label"
                        label="Status"
                        value={editDraft.status}
                        onChange={(event) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, status: String(event.target.value) } : prev
                          )
                        }
                      >
                        <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                        <MenuItem value="TERMINATED">TERMINATED</MenuItem>
                      </Select>
                    </FormControl>

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Employee Code: {editDraft.employeeCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Department: {editDraft.department.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Country: {editDraft.country.name}
                      </Typography>
                    </Box>

                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Stack>
                )}
              </Paper>
            </Stack>
          )}

          <Paper elevation={0} sx={{ mt: 4, p: 3, borderRadius: 3, border: '1px solid #d8d1c4' }}>
            <Typography variant="h5" gutterBottom>
              Salary Analytics Dashboard
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {analyticsError && <Alert severity="error">Analytics error: {analyticsError}</Alert>}

            {summary && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
                <Chip label={`Employees: ${summary.totalEmployees}`} color="primary" />
                <Chip label={`Avg Salary: ${formatUsd(summary.averageSalaryUsd)}`} color="success" />
                <Chip label={`Median: ${formatUsd(summary.medianSalaryUsd)}`} />
                <Chip label={`Payroll: ${formatUsd(summary.totalPayrollUsd)}`} color="secondary" />
              </Stack>
            )}

            <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5ded2', flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  By Department
                </Typography>
                {departmentBreakdown.slice(0, 6).map((row) => (
                  <Typography key={row.departmentName} variant="body2" sx={{ mb: 0.5 }}>
                    {row.departmentName}: {formatUsd(row.averageSalaryUsd)} avg ({row.employeeCount} employees)
                  </Typography>
                ))}
              </Paper>

              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5ded2', flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  By Country
                </Typography>
                {countryBreakdown.slice(0, 6).map((row) => (
                  <Typography key={row.countryName} variant="body2" sx={{ mb: 0.5 }}>
                    {row.countryName}: {formatUsd(row.averageSalaryUsd)} avg ({row.employeeCount} employees)
                  </Typography>
                ))}
              </Paper>

              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5ded2', flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  By Job Level
                </Typography>
                {levelBreakdown.map((row) => (
                  <Typography key={row.jobLevel} variant="body2" sx={{ mb: 0.5 }}>
                    {row.jobLevel}: {formatUsd(row.averageSalaryUsd)} avg ({row.employeeCount} employees)
                  </Typography>
                ))}
              </Paper>
            </Stack>
          </Paper>
        </Paper>
      </Container>
    </Box>
  );
}

export default App;
