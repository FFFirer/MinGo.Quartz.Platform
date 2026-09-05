using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MinGo.Quartz.Platform.Data;

/// <summary>
/// UTC 审计拦截器 — SaveChanges 前自动设置 CreatedAt / UpdatedAt
/// </summary>
public class UtcAuditInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is null)
            return base.SavingChangesAsync(eventData, result, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var entries = eventData.Context.ChangeTracker.Entries();

        foreach (var entry in entries)
        {
            // CreatedAt — 仅在 Added 时设置
            if (entry.State == EntityState.Added)
            {
                var createdAtProp = entry.Properties.FirstOrDefault(p =>
                    p.Metadata.Name is "CreatedAt" or "RegisteredAt" or "FirstReportedAt" or "ReportedAt");
                if (createdAtProp is not null && (DateTimeOffset)createdAtProp.CurrentValue! == default)
                {
                    createdAtProp.CurrentValue = now;
                }
            }

            // UpdatedAt — Added 和 Modified 都设置
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                var updatedAtProp = entry.Properties.FirstOrDefault(p =>
                    p.Metadata.Name is "UpdatedAt" or "LastHeartbeat" or "LastReportedAt");
                if (updatedAtProp is not null)
                {
                    updatedAtProp.CurrentValue = now;
                }
            }
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
