using Microsoft.EntityFrameworkCore;
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
            entity.HasIndex(e => e.TokenHash).IsUnique().HasFilter("[TokenHash] IS NOT NULL");
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
    }
}
