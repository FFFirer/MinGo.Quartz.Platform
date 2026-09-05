using System.Text.Json;
using System.Threading.Channels;
using MinGo.Quartz.Agent.Abstractions;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// 实时事件广播服务（SSE 后端）
/// </summary>
public class ActivityFeedService
{
    private readonly Channel<ActivityEvent> _channel;
    private readonly ILogger<ActivityFeedService> _logger;

    public ActivityFeedService(ILogger<ActivityFeedService> logger)
    {
        _logger = logger;
        _channel = Channel.CreateBounded<ActivityEvent>(new BoundedChannelOptions(1024)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = false,
            SingleWriter = false
        });
    }

    /// <summary>
    /// 发布事件
    /// </summary>
    public async ValueTask PublishAsync(ActivityEvent evt, CancellationToken ct = default)
    {
        evt.Timestamp = DateTimeOffset.UtcNow;
        await _channel.Writer.WriteAsync(evt, ct);
    }

    /// <summary>
    /// 订阅事件流
    /// </summary>
    public IAsyncEnumerable<ActivityEvent> SubscribeAsync(CancellationToken ct)
    {
        return _channel.Reader.ReadAllAsync(ct);
    }

    /// <summary>
    /// 尝试发布事件（非阻塞）
    /// </summary>
    public bool TryPublish(ActivityEvent evt)
    {
        evt.Timestamp = DateTimeOffset.UtcNow;
        return _channel.Writer.TryWrite(evt);
    }
}

/// <summary>
/// 活动事件
/// </summary>
public class ActivityEvent
{
    /// <summary>事件类型</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>事件数据</summary>
    public object? Data { get; set; }

    /// <summary>事件时间戳</summary>
    public DateTimeOffset Timestamp { get; set; }

    /// <summary>事件 ID（用于 SSE id 字段）</summary>
    public string? Id { get; set; }

    /// <summary>
    /// 创建 Agent 状态变更事件
    /// </summary>
    public static ActivityEvent AgentStatusChanged(string agentId, string agentName, string previousStatus, string newStatus)
    {
        return new ActivityEvent
        {
            Type = "AgentStatusChanged",
            Id = Guid.NewGuid().ToString("N"),
            Data = new { AgentId = agentId, AgentName = agentName, PreviousStatus = previousStatus, NewStatus = newStatus }
        };
    }

    /// <summary>
    /// 创建 Job 执行完成事件
    /// </summary>
    public static ActivityEvent JobExecuted(string schedulerName, string jobGroup, string jobName, bool success, long? durationMs)
    {
        return new ActivityEvent
        {
            Type = "JobExecuted",
            Id = Guid.NewGuid().ToString("N"),
            Data = new { SchedulerName = schedulerName, JobGroup = jobGroup, JobName = jobName, Success = success, DurationMs = durationMs }
        };
    }

    /// <summary>
    /// 创建 Scheduler 状态变更事件
    /// </summary>
    public static ActivityEvent SchedulerStatusChanged(string schedulerName, string previousStatus, string newStatus)
    {
        return new ActivityEvent
        {
            Type = "SchedulerStatusChanged",
            Id = Guid.NewGuid().ToString("N"),
            Data = new { SchedulerName = schedulerName, PreviousStatus = previousStatus, NewStatus = newStatus }
        };
    }

    /// <summary>
    /// 序列化为 SSE 格式
    /// </summary>
    public string ToSseData()
    {
        var json = JsonSerializer.Serialize(this, MinGoJsonDefaults.Options);
        return $"id: {Id}\nevent: {Type}\ndata: {json}\n\n";
    }
}
