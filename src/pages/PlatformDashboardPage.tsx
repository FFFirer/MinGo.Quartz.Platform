import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Layers, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import ActivityFeed from '../components/ActivityFeed';
import { useEventStream } from '../components/useEventStream';
import StatsCard from '../components/StatsCard';
import UpcomingJobsList from '../components/UpcomingJobsList';
import { StatsCardSkeleton, CardSkeleton } from '../components/LoadingSkeleton';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { agentApi, schedulerApi } from '../api';
import type { SchedulerSummaryDto, AgentDetailDto } from '../types';
import HealthMatrix from '../components/HealthMatrix';
import ExecutionTrendChart from '../components/ExecutionTrendChart';
import PageHeader from '../components/PageHeader';

// v2 API data now comes from schedulerApi.getAll() and agentApi.getAll()

export function PlatformDashboardPage() {
  // Real-time activity stream hook
  const { events, isLive } = useEventStream();
  // Fetch v2 API data in parallel via useQueries
  const results = useQueries({
    queries: [
      {
        queryKey: ['platform-dashboard-schedulers'],
        queryFn: () => schedulerApi.getAll(),
        refetchInterval: 30000,
      },
      {
        queryKey: ['platform-dashboard-agents'],
        queryFn: () => agentApi.getAll(),
        refetchInterval: 30000,
      },
    ],
  });

  const schedulers = useMemo(() => (results[0]?.data?.data ?? []) as SchedulerSummaryDto[], [results[0]?.data?.data]);
  const agents = useMemo(() => (results[1]?.data?.data?.items ?? []) as AgentDetailDto[], [results[1]?.data?.data]);

  const isLoading = results.some(r => r.isLoading);
  const error = results.find(r => r.isError)?.error as Error | undefined;

  // Derived stats from v2 API data (memoized for performance)
  const lastUpdated = useMemo(() => {
    const times = schedulers.map(s => s?.lastReportedAt).filter(t => !!t);
    if (times.length === 0) return undefined;
    const latest = times.map(t => new Date(t)).sort((a, b) => +b - +a)[0];
    return latest?.toLocaleString();
  }, [schedulers]);

  const totalSchedulers = schedulers.length;
  const totalJobs = schedulers.reduce((acc, s) => acc + (((s as any).jobCounts?.totalJobs ?? 0) as number), 0);

  const onlineAgents = agents.filter(a => (a as any).status === 'Online').length;
  const warningAgents = agents.filter(a => (a as any).status === 'Warning').length;
  const offlineAgents = agents.filter(a => (a as any).status === 'Offline').length;
  const totalAgents = agents.length;

  const totalActive = schedulers.reduce((acc, s) => acc + (((s as any).jobCounts as any)?.active ?? 0), 0);
  const totalPaused = schedulers.reduce((acc, s) => acc + (((s as any).jobCounts as any)?.paused ?? 0), 0);
  const totalBlocked = schedulers.reduce((acc, s) => acc + (((s as any).jobCounts as any)?.blocked ?? 0), 0);
  const totalExecuting = schedulers.reduce((acc, s) => acc + (((s as any).jobCounts as any)?.executing ?? 0), 0);

  const upcomingJobs = schedulers.flatMap((s: any) => s?.upcomingJobs ?? []);

  // Retry handler kept for parity with previous UI but actual retry uses refetch interval; provide manual reload
  const handleRetry = () => {
    window.location.reload();
    toast.success('Refreshing dashboard...');
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-50 mb-2">Failed to load dashboard</h2>
          <p className="text-slate-400 mb-4">{error.message}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Platform Dashboard"
        subtitle={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'Overview of all schedulers and agents'}
      >
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageHeader>

      {/* Overview Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-50 mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <StatsCard
                title="Total Schedulers"
                value={totalSchedulers}
                icon={<Layers size={20} />}
                variant="default"
              />
              <StatsCard
                title="Total Jobs"
                value={totalJobs}
                icon={<Clock size={20} />}
                variant="default"
              />
              <StatsCard
                title="Online Agents"
                value={onlineAgents}
                subtitle={`of ${totalAgents} total`}
                icon={<CheckCircle size={20} />}
                variant="success"
              />
              <StatsCard
                title="Warning Agents"
                value={warningAgents}
                subtitle={offlineAgents ? `${offlineAgents} offline` : undefined}
                icon={<AlertCircle size={20} />}
                variant={warningAgents ? 'warning' : 'default'}
              />
            </>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Execution Trend (replacing Job Status) */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Execution Trend</h3>
          <ExecutionTrendChart schedulers={schedulers} />
        </div>

        {/* Agent Health */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Agent Health</h3>
          {isLoading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Online', value: onlineAgents, color: 'bg-green-500' },
                { label: 'Warning', value: warningAgents, color: 'bg-amber-500' },
                { label: 'Offline', value: offlineAgents, color: 'bg-red-500' },
              ].map(item => {
                const total = totalAgents;
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-50">{item.value}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedulers section replaced by HealthMatrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <HealthMatrix schedulers={schedulers} />
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-50">Upcoming Jobs (24h)</h3>
          </div>
          <UpcomingJobsList
            jobs={upcomingJobs ?? []}
            showScheduler
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default PlatformDashboardPage;
