# GoSea 插件配置指南

GoSea 是 Panel 的代理业务层插件，提供完整的代理销售和管理功能。

## 目录

1. [架构概述](#架构概述)
2. [节点类型配置](#节点类型配置)
3. [批量生成代理](#批量生成代理)
4. [订阅管理](#订阅管理)
5. [与 ipipdcn API 兼容](#与-ipipdcn-api-兼容)

---

## 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                     GoSea 业务层                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Socks5 Pool│  │ Relay Pool  │  │ Subscription│          │
│  │   (库存)    │  │  (中转)     │  │   (订阅)    │          │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘          │
│         │                │                                   │
│  ┌──────┴────────────────┴──────┐                           │
│  │         Panel Core           │                           │
│  │  (Node/Inbound/Outbound)     │                           │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **Socks5 Pool** | 原始 Socks5 代理库存池 |
| **Relay Endpoint** | 中转节点，将 VLESS/VMess 转发到 Socks5 |
| **Allocation** | 分配记录，关联用户订单和代理 |
| **Subscription** | 订阅链接，支持多种客户端格式 |

---

## 节点类型配置

### 1. Socks5 节点

直接提供 Socks5 代理的节点。

**创建节点**:
```bash
curl -X POST https://api.panel.yourdomain.com/api/nodes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "US-Socks5-01",
    "nodeType": "socks5",
    "countryCode": "US",
    "city": "Los Angeles"
  }'
```

**批量导入 Socks5 代理**:
```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/socks5/batch-generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "<node-uuid>",
    "count": 100,
    "ingressEqualsEgress": true,
    "portMode": "range",
    "portRange": {"min": 10000, "max": 10100},
    "oversellCount": 1,
    "dryRun": false
  }'
```

### 2. Relay 节点

中转节点，将 VLESS/VMess 流量转发到后端 Socks5。

**创建节点**:
```bash
curl -X POST https://api.panel.yourdomain.com/api/nodes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HK-Relay-01",
    "nodeType": "relay",
    "countryCode": "HK",
    "city": "Hong Kong"
  }'
```

**批量生成 Relay 代理**:
```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/relay/batch-generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "relayNodeId": "<relay-node-uuid>",
    "protocol": "vless",
    "socks5List": [
      {"ip": "1.2.3.4", "port": 1080, "username": "u1", "password": "p1", "remark": "US-01"},
      {"ip": "1.2.3.5", "port": 1080, "username": "u2", "password": "p2", "remark": "US-02"}
    ],
    "portMode": "range",
    "portRange": {"min": 20000, "max": 20100}
  }'
```

**自动从 Socks5 节点生成 Relay**:
```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/relay/batch-generate-auto \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "relayNodeId": "<relay-node-uuid>",
    "socks5NodeIds": ["<socks5-node-1>", "<socks5-node-2>"],
    "protocol": "vless",
    "portMode": "range",
    "portRange": {"min": 20000, "max": 20100}
  }'
```

---

## 批量生成代理

### Socks5 批量生成参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nodeId | string | ✅ | 目标节点 ID |
| count | number | ✅ | 生成数量 |
| ingressEqualsEgress | boolean | ❌ | 入口IP=出口IP |
| portMode | string | ✅ | `range` 或 `list` |
| portRange | object | 条件 | `{min, max}` |
| portList | number[] | 条件 | 端口列表 |
| oversellCount | number | ❌ | 超卖倍数（默认1） |
| expiresAt | string | ❌ | 过期时间 |
| dryRun | boolean | ❌ | 预览模式 |

### Relay 批量生成参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| relayNodeId | string | ✅ | 中转节点 ID |
| protocol | string | ✅ | `vless`/`vmess`/`trojan`/`shadowsocks` |
| socks5List | array | ✅ | Socks5 列表 |
| portMode | string | ✅ | `range`/`list`/`shared` |
| sharedPort | number | 条件 | 共享端口（单端口多出口） |
| ingressIp | string | ❌ | 自定义入口 IP |
| dryRun | boolean | ❌ | 预览模式 |

### 预览模式

设置 `dryRun: true` 可预览生成结果而不实际创建：

```bash
curl -X POST .../batch-generate \
  -d '{"...", "dryRun": true}'
```

响应：
```json
{
  "preview": [...],
  "totalCount": 100,
  "created": false
}
```

---

## 订阅管理

### 生成订阅链接

```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/subscription/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "user-123",
    "relayIds": ["relay-uuid-1", "relay-uuid-2"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

响应：
```json
{
  "token": "abc123...",
  "subscriptionUrl": "/plugins/gosea/subscription/abc123..."
}
```

### 获取订阅内容

支持多种格式：

```bash
# Clash 格式（默认）
curl https://api.panel.yourdomain.com/api/plugins/gosea/subscription/<token>

# V2Ray/Shadowrocket 格式
curl https://api.panel.yourdomain.com/api/plugins/gosea/subscription/<token>?format=v2ray

# Sing-box 格式
curl https://api.panel.yourdomain.com/api/plugins/gosea/subscription/<token>?format=singbox

# 纯链接格式
curl https://api.panel.yourdomain.com/api/plugins/gosea/subscription/<token>?format=link

# JSON 格式
curl https://api.panel.yourdomain.com/api/plugins/gosea/subscription/<token>?format=json
```

---

## 与 ipipdcn API 兼容

GoSea 提供与 ipipdcn API 兼容的接口，方便迁移。

### 对照表

| ipipdcn API | GoSea API |
|-------------|-----------|
| POST /proxy/search | POST /plugins/gosea/instances |
| POST /proxy/change-ip | POST /plugins/gosea/instances/change-ip |
| POST /proxy/renew | POST /plugins/gosea/instances/renew |
| GET /location/list | GET /plugins/gosea/locations |
| POST /line/search | POST /plugins/gosea/lines |
| GET /account/info | GET /plugins/gosea/account |

### 实例搜索

```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/instances \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": 1,
    "countryCode": "US",
    "current": 0,
    "size": 20
  }'
```

响应格式与 ipipdcn 兼容：
```json
{
  "success": true,
  "code": "SUCCESS",
  "data": {
    "records": [
      {
        "proxyId": "uuid",
        "host": "1.2.3.4",
        "ip": "1.2.3.4",
        "port": 1080,
        "username": "user",
        "password": "********",
        "protocol": "socks5",
        "status": 1,
        "countryCode": "US",
        "countryName": "United States",
        "cityCode": "LAX",
        "cityName": "Los Angeles"
      }
    ],
    "total": 100,
    "current": 0,
    "size": 20
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 批量换 IP

```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/instances/change-ip \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proxyIds": ["uuid1", "uuid2"],
    "remark": "Batch change"
  }'
```

### 批量续费

```bash
curl -X POST https://api.panel.yourdomain.com/api/plugins/gosea/instances/renew \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proxyIds": ["uuid1", "uuid2"],
    "days": 30
  }'
```

---

## 最佳实践

### 1. 节点规划

```
推荐架构：
- 2-3 个 Socks5 节点（不同地区）
- 1-2 个 Relay 节点（低延迟地区如 HK/SG）
- Relay 节点负责协议转换和流量聚合
```

### 2. 端口规划

```
Socks5 节点：10000-19999
Relay 节点：20000-29999
预留端口：30000+
```

### 3. 超卖策略

```
住宅代理：oversellCount = 1（不超卖）
数据中心代理：oversellCount = 3-5（适度超卖）
```

### 4. 监控告警

- 监控节点在线状态
- 监控代理可用率
- 监控流量使用情况
- 设置过期提醒
