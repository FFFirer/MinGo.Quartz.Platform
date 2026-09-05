import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentStatusChangedEvent,
  JobExecutedEvent,
  SchedulerStatusChangedEvent,
} from '../types';

// Unified stream event for UI display
export type StreamEvent = {
  id: string;
  type: 'AgentStatusChanged' | 'JobExecuted' | 'SchedulerStatusChanged';
  message: string;
  timestamp: string;
  data: AgentStatusChangedEvent | JobExecutedEvent | SchedulerStatusChangedEvent;
};

type ConnectionStatus = 'connected' | 'polling' | 'disconnected';

let eventCounter = 0;

function toStreamEvent(eventType: string, rawData: unknown): StreamEvent | null {
  const ts = new Date().toISOString();
  switch (eventType) {
    case 'AgentStatusChanged': {
      const d = rawData as AgentStatusChangedEvent;
      return {
        id: `sse-${++eventCounter}`,
        type: 'AgentStatusChanged',
        message: `Agent "${d.agentName}" status: ${d.previousStatus} → ${d.newStatus}`,
        timestamp: ts,
        data: d,
      };
    }
    case 'JobExecuted': {
      const d = rawData as JobExecutedEvent;
      return {
        id: `sse-${++eventCounter}`,
        type: 'JobExecuted',
        message: `Job "${d.jobGroup}.${d.jobName}" ${d.success ? 'completed' : 'failed'} (${d.durationMs}ms)`,
        timestamp: ts,
        data: d,
      };
    }
    case 'SchedulerStatusChanged': {
      const d = rawData as SchedulerStatusChangedEvent;
      return {
        id: `sse-${++eventCounter}`,
        type: 'SchedulerStatusChanged',
        message: `Scheduler "${d.schedulerName}" status: ${d.previousStatus} → ${d.newStatus}`,
        timestamp: ts,
        data: d,
      };
    }
    default:
      return null;
  }
}

// Custom hook: SSE with polling fallback
export function useEventStream(): {
  events: StreamEvent[];
  isLive: boolean;
  connectionStatus: ConnectionStatus;
} {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const esRef = useRef<EventSource | null>(null);
  const mounted = useRef(true);
  const pollingTimer = useRef<number | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const backoffMs = useRef<number>(1000);

  const addEvent = (evt: StreamEvent) => {
    setEvents((prev) => {
      const merged = [...prev, evt];
      return merged.length > 50 ? merged.slice(-50) : merged;
    });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (pollingTimer.current) {
        window.clearInterval(pollingTimer.current);
        pollingTimer.current = null;
      }
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, []);

  // Establish SSE connection
  useEffect(() => {
    const connectSSE = () => {
      if (!mounted.current) return;
      try {
        const es = new EventSource('/api/events');
        esRef.current = es;
        setIsLive(true);
        setConnectionStatus('connected');

        // Handle named L3 events
        const handleNamedEvent = (eventType: string) => (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            const evt = toStreamEvent(eventType, data);
            if (evt) addEvent(evt);
          } catch {
            // ignore parse errors
          }
        };

        es.addEventListener('AgentStatusChanged', handleNamedEvent('AgentStatusChanged'));
        es.addEventListener('JobExecuted', handleNamedEvent('JobExecuted'));
        es.addEventListener('SchedulerStatusChanged', handleNamedEvent('SchedulerStatusChanged'));

        // Fallback for unnamed messages
        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            // L3 may send a "connected" event as initial ack
            if (data?.type) {
              const evt = toStreamEvent(data.type, data);
              if (evt) addEvent(evt);
            }
          } catch {
            // ignore
          }
        };

        es.onerror = () => {
          if (!mounted.current) return;
          es.close();
          esRef.current = null;
          setConnectionStatus('polling');
          setIsLive(false);
          // Reconnect with exponential backoff
          window.clearTimeout(reconnectTimer.current as number);
          const delay = backoffMs.current;
          reconnectTimer.current = window.setTimeout(() => {
            backoffMs.current = Math.min(backoffMs.current * 2, 30000);
            connectSSE();
          }, delay) as unknown as number;
        };
      } catch {
        setConnectionStatus('polling');
        setIsLive(false);
        startPollingFallback();
      }
    };

    const startPollingFallback = () => {
      if (pollingTimer.current) return;
      const tick = async () => {
        try {
          const res = await fetch('/api/events', {
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) {
              for (const item of json) {
                const evt = toStreamEvent(item.type, item);
                if (evt) addEvent(evt);
              }
            }
            setConnectionStatus('polling');
          } else {
            throw new Error('Polling failed');
          }
        } catch {
          setConnectionStatus('disconnected');
        }
      };
      pollingTimer.current = window.setInterval(tick, 15000) as unknown as number;
      setIsLive(false);
      setConnectionStatus('polling');
    };

    connectSSE();

    return () => {
      // cleanup handled in unmount effect
    };
  }, []);

  return useMemo(() => ({ events, isLive, connectionStatus }), [events, isLive, connectionStatus]);
}
