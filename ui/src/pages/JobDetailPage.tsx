import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Trash2 } from 'lucide-react';
import { jobApi, manifestApi, executionLogApi } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import JobParamsDisplay from '../components/JobParamsDisplay';
import JobTypeDisplay from '../components/JobTypeDisplay';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import PaginationBar from '../components/PaginationBar';
import type { JobDetailDto, JobKeyDto, ScheduleDto, QuartzOptionsDto, TriggerSummaryDto, ExecutionLogDto } from '../types';

/** Safely parse a JSON string, falling back to default on failure */
function tryParseJson<T>(raw: string, fallback: T): T {
  if (typeof raw !== 'string') return raw as unknown as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn('Failed to parse JSON string:', raw);
    return fallback;
  }
}

const JobDetailPage: React.FC = () => {
  const { schedulerName, name, group } = useParams<{ schedulerName: string; name: string; group?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [logPage, setLogPage] = useState(1);

  const decodedSchedulerName = schedulerName ? decodeURIComponent(schedulerName) : '';
  const decodedName = name ? decodeURIComponent(name) : '';
  const decodedGroup = group ? decodeURIComponent(group) : 'DEFAULT';
  const jobKey: JobKeyDto = { name: decodedName, group: decodedGroup };

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', decodedSchedulerName, decodedName, decodedGroup],
    queryFn: async () => {
      const response = await jobApi.get(decodedSchedulerName, jobKey);
      if (!response.success) throw new Error(response.errorMessage);
      const dto = response.data!;
      // Deserialize string fields from JobDefinitionDto to match JobDetailDto shape
      return {
        jobKey: dto.jobKey,
        jobType: dto.jobType,
        status: dto.status,
        description: '',
        schedule: tryParseJson<ScheduleDto>(dto.schedule, {} as ScheduleDto),
        options: tryParseJson<QuartzOptionsDto>(dto.options, {} as QuartzOptionsDto),
        params: tryParseJson<Record<string, any>>(dto.params, {}),
        nextFireTime: undefined,
        previousFireTime: undefined,
        triggers: (dto.triggers ?? []) as TriggerSummaryDto[],
      } as JobDetailDto;
    },
    enabled: !!decodedName,
  });

  // Fetch execution logs
  const { data: logsResponse } = useQuery({
    queryKey: ['job-logs', decodedSchedulerName, decodedName, decodedGroup, logPage],
    queryFn: async () => {
      const response = await executionLogApi.query(decodedSchedulerName, { page: logPage, pageSize: 10, jobName: decodedName, jobGroup: decodedGroup });
      if (!response.success) throw new Error(response.errorMessage);
      return response.data;
    },
    enabled: !!decodedName,
  });

  const logs = logsResponse?.items ?? [];
  const logTotalPages = logsResponse?.totalPages ?? 1;

  // Fetch manifest for parameter metadata
  const { data: manifest } = useQuery({
    queryKey: ['manifest', decodedSchedulerName],
    queryFn: async () => {
      const response = await manifestApi.get(decodedSchedulerName);
      if (!response.success) return null;
      return response.data;
    },
    enabled: !!decodedSchedulerName,
    staleTime: 60_000,
  });

  const triggerJob = useMutation({
    mutationFn: () => jobApi.trigger(decodedSchedulerName, jobKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', decodedSchedulerName, decodedName, decodedGroup] });
    },
  });

  const pauseJob = useMutation({
    mutationFn: () => jobApi.pause(decodedSchedulerName, jobKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', decodedSchedulerName, decodedName, decodedGroup] });
    },
  });

  const resumeJob = useMutation({
    mutationFn: () => jobApi.resume(decodedSchedulerName, jobKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', decodedSchedulerName, decodedName, decodedGroup] });
    },
  });

  const deleteJob = useMutation({
    mutationFn: () => jobApi.delete(decodedSchedulerName, jobKey),
    onSuccess: () => {
      navigate(`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs`);
    },
    onError: (err: Error) => alert('Failed to delete job: ' + err.message),
  });

  const handleDelete = async () => {
    try {
      await deleteJob.mutateAsync();
    } catch (err: any) {
      alert('Failed to delete job: ' + err.message);
    }
  };

  if (isLoading) {
    return <div className="p-6"><LoadingSkeleton /></div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <p className="text-red-400">{error.message}</p>
          <Link
            to={`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs`}
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            ← Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const displayJobKey = `${decodedGroup}.${decodedName}`;

  const triggerStateDisplay = (() => {
    switch (job.status) {
      case 'normal': return { label: 'Normal', color: 'text-green-400' };
      case 'paused': return { label: 'Paused', color: 'text-amber-400' };
      case 'blocked': return { label: 'Blocked', color: 'text-red-400' };
      case 'complete': return { label: 'Complete', color: 'text-blue-400' };
      case 'error': return { label: 'Error', color: 'text-red-500' };
      default: return { label: job.status, color: 'text-slate-400' };
    }
  })();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const scheduleTypeDisplay = (() => {
    if (!job.schedule) return 'N/A';
    const type = (job.schedule.type || '').toLowerCase();
    switch (type) {
      case 'cron': return `Cron: ${job.schedule.cronExpression}`;
      case 'interval': return `Every ${job.schedule.intervalSeconds}s`;
      case 'once': return `Once at ${formatDate(job.schedule.runAt)}`;
      default: return job.schedule.type;
    }
  })();

  // Get parameter definitions for this job type from manifest (match by FullName)
  const paramDefinitions = manifest?.jobs?.find(j => j.jobTypeQualifiedName?.fullName === job.jobType?.fullName)?.parameters;

  const triggerStateColor = (state: string) => {
    switch (state) {
      case 'normal': return 'text-green-400';
      case 'paused': return 'text-amber-400';
      case 'blocked': return 'text-red-400';
      case 'complete': return 'text-blue-400';
      case 'error': return 'text-red-500';
      default: return 'text-slate-400';
    }
  };

  const triggerTypeDisplay = (trigger: TriggerSummaryDto) => {
    switch (trigger.type) {
      case 'cron': return <span className="text-xs font-mono">{trigger.cronExpression}</span>;
      case 'interval': return `Every ${trigger.intervalSeconds}s`;
      case 'once': return 'Once';
      case 'calendar': return 'Calendar';
      case 'daily': return 'Daily';
      default: return trigger.type;
    }
  };

  const triggerColumns: any[] = [
    {
      header: 'Name',
      accessor: (row: TriggerSummaryDto) => row.name,
      sortable: true,
    },
    {
      header: 'Group',
      accessor: (row: TriggerSummaryDto) => row.group,
    },
    {
      header: 'Type',
      accessor: (row: TriggerSummaryDto) => triggerTypeDisplay(row),
    },
    {
      header: 'State',
      accessor: (row: TriggerSummaryDto) => (
        <span className={`text-sm font-medium ${triggerStateColor(row.state)}`}>
          {row.state}
        </span>
      ),
    },
    {
      header: 'Next Fire',
      accessor: (row: TriggerSummaryDto) => row.nextFireTime ? new Date(row.nextFireTime).toLocaleString() : '-',
    },
    {
      header: 'Previous Fire',
      accessor: (row: TriggerSummaryDto) => row.previousFireTime ? new Date(row.previousFireTime).toLocaleString() : '-',
    },
    {
      header: 'Priority',
      accessor: (row: TriggerSummaryDto) => row.priority,
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <PageHeader
        title={displayJobKey}
        subtitle={`Scheduler: ${decodedSchedulerName}`}
        backPath={`/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs`}
        breadcrumbs={[
          { label: 'Schedulers', path: '/schedulers' },
          { label: decodedSchedulerName, path: `/schedulers/${encodeURIComponent(decodedSchedulerName)}` },
          { label: 'Jobs', path: `/schedulers/${encodeURIComponent(decodedSchedulerName)}/jobs` },
          { label: displayJobKey, active: true }
        ]}
      />
      <div className="flex gap-2 mb-6">
          <button
            onClick={() => triggerJob.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Play size={14} /> Trigger
          </button>
          <button
            onClick={() => pauseJob.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            <Pause size={14} /> Pause
          </button>
          <button
            onClick={() => resumeJob.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <Play size={14} /> Resume
          </button>
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>

      {/* Job Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Job Type</div>
          <JobTypeDisplay jobType={job.jobType} />
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Group</div>
          <div className="text-sm text-slate-50">{job.jobKey.group}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Status</div>
          <div className={`text-sm font-medium ${triggerStateDisplay.color}`}>{triggerStateDisplay.label}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Schedule</div>
          <div className="text-sm text-slate-50">{scheduleTypeDisplay}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Next Fire Time</div>
          <div className="text-sm text-slate-50">{formatDate(job.nextFireTime)}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Previous Fire Time</div>
          <div className="text-sm text-slate-50">{formatDate(job.previousFireTime)}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Description</div>
          <div className="text-sm text-slate-50">{job.description || 'No description'}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Disallow Concurrent</div>
          <div className="text-sm text-slate-50">{job.options.disallowConcurrentExecution ? 'Yes' : 'No'}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Misfire Policy</div>
          <div className="text-sm text-slate-50">{job.options.misfirePolicy}</div>
        </div>
      </div>

      {/* Job Parameters */}
      {job.params && Object.keys(job.params).length > 0 && (
        <JobParamsDisplay
          params={job.params}
          paramDefinitions={paramDefinitions}
          searchable={true}
        />
      )}

      {/* Triggers */}
      {job.triggers && job.triggers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-slate-200 mb-3">Triggers ({job.triggers.length})</h3>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <DataTable
              columns={triggerColumns}
              data={job.triggers}
              emptyMessage="No triggers"
            />
          </div>
        </div>
      )}

      {/* Execution History */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-slate-200 mb-3">Execution History</h3>
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <DataTable
            columns={[
              {
                header: 'Start Time',
                accessor: (row: ExecutionLogDto) => new Date(row.startTime).toLocaleString(),
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
                header: 'Error',
                accessor: (row: ExecutionLogDto) => row.errorMessage ? (
                  <span className="text-xs text-red-400 truncate max-w-xs" title={row.errorMessage}>
                    {row.errorMessage}
                  </span>
                ) : '-',
              },
            ]}
            data={logs}
            emptyMessage="No execution history"
          />
        </div>
        {logTotalPages > 1 && (
          <PaginationBar
            page={logPage}
            pageSize={10}
            totalItems={logsResponse?.total ?? 0}
            totalPages={logTotalPages}
            onPageChange={setLogPage}
            onPageSizeChange={() => {}}
          />
        )}
      </div>

      {/* Delete Confirmation */}
      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          title="Delete Job"
          message={`Are you sure you want to delete "${displayJobKey}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
};

export default JobDetailPage;
