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
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data,
        pagination: { page: 1, limit: 200, total: data.length, pages: 1 }
      })
    })
  );
}

function mockDeferredEmployeeResponse() {
  let resolveResponse: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => {};
  const responsePromise = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
    resolveResponse = resolve;
  });

  vi.stubGlobal('fetch', vi.fn().mockReturnValue(responsePromise));

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
    mockEmployeeResponse(sampleEmployees);

    render(<App />);

    const alice = await screen.findByText('Alice Johnson');
    fireEvent.click(alice);

    expect(await screen.findByDisplayValue('Alice')).toBeDefined();
    expect(screen.getByDisplayValue('Johnson')).toBeDefined();
    expect(screen.getByDisplayValue('alice@acme.com')).toBeDefined();
    expect(screen.getByText('Employee Code: EMP0001')).toBeDefined();
  });

  it('saves employee edits and shows success message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: sampleEmployees,
          pagination: { page: 1, limit: 200, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...sampleEmployees[0],
          firstName: 'Alicia'
        })
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.click(await screen.findByText('Alice Johnson'));
    fireEvent.change(await screen.findByLabelText('First name'), {
      target: { value: 'Alicia' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Employee updated successfully.')).toBeDefined();
    await screen.findByText('Alicia Johnson');

    expect(fetchMock).toHaveBeenCalledWith('/api/employees/1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('shows update error when save fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: sampleEmployees,
          pagination: { page: 1, limit: 200, total: 2, pages: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Email already in use' })
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
});
