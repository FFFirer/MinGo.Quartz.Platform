using MinGo.Quartz.Agent.Abstractions.Enums;

namespace MinGo.Quartz.Platform.Data.Entities;

/// <summary>
/// 声明式 Job 定义（Platform 视角的持久化记录）
/// </summary>
public class JobDefinition
{
    public string Id { get; set; } = string.Empty;
    public string SchedulerName { get; set; } = string.Empty;
    public string JobGroup { get; set; } = "DEFAULT";
    public string JobName { get; set; } = string.Empty;
    public string JobType { get; set; } = string.Empty;

    /// <summary>Job 参数的 JSON 序列化</summary>
    public string ParamsJson { get; set; } = "{}";

    /// <summary>Quartz 选项的 JSON 序列化</summary>
    public string OptionsJson { get; set; } = "{}";

    /// <summary>Schedule 配置的 JSON 序列化</summary>
    public string ScheduleJson { get; set; } = "{}";

    public SyncStatus Status { get; set; } = SyncStatus.Pending;
    public string? Error { get; set; }

    /// <summary>Trigger 信息的 JSON 序列化</summary>
    public string? TriggersJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
