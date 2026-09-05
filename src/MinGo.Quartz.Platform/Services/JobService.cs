using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions;
using MinGo.Quartz.Agent.Abstractions.Enums;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Data.Entities;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// 声明式 Job 管理服务（Platform 视角）
/// </summary>
public class JobService
{
    private readonly PlatformDbContext _db;
    private readonly AgentProxyService _proxy;
    private readonly ILogger<JobService> _logger;

    public JobService(PlatformDbContext db, AgentProxyService proxy, ILogger<JobService> logger)
    {
        _db = db;
        _proxy = proxy;
        _logger = logger;
    }

    /// <summary>
    /// 创建 Job（先写本地 DB → 再代理到 Agent）
    /// </summary>
    public async Task<JobDefinitionDto> CreateJobAsync(string schedulerName, CreateJobRequest request, CancellationToken ct = default)
    {
        var def = new JobDefinition
        {
            Id = Guid.NewGuid().ToString("N"),
            SchedulerName = schedulerName,
            JobGroup = request.JobKey.Group,
            JobName = request.JobKey.Name,
            JobType = request.JobType.ToAssemblyQualifiedName(),
            ParamsJson = JsonSerializer.Serialize(request.Params, MinGoJsonDefaults.Options),
            OptionsJson = JsonSerializer.Serialize(request.Options, MinGoJsonDefaults.Options),
            ScheduleJson = JsonSerializer.Serialize(request.Schedule, MinGoJsonDefaults.Options),
            Status = SyncStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.JobDefinitions.Add(def);
        await _db.SaveChangesAsync(ct);

        // 代理到 Agent 执行
        var result = await _proxy.ProxyPutAsync<JobDefinitionDto>(
            schedulerName, "jobs", request, ct);

        if (result is { Success: true })
        {
            def.Status = SyncStatus.Synced;
        }
        else
        {
            def.Status = SyncStatus.Failed;
            def.Error = result?.ErrorMessage ?? "Agent unreachable";
        }

        def.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return MapToDto(def);
    }

    /// <summary>
    /// 更新 Job
    /// </summary>
    public async Task<bool> UpdateJobAsync(string schedulerName, JobKeyDto jobKey, UpdateJobRequest request, CancellationToken ct = default)
    {
        var def = await FindDefinitionAsync(schedulerName, jobKey, ct);
        if (def is null) return false;

        if (request.Params is not null)
            def.ParamsJson = JsonSerializer.Serialize(request.Params, MinGoJsonDefaults.Options);
        if (request.Schedule is not null)
            def.ScheduleJson = JsonSerializer.Serialize(request.Schedule, MinGoJsonDefaults.Options);
        if (request.Options is not null)
            def.OptionsJson = JsonSerializer.Serialize(request.Options, MinGoJsonDefaults.Options);

        def.Status = SyncStatus.Pending;
        def.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        // 代理到 Agent
        var result = await _proxy.ProxyPutAsync<object>(
            schedulerName, $"jobs/{jobKey.Name}/{jobKey.Group}", request, ct);

        def.Status = result is { Success: true } ? SyncStatus.Synced : SyncStatus.Failed;
        def.Error = result is { Success: false } ? result.ErrorMessage : null;
        def.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return true;
    }

    /// <summary>
    /// 删除 Job
    /// </summary>
    public async Task<bool> DeleteJobAsync(string schedulerName, JobKeyDto jobKey, CancellationToken ct = default)
    {
        var def = await FindDefinitionAsync(schedulerName, jobKey, ct);
        if (def is null) return false;

        // 代理到 Agent
        await _proxy.ProxyDeleteAsync<object>(
            schedulerName, $"jobs/{jobKey.Name}/{jobKey.Group}", ct);

        _db.JobDefinitions.Remove(def);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// 获取 Job 详情（优先代理 Agent 获取实时数据）
    /// </summary>
    public async Task<JobDetailDto?> GetJobAsync(string schedulerName, JobKeyDto jobKey, CancellationToken ct = default)
    {
        // 尝试从 Agent 获取实时数据
        var result = await _proxy.ProxyGetApiResponseAsync<JobDetailDto>(
            schedulerName, $"jobs/{jobKey.Name}/{jobKey.Group}", ct);

        if (result is { Success: true, Data: not null })
            return result.Data;

        // 降级读本地 DB
        var def = await FindDefinitionAsync(schedulerName, jobKey, ct);
        if (def is null) return null;

        return new JobDetailDto
        {
            JobKey = new JobKeyDto(def.JobName, def.JobGroup),
            Status = def.Status.ToString(),
            Schedule = JsonSerializer.Deserialize<ScheduleDto>(def.ScheduleJson, MinGoJsonDefaults.Options) ?? new(),
            Options = JsonSerializer.Deserialize<QuartzOptionsDto>(def.OptionsJson, MinGoJsonDefaults.Options) ?? new(),
            Params = JsonSerializer.Deserialize<Dictionary<string, object>>(def.ParamsJson, MinGoJsonDefaults.Options) ?? new()
        };
    }

    /// <summary>
    /// 获取 Job 列表（代理 Agent）
    /// </summary>
    public async Task<PagedResponse<JobSummaryDto>> GetJobsAsync(string schedulerName, JobQuery query, CancellationToken ct = default)
    {
        var result = await _proxy.ProxyGetApiResponseAsync<PagedResponse<JobSummaryDto>>(
            schedulerName,
            $"jobs?page={query.Page}&pageSize={query.PageSize}" +
            (query.Status is not null ? $"&status={query.Status}" : "") +
            (query.Group is not null ? $"&group={query.Group}" : "") +
            (query.Keyword is not null ? $"&keyword={query.Keyword}" : ""),
            ct);

        if (result is { Success: true, Data: not null })
            return result.Data;

        // 降级读本地 DB
        var queryable = _db.JobDefinitions
            .Where(j => j.SchedulerName == schedulerName);

        if (!string.IsNullOrEmpty(query.Group))
            queryable = queryable.Where(j => j.JobGroup == query.Group);
        if (!string.IsNullOrEmpty(query.Keyword))
            queryable = queryable.Where(j => j.JobName.Contains(query.Keyword) || j.JobType.Contains(query.Keyword));

        var total = await queryable.CountAsync(ct);
        var items = await queryable
            .OrderBy(j => j.JobGroup).ThenBy(j => j.JobName)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResponse<JobSummaryDto>
        {
            Items = items.Select(MapToSummaryDto).ToList(),
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 触发 Job
    /// </summary>
    public async Task<bool> TriggerJobAsync(string schedulerName, JobKeyDto jobKey, CancellationToken ct = default)
    {
        var result = await _proxy.ProxyPostAsync<object>(
            schedulerName, $"jobs/{jobKey.Name}/{jobKey.Group}/trigger", null, ct);
        return result is { Success: true };
    }

    /// <summary>
    /// 暂停 Job
    /// </summary>
    public async Task<bool> PauseJobAsync(string schedulerName, JobKeyDto jobKey, CancellationToken ct = default)
    {
        var result = await _proxy.ProxyPostAsync<object>(
            schedulerName, $"jobs/{jobKey.Name}/{jobKey.Group}/pause", null, ct);
        return result is { Success: true };
    }

    /// <summary>
    /// 恢复 Job
    /// </summary>
    public async Task<bool> ResumeJobAsync(string schedulerName, JobKeyDto jobKey, CancellationToken ct = default)
    {
        var result = await _proxy.ProxyPostAsync<object>(
            schedulerName, $"jobs/{jobKey.Name}/{jobKey.Group}/resume", null, ct);
        return result is { Success: true };
    }

    /// <summary>
    /// 批量操作
    /// </summary>
    public async Task<BatchOperationResult> BatchOperationAsync(
        string schedulerName, BatchOperationRequest request, CancellationToken ct = default)
    {
        var result = new BatchOperationResult();

        foreach (var jobKey in request.JobKeys)
        {
            bool success = request.Action.ToLowerInvariant() switch
            {
                "trigger" => await TriggerJobAsync(schedulerName, jobKey, ct),
                "pause" => await PauseJobAsync(schedulerName, jobKey, ct),
                "resume" => await ResumeJobAsync(schedulerName, jobKey, ct),
                "delete" => await DeleteJobAsync(schedulerName, jobKey, ct),
                _ => false
            };

            if (success) result.Succeeded++;
            else result.Failed++;
        }

        return result;
    }

    #region Helpers

    private async Task<JobDefinition?> FindDefinitionAsync(string schedulerName, JobKeyDto jobKey, CancellationToken ct)
    {
        return await _db.JobDefinitions
            .FirstOrDefaultAsync(j =>
                j.SchedulerName == schedulerName &&
                j.JobName == jobKey.Name &&
                j.JobGroup == jobKey.Group, ct);
    }

    private static JobDefinitionDto MapToDto(JobDefinition def)
    {
        return new JobDefinitionDto
        {
            Id = def.Id,
            SchedulerName = def.SchedulerName,
            JobKey = new JobKeyDto(def.JobName, def.JobGroup),
            Status = def.Status.ToString(),
            ErrorMessage = def.Error,
            CreatedAt = def.CreatedAt,
            UpdatedAt = def.UpdatedAt
        };
    }

    private static JobSummaryDto MapToSummaryDto(JobDefinition def)
    {
        return new JobSummaryDto
        {
            JobKey = new JobKeyDto(def.JobName, def.JobGroup),
            Status = def.Status.ToString()
        };
    }

    #endregion
}

/// <summary>
/// 批量操作请求
/// </summary>
public class BatchOperationRequest
{
    public string Action { get; set; } = string.Empty;
    public List<JobKeyDto> JobKeys { get; set; } = new();
}

/// <summary>
/// 批量操作结果
/// </summary>
public class BatchOperationResult
{
    public int Succeeded { get; set; }
    public int Failed { get; set; }
    public int Total => Succeeded + Failed;
}
