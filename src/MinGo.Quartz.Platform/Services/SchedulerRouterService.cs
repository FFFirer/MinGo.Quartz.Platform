using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Enums;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Data.Entities;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// SchedulerName → 健康 Agent 路由服务
/// </summary>
public class SchedulerRouterService
{
    private readonly PlatformDbContext _db;
    private readonly ILogger<SchedulerRouterService> _logger;

    public SchedulerRouterService(PlatformDbContext db, ILogger<SchedulerRouterService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// 查找管理指定 Scheduler 的健康 Agent
    /// </summary>
    public async Task<AgentInfo?> ResolveAgentAsync(string schedulerName, CancellationToken ct = default)
    {
        var assoc = await _db.AgentSchedulers
            .Include(a => a.Agent)
            .Where(a => a.SchedulerName == schedulerName)
            .FirstOrDefaultAsync(a =>
                a.Agent.Status == AgentStatus.Online || a.Agent.Status == AgentStatus.Warning,
                ct);

        if (assoc?.Agent is null)
        {
            _logger.LogWarning("No healthy agent found for scheduler: {SchedulerName}", schedulerName);
        }

        return assoc?.Agent;
    }

    /// <summary>
    /// 获取目标 Agent 的 API base URL
    /// </summary>
    public async Task<string?> GetAgentApiUrlAsync(string schedulerName, CancellationToken ct = default)
    {
        var agent = await ResolveAgentAsync(schedulerName, ct);
        return agent?.Url;
    }
}
