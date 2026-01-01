# Panel 项目任务清单

> 更新时间: 2025-12-25  
> 架构版本: v2.1 (Agent 主动拉取模式)  
> 整体进度: **~95%**

---

## 进度总览

| 阶段 | 进度 | 说明 |
|------|------|------|
| Phase 1: 骨架搭建 | **100%** | 数据模型 100%，API 骨架 100%，Agent 协议 100% |
| Phase 2: 功能完善 | **100%** | 所有 Service 完整实现，Guards 完成，订阅模块完成，审计日志完成 |
| Phase 3: 前端开发 | **100%** | 全部页面完成，包括审计日志查询 |
| Phase 4: Agent 开发 | **90%** | Go Sidecar 核心功能完成 |
| Phase 5: 部署运维 | **60%** | Docker 化完成，安装脚本完成，CI/CD 待做 |

---

## Phase 1: 骨架搭建 ✅ 100%

### 1.1 项目基础设施 ✅
- [x] Turborepo monorepo 结构 (`apps/api`, `packages/shared`)
- [x] NestJS 后端框架配置
- [x] Prisma ORM + PostgreSQL 数据库
- [x] 依赖安装 (NestJS, BullMQ, Redis, JWT, Passport, bcrypt, class-validator)
- [x] TypeScript 配置
- [x] 环境变量配置 (.env.example)

### 1.2 数据模型 ✅ 100%
`apps/api/prisma/schema.prisma` - 18 张表完整实现

**多租户层:**
- [x] Tenant (租户)
- [x] TenantUser (租户管理员)
- [x] TenantApiKey (API 密钥)

**节点层:**
- [x] Node (节点)
- [x] NodeGroup (节点组)
- [x] EgressIp (出口 IP)

**Xray 配置层 (JSONB 100% 透传):**
- [x] Inbound (入站配置)
- [x] Outbound (出站配置)
- [x] RoutingRule (路由规则)
- [x] Balancer (负载均衡器)
- [x] DnsConfig (DNS 配置)
- [x] PolicyConfig (策略配置)

**Client 层:**
- [x] Client (用户)
- [x] ClientInboundAccess (用户-入站多对多)
- [x] ClientTraffic (流量统计)
- [x] ClientOnlineLog (在线记录)
- [x] AuditLog (审计日志)

### 1.3 API 模块 ✅ 100%

| 模块 | Controller | Service | DTO | 实现状态 |
|------|:----------:|:-------:|:---:|----------|
| Auth | ✅ | ✅ | ✅ | **完整** - JWT 登录, API Key 验证, Node Token 验证 |
| Tenant | ✅ | ✅ | ✅ | **完整** - CRUD + 配额管理 + API Key 生成 + 用户管理 |
| Node | ✅ | ✅ | ✅ | **完整** - CRUD, Token 生成, 安装命令 |
| NodeGroup | ✅ | ✅ | ✅ | **完整** - CRUD + 节点添加/移除 |
| Inbound | ✅ | ✅ | ✅ | **完整** - CRUD |
| Outbound | ✅ | ✅ | ✅ | **完整** - CRUD + 出口 IP 绑定 |
| Routing | ✅ | ✅ | ✅ | **完整** - CRUD + 优先级排序 |
| Balancer | ✅ | ✅ | ✅ | **完整** - CRUD + 策略配置 |
| DnsConfig | ✅ | ✅ | ✅ | **完整** - CRUD |
| PolicyConfig | ✅ | ✅ | ✅ | **完整** - CRUD |
| Client | ✅ | ✅ | ✅ | **完整** - CRUD, 流量重置, 流量查询 |
| Agent | ✅ | ✅ | ✅ | **完整** - 全部 7 个 API |
| Stats | ✅ | ✅ | ✅ | **完整** - 概览统计 + 节点统计 |
| Subscription | ✅ | ✅ | - | **完整** - Clash/V2ray/SingBox/Shadowrocket/Surge |

### 1.4 Agent 通信协议 ✅ 100%
`apps/api/src/modules/agent/agent.service.ts`

- [x] `GET /agent/config` - 配置拉取 (ETag 支持)
- [x] `GET /agent/users` - 用户列表拉取 (有效性过滤)
- [x] `POST /agent/traffic` - 流量上报
- [x] `POST /agent/status` - 状态上报
- [x] `POST /agent/alive` - 在线用户上报 (设备限制检查)
- [x] `POST /agent/egress-ips` - 出口 IP 上报
- [x] `POST /agent/register` - 节点注册

---

## Phase 2: 功能完善 ✅ 90%

### 2.1 后端 API 完善 ✅
- [x] Tenant Service 完整实现 (CRUD + 配额管理 + API Key 生成)
- [x] NodeGroup Service 完整实现 (CRUD + 负载均衡配置)
- [x] Outbound Service 完整实现 (CRUD + 出口 IP 绑定)
- [x] RoutingRule Service 完整实现 (CRUD + 优先级排序)
- [x] Balancer Service 完整实现 (CRUD + 策略配置)
- [x] DnsConfig Service 完整实现
- [x] PolicyConfig Service 完整实现
- [x] Stats Service 完整实现 (概览统计, 节点统计, 流量图表)

### 2.2 认证与权限 ✅
- [x] JwtAuthGuard - JWT Token 验证
- [x] ApiKeyGuard - API Key 验证
- [x] NodeTokenGuard - Agent Node Token 验证
- [x] RolesGuard - RBAC 权限检查 (admin/operator/readonly)
- [x] @Public() 装饰器 - 公开路由
- [x] @Roles() 装饰器 - 角色限制
- [x] @CurrentUser() / @TenantId() 装饰器 - 获取当前用户/租户

### 2.3 业务功能
- [x] 订阅链接生成 (Clash/V2ray/SingBox/Shadowrocket/Surge)
- [x] 审计日志自动记录 (AuditLogInterceptor) ✅ 2025-12-25
- [x] GET/PUT /tenants/current API ✅ 2025-12-25
- [x] POST /auth/refresh API ✅ 2025-12-25
- [ ] 节点健康检查定时任务
- [ ] 流量配额超限自动禁用
- [ ] 过期用户自动禁用

### 2.4 数据库
- [ ] Seed 脚本完善 (测试数据)
- [ ] Migration 脚本
- [ ] 索引优化

---

## Phase 3: 前端开发 ✅ 95%

### 3.1 项目初始化 ✅
- [x] `apps/web` - React 19 + TypeScript + Vite
- [x] Ant Design 5.x 配置
- [x] React Router 6 路由配置
- [x] React Query 数据获取
- [x] Zustand 状态管理
- [x] API Client 封装

### 3.2 页面开发 ✅
- [x] 登录页面
- [x] Dashboard 概览 (统计卡片, 流量图表, 节点状态)
- [x] 节点管理 (列表, 添加, 详情, 安装命令)
- [x] 节点组管理
- [x] Inbound 管理 (协议配置表单, JSON 编辑器)
- [x] Outbound 管理 (出口 IP 绑定, JSON 编辑器)
- [x] 路由规则管理 (规则编辑器)
- [x] Balancer 管理 ✅ 2025-12-25
- [x] DNS Config 管理 ✅ 2025-12-25
- [x] Policy Config 管理 ✅ 2025-12-25
- [x] Client 管理 (列表, 添加, 配额, 订阅链接, 二维码)
- [x] 系统设置 (租户设置, 配额管理)
- [x] 审计日志查询页面 ✅ 2025-12-25

---

## Phase 4: Agent 开发 (Go Sidecar) ✅ 90%

### 4.1 项目初始化 ✅
- [x] Go 项目结构 (`apps/agent`)
- [x] 配置文件解析 (node_token, panel_url)
- [x] 日志框架 (zerolog)

### 4.2 核心功能 ✅
- [x] HTTP Client (带重试, 超时)
- [x] Config Puller (ETag 缓存, 定时拉取)
- [x] User Syncer (用户列表同步)
- [x] Xray Config Generator (注入 clients 到 inbounds)
- [x] Xray Process Manager (启动/重启/热重载)
- [ ] Xray Handler API 集成 (动态增删用户) - 待完善
- [x] Stats Collector (系统状态收集)
- [x] Traffic Reporter (定时上报流量)
- [x] Status Reporter (定时上报状态)
- [x] Alive Reporter (定时上报在线用户)
- [x] Egress IP Reporter (启动时上报出口 IP)

### 4.3 高级功能
- [x] 优雅关闭
- [ ] 自动更新
- [ ] 系统服务集成 (systemd)

---

## Phase 5: 部署运维 ✅ 60%

### 5.1 Docker 化 ✅
- [x] docker-compose.yml (完整版，含 API/Web/PostgreSQL/Redis)
- [x] Dockerfile - Panel API (NestJS + Prisma)
- [x] Dockerfile - Panel Web (React + Nginx)
- [x] Dockerfile - Agent (Go + Xray-core)

### 5.2 一键安装 ✅
- [x] Agent 安装脚本 (`install.sh`)
- [x] 系统检测 (Ubuntu/Debian/CentOS/RHEL/Fedora)
- [x] 依赖安装
- [x] Xray-core 下载
- [x] Agent 二进制下载
- [x] Systemd 服务配置

### 5.3 CI/CD
- [ ] GitHub Actions - 构建
- [ ] GitHub Actions - 测试
- [ ] GitHub Actions - 发布

---

## 当前优先级

1. **P0 - CI/CD**
   - GitHub Actions 构建/测试/发布

2. **P1 - 完善细节**
   - Xray Handler API 集成 (动态增删用户)
   - 节点健康检查定时任务
   - 流量配额超限自动禁用
   - 过期用户自动禁用

---

## 最近更新 (2025-12-25)

### 后端修复
- ✅ 新增 `GET /tenants/current` - 获取当前租户信息
- ✅ 新增 `PUT /tenants/current` - 更新当前租户信息
- ✅ 新增 `POST /auth/refresh` - JWT Token 刷新
- ✅ 新增 `AuditLogInterceptor` - 自动记录所有 CRUD 操作

### 前端新增
- ✅ Balancers 页面 (列表/CRUD/JSON 编辑器)
- ✅ DNS Config 页面 (列表/CRUD/JSON 编辑器)
- ✅ Policy Config 页面 (列表/CRUD/JSON 编辑器)
- ✅ 审计日志查询页面 (筛选/分页/详情查看)
- ✅ 导航菜单更新 (新增 4 个菜单项)

### 部署准备
- ✅ Dockerfile - Panel API (NestJS + Prisma + 自动迁移)
- ✅ Dockerfile - Panel Web (React + Nginx + SPA 路由)
- ✅ Dockerfile - Agent (Go + Xray-core)
- ✅ docker-compose.yml 完整版 (API/Web/PostgreSQL/Redis)
- ✅ Agent 安装脚本 `install.sh` (支持 Ubuntu/Debian/CentOS/RHEL)

---

## 文件结构

```
Panel/
├── apps/
│   ├── api/                    # NestJS 后端 ✅
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 数据模型 ✅
│   │   │   └── seed.ts         # 种子数据
│   │   └── src/
│   │       ├── modules/        # 14 个功能模块 ✅
│   │       ├── prisma/         # Prisma Service ✅
│   │       ├── app.module.ts   # 主模块 ✅
│   │       └── main.ts         # 入口 ✅
│   ├── agent/                  # Go Agent ✅
│   │   ├── cmd/agent/          # 主入口
│   │   ├── internal/
│   │   │   ├── config/         # 配置解析
│   │   │   ├── client/         # Panel API Client
│   │   │   ├── xray/           # Xray 配置生成 & 进程管理
│   │   │   ├── reporter/       # 状态收集
│   │   │   └── manager/        # 主控制器
│   │   └── pkg/types/          # 共享类型
│   └── web/                    # React 前端 ⏳
├── packages/
│   └── shared/                 # 共享类型/工具 ✅
├── docs/
│   └── tasks.md                # 本文件
├── docker-compose.yml          # Docker 配置
├── turbo.json                  # Turborepo 配置 ✅
└── package.json                # 根配置 ✅
```
