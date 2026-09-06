# MinGo.Quartz.Platform — L3 平台后端 + L4 可视化 UI（合并仓）

本仓合并了原 **L3 `MinGo.Quartz.Platform`**（ASP.NET Core Web API 后端）与 **L4 `MinGo.Quartz.Platform.UI`**（React + Vite + TypeScript 前端），后端为主干，前端作为 `ui/` 子目录并入。

依赖方向：L4 UI → L3 Platform（REST + SSE + OpenAPI 契约）；L3 Platform → L2 `MinGo.Quartz.Agent.Abstractions`（NuGet 包引用，契约 + 观测 DTO）。

## 目录结构

```
MinGo.Quartz.Platform/
├── src/MinGo.Quartz.Platform/       # L3 ASP.NET Core Web API
├── tests/MinGo.Quartz.Platform.Tests/
├── ui/                              # L4 React + Vite + TypeScript（原 MinGo.Quartz.Platform.UI）
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── scripts/
├── MinGo.Quartz.Platform.slnx
├── Directory.Build.props
├── NuGet.config                     # 引用 ../MinGo.Quartz.SDK/artifacts 本地源
├── README.md
└── PLAN.md
```

## L3 后端

ASP.NET Core Web API，提供 Agent/Scheduler/Job 管理接口、声明式 Job、执行历史持久化、实时 Activity Feed（SSE）、Token 鉴权与 NSwag OpenAPI。

### 关键能力

- **Agent 管理**：注册/心跳/注销、Scheduler 上报、执行日志上报
- **Scheduler 管理**：列表、详情（含 L1 观测快照）、Job CRUD + 代理
- **执行历史**：`ExecutionLog` 持久化 + 分页查询（按 Job/时间/结果过滤）
- **Activity Feed**：`/api/events` SSE 端点，聚合 Agent 状态变化、Job 执行、心跳事件
- **批量操作**：Jobs 批量 trigger/pause/resume/delete
- **鉴权**：`AgentTokenMiddleware`（SHA256 Token 哈希验证）
- **OpenAPI**：NSwag 生成 Swagger/OpenAPI JSON，供 L4 生成 TS 类型

### 数据库

SQLite（`mingo_quartz_platform.db`），EF Core 10 + Unix 毫秒时间戳存储。

### 构建与测试

```powershell
.\scripts\build.ps1     # 构建后端 + 测试
.\scripts\test.ps1      # 运行 29 项测试
```

> NuGet 源：`NuGet.config` 配置 `../MinGo.Quartz.SDK/artifacts` 为本地源，需先构建 SDK 仓生成 .nupkg。

## L4 前端（ui/）

React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 3 + TanStack Query/Table。

### 关键能力

- **Dashboard**：平台/集群仪表盘、健康矩阵、执行趋势、实时 Activity Feed
- **Agents**：列表（分页/过滤）、详情、状态（Pending/Online/Warning/Offline）
- **Schedulers**：列表、详情（含 L1 观测快照）
- **Jobs**：列表、详情（Trigger 列表 + 参数类型化展示）、创建、批量操作
- **执行历史**：ExecutionLog 分页查询 + 过滤
- **SSE**：`useEventStream` 实时事件流 + 15s 轮询降级

### 构建

```powershell
cd ui
npm install
npm run build           # 生产构建
npm run dev             # 开发服务器（Vite 代理到 L3 http://localhost:5000）
```

### OpenAPI 类型生成

```powershell
cd ui
npm run gen:api         # 从 L3 /swagger/v1/swagger.json 生成 TS 客户端
```

> 前提：L3 后端运行在 `http://localhost:5000`。启动命令：`cd ../src/MinGo.Quartz.Platform && dotnet run`

## 里程碑状态

### L3

| 里程碑 | 状态 |
|---|---|
| M1 迁移 + 命名空间对齐 | ✅ |
| M2 ExecutionLog 持久化 + 查询 | ✅ |
| M3 Activity Feed + 批量操作 | ✅ |
| M4 鉴权 + OpenAPI | ✅ |

测试：29/29 全绿。

### L4

| 里程碑 | 状态 |
|---|---|
| M1 迁移 + 类型生成打通 | ✅ |
| M2 观测视图 + 执行历史 | ✅ |
| M3 批量操作 + Activity Feed | ✅ |
| M4 打磨（响应式/搜索/骨架屏） | ✅ |

构建：0 错误。

## 仓库合并说明

本仓由原 `MinGo.Quartz.Platform`（L3）与 `MinGo.Quartz.Platform.UI`（L4）两个独立仓库于 2026-09 合并而成：
- 使用 `git subtree` 保留两仓完整提交历史
- L4 UI 作为 `ui/` 子目录并入
- `NuGet.config` 本地源路径从 L1/L2 改为 SDK 合并仓
- `ui/scripts/gen-api.js` 启动命令路径更新

原 `FFFirer/MinGo.Quartz.Platform.UI.git` 保留作为归档，不再更新。
