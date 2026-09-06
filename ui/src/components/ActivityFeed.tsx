import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StreamEvent } from './useEventStream';
import { UserCheck, UserX, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

type ActivityFeedProps = {
  events: StreamEvent[];
  isLive: boolean;
  maxItems?: number;
};

const iconFor = (type: StreamEvent['type']) => {
  switch (type) {
    case 'AgentStatusChanged':
      return <UserCheck className="text-green-400" />;
    case 'JobExecuted':
      return <CheckCircle className="text-blue-400" />;
    case 'SchedulerStatusChanged':
      return <RefreshCw className="text-amber-400" />;
    default:
      return null;
  }
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, isLive, maxItems = 20 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  const visibleEvents = useMemo(() => {
    if (!events) return [] as StreamEvent[];
    return events.slice(-maxItems);
  }, [events, maxItems]);

  // Auto-scroll to bottom on new events when user is at bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    } else {
      // show a banner to indicate new items available
      if (visibleEvents.length > 0) setShowBanner(true);
    }
  }, [visibleEvents.length]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const bottom = Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 20;
    setAtBottom(bottom);
    if (bottom) setShowBanner(false);
  };

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowBanner(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 text-slate-50">
        <span className="font-semibold text-lg">Activity Feed</span>
        <span className="flex items-center text-sm text-slate-400">
          <span className={`inline-block w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="ml-2">{isLive ? 'Live' : 'Polling'}</span>
        </span>
      </div>
      {showBanner && (
        <div
          className="bg-blue-600 text-white text-xs px-2 py-1 rounded mb-2 cursor-pointer w-fit"
          onClick={scrollToBottom}
        >
          New events
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-2"
        style={{ maxHeight: 320 }}
      >
        {visibleEvents.length === 0 && (
          <div className="text-slate-400 text-sm p-2">No recent activity</div>
        )}
        {visibleEvents.map((ev) => (
          <div key={ev.id} className="flex items-start gap-2 py-1 px-1 rounded hover:bg-slate-700">
            <div className="mt-1">{iconFor(ev.type)}</div>
            <div className="flex-1">
              <div className="text-slate-50 text-sm">{ev.message}</div>
              <div className="text-slate-400 text-xs">{timeAgo(ev.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
