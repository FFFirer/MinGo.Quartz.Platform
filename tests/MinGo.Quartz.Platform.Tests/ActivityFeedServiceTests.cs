using Microsoft.Extensions.Logging;
using MinGo.Quartz.Platform.Services;
using NSubstitute;

namespace MinGo.Quartz.Platform.Tests;

/// <summary>
/// ActivityFeedService 单元测试
/// </summary>
public class ActivityFeedServiceTests
{
    [Fact]
    public async Task PublishAndSubscribe_ReceivesEvents()
    {
        var logger = Substitute.For<ILogger<ActivityFeedService>>();
        var service = new ActivityFeedService(logger);

        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

        // 发布事件
        await service.PublishAsync(ActivityEvent.AgentStatusChanged("agent-1", "TestAgent", "Pending", "Online"));
        await service.PublishAsync(ActivityEvent.JobExecuted("sched", "DEFAULT", "Job1", true, 1000));

        // 订阅并收集
        var received = new List<ActivityEvent>();
        var task = Task.Run(async () =>
        {
            await foreach (var evt in service.SubscribeAsync(cts.Token))
            {
                received.Add(evt);
                if (received.Count >= 2) break;
            }
        });

        await Task.WhenAny(task, Task.Delay(3000));

        Assert.True(received.Count >= 2, $"Expected at least 2 events, got {received.Count}");
        Assert.Contains(received, e => e.Type == "AgentStatusChanged");
        Assert.Contains(received, e => e.Type == "JobExecuted");
    }

    [Fact]
    public void TryPublish_ReturnsTrue_WhenChannelNotFull()
    {
        var logger = Substitute.For<ILogger<ActivityFeedService>>();
        var service = new ActivityFeedService(logger);

        var result = service.TryPublish(ActivityEvent.SchedulerStatusChanged("sched-1", "running", "standby"));
        Assert.True(result);
    }

    [Fact]
    public void ActivityEvent_ToSseData_FormatsCorrectly()
    {
        var evt = ActivityEvent.AgentStatusChanged("agent-1", "TestAgent", "Pending", "Online");
        var sse = evt.ToSseData();

        Assert.StartsWith("id: ", sse);
        Assert.Contains("event: AgentStatusChanged", sse);
        Assert.Contains("data: ", sse);
        Assert.EndsWith("\n\n", sse);
    }

    [Fact]
    public void ActivityEvent_FactoryMethods_SetCorrectType()
    {
        var agentEvt = ActivityEvent.AgentStatusChanged("a", "b", "c", "d");
        Assert.Equal("AgentStatusChanged", agentEvt.Type);

        var jobEvt = ActivityEvent.JobExecuted("s", "g", "j", true, 100);
        Assert.Equal("JobExecuted", jobEvt.Type);

        var schedEvt = ActivityEvent.SchedulerStatusChanged("s", "a", "b");
        Assert.Equal("SchedulerStatusChanged", schedEvt.Type);
    }
}
