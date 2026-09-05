import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { agentApi } from '../api';
import { ApiResponse, PagedResponse, AgentDetailDto } from '../types';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import { AlertCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import PaginationBar from '../components/PaginationBar';
import { useNavigate } from 'react-router-dom';

// Simple formatter for ISO dates to a readable string
function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Data fetch with pagination
  const { data, isLoading, isError, error } = useQuery<ApiResponse<PagedResponse<AgentDetailDto>>, Error>({
    queryKey: ['agents', page, pageSize],
    queryFn: async () => {
      const response = await agentApi.getAll(page, pageSize);
      if (!response?.success) throw new Error(response?.errorMessage ?? 'Failed to load agents');
      return response as ApiResponse<PagedResponse<AgentDetailDto>>;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const paged = (data?.data ?? { items: [], total: 0, page, pageSize, totalPages: 0 }) as PagedResponse<AgentDetailDto>;
  const agents = paged.items ?? [];

  // Subtitle shows total items from pagination response
  const totalItems = paged.total ?? 0;
  // Computed pagination for UI controls
  const totalPages = paged.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  const columns: any[] = [
    {
      header: 'Name',
      accessor: (row: AgentDetailDto) => (
        <Link to={`/agents/${row.id}`} className="hover:underline">{row.name}</Link>
      ),
    },
    {
      header: 'URL',
      accessor: (row: AgentDetailDto) => (
        <a href={row.url} target="_blank" rel="noreferrer" className="text-slate-200 hover:underline">{row.url}</a>
      ),
    },
    {
      header: 'Status',
      accessor: (row: AgentDetailDto) => <StatusBadge status={row.status as any} />,
    },
    {
      header: 'Schedulers',
      accessor: (row: AgentDetailDto) => row.schedulers?.length ?? 0,
    },
    {
      header: 'Last Heartbeat',
      accessor: (row: AgentDetailDto) => formatDate(row.lastHeartbeat),
    },
    {
      header: 'Started At',
      accessor: (row: AgentDetailDto) => formatDate(row.startedAt),
    },
  ];

  // Navigation on row click
  const onRowClick = (row: AgentDetailDto) => {
    navigate(`/agents/${row.id}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div className="p-6">
      <PageHeader title="Agents" subtitle={`${totalItems} total`} />

      {/* DataTable replaces manual grid and rows */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <DataTable
          columns={columns}
          data={agents}
          onRowClick={onRowClick}
          loading={isLoading}
          emptyMessage="No agents found."
        />
      </div>

      {/* Pagination controls */}
      <PaginationBar
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Error state kept as-is to not break existing handling */}
      {isError && (
        <div className="mt-4 flex items-center text-sm text-amber-300">
          <AlertCircle className="mr-2" />
          Failed to load agents: {error?.message ?? 'Unknown error'}
        </div>
      )}
    </div>
  );
};

export default AgentsPage;
