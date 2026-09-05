using Microsoft.AspNetCore.Mvc;
using MinGo.Quartz.Platform.Services;

namespace MinGo.Quartz.Platform.Controllers;

/// <summary>
/// SSE 实时事件流
/// </summary>
[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly ActivityFeedService _feed;

    public EventsController(ActivityFeedService feed)
    {
        _feed = feed;
    }

    /// <summary>SSE 事件流订阅</summary>
    [HttpGet]
    public async Task Subscribe(CancellationToken ct)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        // 发送初始连接确认
        await Response.WriteAsync("event: connected\ndata: {\"message\":\"SSE connected\"}\n\n", ct);
        await Response.Body.FlushAsync(ct);

        await foreach (var evt in _feed.SubscribeAsync(ct))
        {
            if (ct.IsCancellationRequested) break;

            await Response.WriteAsync(evt.ToSseData(), ct);
            await Response.Body.FlushAsync(ct);
        }
    }
}
