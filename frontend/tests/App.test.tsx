import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

const sampleEmployees = [
  {
    id: '1',
    employeeCode: 'EMP0001',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@acme.com',
    jobLevel: 'L3',
    status: 'ACTIVE',
    country: { name: 'Canada', currencyCode: 'CAD' },
    department: { name: 'Engineering' },
    currentSalary: { amountUsd: '85000', currency: 'CAD' }
  },
  {
    id: '2',
    employeeCode: 'EMP0002',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@acme.com',
    jobLevel: 'L2',
    status: 'ACTIVE',
    country: { name: 'India', currencyCode: 'INR' },
    department: { name: 'Finance' },
    currentSalary: { amountUsd: '22000', currency: 'INR' }
  }
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockEmployeeResponse(data: Array<Record<string, unknown>>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/employees')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data,
          pagination: { page: 1, limit: 200, total: data.length, pages: 1 }
        })
      });
    }

    if (url.includes('/api/salary-analytics/summary')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          totalEmployees: 10000,
          averageSalaryUsd: 78000,
          medianSalaryUsd: 69000,
          minSalaryUsd: 9000,
          maxSalaryUsd: 245000,
          totalPayrollUsd: 780000000,
          departmentCount: 7,
          countryCount: 6
        })
      });
    }

    if (url.includes('/api/salary-analytics/by-department')) {
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    }

    if (url.includes('/api/salary-analytics/by-country')) {
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    }

    if (url.includes('/api/salary-analytics/by-level')) {
      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  vi.stubGlobal('fetch', fetchMock);
}

function mockAppFetchWithAnalytics(options?: { analyticsFails?: boolean }) {
  const analyticsFails = options?.analyticsFails ?? false;
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/employees')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: sampleEmployees,
          pagination: { page: 1, limit: 200, total: sampleEmployees.length, pages: 1 }
        })
      });
    }

    if (analyticsFails && url.includes('/api/salary-analytics/')) {
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
    }

    if (url.includes('/api/salary-analytics/summary')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          totalEmployees: 10000,
          averageSalaryUsd: 78000,
          medianSalaryUsd: 69000,
          minSalaryUsd: 9000,
          maxSalaryUsd: 245000,
          totalPayrollUsd: 780000000,
          departmentCount: 7,
          countryCount: 6
        })
      });
    }

    if (url.includes('/api/salary-analytics/by-department')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { departmentName: 'Engineering', averageSalaryUsd: 98000, employeeCount: 2800, totalPayrollUsd: 274400000 },
          { departmentName: 'Finance', averageSalaryUsd: 76000, employeeCount: 900, totalPayrollUsd: 68400000 }
        ]
      });
    }

    if (url.includes('/api/salary-analytics/by-country')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { countryName: 'Canada', averageSalaryUsd: 84000, employeeCount: 1400, totalPayrollUsd: 117600000 },
          { countryName: 'India', averageSalaryUsd: 24000, employeeCount: 2200, totalPayrollUsd: 52800000 }
        ]
      });
    }

    if (url.includes('/api/salary-analytics/by-level')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { jobLevel: 'L1', averageSalaryUsd: 32000, employeeCount: 3000, totalPayrollUsd: 96000000 },
          { jobLevel: 'L2', averageSalaryUsd: 51000, employeeCount: 2400, totalPayrollUsd: 122400000 }
        ]
      });
    }

    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mockDeferredEmployeeResponse() {
  let resolveResponse: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
  const responsePromise = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
    resolveResponse = resolve;
  });

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/employees')) {
        return responsePromise;
      }

      if (url.includes('/api/salary-analytics/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalEmployees: 10000,
            averageSalaryUsd: 78000,
            medianSalaryUsd: 69000,
            minSalaryUsd: 9000,
            maxSalaryUsd: 245000,
            totalPayrollUsd: 780000000,
            departmentCount: 7,
            countryCount: 6
          })
        });
      }

      if (url.includes('/api/salary-analytics/')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    })
  );

  return {
    resolveResponse,
    responsePromise
  };
}

describe('App Component', () => {
  it('renders the title', async () => {
    mockEmployeeResponse([]);

    render(<App />);
    const title = await screen.findByText('ACME Salary Management');
    expect(title).toBeDefined();
    await screen.findByText('No employees match the current filters.');
  });

  it('renders employee list controls', async () => {
    mockEmployeeResponse([]);

    render(<App />);
    expect(screen.getByLabelText('Search employees')).toBeDefined();
    expect(await screen.findByText('No employees match the current filters.')).toBeDefined();
  });

  it('shows loading state before employees are fetched', async () => {
    const deferred = mockDeferredEmployeeResponse();

    render(<App />);

    expect(screen.getByText('Loading employees...')).toBeDefined();

    await act(async () => {
      deferred.resolveResponse({
        ok: true,
        json: async () => ({ data: [], pagination: { page: 1, limit: 200, total: 0, pages: 0 } })
      });
      await deferred.responsePromise;
    });

    await screen.findByText('No employees match the current filters.');
  });

  it('shows an error state when the employee API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      })
    );

    render(<App />);

    expect(await screen.findByText(/Failed to load employee data:/)).toBeDefined();
  });

  it('filters employees by search text', async () => {
    mockEmployeeResponse(sampleEmployees);

    render(<App />);

    await screen.findByText('Alice Johnson');
    fireEvent.change(screen.getByLabelText('Search employees'), {
      target: { value: 'alice' }
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeDefined();
      expect(screen.queryByText('Bob Smith')).toBeNull();
    });
  });

  it('filters employees by department and country', async () => {
    mockEmployeeResponse(sampleEmployees);

    render(<App />);

    expect(await screen.findByText('Alice Johnson')).toBeDefined();

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByRole('option', { name: 'Engineering' }));

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeDefined();
      expect(screen.queryByText('Bob Smith')).toBeNull();
    });

    fireEvent.mouseDown(screen.getByLabelText('Department'));
    fireEvent.click(await screen.findByRole('option', { name: 'All departments' }));

    fireEvent.mouseDown(screen.getByLabelText('Country'));
    fireEvent.click(await screen.findByRole('option', { name: 'India' }));

    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeDefined();
      expect(screen.queryByText('Alice Johnson')).toBeNull();
    });
  });

  it('updates visible and loaded counters when filters change', async () => {
    mockEmployeeResponse(sampleEmployees);

    render(<App />);

    expect(await screen.findByText('2 loaded')).toBeDefined();
    expect(screen.getByText('2 visible')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Search employees'), {
      target: { value: 'alice' }
    });

    await waitFor(() => {
      expect(screen.getByText('1 visible')).toBeDefined();
      expect(screen.getByText('2 loaded')).toBeDefined();
    });
  });

  it('shows selected employee details in the edit panel', async () => {
    mockAppFetchWithAnalytics();

    render(<App />);

    const alice = await screen.findByText('Alice Johnson');
    fireEvent.click(alice);

    expect(await screen.findByDisplayValue('Alice')).toBeDefined();
    expect(screen.getByDisplayValue('Johnson')).toBeDefined();
    expect(screen.getByDisplayValue('alice@acme.com')).toBeDefined();
    expect(screen.getByText('Employee Code: EMP0001')).toBeDefined();
  });

  it('saves employee edits and shows success message', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/employees?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: sampleEmployees,
            pagination: { page: 1, limit: 200, total: 2, pages: 1 }
          })
        });
      }

      if (url.includes('/api/employees/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...sampleEmployees[0],
            firstName: 'Alicia'
          })
        });
      }

      if (url.includes('/api/salary-analytics/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalEmployees: 10000,
            averageSalaryUsd: 78000,
            medianSalaryUsd: 69000,
            minSalaryUsd: 9000,
            maxSalaryUsd: 245000,
            totalPayrollUsd: 780000000,
            departmentCount: 7,
            countryCount: 6
          })
        });
      }

      if (url.includes('/api/salary-analytics/')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByText('Alice Johnson'));
    fireEvent.change(await screen.findByLabelText('First name'), {
      target: { value: 'Alicia' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Employee updated successfully.')).toBeDefined();
    expect(await screen.findByDisplayValue('Alicia')).toBeDefined();

    expect(fetchMock).toHaveBeenCalledWith('/api/employees/1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('shows update error when save fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/employees?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: sampleEmployees,
            pagination: { page: 1, limit: 200, total: 2, pages: 1 }
          })
        });
      }

      if (url.includes('/api/employees/1')) {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ error: 'Email already in use' })
        });
      }

      if (url.includes('/api/salary-analytics/summary')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalEmployees: 10000,
            averageSalaryUsd: 78000,
            medianSalaryUsd: 69000,
            minSalaryUsd: 9000,
            maxSalaryUsd: 245000,
            totalPayrollUsd: 780000000,
            departmentCount: 7,
            countryCount: 6
          })
        });
      }

      if (url.includes('/api/salary-analytics/')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByText('Alice Johnson'));
    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'conflict@acme.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Update failed (409)')).toBeDefined();
  });

  it('renders analytics dashboard summary and breakdown cards', async () => {
    mockAppFetchWithAnalytics();

    render(<App />);

    expect(await screen.findByText('Salary Analytics Dashboard')).toBeDefined();
    expect(await screen.findByText('Employees: 10000')).toBeDefined();
    expect(screen.getByText(/Engineering:/)).toBeDefined();
    expect(screen.getByText(/Canada:/)).toBeDefined();
    expect(screen.getByText(/L1:/)).toBeDefined();
  });

  it('shows analytics error when analytics APIs fail', async () => {
    mockAppFetchWithAnalytics({ analyticsFails: true });

    render(<App />);

    expect(await screen.findByText(/Analytics error:/)).toBeDefined();
  });
});
