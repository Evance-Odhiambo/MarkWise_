"use-client";
import React from "react";

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <h1 className="text-4xl font-bold text-emerald-700">Pricing</h1>
        <p className="text-lg text-gray-700">
          Our pricing plans are designed to accommodate institutions of all
          sizes. Choose the plan that best fits your needs and budget.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800">Basic Plan</h2>
            <p className="mt-2 text-gray-600">$49/month</p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Access to core features</li>
              <li>Basic support</li>
              <li>Up to 100 users</li>
            </ul>
            <button className="mt-6 w-full rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors">
              Choose Basic
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800">Pro Plan</h2>
            <p className="mt-2 text-gray-600">$99/month</p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>All features in Basic</li>
              <li>Priority support</li>
              <li>Up to 500 users</li>
            </ul>
            <button className="mt-6 w-full rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors">
              Choose Pro
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800">
              Enterprise Plan
            </h2>
            <p className="mt-2 text-gray-600">Contact us for pricing</p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>All features in Pro</li>
              <li>Dedicated account manager</li>
              <li>Unlimited users</li>
            </ul>
            <button className="mt-6 w-full rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
