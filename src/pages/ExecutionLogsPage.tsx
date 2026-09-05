import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { executionLogApi } from '../api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import PaginationBar from '../components/PaginationBar';
import type { ExecutionLogDto, ExecutionLogQuery } from '../types';

const ExecutionLogsPage: React.FC = () => {
  const { schedulerName } = useParams<{ schedulerName: string }>();
  const decodedSchedulerName = schedulerName ? decodeURIComponent(schedulerName) : '';
  const [query, setQuery] = useState<ExecutionLogQuery>({
    page: 1,
    pageSize: 20,
    jobGroup: '',
    jobName: '',
    success: undefined,
  });

  const { data: logsResponse, isLoading, error } = useQuery({
    queryKey: ['execution-logs', decodedSchedulerName, query],
    queryFn: async () => {
      const response = await executionLogApi.query(decodedSchedulerName, query);
      if (!response.success) throw new Error(response.errorMessage);
      return response.data;
    },
    enabled: !!decodedSchedulerName,
  });

  const logs = logsResponse?.items ?? [];
  const totalItems = logsResponse?.total ?? 0;
  const totalPages = logsResponse?.totalPages ?? 1;

  const columns = [
    {
      header: 'Job Key',
      accessor: (row: ExecutionLogDto) => `${row.jobKey.group}.${row.jobKey.name}`,
      sortable: true,
    },
    {
      header: 'Start Time',
      accessor: (row: ExecutionLogDto) => new Date(row.startTime).toLocaleString(),
      sortable: true,
    },
    {
      header: 'End Time',
      accessor: (row: ExecutionLogDto) => row.endTime ? new Date(row.endTime).toLocaleString() : '-',
    },
    {
      header: 'Duration',
      accessor: (row: ExecutionLogDto) => row.durationMs != null ? `${row.durationMs}ms` : '-',
    },
    {
      header: 'Status',
      accessor: (row: ExecutionLogDto) => (
        <span className={`text-sm font-medium ${row.success ? 'text-green-400' : 'text-red-400'}`}>
          {row.success ? 'Success' : 'Failed'}
        </span>
      ),
    },
    {
      header: 'Agent',
      accessor: (row: ExecutionLogDto) => row.agentId,
    },
    {
      header: 'Error',
      accessor: (row: ExecutionLogDto) => row.errorMessage ? (
        <span className="text-xs text-red-400 truncate max-w-xs" title={row.errorMessage}>
          {row.errorMessage}
        </span>
      ) : '-',
    },
  ];

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Error: {(error as Error).message}</div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Execution Logs"
        subtitle={`Scheduler: ${decodedSchedulerName}`}
        breadcrumbs={[
          { label: 'Schedulers', path: '/schedulers' },
          { label: decodedSchedulerName, path: `/schedulers/${encodeURIComponent(decodedSchedulerName)}` },
          { label: 'Execution Logs', active: true }
        ]}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Job Group"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 w-40"
          value={query.jobGroup}
          onChange={(e) => setQuery(q => ({ ...q, jobGroup: e.target.value, page: 1 }))}
        />
        <input
          type="text"
          placeholder="Job Name"
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 w-40"
          value={query.jobName}
          onChange={(e) => setQuery(q => ({ ...q, jobName: e.target.value, page: 1 }))}
        />
        <select
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
          value={query.success === undefined ? '' : String(query.success)}
          onChange={(e) => setQuery(q => ({
            ...q,
            success: e.target.value === '' ? undefined : e.target.value === 'true',
            page: 1,
          }))}
        >
          <option value="">All Results</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <DataTable
          columns={columns}
          data={logs}
          emptyMessage="No execution logs found"
        />
      </div>

      <PaginationBar
        page={query.page}
        pageSize={query.pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={(p) => setQuery(q => ({ ...q, page: p }))}
        onPageSizeChange={(newSize) => setQuery(q => ({ ...q, pageSize: newSize, page: 1 }))}
      />
    </div>
  );
};

export default ExecutionLogsPage;
