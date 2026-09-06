# syntax=docker/dockerfile:1

# =============================================================================
# MinGo.Quartz.Platform — 生产镜像
#
# 构建上下文 = Platform 仓根目录（MinGo.Quartz.Platform/）。
#
#   docker build -t mingo-quartz-platform .
#
# 依赖说明：后端引用 MinGo.Quartz.Agent.Abstractions 1.0.0，直接从 nuget.org 还原
# （NuGet.config 仅配置 nuget.org 源）。
# =============================================================================

# ---------- 阶段 1：构建前端（React + Vite -> dist） ----------
FROM node:22-alpine AS ui-build
WORKDIR /ui

# 先仅复制清单以最大化利用依赖层缓存
COPY ui/package.json ui/package-lock.json ./
RUN npm ci

# 复制前端源码并执行生产构建（VITE_API_URL 未设置，默认同源 "/"）
COPY ui/ ./
RUN npm run build


# ---------- 阶段 2：发布后端（ASP.NET Core Web API） ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 先复制 NuGet 源配置、工程文件与全局构建属性以缓存还原层
COPY NuGet.config Directory.Build.props ./
COPY src/MinGo.Quartz.Platform/MinGo.Quartz.Platform.csproj src/MinGo.Quartz.Platform/

# 从 nuget.org 还原（含 MinGo.Quartz.Agent.Abstractions 1.0.0）
RUN dotnet restore src/MinGo.Quartz.Platform/MinGo.Quartz.Platform.csproj

# 复制其余后端源码并发布
COPY src/ src/
RUN dotnet publish src/MinGo.Quartz.Platform/MinGo.Quartz.Platform.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false


# ---------- 阶段 3：运行时镜像 ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# 后端发布产物
COPY --from=build /app/publish ./
# 前端构建产物放入 wwwroot，由静态文件中间件提供
COPY --from=ui-build /ui/dist ./wwwroot

# SQLite 数据库持久化目录（挂载卷以保留数据）
RUN mkdir -p /data && chown -R "$APP_UID" /data /app

ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    ConnectionStrings__PlatformDb="Data Source=/data/mingo_quartz_platform.db"

VOLUME ["/data"]
EXPOSE 8080

# 以 .NET 镜像内置的非 root 用户运行
USER $APP_UID

ENTRYPOINT ["dotnet", "MinGo.Quartz.Platform.dll"]
