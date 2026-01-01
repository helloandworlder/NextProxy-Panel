# Panel 部署指南

本文档介绍如何在 Dokploy 上部署 Panel 系统。

## 目录

1. [系统架构](#系统架构)
2. [前置要求](#前置要求)
3. [Dokploy 部署步骤](#dokploy-部署步骤)
4. [环境变量配置](#环境变量配置)
5. [Agent 节点部署](#agent-节点部署)
6. [验证部署](#验证部署)
7. [常见问题](#常见问题)

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Dokploy Server                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Panel API  │  │  Panel Web  │  │   Traefik   │          │
│  │   (NestJS)  │  │   (React)   │  │   (Proxy)   │          │
│  └──────┬──────┘  └─────────────┘  └─────────────┘          │
│         │                                                    │
│  ┌──────┴──────┐  ┌─────────────┐                           │
│  │  PostgreSQL │  │    Redis    │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │   Agent 1   │ │   Agent 2   │ │   Agent N   │
    │  (Socks5)   │ │   (Relay)   │ │   (Edge)    │
    │   + Xray    │ │   + Xray    │ │   + Xray    │
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 前置要求

### 服务器要求

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| Panel Server | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| Agent Node | 1 vCPU, 1GB RAM | 2 vCPU, 2GB RAM |
| 磁盘空间 | 20GB SSD | 50GB SSD |

### 软件要求

- Dokploy 已安装并运行
- 域名已解析到服务器 IP
- SSL 证书（Dokploy 自动管理）

---

## Dokploy 部署步骤

### 步骤 1: 创建项目

1. 登录 Dokploy 控制台
2. 点击 **Create Project** → 输入项目名 `panel`
3. 进入项目

### 步骤 2: 部署 PostgreSQL

1. 点击 **+ Create Service** → **Database** → **PostgreSQL**
2. 配置：
   - Name: `panel-postgres`
   - Version: `16-alpine`
   - Database Name: `panel`
   - Username: `postgres`
   - Password: `<生成强密码>`
3. 点击 **Deploy**
4. 记录内部连接地址：`postgresql://postgres:<password>@panel-postgres:5432/panel`

### 步骤 3: 部署 Redis

1. 点击 **+ Create Service** → **Database** → **Redis**
2. 配置：
   - Name: `panel-redis`
   - Version: `7-alpine`
3. 点击 **Deploy**
4. 记录内部连接地址：`redis://panel-redis:6379`

### 步骤 4: 部署 Panel API

1. 点击 **+ Create Service** → **Application**
2. 选择 **Git Repository**
3. 配置：
   - Name: `panel-api`
   - Repository: `<你的 Git 仓库 URL>`
   - Branch: `main`
   - Build Path: `Panel`
   - Dockerfile Path: `apps/api/Dockerfile`

4. 环境变量（在 Environment 标签页添加）：

```env
# 数据库（使用步骤2的连接地址）
DATABASE_URL=postgresql://postgres:<password>@panel-postgres:5432/panel

# Redis（使用步骤3的连接地址）
REDIS_URL=redis://panel-redis:6379

# 安全配置（必须修改！）
JWT_SECRET=<运行: openssl rand -hex 32>
JWT_EXPIRES_IN=7d

# API 配置
API_PORT=3000
API_PREFIX=api
NODE_ENV=production
LOG_LEVEL=info

# CORS（填写你的前端域名）
CORS_ORIGIN=https://panel.yourdomain.com
```

5. 端口配置：
   - Container Port: `3000`
   - 勾选 **Expose Port**

6. 域名配置：
   - 添加域名：`api.panel.yourdomain.com`
   - 启用 HTTPS

7. 点击 **Deploy**

### 步骤 5: 部署 Panel Web

1. 点击 **+ Create Service** → **Application**
2. 配置：
   - Name: `panel-web`
   - Repository: `<你的 Git 仓库 URL>`
   - Branch: `main`
   - Build Path: `Panel`
   - Dockerfile Path: `apps/web/Dockerfile`

3. 环境变量：

```env
VITE_API_URL=https://api.panel.yourdomain.com
```

4. 端口配置：
   - Container Port: `80`

5. 域名配置：
   - 添加域名：`panel.yourdomain.com`
   - 启用 HTTPS

6. 点击 **Deploy**

### 步骤 6: 初始化数据库

部署完成后，进入 `panel-api` 服务：

1. 点击 **Terminal** 标签
2. 执行数据库迁移：

```bash
npx prisma migrate deploy
```

3. 创建初始管理员（可选）：

```bash
npx prisma db seed
```

---

## 环境变量配置

### Panel API 完整配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `REDIS_URL` | ✅ | - | Redis 连接字符串 |
| `JWT_SECRET` | ✅ | - | JWT 签名密钥（至少32字符） |
| `JWT_EXPIRES_IN` | ❌ | `7d` | Token 过期时间 |
| `API_PORT` | ❌ | `3000` | API 监听端口 |
| `API_PREFIX` | ❌ | `api` | API 路径前缀 |
| `NODE_ENV` | ❌ | `development` | 运行环境 |
| `LOG_LEVEL` | ❌ | `info` | 日志级别 |
| `CORS_ORIGIN` | ❌ | `*` | 允许的跨域来源 |

### 生成安全密钥

```bash
# JWT Secret
openssl rand -hex 32

# 示例输出
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## Agent 节点部署

Agent 是运行在代理节点上的守护进程，负责管理 Xray 配置。

### 方式一：一键安装脚本

在每个代理节点服务器上执行：

```bash
curl -fsSL https://api.panel.yourdomain.com/api/install/agent.sh | bash -s -- \
  --panel-url https://api.panel.yourdomain.com \
  --node-key <从Panel后台获取的节点密钥>
```

### 方式二：手动安装

1. 下载 Agent 二进制文件：

```bash
# Linux AMD64
wget https://github.com/your-repo/releases/latest/download/agent-linux-amd64 -O /usr/local/bin/agent
chmod +x /usr/local/bin/agent

# Linux ARM64
wget https://github.com/your-repo/releases/latest/download/agent-linux-arm64 -O /usr/local/bin/agent
chmod +x /usr/local/bin/agent
```

2. 创建配置文件 `/etc/panel-agent/config.yaml`：

```yaml
panel:
  url: "https://api.panel.yourdomain.com"
  apiPath: "/api/agent"

node:
  key: "<从Panel后台获取>"

xray:
  binaryPath: "/usr/local/bin/xray"
  configPath: "/etc/xray/config.json"
  assetPath: "/usr/local/share/xray"

log:
  level: "info"
  file: "/var/log/panel-agent/agent.log"
```

3. 创建 Systemd 服务 `/etc/systemd/system/panel-agent.service`：

```ini
[Unit]
Description=Panel Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/agent -c /etc/panel-agent/config.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

4. 启动服务：

```bash
systemctl daemon-reload
systemctl enable panel-agent
systemctl start panel-agent
```

### 获取节点密钥

1. 登录 Panel Web 控制台
2. 进入 **节点管理** → **添加节点**
3. 填写节点信息，点击创建
4. 复制生成的 **Node Key**

---

## 验证部署

### 1. 检查 API 健康状态

```bash
curl https://api.panel.yourdomain.com/api/health
# 期望输出: {"status":"ok","timestamp":"..."}
```

### 2. 检查数据库连接

```bash
curl https://api.panel.yourdomain.com/api/ready
# 期望输出: {"status":"ok","checks":{"database":{"status":"ok"},"redis":{"status":"ok"}}}
```

### 3. 检查 Agent 连接

在 Agent 节点上：

```bash
systemctl status panel-agent
journalctl -u panel-agent -f
```

在 Panel Web 控制台查看节点状态应为 **在线**。

### 4. 测试代理功能

```bash
# 测试 Socks5 代理
curl -x socks5://user:pass@node-ip:port https://api.ipify.org

# 测试 VLESS 代理（使用客户端）
# 导入订阅链接或手动配置
```

---

## 常见问题

### Q: 数据库迁移失败

```bash
# 检查数据库连接
npx prisma db pull

# 重置数据库（危险！会删除所有数据）
npx prisma migrate reset
```

### Q: Agent 无法连接 Panel

1. 检查网络连通性：
```bash
curl -v https://api.panel.yourdomain.com/api/health
```

2. 检查 Node Key 是否正确

3. 检查防火墙规则

### Q: Redis 连接超时

确保 Redis 服务正常运行，且内部网络可达：
```bash
redis-cli -h panel-redis ping
```

### Q: 如何备份数据

```bash
# 备份 PostgreSQL
pg_dump -h panel-postgres -U postgres panel > backup.sql

# 恢复
psql -h panel-postgres -U postgres panel < backup.sql
```

### Q: 如何更新部署

在 Dokploy 中：
1. 进入对应服务
2. 点击 **Redeploy**
3. 或配置 Webhook 自动部署

---

## 下一步

- [API 文档](./API.md) - 完整的 API 接口文档
- [GoSea 插件指南](./GOSEA.md) - GoSea 代理业务配置
- [监控配置](./MONITORING.md) - Prometheus + Grafana 集成
