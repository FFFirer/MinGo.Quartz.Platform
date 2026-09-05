using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Enums;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// 平台仪表盘 API
/// </summary>
[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly PlatformDbContext _db;

    public DashboardController(PlatformDbContext db)
    {
        _db = db;
    }

    /// <summary>平台仪表盘聚合数据</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<DashboardDto>>> GetDashboard(CancellationToken ct)
    {
        var totalAgents = await _db.Agents.CountAsync(a => a.Status != AgentStatus.Deleted, ct);
        var onlineAgents = await _db.Agents.CountAsync(a => a.Status == AgentStatus.Online, ct);
        var warningAgents = await _db.Agents.CountAsync(a => a.Status == AgentStatus.Warning, ct);
        var offlineAgents = await _db.Agents.CountAsync(a => a.Status == AgentStatus.Offline, ct);

        var totalJobs = await _db.JobDefinitions.CountAsync(ct);
        var syncedJobs = await _db.JobDefinitions.CountAsync(j => j.Status == SyncStatus.Synced, ct);
        var failedJobs = await _db.JobDefinitions.CountAsync(j => j.Status == SyncStatus.Failed, ct);

        var dashboard = new DashboardDto
        {
            TotalJobs = totalJobs,
            TotalAgents = totalAgents,
            OnlineAgents = onlineAgents,
            WarningAgents = warningAgents,
            OfflineAgents = offlineAgents,
            JobStatus = new JobStatusDistribution
            {
                Active = syncedJobs,
                Paused = 0, // 需要从 Agent 实时获取
                Blocked = 0,
                Executing = 0
            },
            LastUpdated = DateTimeOffset.UtcNow
        };

        return Ok(ApiResponse<DashboardDto>.Ok(dashboard));
    }
}
