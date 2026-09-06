import React, { useState, useMemo, useCallback } from 'react';
import { Search, Clipboard, ClipboardCheck, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import type { ParameterInfoDto } from '../types';

// ── Props ──────────────────────────────────────────────

interface JobParamsDisplayProps {
  /** Key/value map of runtime parameter values */
  params: Record<string, any>;
  /** Optional parameter definitions from manifest (for labels, types, etc.) */
  paramDefinitions?: ParameterInfoDto[];
  /** Show search input (default: true) */
  searchable?: boolean;
}

// ── Type detection ─────────────────────────────────────

type DetectedType = 'bool' | 'number' | 'date' | 'object' | 'string';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function detectType(value: any): DetectedType {
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && ISO_DATE_RE.test(value) && !isNaN(Date.parse(value))) return 'date';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
}

// ── Sub-renderers ──────────────────────────────────────

const ParamBool: React.FC<{ value: boolean }> = ({ value }) =>
  value ? (
    <span className="inline-flex items-center gap-1 text-green-400">
      <Check size={14} strokeWidth={3} />
      <span>true</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-500">
      <X size={14} strokeWidth={3} />
      <span>false</span>
    </span>
  );

const ParamNumber: React.FC<{ value: number }> = ({ value }) => (
  <span className="font-mono tabular-nums text-slate-50">{value.toLocaleString()}</span>
);

const ParamDate: React.FC<{ value: string }> = ({ value }) => {
  const d = new Date(value);
  return (
    <span className="text-slate-50 cursor-help border-b border-dotted border-slate-600" title={value}>
      {d.toLocaleString()}
    </span>
  );
};

const ParamJsonTree: React.FC<{ data: any; depth?: number }> = ({ data, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth < 2);

  if (data === null) return <span className="text-slate-500 italic">null</span>;
  if (typeof data !== 'object') return <span className="text-slate-50">{String(data)}</span>;

  const isArray = Array.isArray(data);
  const entries: [string | number, any][] = isArray
    ? data.map((v: any, i: number) => [i, v])
    : Object.entries(data);

  if (entries.length === 0) {
    return <span className="text-slate-500">{isArray ? '[]' : '{}'}</span>;
  }

  const summary = isArray ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <div className={depth > 0 ? 'ml-4' : ''}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-slate-500">{summary}</span>
      </button>
      {expanded && (
        <div className="ml-3 border-l border-slate-700 pl-3 mt-1 space-y-0.5">
          {entries.map(([k, v]) => (
            <div key={String(k)} className="text-xs leading-5">
              <span className="text-slate-400">{isArray ? `[${k}]` : `${k}`}: </span>
              {typeof v === 'object' && v !== null ? (
                <ParamJsonTree data={v} depth={depth + 1} />
              ) : v === null ? (
                <span className="text-slate-500 italic">null</span>
              ) : typeof v === 'boolean' ? (
                <ParamBool value={v} />
              ) : typeof v === 'number' ? (
                <ParamNumber value={v} />
              ) : (
                <span className="text-slate-50">{String(v)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ParamLongText: React.FC<{ value: string }> = ({ value }) => {
  const [expanded, setExpanded] = useState(false);
  const truncated = value.length > 80;
  return (
    <div>
      <span className="text-slate-50 break-all font-mono text-xs">
        {truncated && !expanded ? `${value.slice(0, 80)}...` : value}
      </span>
      {truncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-1 text-xs text-blue-400 hover:text-blue-300"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────

const JobParamsDisplay: React.FC<JobParamsDisplayProps> = ({
  params,
  paramDefinitions,
  searchable = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Build a lookup map from parameter definitions
  const defMap = useMemo<Map<string, ParameterInfoDto>>(() => {
    const map = new Map<string, ParameterInfoDto>();
    paramDefinitions?.forEach((d) => map.set(d.name, d));
    return map;
  }, [paramDefinitions]);

  // Filtered entries based on search query
  const filteredEntries = useMemo(() => {
    const entries = Object.entries(params);
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(([key, value]) => {
      const def = defMap.get(key);
      const label = (def?.label ?? '').toLowerCase();
      return (
        key.toLowerCase().includes(q) ||
        label.includes(q) ||
        String(value).toLowerCase().includes(q)
      );
    });
  }, [params, searchQuery, defMap]);

  // Copy value to clipboard
  const handleCopy = useCallback(async (key: string, value: any) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard API not available
    }
  }, []);

  // Render a single parameter value based on its type
  const renderValue = (value: any, def?: ParameterInfoDto) => {
    const type = def?.type || detectType(value);

    switch (type) {
      case 'bool':
        return <ParamBool value={Boolean(value)} />;
      case 'number':
        return <ParamNumber value={Number(value)} />;
      case 'date':
        return <ParamDate value={String(value)} />;
      case 'object':
        return <ParamJsonTree data={value} />;
      default: {
        const str = String(value);
        if (str.length > 80) return <ParamLongText value={str} />;
        return <span className="text-slate-50">{str}</span>;
      }
    }
  };

  // Keyboard shortcut: Ctrl/Cmd+F to focus search
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && searchable) {
        // Only intercept if focus is not already in an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchable]);

  const paramCount = Object.keys(params).length;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-lg font-semibold text-slate-50">Parameters</h3>
        <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
          {paramCount} {paramCount === 1 ? 'param' : 'params'}
        </span>
      </div>

      {/* Search */}
      {searchable && paramCount > 0 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parameters…"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600 rounded-lg
                         text-slate-200 placeholder-slate-500
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
                         transition-colors"
            />
          </div>
        </div>
      )}

      {/* Parameter list */}
      <div className="px-4 pb-4">
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            {searchQuery ? 'No matching parameters' : 'No parameters'}
          </p>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredEntries.map(([key, value]) => {
              const def = defMap.get(key);
              const isDefault = def?.default !== undefined && def.default === value;

              return (
                <div
                  key={key}
                  className="flex items-start gap-2 py-2.5 px-2 -mx-2 rounded-lg
                             hover:bg-slate-700/30 transition-colors group"
                >
                  {/* Label column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-medium text-slate-300">
                        {def?.label || key}
                      </span>
                      {def?.required && (
                        <span className="text-red-500 text-xs leading-none" title="Required">*</span>
                      )}
                      {def && (
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-700 px-1 rounded leading-none">
                          {def.type}
                        </span>
                      )}
                    </div>
                    <div className="text-sm leading-relaxed">
                      {renderValue(value, def)}
                    </div>
                    {isDefault && (
                      <span className="text-[10px] text-slate-600 mt-0.5 block">(default)</span>
                    )}
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(key, value)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100
                               p-1.5 rounded text-slate-500 hover:text-slate-300
                               hover:bg-slate-700 transition-all"
                    title="Copy value"
                  >
                    {copiedKey === key ? (
                      <ClipboardCheck size={14} className="text-green-400" />
                    ) : (
                      <Clipboard size={14} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobParamsDisplay;
