using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Agent.Abstractions;
using MinGo.Quartz.Platform.Auth;
using MinGo.Quartz.Platform.Data;
using MinGo.Quartz.Platform.Services;
using NSwag.Generation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 1. 数据库
builder.Services.AddDbContext<PlatformDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("PlatformDb"))
           .AddInterceptors(new UtcAuditInterceptor()));

// 2. 核心服务
builder.Services.AddScoped<AgentService>();
builder.Services.AddScoped<SchedulerService>();
builder.Services.AddScoped<SchedulerRouterService>();
builder.Services.AddScoped<AgentProxyService>();
builder.Services.AddScoped<JobService>();
builder.Services.AddScoped<ExecutionLogService>();
builder.Services.AddSingleton<ActivityFeedService>();
builder.Services.AddHostedService<AgentStatusTracker>();

// 3. HttpClient（代理到 Agent）
builder.Services.AddHttpClient("AgentApi")
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(15);
    });

// 4. 控制器 + JSON（与 MinGoJsonDefaults 对齐）
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            MinGoJsonDefaults.Options.DefaultIgnoreCondition;
    });

// 5. NSwag / OpenAPI
builder.Services.AddOpenApiDocument(config =>
{
    config.Title = "MinGo.Quartz.Platform API";
    config.Version = "v1";
    config.Description = "Quartz 管理平台后端 API — Agent/Scheduler/Job 管理、执行日志、实时事件";
});
builder.Services.AddSwaggerDocument();

// 6. CORS（开发阶段允许所有来源）
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 中间件管道
app.UseCors();
app.UseOpenApi();
app.UseSwaggerUi();

// 鉴权中间件（默认关闭，启用后 Agent 请求需要 Token）
// app.UseMiddleware<AgentTokenMiddleware>();

app.MapControllers();

// 数据库初始化（使用 Migrations 管理 Schema）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex,
            "Database migration failed. Ensure SQLite connection string is correct.");
    }
}

app.Run();

/// <summary>
/// 测试入口点（供 WebApplicationFactory 使用）
/// </summary>
public partial class Program;
