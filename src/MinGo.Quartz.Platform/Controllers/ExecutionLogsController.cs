using Microsoft.AspNetCore.Mvc;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// 执行日志查询 API
/// </summary>
[ApiController]
[Route("api/schedulers/{schedulerName}/logs")]
public class ExecutionLogsController : ControllerBase
{
    private readonly ExecutionLogService _logService;

    public ExecutionLogsController(ExecutionLogService logService)
    {
        _logService = logService;
    }

    /// <summary>查询执行日志（分页）</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<ExecutionLogDto>>>> QueryLogs(
        string schedulerName, [FromQuery] ExecutionLogQuery query, CancellationToken ct)
    {
        var result = await _logService.QueryLogsAsync(query, ct);
        return Ok(ApiResponse<PagedResponse<ExecutionLogDto>>.Ok(result));
    }

    /// <summary>获取单条日志详情</summary>
    [HttpGet("{id:long}")]
    public async Task<ActionResult<ApiResponse<ExecutionLogDto>>> GetLog(long id, CancellationToken ct)
    {
        var result = await _logService.GetLogAsync(id, ct);
        if (result is null)
            return NotFound(ApiResponse<ExecutionLogDto>.Fail("Log not found", "NOT_FOUND"));

        return Ok(ApiResponse<ExecutionLogDto>.Ok(result));
    }
}
