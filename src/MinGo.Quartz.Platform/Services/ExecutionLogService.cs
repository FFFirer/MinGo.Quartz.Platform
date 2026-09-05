using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions;
using MinGo.Quartz.Agent.Abstractions.Models;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Data.Entities;

namespace MinGo.Quartz.Platform.Services;

/// <summary>
/// 执行日志持久化服务
/// </summary>
public class ExecutionLogService
{
    private readonly PlatformDbContext _db;
    private readonly ILogger<ExecutionLogService> _logger;

    public ExecutionLogService(PlatformDbContext db, ILogger<ExecutionLogService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// 批量写入执行日志
    /// </summary>
    public async Task<int> IngestLogsAsync(string agentId, List<ExecutionLogDto> logs, CancellationToken ct = default)
    {
        var entities = logs.Select(dto => new ExecutionLog
        {
            AgentId = agentId,
            JobGroup = dto.JobKey.Group,
            JobName = dto.JobKey.Name,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            DurationMs = dto.DurationMs,
            Success = dto.Success,
            ErrorMessage = dto.ErrorMessage,
            StackTrace = dto.StackTrace,
            CustomFieldsJson = dto.CustomFields is not null
                ? JsonSerializer.Serialize(dto.CustomFields, MinGoJsonDefaults.Options)
                : null,
            CreatedAt = DateTimeOffset.UtcNow
        }).ToList();

        _db.ExecutionLogs.AddRange(entities);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Ingested {Count} execution log(s) from agent {AgentId}", entities.Count, agentId);
        return entities.Count;
    }

    /// <summary>
    /// 分页查询执行日志
    /// </summary>
    public async Task<PagedResponse<ExecutionLogDto>> QueryLogsAsync(ExecutionLogQuery query, CancellationToken ct = default)
    {
        var queryable = _db.ExecutionLogs.AsQueryable();

        if (!string.IsNullOrEmpty(query.JobGroup))
            queryable = queryable.Where(l => l.JobGroup == query.JobGroup);
        if (!string.IsNullOrEmpty(query.JobName))
            queryable = queryable.Where(l => l.JobName == query.JobName);
        if (query.Success.HasValue)
            queryable = queryable.Where(l => l.Success == query.Success.Value);
        if (query.StartTimeFrom.HasValue)
            queryable = queryable.Where(l => l.StartTime >= query.StartTimeFrom.Value);
        if (query.StartTimeTo.HasValue)
            queryable = queryable.Where(l => l.StartTime <= query.StartTimeTo.Value);

        var total = await queryable.CountAsync(ct);
        var items = await queryable
            .OrderByDescending(l => l.StartTime)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResponse<ExecutionLogDto>
        {
            Items = items.Select(MapToDto).ToList(),
            Total = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>
    /// 获取单条日志详情
    /// </summary>
    public async Task<ExecutionLogDto?> GetLogAsync(long id, CancellationToken ct = default)
    {
        var log = await _db.ExecutionLogs.FirstOrDefaultAsync(l => l.Id == id, ct);
        return log is null ? null : MapToDto(log);
    }

    private static ExecutionLogDto MapToDto(ExecutionLog entity)
    {
        return new ExecutionLogDto
        {
            JobKey = new JobKeyDto(entity.JobName, entity.JobGroup),
            StartTime = entity.StartTime,
            EndTime = entity.EndTime,
            DurationMs = entity.DurationMs,
            Success = entity.Success,
            ErrorMessage = entity.ErrorMessage,
            StackTrace = entity.StackTrace,
            CustomFields = entity.CustomFieldsJson is not null
                ? JsonSerializer.Deserialize<Dictionary<string, object>>(entity.CustomFieldsJson, MinGoJsonDefaults.Options)
                : null
        };
    }
}

/// <summary>
/// 执行日志查询参数
/// </summary>
public class ExecutionLogQuery : PagedQuery
{
    public string? JobGroup { get; set; }
    public string? JobName { get; set; }
    public bool? Success { get; set; }
    public DateTimeOffset? StartTimeFrom { get; set; }
    public DateTimeOffset? StartTimeTo { get; set; }
}
