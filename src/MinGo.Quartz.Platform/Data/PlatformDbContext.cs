using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using MinGo.Quartz.Platform.Data.Entities;

namespace MinGo.Quartz.Platform.Data;

/// <summary>
/// Platform 数据库上下文
/// </summary>
public class PlatformDbContext : DbContext
{
    public PlatformDbContext(DbContextOptions<PlatformDbContext> options)
        : base(options)
    {
    }

    public DbSet<AgentInfo> Agents => Set<AgentInfo>();
    public DbSet<AgentScheduler> AgentSchedulers => Set<AgentScheduler>();
    public DbSet<SchedulerInfo> SchedulerInfos => Set<SchedulerInfo>();
    public DbSet<JobDefinition> JobDefinitions => Set<JobDefinition>();
    public DbSet<ExecutionLog> ExecutionLogs => Set<ExecutionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // AgentInfo
        modelBuilder.Entity<AgentInfo>(entity =>
        {
            entity.ToTable("Agents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Url).HasMaxLength(512);
            entity.Property(e => e.TokenHash).HasMaxLength(128);
            entity.HasIndex(e => e.TokenHash).IsUnique().HasFilter("TokenHash IS NOT NULL");
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Status);
        });

        // AgentScheduler
        modelBuilder.Entity<AgentScheduler>(entity =>
        {
            entity.ToTable("AgentSchedulers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AgentId, e.SchedulerName }).IsUnique();
            entity.HasIndex(e => e.SchedulerName);

            entity.HasOne<AgentInfo>(a => a.Agent)
                .WithMany(a => a.Schedulers)
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SchedulerInfo
        modelBuilder.Entity<SchedulerInfo>(entity =>
        {
            entity.ToTable("SchedulerInfos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // JobDefinition
        modelBuilder.Entity<JobDefinition>(entity =>
        {
            entity.ToTable("JobDefinitions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SchedulerName, e.JobGroup, e.JobName }).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.JobGroup).HasMaxLength(200);
            entity.Property(e => e.JobName).HasMaxLength(200);
            entity.Property(e => e.JobType).HasMaxLength(500);
        });

        // ExecutionLog
        modelBuilder.Entity<ExecutionLog>(entity =>
        {
            entity.ToTable("ExecutionLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.AgentId, e.StartTime });
            entity.HasIndex(e => new { e.JobGroup, e.JobName, e.StartTime });
            entity.HasIndex(e => e.StartTime);

            entity.HasOne<AgentInfo>(e => e.Agent)
                .WithMany()
                .HasForeignKey(e => e.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SQLite 不支持 DateTimeOffset 在 ORDER BY 中使用，且 TEXT 存储日期索引效率低。
        // 全局将 DateTimeOffset / DateTime (UTC) 统一转换为 Unix 毫秒时间戳 (long) 存储：
        //   • 存储为 INTEGER 列，排序、索引、比较均高效
        //   • 跨数据库兼容（SQLite / PostgreSQL / MySQL 均原生支持）
        //   • 与前端 JavaScript Date.now() 一致，简化 API 交换
        // 假定所有 DateTime 均为 UTC（与 UtcAuditInterceptor 写入行为一致）。
        var dtoToUnixMs = new ValueConverter<DateTimeOffset, long>(
            v => v.ToUnixTimeMilliseconds(),
            v => DateTimeOffset.FromUnixTimeMilliseconds(v));

        var nullableDtoToUnixMs = new ValueConverter<DateTimeOffset?, long?>(
            v => v.HasValue ? v.Value.ToUnixTimeMilliseconds() : default(long?),
            v => v.HasValue ? DateTimeOffset.FromUnixTimeMilliseconds(v.Value) : default(DateTimeOffset?));

        var dtToUnixMs = new ValueConverter<DateTime, long>(
            v => new DateTimeOffset(DateTime.SpecifyKind(v, DateTimeKind.Utc)).ToUnixTimeMilliseconds(),
            v => DateTime.UnixEpoch.AddMilliseconds(v));

        var nullableDtToUnixMs = new ValueConverter<DateTime?, long?>(
            v => v.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)).ToUnixTimeMilliseconds()
                : default(long?),
            v => v.HasValue ? DateTime.UnixEpoch.AddMilliseconds(v.Value) : default(DateTime?));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                    property.SetValueConverter(dtoToUnixMs);
                else if (property.ClrType == typeof(DateTimeOffset?))
                    property.SetValueConverter(nullableDtoToUnixMs);
                else if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(dtToUnixMs);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(nullableDtToUnixMs);
            }
        }
    }
}
