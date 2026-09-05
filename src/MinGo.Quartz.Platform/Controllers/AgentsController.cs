using Microsoft.AspNetCore.Mvc;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// Agent 管理 API
/// </summary>
[ApiController]
[Route("api/agents")]
public class AgentsController : ControllerBase
{
    private readonly AgentService _agentService;
    private readonly SchedulerService _schedulerService;
    private readonly ExecutionLogService _logService;
    private readonly ActivityFeedService _feed;

    public AgentsController(
        AgentService agentService,
        SchedulerService schedulerService,
        ExecutionLogService logService,
        ActivityFeedService feed)
    {
        _agentService = agentService;
        _schedulerService = schedulerService;
        _logService = logService;
        _feed = feed;
    }

    /// <summary>注册/重连 Agent</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<RegisterAgentResponse>>> Register(
        [FromBody] RegisterAgentRequest request, CancellationToken ct)
    {
        var response = await _agentService.RegisterAsync(request, ct);
        return Ok(ApiResponse<RegisterAgentResponse>.Ok(response));
    }

    /// <summary>Agent 列表（分页）</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<AgentDetailDto>>>> GetAgents(
        [FromQuery] PagedQuery query, CancellationToken ct)
    {
        var result = await _agentService.GetAgentsAsync(query, ct);
        return Ok(ApiResponse<PagedResponse<AgentDetailDto>>.Ok(result));
    }

    /// <summary>Agent 详情</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<AgentDetailDto>>> GetAgent(string id, CancellationToken ct)
    {
        var result = await _agentService.GetAgentAsync(id, ct);
        if (result is null)
            return NotFound(ApiResponse<AgentDetailDto>.Fail("Agent not found", "NOT_FOUND"));

        return Ok(ApiResponse<AgentDetailDto>.Ok(result));
    }

    /// <summary>注销 Agent</summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> Deregister(string id, CancellationToken ct)
    {
        var success = await _agentService.DeregisterAsync(id, ct);
        if (!success)
            return NotFound(ApiResponse<object>.Fail("Agent not found", "NOT_FOUND"));

        _feed.TryPublish(ActivityEvent.AgentStatusChanged(id, "", "", "Deleted"));
        return Ok(ApiResponse<object>.Ok(new { Deregistered = true }));
    }

    /// <summary>Agent 心跳</summary>
    [HttpPost("{id}/heartbeat")]
    public async Task<ActionResult<ApiResponse<AgentHeartbeatResponseV2>>> Heartbeat(
        string id, [FromBody] AgentHeartbeatRequestV2 request, CancellationToken ct)
    {
        var response = await _agentService.HeartbeatAsync(id, request, ct);
        return Ok(ApiResponse<AgentHeartbeatResponseV2>.Ok(response));
    }

    /// <summary>Agent 上报 Scheduler</summary>
    [HttpPost("{id}/schedulers")]
    public async Task<ActionResult<ApiResponse<object>>> ReportSchedulers(
        string id, [FromBody] SchedulerReportRequest request, CancellationToken ct)
    {
        await _schedulerService.ReportSchedulersAsync(id, request, ct);
        return Ok(ApiResponse<object>.Ok(new { Received = true }));
    }

    /// <summary>Agent 上报执行日志</summary>
    [HttpPost("{id}/logs")]
    public async Task<ActionResult<ApiResponse<object>>> ReportLogs(
        string id, [FromBody] List<ExecutionLogDto> logs, CancellationToken ct)
    {
        var count = await _logService.IngestLogsAsync(id, logs, ct);

        // 发布 Job 执行事件到 Activity Feed
        foreach (var log in logs)
        {
            _feed.TryPublish(ActivityEvent.JobExecuted(
                "", log.JobKey.Group, log.JobKey.Name, log.Success, log.DurationMs));
        }

        return Ok(ApiResponse<object>.Ok(new { Ingested = count }));
    }
}
