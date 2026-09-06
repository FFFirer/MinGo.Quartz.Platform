import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import type { SchedulerSummaryDto } from '../types';

type HealthMatrixProps = {
  schedulers: SchedulerSummaryDto[];
};

function truncateId(id: string | undefined, len = 8): string {
  if (!id) return '';
  if (id.length <= len) return id;
  return id.substring(0, len) + '…';
}

function timeAgo(ts: string | undefined): string {
  if (!ts) return '';
  try {
    const now = new Date();
    const t = new Date(ts);
    const diff = Math.max(0, now.getTime() - t.getTime());
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  } catch {
    return '';
  }
}

const HealthMatrix: React.FC<HealthMatrixProps> = ({ schedulers }) => {
  const hasData = schedulers && schedulers.length > 0;

  if (!hasData) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="text-slate-200">No schedulers registered</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-50">Schedulers</h3>
        <Link to="/schedulers" className="text-sm text-blue-400 hover:text-blue-300">
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedulers.map((s) => (
          <Link
            key={s.schedulerName}
            to={`/schedulers/${encodeURIComponent(s.schedulerName)}`}
            className="group block p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={s.status} size="sm" showLabel={false} />
              <span className="font-medium text-slate-50">{s.schedulerName}</span>
              {s.isClustered ? (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-600 text-white">Clustered</span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>Instance: {truncateId(s.schedulerInstanceId)}</div>
              <div>Agents: {s.agentCount ?? 0}</div>
              <div>Last reported: {timeAgo(s.lastReportedAt)}</div>
              <div>Jobs: {((s as any).jobCounts?.totalJobs ?? 0)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HealthMatrix;
