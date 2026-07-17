import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App Component', () => {
  it('renders the title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { page: 1, limit: 200, total: 0, pages: 0 } })
      })
    );

    render(<App />);
    const title = await screen.findByText('ACME Salary Management');
    expect(title).toBeDefined();
    await screen.findByText('No employees match the current filters.');
  });

  it('renders employee list controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { page: 1, limit: 200, total: 0, pages: 0 } })
      })
    );

    render(<App />);
    expect(screen.getByLabelText('Search employees')).toBeDefined();
    expect(await screen.findByText('No employees match the current filters.')).toBeDefined();
  });

  it('filters employees by search text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
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
          ],
          pagination: { page: 1, limit: 200, total: 2, pages: 1 }
        })
      })
    );

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
});
