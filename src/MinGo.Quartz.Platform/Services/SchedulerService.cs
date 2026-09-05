using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Data.Entities;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// Scheduler 信息管理服务
/// </summary>
public class SchedulerService
{
    private readonly PlatformDbContext _db;
    private readonly ILogger<SchedulerService> _logger;

    public SchedulerService(PlatformDbContext db, ILogger<SchedulerService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Agent 上报 Scheduler 信息
    /// </summary>
    public async Task ReportSchedulersAsync(string agentId, SchedulerReportRequest request, CancellationToken ct = default)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.Id == agentId, ct);
        if (agent is null)
        {
            _logger.LogWarning("Scheduler report from unknown agent: {AgentId}", agentId);
            return;
        }

        foreach (var dto in request.Schedulers)
        {
            // 更新或创建 SchedulerInfo
            var info = await _db.SchedulerInfos
                .FirstOrDefaultAsync(s => s.Name == dto.SchedulerName, ct);

            if (info is null)
            {
                info = new SchedulerInfo
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Name = dto.SchedulerName,
                    FirstReportedAt = DateTimeOffset.UtcNow
                };
                _db.SchedulerInfos.Add(info);
            }

            info.InstanceId = dto.SchedulerInstanceId;
            info.Status = dto.Status;
            info.IsClustered = dto.IsClustered;
            info.JobStoreType = dto.JobStoreType;
            info.ThreadPoolType = dto.ThreadPoolType;
            info.ThreadPoolSize = dto.ThreadPoolSize;
            info.RunningSince = dto.RunningSince;
            info.Version = dto.Version;
            info.NumberOfJobsExecuted = dto.NumberOfJobsExecuted;
            info.JobCountsJson = dto.JobCounts is not null
                ? JsonSerializer.Serialize(dto.JobCounts)
                : null;
            info.LastReportedAt = DateTimeOffset.UtcNow;

            // 更新或创建 AgentScheduler 关联
            var assoc = await _db.AgentSchedulers
                .FirstOrDefaultAsync(a => a.AgentId == agentId && a.SchedulerName == dto.SchedulerName, ct);

            if (assoc is null)
            {
                assoc = new AgentScheduler
                {
                    Id = Guid.NewGuid().ToString("N"),
                    AgentId = agentId,
                    SchedulerName = dto.SchedulerName
                };
                _db.AgentSchedulers.Add(assoc);
            }

            assoc.SchedulerInstanceId = dto.SchedulerInstanceId;
            assoc.ReportedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Agent {AgentId} reported {Count} scheduler(s)", agentId, request.Schedulers.Count);
    }

    /// <summary>
    /// 获取所有 Scheduler 列表（含 Agent 数量统计）
    /// </summary>
    public async Task<List<SchedulerSummaryDto>> GetSchedulersAsync(CancellationToken ct = default)
    {
        var schedulers = await _db.SchedulerInfos
            .OrderBy(s => s.Name)
            .ToListAsync(ct);

        // 手动查询 Agent 数量（无 FK 关系）
        var agentCounts = await _db.AgentSchedulers
            .GroupBy(a => a.SchedulerName)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Name, x => x.Count, ct);

        return schedulers.Select(s => new SchedulerSummaryDto
        {
            Id = s.Id,
            SchedulerName = s.Name,
            SchedulerInstanceId = s.InstanceId,
            Status = s.Status,
            IsClustered = s.IsClustered,
            RunningSince = s.RunningSince,
            LastReportedAt = s.LastReportedAt,
            AgentCount = agentCounts.GetValueOrDefault(s.Name, 0)
        }).ToList();
    }

    /// <summary>
    /// 获取 Scheduler 详情（含关联 Agent 列表）
    /// </summary>
    public async Task<SchedulerDetailDto?> GetSchedulerAsync(string name, CancellationToken ct = default)
    {
        var scheduler = await _db.SchedulerInfos
            .FirstOrDefaultAsync(s => s.Name == name, ct);

        if (scheduler is null) return null;

        // 手动查询关联 Agent（无 FK 关系）
        var assocs = await _db.AgentSchedulers
            .Where(a => a.SchedulerName == name)
            .ToListAsync(ct);

        var agentIds = assocs.Select(a => a.AgentId).Distinct().ToList();
        var agents = await _db.Agents
            .Where(a => agentIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, ct);

        return new SchedulerDetailDto
        {
            Id = scheduler.Id,
            SchedulerName = scheduler.Name,
            SchedulerInstanceId = scheduler.InstanceId,
            Status = scheduler.Status,
            IsClustered = scheduler.IsClustered,
            JobStoreType = scheduler.JobStoreType,
            ThreadPoolType = scheduler.ThreadPoolType,
            ThreadPoolSize = scheduler.ThreadPoolSize,
            RunningSince = scheduler.RunningSince,
            Version = scheduler.Version,
            NumberOfJobsExecuted = scheduler.NumberOfJobsExecuted,
            JobCounts = scheduler.JobCountsJson is not null
                ? JsonSerializer.Deserialize<JobCountsDto>(scheduler.JobCountsJson)
                : null,
            FirstReportedAt = scheduler.FirstReportedAt,
            LastReportedAt = scheduler.LastReportedAt,
            Agents = assocs.Select(a =>
            {
                agents.TryGetValue(a.AgentId, out var agent);
                return new SchedulerAgentDto
                {
                    AgentId = a.AgentId,
                    AgentName = agent?.Name ?? string.Empty,
                    AgentUrl = agent?.Url ?? string.Empty,
                    AgentStatus = agent?.Status.ToString() ?? "Unknown",
                    ReportedAt = a.ReportedAt
                };
            }).ToList()
        };
    }
}
