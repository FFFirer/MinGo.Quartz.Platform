// Enums
export type SyncStatus = 'Pending' | 'Synced' | 'Failed' | 'Timeout';
export type ScheduleType = 'Once' | 'Cron' | 'Interval' | 'None';
export type MisfirePolicy = 'FireAndProceed' | 'IgnoreMisfire' | 'DoNothing';

// Common
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errorMessage?: string;
  errorCode?: string;
  timestamp: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedQuery {
  page: number;
  pageSize: number;
}

// Agent types
export type AgentStatus = 'Pending' | 'Online' | 'Warning' | 'Offline' | 'Deleted';

export interface AgentSummaryDto {
  id: string;
  name: string;
  url: string;
  status: string;
  agentVersion?: string;
  lastHeartbeat?: string;
  startedAt: string;
  schedulerCount: number;
}

export interface AgentDetailDto {
  id: string;
  name: string;
  url: string;
  status: string;
  agentVersion?: string;
  lastHeartbeat?: string;
  lastReportedAt?: string;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  schedulers: AgentSchedulerDto[];
}

export interface AgentIdentity {
  agentId: string;
  registeredAt: string;
  lastUpdatedAt: string;
}

export interface RegisterAgentRequest {
  agentId?: string;
  name?: string;
  url: string;
  agentVersion?: string;
  startedAt: string;
}

export interface RegisterAgentResponse {
  agentId: string;
  token: string;
  heartbeatIntervalSeconds: number;
  warningThresholdSeconds: number;
  offlineThresholdSeconds: number;
}

export interface AgentHeartbeatRequestV2 {
  agentId: string;
  status: string;
  timestamp: string;
  schedulerSummaries?: SchedulerStatusSummary[];
  metadata?: Record<string, string>;
}

export interface AgentHeartbeatResponseV2 {
  serverTime: string;
  shouldReportSchedulers?: boolean;
  nextHeartbeatIntervalSeconds?: number;
}

// Scheduler types
export interface SchedulerInfoDto {
  schedulerName: string;
  schedulerInstanceId?: string;
  status: string;
  isClustered: boolean;
  jobStoreType?: string;
  threadPoolType?: string;
  threadPoolSize: number;
  runningSince?: string;
  version?: string;
  numberOfJobsExecuted: number;
  jobCounts?: JobCountsDto;
  properties?: Record<string, string>;
}

export interface SchedulerSummaryDto {
  id: string;
  schedulerName: string;
  schedulerInstanceId?: string;
  status: string;
  isClustered: boolean;
  runningSince?: string;
  lastReportedAt: string;
  agentCount: number;
}

export interface SchedulerDetailDto {
  id: string;
  schedulerName: string;
  schedulerInstanceId?: string;
  status: string;
  isClustered: boolean;
  jobStoreType?: string;
  threadPoolType?: string;
  threadPoolSize: number;
  runningSince?: string;
  version?: string;
  numberOfJobsExecuted: number;
  jobCounts?: JobCountsDto;
  properties?: Record<string, string>;
  firstReportedAt: string;
  lastReportedAt: string;
  agents: SchedulerAgentDto[];
}

export interface AgentSchedulerDto {
  schedulerInfoId: string;
  schedulerName: string;
  schedulerInstanceId?: string;
  status: string;
  isClustered: boolean;
  runningSince?: string;
  reportedAt: string;
}

export interface SchedulerAgentDto {
  agentId: string;
  agentName: string;
  agentUrl: string;
  agentStatus: string;
  reportedAt: string;
}

export interface SchedulerStatusSummary {
  schedulerName: string;
  status: string;
  jobCount: number;
  runningJobCount: number;
}

export interface SchedulerReportRequest {
  schedulers: SchedulerInfoDto[];
}

// JobTypeQualifiedName — 结构化限定名
export interface JobTypeQualifiedName {
  fullName: string;
  assembly: string;
  version?: string;
  culture?: string;
  publicKeyToken?: string;
}

// JobKeyDto — 强类型 Job 标识符
export interface JobKeyDto {
  name: string;
  group: string;
}

// Job types
export interface ScheduleDto {
  type: ScheduleType;
  cronExpression?: string;
  intervalSeconds?: number;
  runAt?: string;
}

export interface QuartzOptionsDto {
  disallowConcurrentExecution: boolean;
  storeDurable: boolean;
  requestRecovery: boolean;
  misfirePolicy: MisfirePolicy;
}

export interface CreateJobRequest {
  jobKey: JobKeyDto;
  jobType: JobTypeQualifiedName;
  params: Record<string, any>;
  schedule: ScheduleDto;
  options: QuartzOptionsDto;
}

export interface UpdateJobRequest {
  params?: Record<string, any>;
  schedule?: ScheduleDto;
  options?: QuartzOptionsDto;
}

export interface JobDefinitionDto {
  id: string;
  schedulerName: string;
  jobKey: JobKeyDto;
  jobType: JobTypeQualifiedName;
  params: string;
  schedule: string;
  options: string;
  status: SyncStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
  triggers?: TriggerSummaryDto[];
}

export interface JobSummaryDto {
  jobKey: JobKeyDto;
  jobType: JobTypeQualifiedName;
  status: string;
  scheduleType: string;
  cronExpression?: string;
  nextFireTime?: string;
  previousFireTime?: string;
}

export interface JobDetailDto {
  jobKey: JobKeyDto;
  jobType: JobTypeQualifiedName;
  status: string;
  description: string;
  schedule: ScheduleDto;
  options: QuartzOptionsDto;
  params: Record<string, any>;
  nextFireTime?: string;
  previousFireTime?: string;
  triggers: TriggerSummaryDto[];
}

export interface TriggerSummaryDto {
  name: string;
  group: string;
  type: string;
  state: string;
  cronExpression?: string;
  intervalSeconds?: number;
  repeatCount?: number;
  timesTriggered: number;
  calendarName?: string;
  description?: string;
  priority: number;
  misfireInstruction: string;
  startTime?: string;
  endTime?: string;
  previousFireTime?: string;
  nextFireTime?: string;
  finalFireTime?: string;
}

export interface JobQuery extends PagedQuery {
  status?: string;
  group?: string;
  keyword?: string;
}

// Execution Log types
export interface ExecutionLogDto {
  id: number;
  agentId: string;
  schedulerName: string;
  jobKey: JobKeyDto;
  triggerGroup?: string;
  triggerName?: string;
  fireInstanceId?: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
  customFields?: Record<string, any>;
  createdAt: string;
}

export interface ExecutionLogQuery extends PagedQuery {
  jobGroup?: string;
  jobName?: string;
  success?: boolean;
  startTimeFrom?: string;
  startTimeTo?: string;
}

// Batch Job types
export interface BatchOperationRequest {
  action: 'trigger' | 'pause' | 'resume' | 'delete';
  jobKeys: JobKeyDto[];
}

export interface BatchOperationResult {
  succeeded: number;
  failed: number;
  total: number;
}

// Job Manifest
export interface ParameterInfoDto {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  label?: string;
}

export interface JobTypeInfoDto {
  key: string;
  jobTypeQualifiedName: string;
  description: string;
  parameters: ParameterInfoDto[];
}

export interface JobManifestDto {
  jobs: JobTypeInfoDto[];
}

// Dashboard types
export interface UpcomingJobDto {
  jobKey: JobKeyDto;
  jobType: JobTypeQualifiedName;
  scheduleDescription: string;
  nextFireTime: string;
}

export interface JobStatusDistribution {
  active: number;
  paused: number;
  blocked: number;
  executing: number;
}

export interface DashboardDto {
  totalJobs: number;
  totalAgents: number;
  onlineAgents: number;
  warningAgents: number;
  offlineAgents: number;
  upcomingJobs: UpcomingJobDto[];
  jobStatus: JobStatusDistribution;
  lastUpdated: string;
}

// SSE event types
export interface AgentStatusChangedEvent {
  agentId: string;
  agentName: string;
  previousStatus: string;
  newStatus: string;
}

export interface JobExecutedEvent {
  schedulerName: string;
  jobGroup: string;
  jobName: string;
  success: boolean;
  durationMs: number;
}

export interface SchedulerStatusChangedEvent {
  schedulerName: string;
  previousStatus: string;
  newStatus: string;
}

export type StreamEvent =
  | { type: 'connected'; data: null; timestamp: string }
  | { type: 'AgentStatusChanged'; data: AgentStatusChangedEvent; timestamp: string }
  | { type: 'JobExecuted'; data: JobExecutedEvent; timestamp: string }
  | { type: 'SchedulerStatusChanged'; data: SchedulerStatusChangedEvent; timestamp: string };

// Heartbeat
export interface HeartbeatDto {
  timestamp: string;
  agentVersion: string;
  uptimeSeconds: number;
  schedulerStatus: string;
  jobs: JobCountsDto;
  system: SystemMetricsDto;
}

export interface JobCountsDto {
  total: number;
  totalJobs: number;
  normal: number;
  runningJobs: number;
  paused: number;
  pausedJobs: number;
  blocked: number;
  blockedJobs: number;
  executing: number;
  waitingJobs: number;
}

export interface SystemMetricsDto {
  memoryUsedMb: number;
  memoryTotalMb: number;
  cpuPercent: number;
}

// Utility: format a JobKeyDto for display
export function formatJobKey(jobKey: JobKeyDto): string {
  return `${jobKey.group}.${jobKey.name}`;
}

// Utility: safely parse a JSON string or return fallback
export function tryParseJson<T>(raw: string, fallback: T): T {
  if (typeof raw !== 'string') return raw as unknown as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
