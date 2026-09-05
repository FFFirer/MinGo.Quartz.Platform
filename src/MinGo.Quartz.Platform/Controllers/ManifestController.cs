using Microsoft.AspNetCore.Mvc;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// Job Manifest API（代理到 Agent）
/// </summary>
[ApiController]
[Route("api/schedulers/{schedulerName}/manifest")]
public class ManifestController : ControllerBase
{
    private readonly AgentProxyService _proxy;

    public ManifestController(AgentProxyService proxy)
    {
        _proxy = proxy;
    }

    /// <summary>获取 Job Manifest（可用 Job 类型列表）</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<JobManifestDto>>> GetManifest(
        string schedulerName, CancellationToken ct)
    {
        var result = await _proxy.ProxyGetApiResponseAsync<JobManifestDto>(
            schedulerName, "manifest", ct);

        if (result is null)
            return BadRequest(ApiResponse<JobManifestDto>.Fail("No healthy agent available", "NO_AGENT"));

        return Ok(result);
    }
}
