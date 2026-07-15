import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.js';

describe('App Component', () => {
  it('renders the title', () => {
    render(<App />);
    const title = screen.getByText('ACME Salary Management');
    expect(title).toBeDefined();
  });

  it('displays connectivity check message', () => {
    render(<App />);
    const subtitle = screen.getByText(/Employee Salary Management System/);
    expect(subtitle).toBeDefined();
  });
});
