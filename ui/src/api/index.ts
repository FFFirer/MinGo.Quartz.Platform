import axios from 'axios';
import type {
  ApiResponse,
  JobKeyDto,
  JobSummaryDto,
  JobDefinitionDto,
  CreateJobRequest,
  UpdateJobRequest,
  JobManifestDto,
  AgentDetailDto,
  AgentSchedulerDto,
  SchedulerSummaryDto,
  SchedulerDetailDto,
  SchedulerAgentDto,
  SchedulerReportRequest,
  RegisterAgentRequest,
  RegisterAgentResponse,
  PagedResponse,
  ExecutionLogDto,
  ExecutionLogQuery,
  BatchOperationRequest,
  BatchOperationResult,
  DashboardDto,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.errorMessage || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// --- Dashboard API ---
export const dashboardApi = {
  get: () =>
    api.get<ApiResponse<DashboardDto>>('/api/dashboard').then(r => r.data),
};

// --- Agent APIs ---
export const agentApi = {
  getAll: (page?: number, pageSize?: number) =>
    api.get<ApiResponse<PagedResponse<AgentDetailDto>>>('/api/agents', {
      params: { page, pageSize }
    }).then(r => r.data),

  get: (agentId: string) =>
    api.get<ApiResponse<AgentDetailDto>>(`/api/agents/${agentId}`).then(r => r.data),

  register: (data: RegisterAgentRequest) =>
    api.post<ApiResponse<RegisterAgentResponse>>('/api/agents', data).then(r => r.data),

  delete: (agentId: string) =>
    api.delete<ApiResponse<{}>>(`/api/agents/${agentId}`).then(r => r.data),

  heartbeat: (agentId: string, data: any) =>
    api.post<ApiResponse<{}>>(`/api/agents/${agentId}/heartbeat`, data).then(r => r.data),

  reportSchedulers: (agentId: string, data: SchedulerReportRequest) =>
    api.post<ApiResponse<{}>>(`/api/agents/${agentId}/schedulers`, data).then(r => r.data),
};

// --- Scheduler APIs ---
export const schedulerApi = {
  getAll: () =>
    api.get<ApiResponse<SchedulerSummaryDto[]>>('/api/schedulers').then(r => r.data),

  get: (schedulerName: string) =>
    api.get<ApiResponse<SchedulerDetailDto>>(`/api/schedulers/${encodeURIComponent(schedulerName)}`).then(r => r.data),
};

// Helper: build job URL path from name + group
function buildJobUrlPath(name: string, group?: string): string {
  return group && group !== 'DEFAULT'
    ? `${encodeURIComponent(name)}/${encodeURIComponent(group)}`
    : encodeURIComponent(name);
}

// --- Job APIs ---
export const jobApi = {
  getAll: (schedulerName: string, page = 1, pageSize = 20, status?: string, group?: string, keyword?: string) =>
    api.get<ApiResponse<PagedResponse<JobSummaryDto>>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs`, {
      params: { page, pageSize, status, group, keyword }
    }).then(r => r.data),

  get: (schedulerName: string, jobKey: JobKeyDto) =>
    api.get<ApiResponse<JobDefinitionDto>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/${buildJobUrlPath(jobKey.name, jobKey.group)}`).then(r => r.data),

  create: (schedulerName: string, data: CreateJobRequest) =>
    api.post<ApiResponse<JobDefinitionDto>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs`, data).then(r => r.data),

  update: (schedulerName: string, jobKey: JobKeyDto, data: UpdateJobRequest) =>
    api.put<ApiResponse<{}>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/${buildJobUrlPath(jobKey.name, jobKey.group)}`, data).then(r => r.data),

  delete: (schedulerName: string, jobKey: JobKeyDto) =>
    api.delete<ApiResponse<{}>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/${buildJobUrlPath(jobKey.name, jobKey.group)}`).then(r => r.data),

  trigger: (schedulerName: string, jobKey: JobKeyDto) =>
    api.post<ApiResponse<{}>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/${buildJobUrlPath(jobKey.name, jobKey.group)}/trigger`).then(r => r.data),

  pause: (schedulerName: string, jobKey: JobKeyDto) =>
    api.post<ApiResponse<{}>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/${buildJobUrlPath(jobKey.name, jobKey.group)}/pause`).then(r => r.data),

  resume: (schedulerName: string, jobKey: JobKeyDto) =>
    api.post<ApiResponse<{}>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/${buildJobUrlPath(jobKey.name, jobKey.group)}/resume`).then(r => r.data),

  batch: (schedulerName: string, request: BatchOperationRequest) =>
    api.post<ApiResponse<BatchOperationResult>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/jobs/batch`, request).then(r => r.data),
};

// --- Execution Log APIs ---
export const executionLogApi = {
  query: (schedulerName: string, query: ExecutionLogQuery) =>
    api.get<ApiResponse<PagedResponse<ExecutionLogDto>>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/logs`, {
      params: query
    }).then(r => r.data),

  get: (schedulerName: string, id: number) =>
    api.get<ApiResponse<ExecutionLogDto>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/logs/${id}`).then(r => r.data),
};

// --- Manifest APIs ---
export const manifestApi = {
  get: (schedulerName: string) =>
    api.get<ApiResponse<JobManifestDto>>(`/api/schedulers/${encodeURIComponent(schedulerName)}/manifest`).then(r => r.data),
};

export default api;
