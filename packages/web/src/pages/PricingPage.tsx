import React from 'react';
import PlanComparison from '../components/PlanComparison';

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <PlanComparison />
      </div>
    </div>
  );
};

export default PricingPage;
