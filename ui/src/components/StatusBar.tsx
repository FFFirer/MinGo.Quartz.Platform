import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agentApi, schedulerApi } from '../api';
import { RefreshCw } from 'lucide-react';

type HealthStatus = 'healthy' | 'degraded' | 'down';

const HEALTH_CONFIG: Record<HealthStatus, { color: string; text: string }> = {
  healthy: { color: 'bg-green-500', text: 'All systems operational' },
  degraded: { color: 'bg-amber-500', text: 'Some agents offline or warning' },
  down: { color: 'bg-red-500', text: 'System unavailable' },
};

export default function StatusBar() {
  const { data: schedulers, dataUpdatedAt: schedulersUpdatedAt } = useQuery({
    queryKey: ['statusbar-schedulers'],
    queryFn: () => schedulerApi.getAll(),
    refetchInterval: 30000,
  });

  const { data: agents, dataUpdatedAt: agentsUpdatedAt } = useQuery({
    queryKey: ['statusbar-agents'],
    queryFn: () => agentApi.getAll(1, 1000),
    refetchInterval: 30000,
  });

  const healthStatus: HealthStatus = useMemo(() => {
    const agentList = agents?.data?.items ?? [];
    if (agentList.length === 0) return 'healthy';
    const offlineAgents = agentList.filter(a => a.status === 'Offline' || a.status === 'Warning').length;
    const totalAgents = agentList.length;
    if (offlineAgents === 0) return 'healthy';
    if (offlineAgents < totalAgents) return 'degraded';
    return 'down';
  }, [agents?.data]);

  const latestUpdate = schedulersUpdatedAt ?? agentsUpdatedAt;

  const healthConfig = HEALTH_CONFIG[healthStatus];

  return (
    <div className="h-7 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-4 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${healthConfig.color}`} />
        <span>{healthConfig.text}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>
          Schedulers: {schedulers?.data?.length ?? '-'} | Agents: {agents?.data?.items?.length ?? '-'}
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw size={10} />
          {latestUpdate ? new Date(latestUpdate).toLocaleTimeString() : '-'}
        </span>
        <span className="text-slate-600">v2.0.0</span>
      </div>
    </div>
  );
}
