import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '../api';
import { schedulerApi } from '../api';
import { jobApi } from '../api';
import { AgentDetailDto, SchedulerSummaryDto, JobSummaryDto } from '../types';
import Fuse from 'fuse.js';
import { useQuery } from '@tanstack/react-query';
import { useSearchContext } from './SearchContext';

type FlatItem = {
  type: 'Agents' | 'Schedulers' | 'Jobs';
  label: string;
  payload: any; // holds the data item
  schedulerName?: string;
};

const MAX_PER_GROUP = 5;

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, closeSearch } = useSearchContext();

  // Data fetching with React Query using the provided API clients
  const { data: agents = [] as AgentDetailDto[] } = useQuery<AgentDetailDto[], Error>({
    queryKey: ['agents'],
    queryFn: async () => agentApi.getAll().then(r => (r?.data?.items ?? []) as AgentDetailDto[]),
  });
  const { data: schedulers = [] as SchedulerSummaryDto[] } = useQuery<SchedulerSummaryDto[], Error>({
    queryKey: ['schedulers'],
    queryFn: async () => schedulerApi.getAll().then(r => r as any as SchedulerSummaryDto[]),
  });

  // Jobs are per-scheduler; fetch all then flatten
  const jobsBySchedulerQuery = useQuery<{ schedulerName: string; jobs: JobSummaryDto[] }[]>({
    queryKey: ['jobs-by-scheduler', schedulers?.length],
    queryFn: async () => {
      if (!schedulers || schedulers.length === 0) return [];
      const promises = schedulers.map(s =>
        jobApi.getAll(s.schedulerName, 1, 20).then(r => ({ schedulerName: s.schedulerName, jobs: r.data?.items ?? [] }))
      );
      const results = await Promise.all(promises);
      // normalize to required shape
      return results.map(r => ({ schedulerName: r.schedulerName, jobs: r.jobs }));
    },
    staleTime: 30000,
  });

  // Flatten for Fuse searches
  const allJobs: { schedulerName: string; jobKey: string; jobType: string; status: string }[] = useMemo(() => {
    if (!jobsBySchedulerQuery.data) return [];
    return jobsBySchedulerQuery.data.flatMap(group => group.jobs.map(j => ({ schedulerName: group.schedulerName, jobKey: j.jobKey, jobType: j.jobType, status: j.status }))) as any;
  }, [jobsBySchedulerQuery.data]);
  // Initialize Fuse indexes once data is loaded
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fuseReady = true;

  const agentFuse = useMemo(() => new Fuse(agents, { keys: ['name', 'id'], threshold: 0.25 }), [agents]);
  const schedulerFuse = useMemo(() => new Fuse(schedulers, { keys: ['schedulerName', 'id'], threshold: 0.25 }), [schedulers]);
  const jobsList = useMemo(() => allJobs.map(j => ({ ...j })), [allJobs]);
  const jobsFuse = useMemo(() => new Fuse(jobsList, { keys: ['jobKey', 'jobType'], threshold: 0.25 }), [jobsList]);

  const results = useMemo(() => {
    const q = query?.trim() || '';
    const agentsHits = q ? agentFuse?.search?.(q) ?? [] : (Array.isArray(agents) ? agents : []);
    const schedHits = q ? schedulerFuse?.search?.(q) ?? [] : (Array.isArray(schedulers) ? schedulers : []);
    const jobsHits = q ? jobsFuse?.search?.(q) ?? [] : (Array.isArray(jobsList) ? jobsList : []);

    // Normalize to a common structure and cap per group
    const topAgents = (agentsHits as any[]).slice(0, MAX_PER_GROUP).map(a => ({ type: 'Agents', data: a.item ?? a, label: a.item?.name ?? a.id }));
    const topSchedulers = (schedHits as any[]).slice(0, MAX_PER_GROUP).map(s => ({ type: 'Schedulers', data: s.item ?? s, label: s.item?.schedulerName ?? s.id }));
    const topJobs = (jobsHits as any[]).slice(0, MAX_PER_GROUP).map(j => ({ type: 'Jobs', data: j.item ?? j, label: j.item?.jobKey ?? j.jobKey }));

    // Build a flat list with group boundaries for navigation
    const flat: FlatItem[] = [];
    topAgents.forEach(it => flat.push({ type: it.type as any, label: it.label, payload: it.data }));
    topSchedulers.forEach(it => flat.push({ type: it.type as any, label: it.label, payload: it.data }));
    topJobs.forEach(it => flat.push({ type: it.type as any, label: it.label, payload: it.data }));
    return flat;
  }, [agents, schedulers, jobsList, agentFuse, schedulerFuse, jobsFuse, query]);

  // Keyboard navigation helpers
  const totalItems = results.length;
  const currentItem = results[selectedIndex] ?? null;

  const navigateToCurrent = useCallback(() => {
    if (!currentItem) return;
    const item = currentItem.payload;
    if (!item) return;
    switch (currentItem.type) {
      case 'Agents':
        navigate(`/agents/${item.id}`);
        break;
      case 'Schedulers':
        navigate(`/schedulers/${encodeURIComponent(item.schedulerName ?? item.id)}`);
        break;
      case 'Jobs':
        navigate(`/schedulers/${encodeURIComponent(item.schedulerName)}/jobs/${encodeURIComponent(item.jobKey)}`);
        break;
      default:
        break;
    }
    closeSearch();
  }, [currentItem, navigate, closeSearch]);

  useEffect(() => {
    if (!isOpen) return;
    // reset selection when opening
    setSelectedIndex(0);
  }, [isOpen]);

  // Bind Enter key to navigate
 useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateToCurrent();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, totalItems, navigateToCurrent, closeSearch]);

  // Auto-focus the search input when opened
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if ((isOpen) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Backdrop close handling
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onBackdropClick} aria-label="Global search" role="dialog">
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute left-1/2 top-10 -translate-x-1/2 w-full max-w-lg mx-auto" style={{ top: '6rem' }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <input
              ref={inputRef}
              className="w-full bg-transparent outline-none text-lg text-slate-900 dark:text-slate-100"
              placeholder="Search agents, schedulers, jobs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow:auto p-2">
            {results.length === 0 && (
              <div className="p-4 text-sm text-slate-500">No results</div>
            )}
            {results.map((r, idx) => (
              <div key={idx} className={`px-2 py-2 rounded-md ${idx === selectedIndex ? 'bg-slate-200 dark:bg-slate-700' : ''}`} onMouseEnter={() => setSelectedIndex(idx)} onClick={() => {
                // navigate on click
                const item = r.payload;
                switch (r.type) {
                  case 'Agents': navigate(`/agents/${item.id}`); break;
                  case 'Schedulers': navigate(`/schedulers/${encodeURIComponent(item.schedulerName ?? item.id)}`); break;
                  case 'Jobs': navigate(`/schedulers/${encodeURIComponent(item.schedulerName)}/jobs/${encodeURIComponent(item.jobKey)}`); break;
                  default: break;
                }
                closeSearch();
              }}>
                <div className="flex items-center justify-between">
                  <span className="truncate w-full mr-2">{r.type} → {r.payload?.name ?? r.payload?.schedulerName ?? r.payload?.jobKey}</span>
                  <span className="text-xs text-slate-500 ml-2">{r.type}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">{r.payload?.url ?? r.payload?.schedulerName ?? r.payload?.jobType ?? ''}{' '}{r.payload?.status ?? ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
