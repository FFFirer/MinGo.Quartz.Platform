using MinGo.Quartz.Agent.Abstractions.Enums;

namespace MinGo.Quartz.Platform.Data.Entities;

/// <summary>
/// Agent 实例实体
/// </summary>
public class AgentInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    /// <summary>SHA256 哈希后的 Token（base64 编码）</summary>
    public string? TokenHash { get; set; }

    public AgentStatus Status { get; set; } = AgentStatus.Pending;
    public string? AgentVersion { get; set; }
    public DateTimeOffset? LastHeartbeat { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset RegisteredAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>心跳警告阈值（秒）</summary>
    public int WarningThresholdSeconds { get; set; } = 30;

    /// <summary>心跳离线阈值（秒）</summary>
    public int OfflineThresholdSeconds { get; set; } = 60;

    /// <summary>心跳间隔（秒）</summary>
    public int HeartbeatIntervalSeconds { get; set; } = 30;

    // Navigation
    public List<AgentScheduler> Schedulers { get; set; } = new();
}
