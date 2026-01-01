# Panel Zeabur Deployment Guide

## 域名: panel.synex.im

## 部署架构

Panel 需要部署 4 个服务:
1. **PostgreSQL** - 数据库
2. **Redis** - 缓存/队列
3. **API** - 后端服务 (NestJS)
4. **Web** - 前端服务 (React)

---

## 步骤 1: 创建 Zeabur 项目

1. 登录 [Zeabur Dashboard](https://dash.zeabur.com)
2. 点击 "Create Project"
3. 选择区域 (推荐: Tokyo 或 Hong Kong)

---

## 步骤 2: 部署 PostgreSQL

1. 点击 "Add Service" → "Marketplace"
2. 搜索并选择 "PostgreSQL"
3. 部署后，记录连接信息:
   - `POSTGRES_HOST`
   - `POSTGRES_PORT`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

---

## 步骤 3: 部署 Redis

1. 点击 "Add Service" → "Marketplace"
2. 搜索并选择 "Redis"
3. 部署后，记录 `REDIS_URL`

---

## 步骤 4: 部署 API 服务

1. 点击 "Add Service" → "Git"
2. 选择你的 GitHub 仓库
3. **Root Directory**: `Panel/apps/api`
4. 配置环境变量:

```env
# Database (从 PostgreSQL 服务获取)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}

# Redis (从 Redis 服务获取)
REDIS_URL=${REDIS_URL}

# Security - 必须设置!
JWT_SECRET=<生成一个64字符的随机字符串>
JWT_EXPIRES_IN=7d

# API Config
API_PORT=3000
API_PREFIX=api/v1
NODE_ENV=production
LOG_LEVEL=info

# CORS - 设置为你的前端域名
CORS_ORIGIN=https://panel.synex.im

# Initial Admin (首次部署时设置)
SYSADMIN_USERNAME=sysadmin
SYSADMIN_PASSWORD=<设置强密码>
SYSADMIN_EMAIL=admin@synex.im
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<设置强密码>
ADMIN_EMAIL=admin@synex.im
```

5. 点击 "Deploy"

---

## 步骤 5: 部署 Web 服务

1. 点击 "Add Service" → "Git"
2. 选择同一个 GitHub 仓库
3. **Root Directory**: `Panel/apps/web`
4. 配置环境变量:

```env
VITE_API_URL=https://api.panel.synex.im
```

5. 点击 "Deploy"

---

## 步骤 6: 配置域名

### API 服务域名
1. 选择 API 服务 → "Networking"
2. 添加自定义域名: `api.panel.synex.im`
3. 按提示配置 DNS CNAME 记录

### Web 服务域名
1. 选择 Web 服务 → "Networking"
2. 添加自定义域名: `panel.synex.im`
3. 按提示配置 DNS CNAME 记录

---

## 步骤 7: 初始化数据库

API 服务首次启动会自动运行:
- `prisma migrate deploy` - 应用数据库迁移
- `prisma db seed` - 创建初始管理员账户

---

## DNS 配置示例

在你的 DNS 提供商添加以下记录:

| Type  | Name              | Value                          |
|-------|-------------------|--------------------------------|
| CNAME | panel.synex.im    | <zeabur-provided-domain>.zeabur.app |
| CNAME | api.panel.synex.im| <zeabur-provided-domain>.zeabur.app |

---

## 验证部署

1. 访问 `https://panel.synex.im` - 应显示登录页面
2. 访问 `https://api.panel.synex.im/api/v1/health` - 应返回健康状态
3. 使用设置的管理员账户登录

---

## 环境变量快速参考

### API 服务必需变量
| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `REDIS_URL` | Redis 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 (至少32字符) |
| `CORS_ORIGIN` | 允许的前端域名 |
| `SYSADMIN_PASSWORD` | 系统管理员密码 |
| `ADMIN_PASSWORD` | 租户管理员密码 |

### Web 服务必需变量
| 变量 | 说明 |
|------|------|
| `VITE_API_URL` | API 服务的完整 URL |

---

## 故障排除

### API 启动失败
- 检查 `DATABASE_URL` 格式是否正确
- 确认 PostgreSQL 服务已启动
- 查看 Zeabur 日志获取详细错误

### 数据库连接失败
- 确保使用 Zeabur 内部网络地址
- 检查 PostgreSQL 服务的连接凭据

### CORS 错误
- 确保 `CORS_ORIGIN` 包含前端域名
- 格式: `https://panel.synex.im` (不要尾部斜杠)
