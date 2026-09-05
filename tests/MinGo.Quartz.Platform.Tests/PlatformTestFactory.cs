using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Tests;

/// <summary>
/// 测试用 WebApplicationFactory，使用 InMemory 数据库
/// </summary>
public class PlatformTestFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString("N");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // 移除原有的所有 DbContext 和 EF 相关注册
            var descriptorsToRemove = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<PlatformDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions) ||
                    d.ServiceType.FullName?.Contains("EntityFrameworkCore") == true)
                .ToList();
            foreach (var d in descriptorsToRemove)
                services.Remove(d);

            // 使用 InMemory 数据库
            services.AddDbContext<PlatformDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            // 确保 ActivityFeedService 已注册
            var feedDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ActivityFeedService));
            if (feedDescriptor is null)
                services.AddSingleton<ActivityFeedService>();
        });
    }

    /// <summary>
    /// 创建测试用的 DbContext scope
    /// </summary>
    public async Task<PlatformDbContext> CreateDbContextAsync()
    {
        var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        await db.Database.EnsureCreatedAsync();
        return db;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
    }
}
