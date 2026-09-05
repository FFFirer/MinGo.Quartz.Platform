import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { agentApi } from '../api';
import type { AgentDetailDto, AgentSchedulerDto, ApiResponse } from '../types';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import PageHeader from '../components/PageHeader';

export const AgentDetailPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const { data: apiResp, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentApi.get(agentId as string),
    enabled: !!agentId,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const agent: AgentDetailDto | undefined = apiResp?.data;

  const formatDate = (value?: string | number) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const renderInfoCard = (label: string, value: React.ReactNode) => (
    <div className="bg-slate-800 rounded-lg p-4 shadow" key={label}>
      <div className="text-sm text-slate-300 mb-1">{label}</div>
      <div className="text-base text-slate-50 font-semibold">{value}</div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg p-6 max-w-xl w-full shadow">
            <div className="text-lg font-semibold mb-2">Failed to load agent details.</div>
            <div className="text-sm text-slate-300">{error?.message ?? 'An unknown error occurred.'}</div>
            <button className="mt-4 px-4 py-2 bg-slate-700 rounded hover:bg-slate-600" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {agent && (
        <PageHeader
          title={agent.name}
          status={<StatusBadge status={agent.status} />}
          backPath="/agents"
        />
      )}

      {/* Agent info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {agent ? (
          <>
            {renderInfoCard('ID', <span className="font-mono">{agent.id}</span>)}
            {renderInfoCard('URL', <a href={agent.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{agent.url}</a>)}
            {renderInfoCard('Version', agent.agentVersion ?? '-')}
            {renderInfoCard('Started At', formatDate(agent.startedAt))}
            {renderInfoCard('Last Heartbeat', formatDate(agent.lastHeartbeat))}
            {renderInfoCard('Last Reported', formatDate(agent.lastReportedAt))}
          </>
        ) : (
          <>
            {renderInfoCard('ID', '-')}
            {renderInfoCard('URL', '-')}
            {renderInfoCard('Version', '-')}
            {renderInfoCard('Started At', '-')}
            {renderInfoCard('Last Heartbeat', '-')}
            {renderInfoCard('Last Reported', '-')}
          </>
        )}
      </div>

      {/* Schedulers list */}
      <div className="bg-slate-800 rounded-lg p-4 shadow mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-slate-50">Associated Schedulers</h2>
        </div>
        <DataTable
          columns={[
            { header: 'Scheduler', accessor: (row: AgentSchedulerDto) => row.schedulerName },
            { header: 'Instance', accessor: (row: AgentSchedulerDto) => row.schedulerInstanceId ?? '-' },
            { header: 'Status', accessor: (row: AgentSchedulerDto) => row.status },
            { header: 'Clustered', accessor: (row: AgentSchedulerDto) => row.isClustered ? 'Yes' : 'No' },
            { header: 'Reported At', accessor: (row: AgentSchedulerDto) => formatDate(row.reportedAt) },
          ]}
          data={agent?.schedulers ?? []}
          onRowClick={(row) => navigate(`/schedulers/${encodeURIComponent(row.schedulerName)}`)}
          emptyMessage="No schedulers associated with this agent."
          showBorder={false}
        />
      </div>
    </div>
  );
};

export default AgentDetailPage;
