import { useEffect, useState } from 'react';
import api from '../services/api';
import type { UsageStats, MemberGrowth } from '../types/api';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

function teamAgeDisplay(days: number): string {
  if (days < 30) return `${days}d old`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo old`;
  return `${Math.floor(months / 12)}yr old`;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [growth, setGrowth] = useState<MemberGrowth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, growthRes] = await Promise.all([
          api.getUsageStats(),
          api.getMemberGrowth(),
        ]);
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        } else {
          setStats({ memberCount: 0, memberLimit: 1, planName: 'Free', teamAgeInDays: 0, monthlyActiveMembers: 0 });
        }
        if (growthRes.success && growthRes.data) {
          setGrowth(growthRes.data.slice(-6));
        }
      } catch {
        setStats({ memberCount: 0, memberLimit: 1, planName: 'Free', teamAgeInDays: 0, monthlyActiveMembers: 0 });
        setError('Failed to load analytics data.');
      }finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxCount = growth.length > 0 ? Math.max(...growth.map((g) => g.count), 1) : 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Usage Analytics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              label="Member Usage"
              value={`${stats.memberCount} / ${stats.memberLimit}`}
              sub="seats used"
            />
            <StatCard label="Plan" value={stats.planName} />
            <StatCard
              label="Team Age"
              value={teamAgeDisplay(stats.teamAgeInDays)}
              sub={`${stats.teamAgeInDays} days old`}
            />
            <StatCard
              label="Monthly Active Members"
              value={String(stats.monthlyActiveMembers)}
              sub="last 30 days"
            />
          </>
        ) : (
          <div className="col-span-4 text-center text-gray-400 py-8">
            {error ?? 'No stats available.'}
          </div>
        )}
      </div>

      {/* Member Growth Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Member Growth (Last 6 Months)</h2>

        {loading ? (
          <div className="flex items-end gap-4 h-40 animate-pulse">
            {[60, 80, 50, 100, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
                <div className="h-3 bg-gray-200 rounded w-10" />
              </div>
            ))}
          </div>
        ) : growth.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No growth data available.</div>
        ) : (
          <div className="flex items-end gap-3 h-48">
            {growth.map((item) => {
              const heightPct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{item.count}</span>
                  <div
                    className="w-full bg-blue-800 rounded-t transition-all duration-500"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    title={`${item.month}: ${item.count}`}
                  />
                  <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
