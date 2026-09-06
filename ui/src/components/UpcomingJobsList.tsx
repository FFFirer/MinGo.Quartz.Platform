import { Clock, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface UpcomingJob {
  jobKey: string;
  jobType: string;
  schedulerId?: string;
  schedulerName?: string;
  scheduleDescription: string;
  nextFireTime: string;
}

interface UpcomingJobsListProps {
  jobs: UpcomingJob[];
  maxItems?: number;
  showScheduler?: boolean;
  loading?: boolean;
  onJobClick?: (jobKey: string) => void;
}

export function UpcomingJobsList({ 
  jobs, 
  maxItems = 10, 
  showScheduler = false,
  loading = false,
  onJobClick 
}: UpcomingJobsListProps) {
  const displayJobs = jobs.slice(0, maxItems);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg animate-pulse">
            <div className="w-12 h-6 bg-slate-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-slate-700 rounded w-32 mb-1" />
              <div className="h-3 bg-slate-700 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
        <p>No upcoming jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayJobs.map((job, index) => (
        <div 
          key={`${job.jobKey}-${index}`}
          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          onClick={() => onJobClick?.(job.jobKey)}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center text-slate-400 min-w-[60px]">
              <Clock size={14} />
              <span className="text-xs">
                {new Date(job.nextFireTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-50">{job.jobKey}</p>
              <p className="text-xs text-slate-400">
                {job.jobType} • {job.scheduleDescription}
              </p>
            </div>
          </div>
          {showScheduler && job.schedulerName && (
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
              {job.schedulerName}
            </span>
          )}
        </div>
      ))}
      {jobs.length > maxItems && (
        <p className="text-center text-sm text-slate-500 pt-2">
          +{jobs.length - maxItems} more jobs
        </p>
      )}
    </div>
  );
}

export default UpcomingJobsList;