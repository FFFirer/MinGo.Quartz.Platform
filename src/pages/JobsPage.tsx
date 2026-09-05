import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Trash2, Plus, RefreshCw, Copy, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApi } from '../api';
import StatusBadge from '../components/StatusBadge';
import JobTypeDisplay from '../components/JobTypeDisplay';
import DataTable from '../components/DataTable';
import PaginationBar from '../components/PaginationBar';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import type { JobSummaryDto, JobKeyDto } from '../types';

// Helper: composite key for batch selection
function compositeKey(name: string, group: string): string {
  return `${name}\x1F${group}`;
}

// Custom hook: debounce a value with specified delay
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const JobsPage: React.FC = () => {
  const { schedulerName } = useParams<{ schedulerName: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<string | null>(null);
  // Batch selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  // Page size is now a stateful value (default 20)
  const [pageSize, setPageSize] = useState<number>(20);
  const decodedSchedulerName = schedulerName ? decodeURIComponent(schedulerName) : '';

  // Filter state
  const [groupFilter, setGroupFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const debouncedGroup = useDebounce(groupFilter, 500);
  const debouncedName = useDebounce(nameFilter, 500);

  // Reset to page 1 when debounced filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedGroup, debouncedName]);

  const { data: jobsResponse, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['jobs', decodedSchedulerName, page, pageSize, debouncedGroup, debouncedName],
    queryFn: async () => {
      const response = await jobApi.getAll(decodedSchedulerName, page, pageSize, undefined, debouncedGroup || undefined, debouncedName || undefined);
      if (!response.success) throw new Error(response.errorMessage);
      return response.data;
    },
    enabled: !!decodedSchedulerName,
  });

  const jobs = jobsResponse?.items ?? [];
  const totalItems = jobsResponse?.total ?? 0;
  const totalPages = jobsResponse?.totalPages ?? 1;

  // Helper: convert a composite key string back to JobKeyDto
  const parseCompositeKey = (key: string): JobKeyDto => {
    const parts = key.split('\x1F');
    return { name: parts[0], group: parts[1] || 'DEFAULT' };
  };

  const triggerJob = useMutation({
    mutationFn: (jobKey: JobKeyDto) => jobApi.trigger(decodedSchedulerName, jobKey),
    onSuccess: () => {
      toast.success('Job triggered successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs', decodedSchedulerName] });
    },
    onError: (err: Error) => toast.error('Failed to trigger job: ' + err.message),
  });

  const pauseJob = useMutation({
    mutationFn: (jobKey: JobKeyDto) => jobApi.pause(decodedSchedulerName, jobKey),
    onSuccess: () => {
      toast.success('Job paused successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs', decodedSchedulerName] });
    },
    onError: (err: Error) => toast.error('Failed to pause job: ' + err.message),
  });

  const resumeJob = useMutation({
    mutationFn: (jobKey: JobKeyDto) => jobApi.resume(decodedSchedulerName, jobKey),
    onSuccess: () => {
      toast.success('Job resumed successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs', decodedSchedulerName] });
    },
    onError: (err: Error) => toast.error('Failed to resume job: ' + err.message),
  });

  const deleteJob = useMutation({
    mutationFn: (jobKey: JobKeyDto) => jobApi.delete(decodedSchedulerName, jobKey),
    onSuccess: () => {
      toast.success('Job deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs', decodedSchedulerName] });
    },
    onError: (err: Error) => toast.error('Failed to delete job: ' + err.message),
  });

  // Batch operations across selected jobs
  const batchMutation = useMutation({
    mutationFn: async (action: 'trigger' | 'pause' | 'resume' | 'delete') => {
      const keys = Array.from(selectedKeys);
      if (keys.length === 0) return { total: 0, succeeded: 0, failed: 0 };
      const jobKeys = keys.map((key) => parseCompositeKey(key));
      const response = await jobApi.batch(decodedSchedulerName, { action, jobKeys });
      if (!response.success) throw new Error(response.errorMessage);
      const result = response.data!;
      return { total: result.total, succeeded: result.succeeded, failed: result.failed };
    },
    onSuccess: (payload: any) => {
      const { total, succeeded, failed } = payload || { total: 0, succeeded: 0, failed: 0 };
      if (total === 0) {
        return;
      }
      if (failed === 0) {
        toast.success(`Triggered ${succeeded} of ${total} jobs successfully`);
      } else if (succeeded > 0) {
        toast.error(`Partial success: ${succeeded} of ${total} succeeded, ${failed} failed`);
      } else {
        toast.error(`Failed to perform operation on all ${total} jobs`);
      }
      queryClient.invalidateQueries({ queryKey: ['jobs', decodedSchedulerName] });
      setSelectedKeys(new Set());
      // Close potential delete confirmation dialog if open
      setBatchDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error('Batch operation failed: ' + (err?.message ?? 'Unknown error'));
    },
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Error: {error.message}</div>;
  }

  const handleJobClick = (jobKey: JobKeyDto) => {
    const url = jobKey.group === 'DEFAULT'
      ? `/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs/${encodeURIComponent(jobKey.name)}`
      : `/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs/${encodeURIComponent(jobKey.name)}/${encodeURIComponent(jobKey.group)}`;
    navigate(url);
  };

  // Columns definition. Insert a checkbox column as the FIRST column for batch selection.
  // We cast to `any` to allow a React element in the header and cells without touching DataTable.tsx.
  const columns: any[] = [
      {
        header: (
          <input
            type="checkbox"
            checked={!!jobs && jobs.length > 0 && selectedKeys.size === jobs.length}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.checked) {
                const keys = (jobs || []).map((j) => compositeKey(j.jobKey.name, j.jobKey.group));
                setSelectedKeys(new Set<string>(keys));
              } else {
                setSelectedKeys(new Set<string>());
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      accessor: (row: JobSummaryDto) => (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={selectedKeys.has(compositeKey(row.jobKey.name, row.jobKey.group))}
          onChange={(e) => {
            e.stopPropagation();
            const key = compositeKey(row.jobKey.name, row.jobKey.group);
            setSelectedKeys((prev) => {
              const next = new Set<string>(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: 'w-14',
    },
    {
      header: 'Job Key',
      accessor: (row: JobSummaryDto) => `${row.jobKey.group}.${row.jobKey.name}`,
      sortable: true,
    },
    {
      header: 'Type',
      accessor: (row: JobSummaryDto) => <JobTypeDisplay jobType={row.jobType} />,
    },
    {
      header: 'Group',
      accessor: (row: JobSummaryDto) => row.jobKey.group,
    },
    {
      header: 'Status',
      accessor: (row: JobSummaryDto) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Schedule',
      accessor: (row: JobSummaryDto) => {
        if (row.scheduleType === 'cron' && row.cronExpression) {
          return <span className="text-xs font-mono">{row.cronExpression}</span>;
        }
        return row.scheduleType;
      },
    },
    {
      header: 'Next Fire',
      accessor: (row: JobSummaryDto) => {
        if (!row.nextFireTime) return '-';
        return new Date(row.nextFireTime).toLocaleString();
      },
    },
    {
      header: 'Actions',
      accessor: (row: JobSummaryDto) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); triggerJob.mutate(row.jobKey); }}
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded"
            title="Trigger"
          >
            <Play size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); pauseJob.mutate(row.jobKey); }}
            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded"
            title="Pause"
          >
            <Pause size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resumeJob.mutate(row.jobKey); }}
            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-slate-700 rounded"
            title="Resume"
          >
            <Play size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const copyFrom = `${row.jobKey.group}.${row.jobKey.name}`;
              navigate(`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs/create?copyFrom=${encodeURIComponent(copyFrom)}`);
            }}
            className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-slate-700 rounded"
            title="Copy"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirmJobId(compositeKey(row.jobKey.name, row.jobKey.group)); }}
            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title="Jobs"
        subtitle={`Scheduler: ${decodedSchedulerName}`}
        breadcrumbs={[
          { label: 'Schedulers', path: '/schedulers' },
          { label: decodedSchedulerName, path: `/schedulers/${encodeURIComponent(decodedSchedulerName)}` },
          { label: 'Jobs', active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Group filter */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter Group..."
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-36 pl-7 pr-7 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-lg border border-slate-600 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {groupFilter && (
                <button
                  onClick={() => setGroupFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Name filter */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter Name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-36 pl-7 pr-7 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-lg border border-slate-600 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {nameFilter && (
                <button
                  onClick={() => setNameFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="w-px h-6 bg-slate-600" />
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              title="Refresh Jobs"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => navigate(`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs/create`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={16} />
              Create Job
            </button>
          </div>
        }
      />

      {/* Batch actions bar - appears when items are selected */}
      {selectedKeys.size > 0 && (
        <div className="bg-slate-800 rounded-lg p-3 mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-200">{selectedKeys.size} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => batchMutation.mutate('trigger')} className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">Trigger</button>
            <button onClick={() => batchMutation.mutate('pause')} className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded hover:bg-slate-600">Pause</button>
            <button onClick={() => batchMutation.mutate('resume')} className="px-3 py-1.5 bg-slate-700 text-slate-200 rounded hover:bg-slate-600">Resume</button>
            <button onClick={() => setBatchDeleteDialogOpen(true)} className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-500">Delete</button>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation for selected items */}
      {batchDeleteDialogOpen && (
        <ConfirmDialog
          isOpen={batchDeleteDialogOpen}
          title="Delete Selected Jobs"
          message={`Are you sure you want to delete ${selectedKeys.size} selected job(s)? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            batchMutation.mutate('delete');
            setBatchDeleteDialogOpen(false);
          }}
          onClose={() => setBatchDeleteDialogOpen(false)}
        />
      )}

      {/* Jobs Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <DataTable
          columns={columns}
          data={jobs || []}
          onRowClick={(row: JobSummaryDto) => handleJobClick(row.jobKey)}
          emptyMessage="No jobs found for this scheduler"
        />
      </div>

      {/* Pagination */}
      <PaginationBar
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Delete Confirmation */}
      {deleteConfirmJobId && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Job"
          message={`Are you sure you want to delete job "${deleteConfirmJobId.replace('\x1F', '.')}"?`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteJob.mutate(parseCompositeKey(deleteConfirmJobId));
            setDeleteConfirmJobId(null);
          }}
          onClose={() => setDeleteConfirmJobId(null)}
        />
      )}
    </div>
  );
};

export default JobsPage;
