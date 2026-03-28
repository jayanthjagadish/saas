import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const PlanComparison: React.FC = () => {
  const [annual, setAnnual] = useState(false);
  const { data: plansResp, isLoading, error } = useQuery(['plans'], () => api.getPlans());
  const plans = plansResp?.data ?? [
    { id: 'free', name: 'Free', priceMonthly: 0, priceYearly: 0, features: { teamMembers: 3 } },
    { id: 'pro', name: 'Pro', priceMonthly: 20, priceYearly: 192, features: { teamMembers: 10, analytics: true, prioritySupport: true } },
    { id: 'enterprise', name: 'Enterprise', priceMonthly: 100, priceYearly: 960, features: { teamMembers: 100, analytics: true, prioritySupport: true, customIntegrations: true, customDomainSSO: true } },
  ];

  const isAuth = api.isAuthenticated();
  const { data: subResp } = useQuery(['subscription'], () => api.getSubscription(), { enabled: isAuth });
  const currentPlanId = subResp?.data?.planId ?? null;

  const priceFor = (plan: any) => {
    const monthly = plan.priceMonthly ?? 0;
    const yearly = plan.priceYearly ?? Math.round(monthly * 12 * 0.8);
    return annual ? yearly : monthly;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Compare Plans</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAnnual(!annual)}
            className="px-3 py-1 bg-sky-600 text-white rounded-md shadow-sm"
            aria-pressed={annual}
          >
            {annual ? 'Annual billing (20% off)' : 'Monthly billing'}
          </button>
          {annual && (
            <span className="text-sm text-green-600 font-medium">Save 20% on annual plans</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan: any) => (
          <div key={plan.id} className="bg-white rounded-lg shadow p-6 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{plan.name}</h2>
              {currentPlanId === plan.id && (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Current Plan</span>
              )}
            </div>

            <p className="mt-4 text-3xl font-extrabold">${priceFor(plan)}{!annual && <span className="text-sm font-medium">/mo</span>}{annual && <span className="text-sm font-medium">/yr</span>}</p>

            <ul className="mt-4 space-y-2 text-sm flex-1">
              <li>Team members: {plan.features?.teamMembers ?? '—'}</li>
              <li>Advanced analytics: {plan.features?.analytics ? 'Yes' : 'No'}</li>
              <li>Priority support: {plan.features?.prioritySupport ? 'Yes' : 'No'}</li>
              <li>Custom integrations: {plan.features?.customIntegrations ? 'Yes' : 'No'}</li>
              <li>Custom domain SSO: {plan.features?.customDomainSSO ? 'Yes' : 'No'}</li>
            </ul>

            <div className="mt-6 flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-white border border-sky-600 text-sky-600 rounded-md">{currentPlanId === plan.id ? 'Manage' : (plan.id === 'free' ? 'Get started' : 'Upgrade')}</button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Downgrade</button>
            </div>

            {isLoading && <p className="mt-3 text-sm text-gray-500">Loading pricing…</p>}
            {error && <p className="mt-3 text-sm text-red-500">Unable to load live pricing. Showing fallback values.</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanComparison;
