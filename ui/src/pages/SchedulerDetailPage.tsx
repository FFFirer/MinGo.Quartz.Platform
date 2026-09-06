import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { schedulerApi } from '../api';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ExternalLink } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import type { SchedulerDetailDto, SchedulerAgentDto, JobCountsDto, ApiResponse } from '../types';

const SchedulerDetailPage: React.FC = () => {
  const { schedulerName } = useParams<{ schedulerName: string }>();
  const navigate = useNavigate();
  const decodedName = schedulerName ? decodeURIComponent(schedulerName) : '';

  const { data, isLoading, isError, error, refetch } = useQuery<ApiResponse<SchedulerDetailDto>, Error>({
    queryKey: ['scheduler', decodedName],
    queryFn: () => schedulerApi.get(decodedName),
    enabled: !!decodedName,
    refetchInterval: 30000,
  });

  const scheduler: SchedulerDetailDto | undefined = data?.data;

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString();
  };

  if (isLoading) return <div className="p-6 space-y-4"><LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton /></div>;

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-4">{error?.message}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  if (!scheduler) return null;

  const InfoCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-sm text-slate-50">{value}</div>
    </div>
  );

  const jobCounts = scheduler.jobCounts;

  return (
    <div className="p-6">
      {/* Header with PageHeader */}
      <PageHeader
        title={decodedName}
        subtitle="Scheduler details"
        backPath="/schedulers"
        status={<StatusBadge status={scheduler.status} />}
        breadcrumbs={[
          { label: 'Schedulers', path: '/schedulers' },
          { label: decodedName, active: true }
        ]}
        actions={
          <Link
            to={`/schedulers/${encodeURIComponent(decodedName)}/jobs`}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <ExternalLink size={14} /> View Jobs
          </Link>
        }
      />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Status" value={<StatusBadge status={scheduler.status} />} />
        <InfoCard label="Instance ID" value={scheduler.schedulerInstanceId || '-'} />
        <InfoCard label="Version" value={scheduler.version || '-'} />
        <InfoCard label="Clustered" value={scheduler.isClustered ? 'Yes' : 'No'} />
        <InfoCard label="Job Store" value={scheduler.jobStoreType || '-'} />
        <InfoCard label="Thread Pool" value={`${scheduler.threadPoolType || '-'} (${scheduler.threadPoolSize})`} />
        <InfoCard label="Running Since" value={formatDate(scheduler.runningSince)} />
        <InfoCard label="Jobs Executed" value={scheduler.numberOfJobsExecuted} />
      </div>

      {/* Job Counts */}
      {jobCounts && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
          <h3 className="text-lg font-semibold text-slate-50 mb-3">Job Counts</h3>
          <div className="flex gap-1 h-6 rounded-full overflow-hidden">
            {jobCounts.runningJobs > 0 && <div className="bg-green-500 flex-1" style={{ flex: jobCounts.runningJobs }} title={`Running: ${jobCounts.runningJobs}`} />}
            {jobCounts.pausedJobs > 0 && <div className="bg-amber-500 flex-1" style={{ flex: jobCounts.pausedJobs }} title={`Paused: ${jobCounts.pausedJobs}`} />}
            {jobCounts.blockedJobs > 0 && <div className="bg-red-500 flex-1" style={{ flex: jobCounts.blockedJobs }} title={`Blocked: ${jobCounts.blockedJobs}`} />}
            {jobCounts.waitingJobs > 0 && <div className="bg-blue-500 flex-1" style={{ flex: jobCounts.waitingJobs }} title={`Waiting: ${jobCounts.waitingJobs}`} />}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            {jobCounts.runningJobs > 0 && <span className="text-green-400">Running: {jobCounts.runningJobs}</span>}
            {jobCounts.pausedJobs > 0 && <span className="text-amber-400">Paused: {jobCounts.pausedJobs}</span>}
            {jobCounts.blockedJobs > 0 && <span className="text-red-400">Blocked: {jobCounts.blockedJobs}</span>}
            {jobCounts.waitingJobs > 0 && <span className="text-blue-400">Waiting: {jobCounts.waitingJobs}</span>}
          </div>
        </div>
      )}

      {/* Associated Agents */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-50 mb-3">Associated Agents ({scheduler.agents.length})</h3>
        <DataTable
          columns={[
            {
              header: 'Name',
              accessor: (row: SchedulerAgentDto) => (
                <span className="text-blue-400 hover:text-blue-300">{row.agentName || row.agentId}</span>
              ),
            },
            { header: 'URL', accessor: (row: SchedulerAgentDto) => row.agentUrl },
            {
              header: 'Status',
              accessor: (row: SchedulerAgentDto) => <StatusBadge status={row.agentStatus} />,
            },
            { header: 'Reported At', accessor: (row: SchedulerAgentDto) => formatDate(row.reportedAt) },
          ]}
          data={scheduler.agents}
          onRowClick={(row) => navigate(`/agents/${row.agentId}`)}
          emptyMessage="No agents associated with this scheduler."
          showBorder={false}
        />
      </div>
    </div>
  );
};

export default SchedulerDetailPage;
