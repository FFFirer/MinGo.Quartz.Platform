import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, FileText, Boxes } from 'lucide-react';
import { manifestApi } from '../api';
import SlidePanel from './SlidePanel';
import JobTypeDisplay from './JobTypeDisplay';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { ApiResponse, JobManifestDto, JobTypeInfoDto, ParameterInfoDto } from '../types';

interface ManifestPanelProps {
  /** Scheduler whose manifest should be shown. `null` keeps the panel closed. */
  schedulerName: string | null;
  onClose: () => void;
}

/** Render a parameter default value as a compact string. */
function renderDefaultValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const ParameterRow: React.FC<{ param: ParameterInfoDto }> = ({ param }) => (
  <div className="py-2 border-b border-slate-700/50 last:border-0">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-sm text-slate-100">{param.name}</span>
      {param.required && (
        <span className="text-[10px] uppercase tracking-wide text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded">
          required
        </span>
      )}
      {param.type && (
        <span className="text-[10px] uppercase tracking-wide text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
          {param.type}
        </span>
      )}
    </div>
    {(param.label || (param.default !== undefined && param.default !== null)) && (
      <div className="mt-1 text-xs text-slate-500 flex gap-4 flex-wrap">
        {param.label && <span>Label: <span className="text-slate-400">{param.label}</span></span>}
        {param.default !== undefined && param.default !== null && (
          <span>
            Default: <span className="font-mono text-slate-400">{renderDefaultValue(param.default)}</span>
          </span>
        )}
      </div>
    )}
  </div>
);

const JobTypeCard: React.FC<{ job: JobTypeInfoDto }> = ({ job }) => {
  const params = job.parameters ?? [];
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
      {/* Key */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono bg-slate-700 text-slate-200 px-2 py-0.5 rounded shrink-0">
          {job.key}
        </span>
      </div>

      {/* Qualified type name */}
      <div className="mb-2">
        <JobTypeDisplay jobType={job.jobTypeQualifiedName} size="sm" showCopy />
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-slate-400 mb-3 leading-relaxed">{job.description}</p>
      )}

      {/* Parameters */}
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Parameters ({params.length})
        </div>
        {params.length > 0 ? (
          <div>
            {params.map((p) => (
              <ParameterRow key={p.name} param={p} />
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">No parameters</span>
        )}
      </div>
    </div>
  );
};

/**
 * Slide-in panel that shows the Job Manifest reported by a scheduler's agent.
 * The manifest endpoint is proxied per-scheduler, so an agent with multiple
 * schedulers exposes one manifest per scheduler.
 */
const ManifestPanel: React.FC<ManifestPanelProps> = ({ schedulerName, onClose }) => {
  const isOpen = !!schedulerName;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    ApiResponse<JobManifestDto>,
    Error
  >({
    queryKey: ['manifest', schedulerName],
    queryFn: () => manifestApi.get(schedulerName as string),
    enabled: isOpen,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // A 200 response can still carry success=false (e.g. agent returned an error payload).
  const inlineError = data && !data.success ? data.errorMessage ?? 'Failed to load manifest' : null;
  const jobs = data?.data?.jobs ?? [];
  const hasError = isError || !!inlineError;

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Job Manifest"
      width="w-full sm:w-[42rem]"
    >
      {/* Context header */}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500">Scheduler</div>
          <div className="text-sm font-mono text-slate-100 truncate" title={schedulerName ?? ''}>
            {schedulerName}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50 shrink-0"
          title="Refresh manifest"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <LoadingSkeleton variant="rectangular" height="120px" />
          <LoadingSkeleton variant="rectangular" height="120px" />
          <LoadingSkeleton variant="rectangular" height="120px" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && hasError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-red-300 mb-1">Failed to load manifest</div>
              <div className="text-sm text-red-200/80 break-words">
                {isError ? error?.message ?? 'An unknown error occurred.' : inlineError}
              </div>
              <button
                onClick={() => refetch()}
                className="mt-3 px-3 py-1.5 text-xs bg-slate-700 rounded hover:bg-slate-600 text-slate-100"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasError && jobs.length === 0 && (
        <div className="text-center py-12">
          <Boxes size={32} className="mx-auto text-slate-600 mb-3" />
          <div className="text-sm text-slate-400">No job types reported by this scheduler.</div>
        </div>
      )}

      {/* Data */}
      {!isLoading && !hasError && jobs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <FileText size={14} />
            {jobs.length} {jobs.length === 1 ? 'job type' : 'job types'} available
          </div>
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobTypeCard key={job.key} job={job} />
            ))}
          </div>
        </div>
      )}
    </SlidePanel>
  );
};

export default ManifestPanel;
