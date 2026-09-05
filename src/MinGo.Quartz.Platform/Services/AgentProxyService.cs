using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using MinGo.Quartz.Agent.Abstractions;
using MinGo.Quartz.Agent.Abstractions.Models;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// Platform → Agent HTTP 代理服务
/// </summary>
public class AgentProxyService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SchedulerRouterService _router;
    private readonly ILogger<AgentProxyService> _logger;

    public AgentProxyService(
        IHttpClientFactory httpClientFactory,
        SchedulerRouterService router,
        ILogger<AgentProxyService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _router = router;
        _logger = logger;
    }

    /// <summary>
    /// 代理 GET 请求到目标 Agent
    /// </summary>
    public async Task<T?> ProxyGetAsync<T>(string schedulerName, string path, CancellationToken ct = default)
    {
        var client = await GetClientAsync(schedulerName, ct);
        if (client is null) return default;

        try
        {
            var response = await client.GetAsync(path, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Agent proxy GET failed: {StatusCode} for {Scheduler}/{Path}",
                    response.StatusCode, schedulerName, path);
                return default;
            }

            var apiResponse = await response.Content.ReadFromApiResponseAsync<T>(cancellationToken: ct);
            return apiResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent proxy GET error for {Scheduler}/{Path}", schedulerName, path);
            return default;
        }
    }

    /// <summary>
    /// 代理 GET 请求（返回原始 ApiResponse）
    /// </summary>
    public async Task<ApiResponse<T>?> ProxyGetApiResponseAsync<T>(string schedulerName, string path, CancellationToken ct = default)
    {
        var client = await GetClientAsync(schedulerName, ct);
        if (client is null) return null;

        try
        {
            var response = await client.GetAsync(path, ct);
            if (!response.IsSuccessStatusCode)
            {
                return ApiResponse<T>.Fail($"Agent returned {(int)response.StatusCode}", "AGENT_ERROR");
            }

            var result = await response.Content.ReadFromJsonAsync<ApiResponse<T>>(
                MinGoJsonDefaults.Options, cancellationToken: ct);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent proxy GET error for {Scheduler}/{Path}", schedulerName, path);
            return ApiResponse<T>.Fail(ex.Message, "AGENT_UNREACHABLE");
        }
    }

    /// <summary>
    /// 代理 PUT 请求到目标 Agent
    /// </summary>
    public async Task<ApiResponse<T>?> ProxyPutAsync<T>(string schedulerName, string path, object body, CancellationToken ct = default)
    {
        var client = await GetClientAsync(schedulerName, ct);
        if (client is null) return ApiResponse<T>.Fail("No healthy agent available", "NO_AGENT");

        try
        {
            var json = JsonSerializer.Serialize(body, MinGoJsonDefaults.Options);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync(path, content, ct);

            var result = await response.Content.ReadFromJsonAsync<ApiResponse<T>>(
                MinGoJsonDefaults.Options, cancellationToken: ct);
            return result ?? ApiResponse<T>.Fail("Empty response from agent", "AGENT_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent proxy PUT error for {Scheduler}/{Path}", schedulerName, path);
            return ApiResponse<T>.Fail(ex.Message, "AGENT_UNREACHABLE");
        }
    }

    /// <summary>
    /// 代理 POST 请求到目标 Agent
    /// </summary>
    public async Task<ApiResponse<T>?> ProxyPostAsync<T>(string schedulerName, string path, object? body = null, CancellationToken ct = default)
    {
        var client = await GetClientAsync(schedulerName, ct);
        if (client is null) return ApiResponse<T>.Fail("No healthy agent available", "NO_AGENT");

        try
        {
            HttpContent? content = null;
            if (body is not null)
            {
                var json = JsonSerializer.Serialize(body, MinGoJsonDefaults.Options);
                content = new StringContent(json, Encoding.UTF8, "application/json");
            }

            var response = await client.PostAsync(path, content, ct);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<T>>(
                MinGoJsonDefaults.Options, cancellationToken: ct);
            return result ?? ApiResponse<T>.Fail("Empty response from agent", "AGENT_ERROR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent proxy POST error for {Scheduler}/{Path}", schedulerName, path);
            return ApiResponse<T>.Fail(ex.Message, "AGENT_UNREACHABLE");
        }
    }

    /// <summary>
    /// 代理 POST 请求（无返回值）
    /// </summary>
    public async Task<ApiResponse<object>?> ProxyPostAsync(string schedulerName, string path, object? body = null, CancellationToken ct = default)
    {
        return await ProxyPostAsync<object>(schedulerName, path, body, ct);
    }

    /// <summary>
    /// 代理 DELETE 请求到目标 Agent
    /// </summary>
    public async Task<ApiResponse<T>?> ProxyDeleteAsync<T>(string schedulerName, string path, CancellationToken ct = default)
    {
        var client = await GetClientAsync(schedulerName, ct);
        if (client is null) return ApiResponse<T>.Fail("No healthy agent available", "NO_AGENT");

        try
        {
            var response = await client.DeleteAsync(path, ct);
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<T>>(
                MinGoJsonDefaults.Options, cancellationToken: ct);
            return result ?? ApiResponse<T>.Ok(default!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent proxy DELETE error for {Scheduler}/{Path}", schedulerName, path);
            return ApiResponse<T>.Fail(ex.Message, "AGENT_UNREACHABLE");
        }
    }

    private async Task<HttpClient?> GetClientAsync(string schedulerName, CancellationToken ct)
    {
        var baseUrl = await _router.GetAgentApiUrlAsync(schedulerName, ct);
        if (string.IsNullOrEmpty(baseUrl))
            return null;

        var client = _httpClientFactory.CreateClient("AgentApi");
        client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/api/agent/");
        client.Timeout = TimeSpan.FromSeconds(15);
        client.DefaultRequestHeaders.Add("X-Scheduler-Name", schedulerName);
        return client;
    }
}
