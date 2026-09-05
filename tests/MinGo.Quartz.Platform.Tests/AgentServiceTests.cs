using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions.Enums;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Services;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace MinGo.Quartz.Platform.Tests;

/// <summary>
/// AgentService 单元测试
/// </summary>
public class AgentServiceTests
{
    private static PlatformDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<PlatformDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new PlatformDbContext(options);
    }

    private static AgentService CreateService(PlatformDbContext db)
    {
        var logger = Substitute.For<ILogger<AgentService>>();
        return new AgentService(db, logger);
    }

    [Fact]
    public async Task Register_NewAgent_ReturnsResponseWithToken()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var request = new RegisterAgentRequest
        {
            Name = "test-agent",
            Url = "http://localhost:5000",
            AgentVersion = "1.0.0"
        };

        var response = await service.RegisterAsync(request);

        Assert.NotNull(response);
        Assert.NotEmpty(response.AgentId);
        Assert.NotEmpty(response.Token);
        Assert.Equal(30, response.HeartbeatIntervalSeconds);

        // 验证数据库记录
        var agent = await db.Agents.FirstAsync();
        Assert.Equal("test-agent", agent.Name);
        Assert.Equal(AgentStatus.Online, agent.Status);
        Assert.NotNull(agent.TokenHash);
    }

    [Fact]
    public async Task Register_SameAgentTwice_ReconnectsIdempotently()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var request = new RegisterAgentRequest
        {
            Name = "test-agent",
            Url = "http://localhost:5000"
        };

        var response1 = await service.RegisterAsync(request);
        var response2 = await service.RegisterAsync(request);

        // 重连应返回同一个 AgentId
        Assert.Equal(response1.AgentId, response2.AgentId);
        // Token 应重新生成
        Assert.NotEqual(response1.Token, response2.Token);

        // 数据库中只有一个 Agent
        var count = await db.Agents.CountAsync();
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task Register_WithExistingId_Reconnects()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var request = new RegisterAgentRequest
        {
            Name = "test-agent",
            Url = "http://localhost:5000"
        };

        var response1 = await service.RegisterAsync(request);

        // 使用已有 ID 重连
        var reconnectRequest = new RegisterAgentRequest
        {
            AgentId = response1.AgentId,
            Name = "test-agent",
            Url = "http://localhost:5000"
        };

        var response2 = await service.RegisterAsync(reconnectRequest);
        Assert.Equal(response1.AgentId, response2.AgentId);
    }

    [Fact]
    public async Task Heartbeat_UpdatesLastHeartbeat()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        // 先注册
        var registerResponse = await service.RegisterAsync(new RegisterAgentRequest
        {
            Name = "test-agent",
            Url = "http://localhost:5000"
        });

        // 发心跳
        var heartbeatRequest = new AgentHeartbeatRequestV2
        {
            AgentId = registerResponse.AgentId,
            Status = "Online",
            Timestamp = DateTimeOffset.UtcNow
        };

        var response = await service.HeartbeatAsync(registerResponse.AgentId, heartbeatRequest);

        Assert.NotNull(response);
        Assert.True(response.ServerTime > DateTimeOffset.UtcNow.AddSeconds(-5));

        var agent = await db.Agents.FirstAsync();
        Assert.Equal(AgentStatus.Online, agent.Status);
        Assert.NotNull(agent.LastHeartbeat);
    }

    [Fact]
    public async Task Heartbeat_UnknownAgent_ReturnsDefaultResponse()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var response = await service.HeartbeatAsync("unknown-id", new AgentHeartbeatRequestV2
        {
            AgentId = "unknown-id",
            Status = "Online"
        });

        Assert.NotNull(response);
        Assert.False(response.ShouldReportSchedulers);
    }

    [Fact]
    public async Task Deregister_SetsStatusToDeleted()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var registerResponse = await service.RegisterAsync(new RegisterAgentRequest
        {
            Name = "test-agent",
            Url = "http://localhost:5000"
        });

        var result = await service.DeregisterAsync(registerResponse.AgentId);
        Assert.True(result);

        var agent = await db.Agents.FirstAsync();
        Assert.Equal(AgentStatus.Deleted, agent.Status);
        Assert.Null(agent.TokenHash);
    }

    [Fact]
    public async Task Deregister_UnknownAgent_ReturnsFalse()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var result = await service.DeregisterAsync("unknown-id");
        Assert.False(result);
    }

    [Fact]
    public async Task GetAgents_ReturnsPagedResults()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        // 注册 3 个 Agent
        for (int i = 0; i < 3; i++)
        {
            await service.RegisterAsync(new RegisterAgentRequest
            {
                Name = $"agent-{i}",
                Url = $"http://localhost:{5000 + i}"
            });
        }

        var result = await service.GetAgentsAsync(new PagedQuery { Page = 1, PageSize = 2 });

        Assert.Equal(3, result.Total);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(2, result.PageSize);
        Assert.Equal(2, result.TotalPages);
    }

    [Fact]
    public async Task GetAgent_ReturnsDetailDto()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var registerResponse = await service.RegisterAsync(new RegisterAgentRequest
        {
            Name = "test-agent",
            Url = "http://localhost:5000",
            AgentVersion = "2.0.0"
        });

        var detail = await service.GetAgentAsync(registerResponse.AgentId);

        Assert.NotNull(detail);
        Assert.Equal("test-agent", detail.Name);
        Assert.Equal("http://localhost:5000", detail.Url);
        Assert.Equal("Online", detail.Status);
        Assert.Equal("2.0.0", detail.AgentVersion);
    }

    [Fact]
    public async Task GetAgent_UnknownId_ReturnsNull()
    {
        using var db = CreateDbContext();
        var service = CreateService(db);

        var detail = await service.GetAgentAsync("unknown-id");
        Assert.Null(detail);
    }
}
