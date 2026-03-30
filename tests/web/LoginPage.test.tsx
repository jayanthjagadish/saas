import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../packages/web/src/context/AuthContext';
import LoginPage from '../../packages/web/src/pages/LoginPage';

const renderWithAuth = (loginMock: any) => {
  return render(
    <AuthContext.Provider value={{ user: null, token: null, login: loginMock, logout: async () => {} }}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

test('renders login form and calls login with correct values', async () => {
  const loginMock = vi.fn().mockResolvedValue(undefined);
  renderWithAuth(loginMock);

  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const rememberCheckbox = screen.getByRole('checkbox');
  const submitButton = screen.getByRole('button', { name: /login/i });

  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.click(rememberCheckbox);
  fireEvent.click(submitButton);

  expect(loginMock).toHaveBeenCalledWith('test@example.com', 'password123', true);
});
