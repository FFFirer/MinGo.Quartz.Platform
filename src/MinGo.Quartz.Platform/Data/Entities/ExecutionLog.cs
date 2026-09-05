namespace MinGo.Quartz.Platform.Data.Entities;

/// <summary>
/// Job 执行日志（持久化记录）
/// </summary>
public class ExecutionLog
{
    /// <summary>自增主键（bigint）</summary>
    public long Id { get; set; }
    public string AgentId { get; set; } = string.Empty;
    public string SchedulerName { get; set; } = string.Empty;
    public string JobGroup { get; set; } = "DEFAULT";
    public string JobName { get; set; } = string.Empty;
    public string TriggerGroup { get; set; } = "DEFAULT";
    public string TriggerName { get; set; } = string.Empty;
    public string? FireInstanceId { get; set; }
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public long? DurationMs { get; set; }
    public bool Success { get; set; }
    public string? ErrorType { get; set; }
    public string? ErrorMessage { get; set; }
    public string? StackTrace { get; set; }

    /// <summary>自定义字段的 JSON 序列化</summary>
    public string? CustomFieldsJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    // Navigation
    public AgentInfo Agent { get; set; } = null!;
}
