import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type RecentAction = {
  label: string;
  icon: string;
  path?: string;
};

const FloatingActionPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<RecentAction[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      if (open) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const navigateTo = (path?: string) => {
    // Fallback to window.location if navigate isn't available
    try {
      if (path && navigate) {
        navigate(path);
        return;
      }
    } catch {
      // ignore and fallback
    }
    if (path) window.location.assign(path);
  };

  const addRecent = (label: string, icon: string, path?: string) => {
    const item: RecentAction = { label, icon, path };
    setRecent(prev => {
      const without = prev.filter(p => p.label !== label);
      const next = [item, ...without].slice(0, 3);
      return next;
    });
  };

  const onCreateJob = () => {
    addRecent('Create Job', '💼', '/jobs/create');
    // Try JobsPanel mechanism via global event for existing JobsPage integration
    try {
      const evt = new CustomEvent('open-create-job-panel');
      window.dispatchEvent(evt);
    } catch {
      // Fallback navigation if event isn't handled
      navigateTo('/schedulers');
    }
  };

  const onDashboard = () => {
    addRecent('View Dashboard', '📊', '/');
    navigateTo('/');
  };

  const onSchedulers = () => {
    addRecent('View Schedulers', '🗂️', '/schedulers');
    navigateTo('/schedulers');
  };

  const menuItems = [
    { key: 'create', label: 'Create Job', icon: '💼', onClick: onCreateJob },
    { key: 'dashboard', label: 'View Dashboard', icon: '📊', onClick: onDashboard },
    { key: 'schedulers', label: 'View Schedulers', icon: '🗂️', onClick: onSchedulers },
  ];

  return (
    <div ref={wrapperRef} className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end relative">
        {open && (
          <div className="absolute bottom-full mb-3 right-0 w-60">
            <div className="bg-slate-800 rounded-md shadow-lg p-2 mb-2 transition-all duration-150 transform origin-bottom-right"
                 style={{ transform: open ? 'translateY(0)' : 'translateY(6px)', opacity: open ? 1 : 0 }}>
              {menuItems.map(item => (
                <button
                  key={item.key}
                  onClick={item.onClick}
                  className="flex items-center w-full justify-start gap-2 text-white bg-slate-800 hover:bg-slate-700 rounded-md px-3 py-2 mb-2"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="bg-slate-800 rounded-md shadow-lg p-2 w-60">
              <div className="text-xs text-slate-300 mb-1">Recent</div>
              <div className="flex flex-wrap gap-2">
                {recent.length === 0 && (
                  <span className="text-xs text-slate-400">No recent actions</span>
                )}
                {recent.map((r, idx) => (
                  <span key={idx} className="bg-slate-700 text-xs px-2 py-1 rounded-md inline-flex items-center">
                    <span className="mr-1">{r.icon}</span>
                    <span>{r.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <button
          aria-label={open ? 'Close actions' : 'Open actions'}
          onClick={() => setOpen(v => !v)}
          className="w-14 h-14 bg-blue-600 rounded-full shadow-lg hover:bg-blue-500 text-white flex items-center justify-center transform transition-transform duration-200"
        >
          <span className={`transition-transform duration-200 ${open ? 'rotate-0' : 'rotate-45'}`}>
            ⚡
          </span>
        </button>
      </div>
    </div>
  );
};

export default FloatingActionPalette;
