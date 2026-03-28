import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '../../packages/web/src/pages/CheckoutPage';
import api from '../../packages/web/src/services/api';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../packages/web/src/services/api');

const mockApi = api as unknown as any;

describe('CheckoutPage', () => {
  beforeEach(() => {
    mockApi.getPlans = vi.fn().mockResolvedValue({ data: [ { id: 'pro', name: 'Pro', priceMonthly: 20, priceYearly: 192, features: ['A','B'] } ] });
  });

  it('renders selected plan and updates billing toggle', async () => {
    render(
      <MemoryRouter initialEntries={["/checkout?plan_id=pro"]}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(/Amount:/)).toHaveTextContent('Amount: $20');

    const annualRadio = screen.getByLabelText(/Annual/i) as HTMLInputElement;
    fireEvent.click(annualRadio);

    await waitFor(() => expect(screen.getByText(/Amount:/)).toHaveTextContent('Amount: $192'));
  });
});
