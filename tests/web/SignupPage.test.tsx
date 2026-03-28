import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import SignupPage from '../../packages/web/src/pages/SignupPage';
import api from '../../packages/web/src/services/api';

const queryClient = new QueryClient();

describe('SignupPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders form fields and password strength', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company name/i)).toBeInTheDocument();
  });

  it('updates password strength meter', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const pw = screen.getByLabelText(/Password/i);
    await userEvent.type(pw, 'Short1!');
    expect(screen.getByText(/Strength:/i)).toBeInTheDocument();

    await userEvent.clear(pw);
    await userEvent.type(pw, 'LongEnoughPassword1!');
    expect(screen.getByText(/Strength:/i)).toBeInTheDocument();
  });

  it('calls signup api on submit and shows success message', async () => {
    const signupSpy = vi.spyOn(api, 'signup').mockResolvedValue({ data: {} } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await userEvent.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'LongEnough1!A');
    await userEvent.type(screen.getByLabelText(/Company name/i), 'ACME Corp');

    userEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(signupSpy).toHaveBeenCalledWith({ email: 'test@example.com', password: 'LongEnough1!A', company_name: 'ACME Corp' });
      expect(screen.getByText(/Check your email to verify your account/i)).toBeInTheDocument();
    });
  });
});
