# Panel API 文档

## 概述

Panel API 是一个基于 NestJS 的代理节点管理系统，提供完整的 RESTful API。

- **Base URL**: `https://api.panel.yourdomain.com/api`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`

---

## 认证

### 登录获取 Token

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

**响应**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "tenantId": "uuid"
  }
}
```

### 使用 Token

所有需要认证的接口，在请求头添加：
```http
Authorization: Bearer <accessToken>
```

---

## 健康检查

### GET /health
基础健康检查，返回 API 运行状态。

```bash
curl https://api.panel.yourdomain.com/api/health
```

**响应**: `{"status":"ok","timestamp":"2025-01-01T00:00:00.000Z"}`

### GET /ready
就绪检查，验证数据库和 Redis 连接。

### GET /live
存活检查，用于 K8s 探针。

---

## 节点管理

### GET /nodes
获取所有节点列表。

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 过滤状态: online, offline, pending |
| nodeType | string | 节点类型: socks5, relay, edge |

**响应**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "US-Node-01",
      "publicIp": "1.2.3.4",
      "nodeType": "socks5",
      "status": "online",
      "countryCode": "US",
      "lastSeenAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 10
}
```

### POST /nodes
创建新节点。

**请求体**:
```json
{
  "name": "US-Node-01",
  "nodeType": "socks5",
  "countryCode": "US",
  "city": "Los Angeles",
  "remark": "Primary US node"
}
```

**响应**: 返回创建的节点信息，包含 `token`（Node Key）。

### GET /nodes/:id
获取单个节点详情。

### PATCH /nodes/:id
更新节点信息。

### DELETE /nodes/:id
删除节点。

### POST /nodes/:id/sync
手动触发节点配置同步，清除缓存。

```bash
curl -X POST https://api.panel.yourdomain.com/api/nodes/{id}/sync \
  -H "Authorization: Bearer <token>"
```

---

## 客户端管理

### GET /clients
获取所有客户端（用户）列表。

### POST /clients
创建新客户端。

**请求体**:
```json
{
  "email": "user@example.com",
  "totalBytes": 107374182400,
  "expiryTime": "2025-12-31T23:59:59.000Z",
  "inboundTags": ["vless-tcp", "vmess-ws"]
}
```

### POST /clients/bulk
批量创建客户端。

**请求体**:
```json
{
  "count": 10,
  "prefix": "user",
  "totalBytes": 107374182400,
  "expiryDays": 30,
  "inboundTags": ["vless-tcp"]
}
```

### GET /clients/:id
获取客户端详情。

### PATCH /clients/:id
更新客户端。

### DELETE /clients/:id
删除客户端。

### POST /clients/:id/reset-traffic
重置客户端流量。

---

## Inbound 管理

### GET /inbounds
获取所有入站配置。

### POST /inbounds
创建入站配置。

**请求体示例 (VLESS)**:
```json
{
  "tag": "vless-tcp-8443",
  "protocol": "vless",
  "port": 8443,
  "settings": {
    "decryption": "none"
  },
  "streamSettings": {
    "network": "tcp",
    "security": "reality",
    "realitySettings": {
      "dest": "www.microsoft.com:443",
      "serverNames": ["www.microsoft.com"],
      "privateKey": "...",
      "shortIds": [""]
    }
  }
}
```

### GET /inbounds/:id
获取入站详情。

### PATCH /inbounds/:id
更新入站配置。

### DELETE /inbounds/:id
删除入站配置。

---

## Outbound 管理

### GET /outbounds
获取所有出站配置。

### POST /outbounds
创建出站配置。

**请求体示例 (Socks5)**:
```json
{
  "tag": "socks5-us-01",
  "protocol": "socks",
  "settings": {
    "servers": [{
      "address": "1.2.3.4",
      "port": 1080,
      "users": [{
        "user": "username",
        "pass": "password"
      }]
    }]
  }
}
```

---

## 路由规则

### GET /routing
获取所有路由规则。

### POST /routing
创建路由规则。

**请求体**:
```json
{
  "tag": "route-us",
  "priority": 100,
  "ruleConfig": {
    "domain": ["geosite:google"],
    "outboundTag": "socks5-us-01"
  }
}
```

---

## Agent API

Agent 节点使用的内部 API。

### POST /agent/register
节点注册/心跳。

**请求头**: `X-Node-Token: <node-key>`

**请求体**:
```json
{
  "nodeKey": "node-key-here",
  "hostname": "us-node-01",
  "publicIp": "1.2.3.4",
  "xrayVersion": "1.8.0",
  "version": "1.0.0"
}
```

### GET /agent/config
获取节点 Xray 配置。

### POST /agent/status
上报节点状态。

### POST /agent/stats
上报流量统计。

---

## GoSea 插件 API

GoSea 是代理业务层插件，提供 ipipdcn 兼容 API。

### 位置查询

#### GET /plugins/gosea/locations
获取位置树（大洲 → 国家 → 城市）。

#### GET /plugins/gosea/locations/available
获取有库存的位置。

### 线路查询

#### POST /plugins/gosea/lines
搜索可用线路。

**请求体**:
```json
{
  "countryCode": "US",
  "cityCode": "LAX",
  "ispType": 0,
  "current": 0,
  "size": 20
}
```

### 实例管理

#### POST /plugins/gosea/instances
搜索实例。

**请求体**:
```json
{
  "status": 1,
  "countryCode": "US",
  "current": 0,
  "size": 20
}
```

#### POST /plugins/gosea/instances/change-ip
批量更换 IP。

#### POST /plugins/gosea/instances/renew
批量续费。

#### POST /plugins/gosea/instances/update-credentials
批量更新凭证。

### 批量生成

#### POST /plugins/gosea/socks5/batch-generate
批量生成 Socks5 代理。

**请求体**:
```json
{
  "nodeId": "uuid",
  "count": 10,
  "ingressEqualsEgress": true,
  "portMode": "range",
  "portRange": { "min": 10000, "max": 10100 },
  "oversellCount": 1,
  "dryRun": false
}
```

#### POST /plugins/gosea/relay/batch-generate
批量生成 Relay 代理。

**请求体**:
```json
{
  "relayNodeId": "uuid",
  "protocol": "vless",
  "socks5List": [
    { "ip": "1.2.3.4", "port": 1080, "username": "u1", "password": "p1" }
  ],
  "portMode": "range",
  "portRange": { "min": 20000, "max": 20100 },
  "dryRun": false
}
```

#### POST /plugins/gosea/relay/batch-generate-auto
从 Socks5 节点自动生成 Relay。

**请求体**:
```json
{
  "relayNodeId": "uuid",
  "socks5NodeIds": ["uuid1", "uuid2"],
  "protocol": "vless",
  "portMode": "range",
  "portRange": { "min": 20000, "max": 20100 }
}
```

### 订阅

#### POST /plugins/gosea/subscription/generate
生成订阅链接。

#### GET /plugins/gosea/subscription/:token
获取订阅内容（支持 clash/v2ray/singbox 格式）。

### 账户

#### GET /plugins/gosea/account
获取账户信息和统计。

---

## 统计 API

### GET /stats/overview
获取系统概览统计。

### GET /stats/nodes/:id
获取节点统计。

### GET /stats/traffic
获取流量统计。

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| nodeId | string | 节点 ID |
| startTime | string | 开始时间 ISO8601 |
| endTime | string | 结束时间 ISO8601 |
| granularity | string | 粒度: minute, hour, day |

---

## 错误响应

所有错误响应格式：

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

---

## 速率限制

API 有三层速率限制：

| 层级 | 限制 | 窗口 |
|------|------|------|
| Short | 10 请求 | 1 秒 |
| Medium | 100 请求 | 1 分钟 |
| Long | 1000 请求 | 1 小时 |

响应头包含限制信息：
```
X-RateLimit-Limit-Short: 10
X-RateLimit-Remaining-Short: 9
X-RateLimit-Reset-Short: 1
```

---

## Swagger 文档

完整的交互式 API 文档可在以下地址访问：

```
https://api.panel.yourdomain.com/api/docs
```
