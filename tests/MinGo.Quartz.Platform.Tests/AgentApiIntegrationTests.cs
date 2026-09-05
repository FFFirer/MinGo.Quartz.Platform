using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MinGo.Quartz.Agent.Abstractions;
using MinGo.Quartz.Agent.Abstractions.Models;

namespace MinGo.Quartz.Platform.Tests;

/// <summary>
/// Agent API 集成测试
/// </summary>
public class AgentApiIntegrationTests : IClassFixture<PlatformTestFactory>
{
    private readonly PlatformTestFactory _factory;
    private readonly HttpClient _client;

    public AgentApiIntegrationTests(PlatformTestFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_ReturnsAgentId()
    {
        var request = new RegisterAgentRequest
        {
            Name = "integration-agent",
            Url = "http://localhost:6000",
            AgentVersion = "1.0.0"
        };

        var response = await _client.PostAsJsonAsync("/api/agents", request);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<RegisterAgentResponse>>(
            content, MinGoJsonDefaults.Options);

        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success);
        Assert.NotNull(apiResponse.Data);
        Assert.NotEmpty(apiResponse.Data.AgentId);
        Assert.NotEmpty(apiResponse.Data.Token);
    }

    [Fact]
    public async Task GetAgents_ReturnsPagedList()
    {
        // 先注册一个 Agent
        await _client.PostAsJsonAsync("/api/agents", new RegisterAgentRequest
        {
            Name = "list-agent",
            Url = "http://localhost:6001"
        });

        var response = await _client.GetAsync("/api/agents?page=1&pageSize=10");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<PagedResponse<AgentDetailDto>>>(
            content, MinGoJsonDefaults.Options);

        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success);
        Assert.NotNull(apiResponse.Data);
        Assert.True(apiResponse.Data.Total >= 1);
    }

    [Fact]
    public async Task Heartbeat_ReturnsResponse()
    {
        // 注册
        var regResponse = await _client.PostAsJsonAsync("/api/agents", new RegisterAgentRequest
        {
            Name = "heartbeat-agent",
            Url = "http://localhost:6002"
        });
        var regContent = await regResponse.Content.ReadFromApiResponseAsync<RegisterAgentResponse>();

        // 心跳
        var heartbeatRequest = new AgentHeartbeatRequestV2
        {
            AgentId = regContent!.AgentId,
            Status = "Online",
            Timestamp = DateTimeOffset.UtcNow
        };

        var response = await _client.PostAsJsonAsync($"/api/agents/{regContent.AgentId}/heartbeat", heartbeatRequest);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<AgentHeartbeatResponseV2>>(
            content, MinGoJsonDefaults.Options);

        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success);
    }

    [Fact]
    public async Task GetAgent_NotFound_Returns404()
    {
        var response = await _client.GetAsync("/api/agents/nonexistent");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Dashboard_ReturnsAggregatedData()
    {
        var response = await _client.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var apiResponse = JsonSerializer.Deserialize<ApiResponse<DashboardDto>>(
            content, MinGoJsonDefaults.Options);

        Assert.NotNull(apiResponse);
        Assert.True(apiResponse.Success);
        Assert.NotNull(apiResponse.Data);
    }

    [Fact]
    public async Task GetSchedulers_ReturnsList()
    {
        var response = await _client.GetAsync("/api/schedulers");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("success", content);
    }
}
