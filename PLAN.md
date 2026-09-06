# MinGo.Quartz.Platform — L3 平台后端（实现规划）

目标：基于 L2 实现**前后端分离的后端**，提供 Agent/Scheduler/Job 管理接口、声明式 Job、执行历史持久化、实时 Activity Feed（SSE）、鉴权与 OpenAPI。本层依赖 L2 Abstractions（契约 + 观测 DTO），不依赖 L2 SDK 实现、不依赖 L1 埋点实现。

## 1. 项目

| 项目 | 类型 | 依赖 |
|---|---|---|
| `src/MinGo.Quartz.Platform/MinGo.Quartz.Platform.csproj` | ASP.NET Core Web API（net10.0） | `MinGo.Quartz.Agent.Abstractions` + Npgsql.EFCore + NSwag |
| `tests/MinGo.Quartz.Platform.Tests` | xUnit + WebApplicationFactory | — |

> 迁移来源：`MinGo.Qap.Platform`。

## 2. 目录树

```
MinGo.Quartz.Platform/
├── MinGo.Quartz.Platform.slnx
├── Directory.Build.props
├── src/MinGo.Quartz.Platform/
│   ├── Controllers/          # Agents / Schedulers / Jobs / Dashboard / Manifest
│   ├── Services/
│   │   ├── AgentService / SchedulerService
│   │   ├── SchedulerRouterService / AgentProxyService
│   │   ├── JobService（声明式 + SyncStatus）
│   │   ├── ExecutionLogService（新增）
│   │   └── ActivityFeedService（新增，SSE）
│   ├── Data/
│   │   ├── Entities/         # Agent SchedulerInfo AgentScheduler JobDefinition ExecutionLog
│   │   ├── PlatformDbContext
│   │   ├── UtcAuditInterceptor
│   │   └── Migrations/
│   ├── Hubs/ or Endpoints/   # /api/events SSE
│   ├── Auth/                 # Token/mTLS 鉴权（阶段后期）
│   └── Program.cs
└── tests/
```

## 3. 关键实现点

### 复用已有（迁移）
- `SchedulerRouterService`（SchedulerName → 健康 Agent 路由）、`AgentProxyService`（HTTP 代理 + `X-Scheduler-Name`）、`AgentService`/`SchedulerService`。
- `JobService` 声明式创建：`JobDefinition` + `SyncStatus`(Pending/Synced/Failed) + 失败回退本地备份。

### 新增/补强
- **ExecutionLog 持久化**：新增 `ExecutionLog` 实体 + `ExecutionLogService`，接收 Agent 上报 `/api/agents/{id}/logs` 后落库（解决上一轮"执行历史只进内存队列、重启即丢"的 gap）；提供按 Job/时间范围/结果的查询。
- **Activity Feed（SSE）**：`/api/events` 端点，聚合 Agent 状态变化、Job 执行、心跳事件；内存 Channel 广播 + 客户端轮询降级（对应 spec `activity-feed`）。
- **批处理操作**：Jobs 批量 trigger/pause/resume/delete 端点（对应 spec `job-batch-operations`）。
- **鉴权**：Agent 端 Token（复用 `TokenHash`）+ Platform 端后续接入 RBAC（阶段后期）。
- **OpenAPI**：NSwag 生成 Swagger/OpenAPI JSON，供 L4 生成 TS 类型。

### 数据库
- 现有表：`Agents`、`SchedulerInfos`、`AgentSchedulers`、`JobDefinitions`；新增 `ExecutionLogs`。
- 时间约定不变：`DateTimeOffset` UTC + `timestamptz` + `UtcAuditInterceptor`。

## 4. API 清单（对齐 L2 契约）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/agents` | 注册/重连 |
| GET | `/api/agents` | Agent 列表（分页/过滤） |
| POST | `/api/agents/{id}/heartbeat` | 心跳 |
| POST | `/api/agents/{id}/schedulers` | 上报 Scheduler |
| POST | `/api/agents/{id}/logs` | 执行日志上报（落库） |
| GET | `/api/schedulers` | Scheduler 列表 |
| GET | `/api/schedulers/{name}` | Scheduler 详情（含观测快照） |
| GET | `/api/schedulers/{name}/jobs` | Job 列表 |
| POST/PUT/DELETE | `/api/schedulers/{name}/jobs[/{key}]` | 创建/更新/删除 |
| POST | `/api/schedulers/{name}/jobs/{key}/trigger|pause|resume` | 单 Job 操作 |
| POST | `/api/schedulers/{name}/jobs/batch` | 批量操作 |
| GET | `/api/schedulers/{name}/manifest` | Job manifest |
| GET | `/api/events` | SSE 实时事件流 |
| GET | `/api/dashboard` | 平台仪表盘聚合 |

## 5. 里程碑与验收

### M1 迁移 + 命名空间对齐
- 交付：`MinGo.Qap.Platform` → `MinGo.Quartz.Platform`，引用 L2 Abstractions。
- 验收：现有 Agent 能对接；Swagger 正常。

### M2 ExecutionLog 持久化 + 查询
- 交付：`ExecutionLog` 实体 + 迁移 + `ExecutionLogService` + 上报/查询端点。
- 验收：Agent 执行 Job → 日志落库 → 查询可见；重启后仍可查历史。

### M3 Activity Feed（SSE）+ 批量操作
- 交付：`/api/events` SSE + Channel 广播 + 批量端点。
- 验收：前端可订阅事件流；批量 pause/resume/delete 幂等。

### M4 鉴权 + OpenAPI 契约固化
- 交付：Token 鉴权中间件 + RBAC（阶段后期）+ NSwag 完整文档。
- 验收：未带 Token 的 Agent 请求被拒；OpenAPI 可生成 L4 TS 类型。

## 6. 风险与注意
- SSE 需处理连接断开/背压，Channel 有界 + 丢弃策略，避免内存无限增长。
- 声明式 `JobService` 状态机要保持 Pending/Synced/Failed 一致，Agent 不可达时回退本地备份（现有逻辑保留）。
- 执行日志量大，建议按 Agent/时间分页 + 归档策略（阶段后期）。

---

## 7. 实现状态（L3 收尾）

| 里程碑 | 状态 | 验收证据 |
|---|---|---|
| M1 迁移 + 命名空间对齐 | ✅ | ASP.NET Core Web API 项目搭建完成；引用 `MinGo.Quartz.Agent.Abstractions` 1.0.0；`AgentsController`/`SchedulersController`/`JobsController` 全部端点可用；NSwag Swagger UI 可访问 |
| M2 ExecutionLog 持久化 + 查询 | ✅ | `ExecutionLog` 实体 + `ExecutionLogs` 表；`ExecutionLogService.IngestLogsAsync` 批量写入；`ExecutionLogsController` 分页查询（按 Job/时间/结果过滤）；单条详情查询 |
| M3 Activity Feed + 批量操作 | ✅ | `ActivityFeedService`（Channel<ActivityEvent> BoundedCapacity=1024 + DropOldest）；`EventsController` SSE 端点 `/api/events`；`AgentStatusTracker` BackgroundService 定期检测心跳超时；`JobsController.BatchOperation` 批量 trigger/pause/resume/delete |
| M4 鉴权 + OpenAPI | ✅ | `AgentTokenMiddleware`（SHA256 Token 哈希验证 + ClaimsPrincipal）；NSwag OpenAPI 文档 `/swagger`；CORS 配置 |

### 测试覆盖
- **29/29 测试全绿**：AgentService 9 项 + SchedulerService 4 项 + ExecutionLogService 5 项 + ActivityFeedService 4 项 + API 集成测试 7 项
- 单元测试使用 EF Core InMemory 数据库
- 集成测试使用 `WebApplicationFactory<Program>` + InMemory 数据库

### 实现说明 / 与规划的偏差
- **TFM**：net10.0（与 L1/L2 一致）
- **数据库**：PostgreSQL（Npgsql.EntityFrameworkCore.PostgreSQL）；开发/测试阶段使用 InMemory 替代
- **Agent 代理**：`AgentProxyService` 通过 `IHttpClientFactory` + `X-Scheduler-Name` header 代理到 Agent API
- **SchedulerInfo ↔ AgentScheduler**：无 EF FK 关系（通过 SchedulerName 字符串关联），查询时手动 Join
- **鉴权默认关闭**：`AgentTokenMiddleware` 在 Program.cs 中注释掉，需要时取消注释启用
- **构建脚本**：`scripts/build.ps1` / `scripts/test.ps1`（与 L1/L2 一致风格）
- **NuGet 源**：`NuGet.config` 配置 `../MinGo.Quartz.SDK/artifacts` 为本地源（原 L1/L2 合并为 SDK 仓）

---

## 8. L4 UI 合并说明

本仓于 2026-09 合入原 **L4 `MinGo.Quartz.Platform.UI`**（React + Vite + TypeScript 前端）作为 `ui/` 子目录：

- 使用 `git subtree` 保留 L4 完整提交历史
- `ui/` 目录包含原 Platform.UI 仓全部内容（src/、package.json、vite.config.ts、tsconfig*.json、tailwind.config.js 等）
- L4 PLAN 保留于 `ui/PLAN.md`
- `ui/scripts/gen-api.js` 启动命令路径更新为 `cd ../src/MinGo.Quartz.Platform && dotnet run`
- 前后端契约：L4 通过 L3 `/swagger/v1/swagger.json` 生成 TS 类型（`npm run gen:api`）

### L4 实现状态（收尾）

| 里程碑 | 状态 | 验收证据 |
|---|---|---|
| M1 迁移 + 类型生成打通 | ✅ | 从 Qap.UI 迁移全部源码；`package.json` 重命名为 `mingo-quartz-platform-ui`；`npm run build` 0 错误通过；类型层与 L3 DTO 完全对齐 |
| M2 观测视图 + 执行历史 | ✅ | `JobDetailPage` 展示 Trigger 列表 + Misfire/并发标记；`ExecutionLogsPage` 使用 L3 `executionLogApi` 分页查询 + 过滤 |
| M3 批量操作 + Activity Feed | ✅ | `JobsPage` 多选 + 批量工具栏；`ActivityFeed` + `useEventStream` 适配 L3 SSE 事件类型 + 15s 轮询降级 |
| M4 打磨（响应式/搜索/骨架屏） | ✅ | `GlobalSearch` 适配 L3 `AgentDetailDto`；`LoadingSkeleton`/`StatusBadge`/`DataTable` 等基础组件复用 |

详细 L4 规划见 `ui/PLAN.md`。
