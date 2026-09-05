using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Enums;
using MinGo.Quartz.Platform.Data;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// Agent 心跳超时检测后台服务
/// </summary>
public class AgentStatusTracker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ActivityFeedService _feed;
    private readonly ILogger<AgentStatusTracker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(15);

    public AgentStatusTracker(
        IServiceProvider services,
        ActivityFeedService feed,
        ILogger<AgentStatusTracker> logger)
    {
        _services = services;
        _feed = feed;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AgentStatusTracker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAgentStatusAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error checking agent status");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task CheckAgentStatusAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        var now = DateTimeOffset.UtcNow;

        var activeAgents = await db.Agents
            .Where(a => a.Status == AgentStatus.Online || a.Status == AgentStatus.Warning || a.Status == AgentStatus.Pending)
            .ToListAsync(ct);

        foreach (var agent in activeAgents)
        {
            if (agent.LastHeartbeat is null) continue;

            var elapsed = (now - agent.LastHeartbeat.Value).TotalSeconds;
            var previousStatus = agent.Status;

            if (elapsed > agent.OfflineThresholdSeconds)
            {
                if (agent.Status != AgentStatus.Offline)
                {
                    agent.Status = AgentStatus.Offline;
                    agent.UpdatedAt = now;

                    _feed.TryPublish(ActivityEvent.AgentStatusChanged(
                        agent.Id, agent.Name, previousStatus.ToString(), "Offline"));

                    _logger.LogWarning("Agent {AgentId} ({Name}) went offline (no heartbeat for {Elapsed}s)",
                        agent.Id, agent.Name, (int)elapsed);
                }
            }
            else if (elapsed > agent.WarningThresholdSeconds)
            {
                if (agent.Status != AgentStatus.Warning)
                {
                    agent.Status = AgentStatus.Warning;
                    agent.UpdatedAt = now;

                    _feed.TryPublish(ActivityEvent.AgentStatusChanged(
                        agent.Id, agent.Name, previousStatus.ToString(), "Warning"));

                    _logger.LogWarning("Agent {AgentId} ({Name}) heartbeat delayed ({Elapsed}s)",
                        agent.Id, agent.Name, (int)elapsed);
                }
            }
            else
            {
                // 恢复正常在线
                if (agent.Status == AgentStatus.Warning)
                {
                    agent.Status = AgentStatus.Online;
                    agent.UpdatedAt = now;

                    _feed.TryPublish(ActivityEvent.AgentStatusChanged(
                        agent.Id, agent.Name, "Warning", "Online"));
                }
            }
        }

        if (activeAgents.Any(a => a.Status != AgentStatus.Online || activeAgents.Any()))
        {
            await db.SaveChangesAsync(ct);
        }
    }
}
