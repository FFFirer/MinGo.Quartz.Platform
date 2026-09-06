import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { schedulerApi } from '../api';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { AlertCircle } from 'lucide-react';
import type { SchedulerSummaryDto, ApiResponse } from '../types';
import { useNavigate, Link } from 'react-router-dom';

const SchedulersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useQuery<ApiResponse<SchedulerSummaryDto[]>, Error>({
    queryKey: ['schedulers'],
    queryFn: () => schedulerApi.getAll(),
    refetchInterval: 30000,
  });

  const schedulers: SchedulerSummaryDto[] = data?.data ?? [];
  const totalCount = schedulers.length;

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString();
  };

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-50 mb-2">Failed to load schedulers</h2>
          <p className="text-slate-400 mb-4">{error?.message}</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Retry</button>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6">
      <PageHeader title="Schedulers" subtitle={`Total: ${totalCount}`} />

      <div className="mt-4 overflow-x-auto">
        <DataTable
          loading={isLoading}
          emptyMessage="No schedulers found."
          data={schedulers}
          onRowClick={(row) => navigate(`/schedulers/${encodeURIComponent(row.schedulerName)}`)}
          columns={[
            {
              header: 'Name',
              accessor: (row: SchedulerSummaryDto) => (
                <Link to={`/schedulers/${encodeURIComponent(row.schedulerName)}`} className="text-blue-400 hover:text-blue-300">
                  {row.schedulerName}
                </Link>
              ),
            },
            {
              header: 'Instance ID',
              accessor: 'schedulerInstanceId',
              format: (v: string | null | undefined) => v ?? '-',
            },
            {
              header: 'Status',
              accessor: (row: SchedulerSummaryDto) => <StatusBadge status={row.status} />,
            },
            {
              header: 'Clustered',
              accessor: 'isClustered',
              format: (v: any) => (v ? 'Yes' : 'No'),
            },
            {
              header: 'Agents',
              accessor: 'agentCount',
            },
            {
              header: 'Last Reported',
              accessor: 'lastReportedAt',
              format: (v: string | undefined) => formatDate(v),
            },
            {
              header: 'Running Since',
              accessor: 'runningSince',
              format: (v: string | undefined) => formatDate(v),
            },
          ] as any}
        />
      </div>
    </div>
  );
};

export default SchedulersPage;
