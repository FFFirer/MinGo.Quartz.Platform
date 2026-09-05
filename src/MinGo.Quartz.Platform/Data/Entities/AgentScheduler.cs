namespace MinGo.Quartz.Platform.Data.Entities;

/// <summary>
/// Agent 与 Scheduler 的关联关系
/// </summary>
public class AgentScheduler
{
    public string Id { get; set; } = string.Empty;
    public string AgentId { get; set; } = string.Empty;
    public string SchedulerName { get; set; } = string.Empty;
    public string? SchedulerInstanceId { get; set; }
    public DateTimeOffset ReportedAt { get; set; }

    // Navigation
    public AgentInfo Agent { get; set; } = null!;
}
