using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Services;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace MinGo.Quartz.Platform.Tests;

/// <summary>
/// SchedulerService 单元测试
/// </summary>
public class SchedulerServiceTests
{
    private static PlatformDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PlatformDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new PlatformDbContext(options);
    }

    [Fact]
    public async Task ReportSchedulers_CreatesSchedulerInfoAndAssociation()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<SchedulerService>>();
        var service = new SchedulerService(db, logger);

        // 先创建 Agent
        var agent = new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        };
        db.Agents.Add(agent);
        await db.SaveChangesAsync();

        // 上报 Scheduler
        var request = new SchedulerReportRequest
        {
            Schedulers =
            [
                new SchedulerInfoDto
                {
                    SchedulerName = "default-scheduler",
                    SchedulerInstanceId = "instance-1",
                    Status = "running",
                    IsClustered = false,
                    ThreadPoolSize = 10
                }
            ]
        };

        await service.ReportSchedulersAsync("agent-001", request);

        // 验证 SchedulerInfo 已创建
        var schedulerInfo = await db.SchedulerInfos.FirstAsync();
        Assert.Equal("default-scheduler", schedulerInfo.Name);
        Assert.Equal("running", schedulerInfo.Status);
        Assert.Equal(10, schedulerInfo.ThreadPoolSize);

        // 验证 AgentScheduler 关联已创建
        var assoc = await db.AgentSchedulers.FirstAsync();
        Assert.Equal("agent-001", assoc.AgentId);
        Assert.Equal("default-scheduler", assoc.SchedulerName);
    }

    [Fact]
    public async Task GetSchedulers_ReturnsSummaryList()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<SchedulerService>>();
        var service = new SchedulerService(db, logger);

        // 创建 Agent + Scheduler + Association
        var agent = new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        };
        db.Agents.Add(agent);

        var scheduler = new Data.Entities.SchedulerInfo
        {
            Id = "sched-001",
            Name = "default-scheduler",
            Status = "running",
            FirstReportedAt = DateTimeOffset.UtcNow,
            LastReportedAt = DateTimeOffset.UtcNow
        };
        db.SchedulerInfos.Add(scheduler);

        db.AgentSchedulers.Add(new Data.Entities.AgentScheduler
        {
            Id = "assoc-001",
            AgentId = "agent-001",
            SchedulerName = "default-scheduler"
        });

        await db.SaveChangesAsync();

        var result = await service.GetSchedulersAsync();

        Assert.Single(result);
        Assert.Equal("default-scheduler", result[0].SchedulerName);
        Assert.Equal(1, result[0].AgentCount);
    }

    [Fact]
    public async Task GetScheduler_ReturnsDetailWithAgents()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<SchedulerService>>();
        var service = new SchedulerService(db, logger);

        var agent = new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        };
        db.Agents.Add(agent);

        var scheduler = new Data.Entities.SchedulerInfo
        {
            Id = "sched-001",
            Name = "default-scheduler",
            Status = "running",
            IsClustered = true,
            ThreadPoolSize = 20,
            FirstReportedAt = DateTimeOffset.UtcNow,
            LastReportedAt = DateTimeOffset.UtcNow
        };
        db.SchedulerInfos.Add(scheduler);

        db.AgentSchedulers.Add(new Data.Entities.AgentScheduler
        {
            Id = "assoc-001",
            AgentId = "agent-001",
            SchedulerName = "default-scheduler"
        });

        await db.SaveChangesAsync();

        var detail = await service.GetSchedulerAsync("default-scheduler");

        Assert.NotNull(detail);
        Assert.Equal("default-scheduler", detail.SchedulerName);
        Assert.True(detail.IsClustered);
        Assert.Single(detail.Agents);
        Assert.Equal("test-agent", detail.Agents[0].AgentName);
    }

    [Fact]
    public async Task GetScheduler_UnknownName_ReturnsNull()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<SchedulerService>>();
        var service = new SchedulerService(db, logger);

        var detail = await service.GetSchedulerAsync("nonexistent");
        Assert.Null(detail);
    }
}
