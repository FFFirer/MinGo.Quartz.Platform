import React from 'react';
import type { SchedulerSummaryDto } from '../types';

type Props = {
  schedulers: SchedulerSummaryDto[];
};

// Simple 24-bar chart using pure HTML/CSS (no libs)
const ExecutionTrendChart: React.FC<Props> = ({ schedulers }) => {
  // Build 24-hour counts by aggregating per-hour history from schedulers
  const counts: number[] = new Array(24).fill(0);
  if (schedulers && schedulers.length > 0) {
    for (const s of schedulers) {
      const hist = (s as any).executionHistory;
      if (Array.isArray(hist)) {
        hist.forEach((h: any) => {
          const hour = typeof h?.hour === 'number' ? h.hour : (typeof h?.hour === 'string' ? parseInt(h.hour, 10) : NaN);
          const c = typeof h?.count === 'number' ? h.count : Number(h?.count) || 0;
          if (!Number.isNaN(hour) && hour >= 0 && hour < 24) {
            counts[hour] += c;
          }
        });
      }
    }
  }

  const max = Math.max(0, ...counts);
  const chartHeight = 120; // px

  if (max === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-50 mb-3">Execution Trend</h3>
        <div className="text-slate-400">No execution data</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-50">Execution Trend (Past 24h)</h3>
      </div>
      <div className="flex items-end" style={{ height: chartHeight }}>
        {counts.map((v, idx) => {
          const h = Math.round((v / max) * chartHeight);
          const w = 8; // 8px width per requirement
          const gap = 2; // 2px gap
          return (
            <div
              key={idx}
              title={`Hour ${idx}:00 — ${v}`}
              style={{ width: w, height: h, marginRight: gap }}
              className="bg-blue-500 rounded-t"
            />
          );
        })}
      </div>
    </div>
  );
};

export default ExecutionTrendChart;
