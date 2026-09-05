using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MinGo.Quartz.Platform.Data;

namespace MinGo.Quartz.Platform.Auth;

/// <summary>
/// Agent Token 鉴权中间件
/// </summary>
public class AgentTokenMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AgentTokenMiddleware> _logger;

    /// <summary>不需要鉴权的路径</summary>
    private static readonly string[] ExemptPaths =
    [
        "/api/agents",  // POST 注册
        "/swagger",
        "/api/swagger",
    ];

    public AgentTokenMiddleware(RequestDelegate next, ILogger<AgentTokenMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";

        // 仅拦截 /api/agents/ 下的非注册请求
        if (!path.StartsWith("/api/agents/", StringComparison.OrdinalIgnoreCase) ||
            ExemptPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        // POST /api/agents 注册端点免鉴权
        if (path.Equals("/api/agents", StringComparison.OrdinalIgnoreCase) &&
            context.Request.Method == "POST")
        {
            await _next(context);
            return;
        }

        // 从 Header 读取 Token
        if (!context.Request.Headers.TryGetValue("X-Agent-Token", out var token))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                errorMessage = "Missing X-Agent-Token header",
                errorCode = "UNAUTHORIZED"
            });
            return;
        }

        // 验证 Token
        var tokenHash = HashToken(token!);
        using var scope = context.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();

        var agent = await db.Agents.FirstOrDefaultAsync(a => a.TokenHash == tokenHash);
        if (agent is null)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                errorMessage = "Invalid token",
                errorCode = "UNAUTHORIZED"
            });
            return;
        }

        // 设置 ClaimsPrincipal
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim("AgentId", agent.Id),
            new Claim("AgentName", agent.Name),
            new Claim(ClaimTypes.Role, "Agent")
        ], "AgentToken"));

        await _next(context);
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }
}
