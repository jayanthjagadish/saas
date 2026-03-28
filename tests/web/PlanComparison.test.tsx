import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlanComparison from '../../packages/web/src/components/PlanComparison';

// Mock the api module used by the component
vi.mock('../../packages/web/src/services/api', () => ({
  default: {
    getPlans: vi.fn().mockResolvedValue({ data: [
      { id: 'free', name: 'Free', priceMonthly: 0, priceYearly: 0, features: { teamMembers: 3 } },
      { id: 'pro', name: 'Pro', priceMonthly: 20, priceYearly: 192, features: { teamMembers: 10, analytics: true, prioritySupport: true } },
      { id: 'enterprise', name: 'Enterprise', priceMonthly: 100, priceYearly: 960, features: { teamMembers: 100, analytics: true, prioritySupport: true, customIntegrations: true, customDomainSSO: true } },
    ] }),
    isAuthenticated: vi.fn().mockReturnValue(true),
    getSubscription: vi.fn().mockResolvedValue({ data: { planId: 'pro' } }),
  }
}));

const queryClient = new QueryClient();

describe('PlanComparison', () => {
  it('renders plan columns and highlights current plan', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PlanComparison />
      </QueryClientProvider>
    );

    // wait for plan names to appear
    expect(await screen.findByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();

    // current plan badge
    expect(await screen.findAllByText('Current Plan')).toHaveLength(1);

    // buttons present
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
