# Panel 快速开始指南

5 分钟在 Dokploy 上部署 Panel 系统。

## 前提条件

- Dokploy 已安装
- 域名已解析到服务器

## 步骤 1: 创建数据库

在 Dokploy 中创建：
- **PostgreSQL 16** → 命名 `panel-postgres`
- **Redis 7** → 命名 `panel-redis`

## 步骤 2: 部署 API

1. 创建 Application → Git Repository
2. 配置：
   - Build Path: `Panel`
   - Dockerfile: `apps/api/Dockerfile`
3. 环境变量：

```env
DATABASE_URL=postgresql://postgres:密码@panel-postgres:5432/panel
REDIS_URL=redis://panel-redis:6379
JWT_SECRET=运行openssl_rand_-hex_32生成
NODE_ENV=production
```

4. 域名：`api.yourdomain.com` + HTTPS
5. Deploy

## 步骤 3: 初始化数据库

进入 API 容器终端：
```bash
npx prisma migrate deploy
```

## 步骤 4: 部署 Web

1. 创建 Application → Git Repository
2. 配置：
   - Build Path: `Panel`
   - Dockerfile: `apps/web/Dockerfile`
3. 环境变量：
```env
VITE_API_URL=https://api.yourdomain.com
```
4. 域名：`panel.yourdomain.com` + HTTPS
5. Deploy

## 步骤 5: 添加节点

在代理服务器上执行：
```bash
curl -fsSL https://api.yourdomain.com/api/install/agent.sh | bash -s -- \
  --panel-url https://api.yourdomain.com \
  --node-key <从Panel后台获取>
```

## 验证

```bash
curl https://api.yourdomain.com/api/health
# {"status":"ok"}
```

## 下一步

- [完整部署文档](./DEPLOYMENT.md)
- [API 文档](./API.md)
- [GoSea 配置](./GOSEA.md)
