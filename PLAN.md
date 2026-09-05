# MinGo.Quartz.Platform.UI — L4 可视化 UI（实现规划）

目标：对接 L3 管理接口，实现统一可视化管理。React + TypeScript + Vite + TanStack Query + Tailwind。类型由 L3 OpenAPI 生成，保证前后端契约一致。

> 迁移来源：`MinGo.Qap.UI`（React 19 + TS + Vite + Tailwind 已具备）。

## 1. 技术栈

| 项 | 选型 |
|---|---|
| 框架 | React 19 + TypeScript + Vite |
| 数据请求 | @tanstack/react-query |
| 表格 | @tanstack/react-table（v8） |
| 图表 | 轻量图表库（如 recharts） |
| 样式 | Tailwind CSS |
| 图标 | lucide-react |
| API 类型 | 由 L3 NSwag OpenAPI 生成（`src/api`） |
| 实时 | SSE（`useEventStream`）+ 轮询降级 |

## 2. 目录树

```
MinGo.Quartz.Platform.UI/
├── package.json / pnpm-lock.yaml
├── vite.config.ts / tsconfig*.json / tailwind.config.js
├── index.html
├── openapi/                 # 生成的 OpenAPI JSON + 代码生成脚本
└── src/
    ├── api/                 # 生成的客户端 + 类型（从 L3 OpenAPI）
    ├── types/
    ├── components/          # DataTable ConfirmDialog PageHeader StatusBadge ToastProvider
    │                        # ActivityFeed GlobalSearch FloatingActionPalette StatsCard
    │                        # HealthMatrix ExecutionTrendChart UpcomingJobsList SlidePanel …
    ├── pages/
    │   ├── PlatformDashboardPage
    │   ├── AgentsPage / AgentDetailPage
    │   ├── SchedulersPage / SchedulerDetailPage
    │   ├── JobsPage / JobDetailPage
    │   └── CreateJobPage
    └── App.tsx / main.tsx / index.css
```

## 3. 功能模块

- **Dashboard**：平台/集群仪表盘、健康矩阵、执行趋势、实时 Activity Feed、即将执行列表。
- **Agents**：列表（分页/过滤）、详情、状态（Pending/Online/Warning/Offline）。
- **Schedulers**：列表、详情（含 L1 观测快照：JobCounts/Trigger 状态/运行时长）。
- **Jobs**：列表（Group/Name/Status/Keyword 过滤）、详情（Trigger 列表 + 参数类型化展示）、创建（全页表单：group/params/schedule/options + copy-from）、批量操作。
- **观测视图（L1 回显）**：Trigger 时间线（prev/next/final fire）、Misfire 指令、并发/持久化标记、执行历史列表（来自 L3 ExecutionLog）。

## 4. 关键实现点

- **类型生成**：`npm run gen:api` 拉取 L3 `/swagger/v1/swagger.json`，用 openapi-typescript-codegen 生成 `src/api`。
- **SSE**：复用 `useEventStream`；SSE 失败自动降级为 15s 轮询（对应 spec `activity-feed`）。
- **契约失败兜底**：`ApiResponse` 反序列化沿用 `MinGoJsonDefaults` 语义；Agent 不可达时展示本地备份状态。
- **统一体验**：DataTable/ConfirmDialog/PageHeader/StatusBadge/Toast 等基础组件标准化（对应 spec `ui-*`）。

## 5. 里程碑与验收

### M1 迁移 + 类型生成打通
- 交付：现有页面迁移 + `gen:api` 脚本 + 生成类型接入。
- 验收：`pnpm build` 通过；列表/详情可用。

### M2 观测视图 + 执行历史
- 交付：Scheduler/Job 详情展示 L1 快照字段 + ExecutionLog 历史列表。
- 验收：Trigger 时间线/Misfire/并发标记正确渲染；历史日志分页可查。

### M3 批量操作 + Activity Feed
- 交付：Jobs 多选批量工具栏 + Dashboard Activity Feed（SSE+轮询）。
- 验收：批量 trigger/pause/resume/delete 交互正确；SSE 断开自动降级。

### M4 打磨（响应式/搜索/骨架屏）
- 交付：GlobalSearch、LoadingSkeleton、响应式布局。
- 验收：移动端/窄屏可用；搜索防抖 500ms。

## 6. 风险与注意
- OpenAPI 契约变更需与 L3 同步发布；建议 CI 中做契约校验（生成类型 diff）。
- SSE 连接需处理重复订阅与组件卸载清理。
- 大数据量表用虚拟滚动或服务端分页（后端已分页）。
