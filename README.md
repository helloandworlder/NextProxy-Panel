# Panel - Proxy Node Management Platform

A universal proxy node management platform, similar to an enhanced 3x-ui.

## Documentation

- **[Quick Start](./docs/QUICKSTART.md)** - 5 分钟部署指南
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - 完整 Dokploy 部署文档
- **[API Reference](./docs/API.md)** - REST API 接口文档
- **[GoSea Plugin](./docs/GOSEA.md)** - 代理业务层配置

## Tech Stack

- **Runtime**: Node.js + pnpm
- **Backend**: NestJS + Prisma + PostgreSQL
- **Cache/Queue**: Redis + BullMQ
- **Auth**: JWT + API Key
- **Frontend**: React 19 + Ant Design (TODO)

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup database
cp apps/api/.env.example apps/api/.env
# Edit .env with your database credentials

# Generate Prisma client
pnpm db:generate

# Push schema to database (requires PostgreSQL running)
pnpm db:push

# Start development server
pnpm dev
```

## Project Structure

```
Panel/
├── apps/
│   └── api/           # NestJS Backend API
├── packages/
│   └── shared/        # Shared TypeScript types
└── turbo.json         # Turborepo config
```

## API Documentation

When running in development mode, Swagger docs are available at:
`http://localhost:3000/docs`

## API Endpoints

### Management API (JWT Auth)
- `POST /api/v1/auth/login` - Login
- `GET/POST/PUT/DELETE /api/v1/tenants` - Tenant management
- `GET/POST/PUT/DELETE /api/v1/nodes` - Node management
- `GET/POST/PUT/DELETE /api/v1/inbounds` - Inbound config
- `GET/POST/PUT/DELETE /api/v1/outbounds` - Outbound config
- `GET/POST/PUT/DELETE /api/v1/routing-rules` - Routing rules
- `GET/POST/PUT/DELETE /api/v1/clients` - Client management
- `GET /api/v1/stats/overview` - Statistics

### Agent API (Node Token Auth)
- `GET /api/v1/agent/config` - Pull node config (with ETag caching)
- `GET /api/v1/agent/users` - Pull valid users list
- `POST /api/v1/agent/traffic` - Report traffic stats
- `POST /api/v1/agent/status` - Report node status
- `POST /api/v1/agent/alive` - Report online users
- `POST /api/v1/agent/egress-ips` - Report egress IPs
- `POST /api/v1/agent/register` - Register node
