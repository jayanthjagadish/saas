import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import type { Invoice, BillingEvent } from '../types/api';

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const styles = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-24" />
        </td>
      ))}
    </tr>
  );
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      <div className="h-4 bg-gray-200 rounded w-48" />
      <div className="h-12 bg-gray-100 rounded" />
      <div className="h-12 bg-gray-100 rounded" />
    </div>
  );
}

function eventIcon(type: BillingEvent['type']) {
  switch (type) {
    case 'renewal':      return '🔄';
    case 'cancellation': return '⚠️';
    case 'trial_end':    return 'ℹ️';
    case 'invoice_due':  return '📄';
  }
}

function eventColorClass(type: BillingEvent['type']) {
  switch (type) {
    case 'renewal':      return 'border-blue-300 bg-blue-50';
    case 'cancellation': return 'border-orange-300 bg-orange-50';
    case 'trial_end':    return 'border-gray-300 bg-gray-50';
    case 'invoice_due':  return 'border-yellow-300 bg-yellow-50';
  }
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNextBillingDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function UpcomingBillingSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['billingCalendar'],
    queryFn: async () => {
      const res = await api.getBillingCalendar();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Billing</h2>
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : !data || data.events.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500 text-sm">
          No upcoming billing events
        </div>
      ) : (
        <div className="px-6 py-4 space-y-3">
          {data.nextBillingDate && (
            <p className="text-sm font-medium text-gray-700 mb-4">
              Next billing:{' '}
              <span className="text-gray-900 font-semibold">
                {formatNextBillingDate(data.nextBillingDate)}
              </span>
            </p>
          )}
          {data.events.map((event, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${eventColorClass(event.type)}`}
            >
              <span className="text-lg leading-none mt-0.5">{eventIcon(event.type)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">
                  {formatEventDate(event.date)} — {event.label}
                  {event.amount !== undefined && (
                    <span className="ml-1 text-gray-600 font-normal">
                      · {formatAmount(event.amount, event.currency)}{data.billingInterval === 'monthly' ? '/mo' : '/yr'}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BillingHistoryPage() {
  const [page, setPage] = useState(1);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [hasMorePages, setHasMorePages] = useState(false);

  const { isLoading, isError } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => {
      const res = await api.getInvoices();
      if (res.success && res.data) {
        if (page === 1) {
          setAllInvoices(res.data.invoices);
        } else {
          setAllInvoices((prev) => [...prev, ...res.data!.invoices]);
        }
        setHasMorePages(res.data.hasMore);
        return res.data;
      }
      return { invoices: [], hasMore: false };
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
        <p className="mt-1 text-sm text-gray-500">Download past invoices or review your payment history.</p>
      </div>

      <UpcomingBillingSection />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isError ? (
          <div className="p-8 text-center text-red-600">
            Failed to load invoices. Please try again later.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Plan', 'Amount', 'Status', 'Download'].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && allInvoices.length === 0 ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : allInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-12 h-12 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-500 font-medium">No invoices yet</p>
                      <p className="text-gray-400 text-sm">Invoices will appear here once you upgrade to a paid plan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.planName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.invoicePdfUrl ? (
                        <a
                          href={invoice.invoicePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {hasMorePages && !isLoading && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Load more
            </button>
          </div>
        )}

        {isLoading && allInvoices.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <span className="text-sm text-gray-500">Loading more…</span>
          </div>
        )}
      </div>
    </div>
  );
}
