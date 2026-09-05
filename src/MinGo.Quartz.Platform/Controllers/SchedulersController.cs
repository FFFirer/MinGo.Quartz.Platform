using Microsoft.AspNetCore.Mvc;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// Scheduler 管理 API
/// </summary>
[ApiController]
[Route("api/schedulers")]
public class SchedulersController : ControllerBase
{
    private readonly SchedulerService _schedulerService;

    public SchedulersController(SchedulerService schedulerService)
    {
        _schedulerService = schedulerService;
    }

    /// <summary>Scheduler 列表</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<SchedulerSummaryDto>>>> GetSchedulers(CancellationToken ct)
    {
        var result = await _schedulerService.GetSchedulersAsync(ct);
        return Ok(ApiResponse<List<SchedulerSummaryDto>>.Ok(result));
    }

    /// <summary>Scheduler 详情</summary>
    [HttpGet("{name}")]
    public async Task<ActionResult<ApiResponse<SchedulerDetailDto>>> GetScheduler(string name, CancellationToken ct)
    {
        var result = await _schedulerService.GetSchedulerAsync(name, ct);
        if (result is null)
            return NotFound(ApiResponse<SchedulerDetailDto>.Fail("Scheduler not found", "NOT_FOUND"));

        return Ok(ApiResponse<SchedulerDetailDto>.Ok(result));
    }
}
