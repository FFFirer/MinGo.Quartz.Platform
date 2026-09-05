namespace MinGo.Quartz.Platform.Data.Entities;

/// <summary>
/// Scheduler 运行时信息
/// </summary>
public class SchedulerInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? InstanceId { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsClustered { get; set; }
    public string? JobStoreType { get; set; }
    public string? ThreadPoolType { get; set; }
    public int ThreadPoolSize { get; set; }
    public DateTimeOffset? RunningSince { get; set; }
    public string? Version { get; set; }
    public int NumberOfJobsExecuted { get; set; }

    /// <summary>JobCounts 的 JSON 序列化存储</summary>
    public string? JobCountsJson { get; set; }

    public DateTimeOffset FirstReportedAt { get; set; }
    public DateTimeOffset LastReportedAt { get; set; }

    // Navigation
    public List<AgentScheduler> AgentSchedulers { get; set; } = new();
}
