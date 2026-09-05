using Microsoft.AspNetCore.Mvc;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// Job 管理 API（通过 Scheduler 路由到 Agent）
/// </summary>
[ApiController]
[Route("api/schedulers/{schedulerName}/jobs")]
public class JobsController : ControllerBase
{
    private readonly JobService _jobService;

    public JobsController(JobService jobService)
    {
        _jobService = jobService;
    }

    /// <summary>Job 列表（分页）</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<JobSummaryDto>>>> GetJobs(
        string schedulerName, [FromQuery] JobQuery query, CancellationToken ct)
    {
        var result = await _jobService.GetJobsAsync(schedulerName, query, ct);
        return Ok(ApiResponse<PagedResponse<JobSummaryDto>>.Ok(result));
    }

    /// <summary>Job 详情</summary>
    [HttpGet("{name}/{group}")]
    public async Task<ActionResult<ApiResponse<JobDetailDto>>> GetJob(
        string schedulerName, string name, string group = "DEFAULT", CancellationToken ct = default)
    {
        var result = await _jobService.GetJobAsync(schedulerName, new JobKeyDto(name, group), ct);
        if (result is null)
            return NotFound(ApiResponse<JobDetailDto>.Fail("Job not found", "NOT_FOUND"));

        return Ok(ApiResponse<JobDetailDto>.Ok(result));
    }

    /// <summary>创建 Job</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<JobDefinitionDto>>> CreateJob(
        string schedulerName, [FromBody] CreateJobRequest request, CancellationToken ct)
    {
        var result = await _jobService.CreateJobAsync(schedulerName, request, ct);
        return Ok(ApiResponse<JobDefinitionDto>.Ok(result));
    }

    /// <summary>更新 Job</summary>
    [HttpPut("{name}/{group}")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateJob(
        string schedulerName, string name, string group,
        [FromBody] UpdateJobRequest request, CancellationToken ct)
    {
        var success = await _jobService.UpdateJobAsync(schedulerName, new JobKeyDto(name, group), request, ct);
        if (!success)
            return NotFound(ApiResponse<object>.Fail("Job not found", "NOT_FOUND"));

        return Ok(ApiResponse<object>.Ok(new { Updated = true }));
    }

    /// <summary>删除 Job</summary>
    [HttpDelete("{name}/{group}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteJob(
        string schedulerName, string name, string group, CancellationToken ct)
    {
        var success = await _jobService.DeleteJobAsync(schedulerName, new JobKeyDto(name, group), ct);
        if (!success)
            return NotFound(ApiResponse<object>.Fail("Job not found", "NOT_FOUND"));

        return Ok(ApiResponse<object>.Ok(new { Deleted = true }));
    }

    /// <summary>手动触发 Job</summary>
    [HttpPost("{name}/{group}/trigger")]
    public async Task<ActionResult<ApiResponse<object>>> TriggerJob(
        string schedulerName, string name, string group, CancellationToken ct)
    {
        var success = await _jobService.TriggerJobAsync(schedulerName, new JobKeyDto(name, group), ct);
        if (!success)
            return BadRequest(ApiResponse<object>.Fail("Failed to trigger job", "AGENT_ERROR"));

        return Ok(ApiResponse<object>.Ok(new { Triggered = true }));
    }

    /// <summary>暂停 Job</summary>
    [HttpPost("{name}/{group}/pause")]
    public async Task<ActionResult<ApiResponse<object>>> PauseJob(
        string schedulerName, string name, string group, CancellationToken ct)
    {
        var success = await _jobService.PauseJobAsync(schedulerName, new JobKeyDto(name, group), ct);
        if (!success)
            return BadRequest(ApiResponse<object>.Fail("Failed to pause job", "AGENT_ERROR"));

        return Ok(ApiResponse<object>.Ok(new { Paused = true }));
    }

    /// <summary>恢复 Job</summary>
    [HttpPost("{name}/{group}/resume")]
    public async Task<ActionResult<ApiResponse<object>>> ResumeJob(
        string schedulerName, string name, string group, CancellationToken ct)
    {
        var success = await _jobService.ResumeJobAsync(schedulerName, new JobKeyDto(name, group), ct);
        if (!success)
            return BadRequest(ApiResponse<object>.Fail("Failed to resume job", "AGENT_ERROR"));

        return Ok(ApiResponse<object>.Ok(new { Resumed = true }));
    }

    /// <summary>批量操作</summary>
    [HttpPost("batch")]
    public async Task<ActionResult<ApiResponse<BatchOperationResult>>> BatchOperation(
        string schedulerName, [FromBody] BatchOperationRequest request, CancellationToken ct)
    {
        var result = await _jobService.BatchOperationAsync(schedulerName, request, ct);
        return Ok(ApiResponse<BatchOperationResult>.Ok(result));
    }
}
