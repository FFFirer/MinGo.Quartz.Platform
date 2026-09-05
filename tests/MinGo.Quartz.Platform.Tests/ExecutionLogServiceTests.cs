using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Services;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace MinGo.Quartz.Platform.Tests;

/// <summary>
/// ExecutionLogService 单元测试
/// </summary>
public class ExecutionLogServiceTests
{
    private static PlatformDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PlatformDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new PlatformDbContext(options);
    }

    [Fact]
    public async Task IngestLogs_PersistsLogsToDatabase()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<ExecutionLogService>>();
        var service = new ExecutionLogService(db, logger);

        // 先创建 Agent
        db.Agents.Add(new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        });
        await db.SaveChangesAsync();

        var logs = new List<ExecutionLogDto>
        {
            new()
            {
                JobKey = new JobKeyDto("TestJob", "DEFAULT"),
                StartTime = DateTimeOffset.UtcNow.AddSeconds(-5),
                EndTime = DateTimeOffset.UtcNow,
                DurationMs = 5000,
                Success = true
            },
            new()
            {
                JobKey = new JobKeyDto("FailJob", "DEFAULT"),
                StartTime = DateTimeOffset.UtcNow.AddSeconds(-3),
                EndTime = DateTimeOffset.UtcNow,
                DurationMs = 3000,
                Success = false,
                ErrorMessage = "Job failed"
            }
        };

        var count = await service.IngestLogsAsync("agent-001", logs);

        Assert.Equal(2, count);
        var dbLogs = await db.ExecutionLogs.ToListAsync();
        Assert.Equal(2, dbLogs.Count);
        Assert.Contains(dbLogs, l => l.JobName == "TestJob" && l.Success);
        Assert.Contains(dbLogs, l => l.JobName == "FailJob" && !l.Success && l.ErrorMessage == "Job failed");
    }

    [Fact]
    public async Task QueryLogs_FiltersByJobName()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<ExecutionLogService>>();
        var service = new ExecutionLogService(db, logger);

        db.Agents.Add(new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        });
        await db.SaveChangesAsync();

        await service.IngestLogsAsync("agent-001",
        [
            new() { JobKey = new JobKeyDto("JobA", "DEFAULT"), StartTime = DateTimeOffset.UtcNow, Success = true },
            new() { JobKey = new JobKeyDto("JobB", "DEFAULT"), StartTime = DateTimeOffset.UtcNow, Success = true },
            new() { JobKey = new JobKeyDto("JobA", "DEFAULT"), StartTime = DateTimeOffset.UtcNow, Success = false }
        ]);

        var result = await service.QueryLogsAsync(new ExecutionLogQuery { JobName = "JobA", Page = 1, PageSize = 10 });

        Assert.Equal(2, result.Total);
        Assert.All(result.Items, i => Assert.Equal("JobA", i.JobKey.Name));
    }

    [Fact]
    public async Task QueryLogs_FiltersBySuccess()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<ExecutionLogService>>();
        var service = new ExecutionLogService(db, logger);

        db.Agents.Add(new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        });
        await db.SaveChangesAsync();

        await service.IngestLogsAsync("agent-001",
        [
            new() { JobKey = new JobKeyDto("Job1", "DEFAULT"), StartTime = DateTimeOffset.UtcNow, Success = true },
            new() { JobKey = new JobKeyDto("Job2", "DEFAULT"), StartTime = DateTimeOffset.UtcNow, Success = false, ErrorMessage = "err" }
        ]);

        var failedOnly = await service.QueryLogsAsync(new ExecutionLogQuery { Success = false, Page = 1, PageSize = 10 });
        Assert.Single(failedOnly.Items);
        Assert.False(failedOnly.Items[0].Success);
    }

    [Fact]
    public async Task GetLog_ReturnsSingleLog()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<ExecutionLogService>>();
        var service = new ExecutionLogService(db, logger);

        db.Agents.Add(new Data.Entities.AgentInfo
        {
            Id = "agent-001",
            Name = "test-agent",
            Url = "http://localhost:5000",
            Status = MinGo.Quartz.Agent.Abstractions.Enums.AgentStatus.Online
        });
        await db.SaveChangesAsync();

        await service.IngestLogsAsync("agent-001",
        [
            new() { JobKey = new JobKeyDto("Job1", "DEFAULT"), StartTime = DateTimeOffset.UtcNow, Success = true }
        ]);

        var log = await db.ExecutionLogs.FirstAsync();
        var result = await service.GetLogAsync(log.Id);

        Assert.NotNull(result);
        Assert.Equal("Job1", result.JobKey.Name);
    }

    [Fact]
    public async Task GetLog_UnknownId_ReturnsNull()
    {
        using var db = CreateDbContext();
        var logger = Substitute.For<ILogger<ExecutionLogService>>();
        var service = new ExecutionLogService(db, logger);

        var result = await service.GetLogAsync(999);
        Assert.Null(result);
    }
}
