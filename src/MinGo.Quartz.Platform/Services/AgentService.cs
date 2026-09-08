using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Enums;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Data.Entities;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// Agent 注册/心跳/状态管理服务
/// </summary>
public class AgentService
{
    private readonly PlatformDbContext _db;
    private readonly ILogger<AgentService> _logger;

    public AgentService(PlatformDbContext db, ILogger<AgentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// 注册或重连 Agent
    /// </summary>
    public async Task<RegisterAgentResponse> RegisterAsync(RegisterAgentRequest request, CancellationToken ct = default)
    {
        // 幂等：相同 Name+Url 的 Agent 重复注册视为重连
        AgentInfo? existing = null;
        if (!string.IsNullOrEmpty(request.AgentId))
        {
            existing = await _db.Agents.FirstOrDefaultAsync(a => a.Id == request.AgentId, ct);
        }

        if (existing is null && !string.IsNullOrEmpty(request.Name) && !string.IsNullOrEmpty(request.Url))
        {
            existing = await _db.Agents.FirstOrDefaultAsync(
                a => a.Name == request.Name && a.Url == request.Url, ct);
        }

        if (existing is not null)
        {
            // 重连 — 重新生成 Token
            var token = GenerateToken();
            existing.TokenHash = HashToken(token);
            existing.Status = AgentStatus.Online;
            existing.AgentVersion = request.AgentVersion ?? existing.AgentVersion;
            existing.LastHeartbeat = DateTimeOffset.UtcNow;
            existing.StartedAt = request.StartedAt != default ? request.StartedAt : DateTimeOffset.UtcNow;
            existing.UpdatedAt = DateTimeOffset.UtcNow;

            // 同步 Agent 上报的最新地址与名称（URL 可能因 ExternalUrl 变更、DHCP/容器 IP 变化而改变）
            if (!string.IsNullOrWhiteSpace(request.Url))
            {
                existing.Url = request.Url;
            }
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                existing.Name = request.Name;
            }

            await _db.SaveChangesAsync(ct);

            _logger.LogInformation("Agent reconnected: {AgentId} ({Name})", existing.Id, existing.Name);

            return new RegisterAgentResponse
            {
                AgentId = existing.Id,
                Token = token,
                HeartbeatIntervalSeconds = existing.HeartbeatIntervalSeconds,
                WarningThresholdSeconds = existing.WarningThresholdSeconds,
                OfflineThresholdSeconds = existing.OfflineThresholdSeconds
            };
        }

        // 首次注册
        var agent = new AgentInfo
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = request.Name ?? $"agent-{Guid.NewGuid().ToString("N")[..8]}",
            Url = request.Url,
            TokenHash = null, // 先设置，下面生成后更新
            Status = AgentStatus.Online,
            AgentVersion = request.AgentVersion,
            StartedAt = request.StartedAt != default ? request.StartedAt : DateTimeOffset.UtcNow,
            RegisteredAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var newToken = GenerateToken();
        agent.TokenHash = HashToken(newToken);

        _db.Agents.Add(agent);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Agent registered: {AgentId} ({Name})", agent.Id, agent.Name);

        return new RegisterAgentResponse
        {
            AgentId = agent.Id,
            Token = newToken,
            HeartbeatIntervalSeconds = agent.HeartbeatIntervalSeconds,
            WarningThresholdSeconds = agent.WarningThresholdSeconds,
            OfflineThresholdSeconds = agent.OfflineThresholdSeconds
        };
    }

    /// <summary>
    /// 处理 Agent 心跳
    /// </summary>
    public async Task<AgentHeartbeatResponseV2> HeartbeatAsync(
        string agentId, AgentHeartbeatRequestV2 request, CancellationToken ct = default)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.Id == agentId, ct);
        if (agent is null)
        {
            _logger.LogWarning("Heartbeat from unknown agent: {AgentId}", agentId);
            return new AgentHeartbeatResponseV2
            {
                ServerTime = DateTimeOffset.UtcNow,
                ShouldReportSchedulers = false
            };
        }

        var previousStatus = agent.Status;
        agent.Status = AgentStatus.Online;
        agent.LastHeartbeat = DateTimeOffset.UtcNow;
        agent.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        // 状态变更时发布事件
        if (previousStatus != AgentStatus.Online)
        {
            _logger.LogInformation("Agent {AgentId} status: {Previous} → Online", agentId, previousStatus);
        }

        // 首次心跳或距上次上报 Scheduler 超过 5 分钟时要求上报
        var shouldReport = previousStatus == AgentStatus.Pending;

        return new AgentHeartbeatResponseV2
        {
            ServerTime = DateTimeOffset.UtcNow,
            ShouldReportSchedulers = shouldReport,
            NextHeartbeatIntervalSeconds = agent.HeartbeatIntervalSeconds
        };
    }

    /// <summary>
    /// 注销 Agent
    /// </summary>
    public async Task<bool> DeregisterAsync(string agentId, CancellationToken ct = default)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.Id == agentId, ct);
        if (agent is null) return false;

        agent.Status = AgentStatus.Deleted;
        agent.TokenHash = null;
        agent.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Agent deregistered: {AgentId}", agentId);
        return true;
    }

    /// <summary>
    /// 获取单个 Agent 详情
    /// </summary>
    public async Task<AgentDetailDto?> GetAgentAsync(string agentId, CancellationToken ct = default)
    {
        var agent = await _db.Agents
            .Include(a => a.Schedulers)
            .FirstOrDefaultAsync(a => a.Id == agentId, ct);

        return agent is null ? null : MapToDetailDto(agent);
    }

    /// <summary>
    /// 分页查询 Agent 列表
    /// </summary>
    public async Task<PagedResponse<AgentDetailDto>> GetAgentsAsync(PagedQuery query, CancellationToken ct = default)
    {
        var queryable = _db.Agents
            .Include(a => a.Schedulers)
            .Where(a => a.Status != AgentStatus.Deleted)
            .OrderByDescending(a => a.UpdatedAt);

        var total = await queryable.CountAsync(ct);
        var agents = await queryable
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResponse<AgentDetailDto>
        {
            Items = agents.Select(MapToDetailDto).ToList(),
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 更新 Agent 状态
    /// </summary>
    public async Task<bool> UpdateAgentStatusAsync(string agentId, AgentStatus status, CancellationToken ct = default)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.Id == agentId, ct);
        if (agent is null) return false;

        agent.Status = status;
        agent.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    #region Helpers

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    internal static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }

    private static AgentDetailDto MapToDetailDto(AgentInfo agent)
    {
        return new AgentDetailDto
        {
            Id = agent.Id,
            Name = agent.Name,
            Url = agent.Url,
            Status = agent.Status.ToString(),
            AgentVersion = agent.AgentVersion,
            LastHeartbeat = agent.LastHeartbeat,
            StartedAt = agent.StartedAt,
            CreatedAt = agent.RegisteredAt,
            UpdatedAt = agent.UpdatedAt,
            Schedulers = agent.Schedulers.Select(s => new AgentSchedulerDto
            {
                SchedulerName = s.SchedulerName,
                SchedulerInstanceId = s.SchedulerInstanceId,
                ReportedAt = s.ReportedAt
            }).ToList()
        };
    }

    #endregion
}
