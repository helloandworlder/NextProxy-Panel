// Redis key prefixes and constants

export const REDIS_KEYS = {
  // ETag caching for Agent API
  CONFIG_ETAG: 'config:etag:',      // config:etag:{nodeId}
  USERS_ETAG: 'users:etag:',        // users:etag:{nodeId}
  
  // Node real-time status (CPU/memory/disk/online users)
  NODE_STATUS: 'node:status:',      // node:status:{nodeId}
  
  // Node real-time traffic stats
  NODE_TRAFFIC: 'node:traffic:',    // node:traffic:{nodeId}
  
  // Online users tracking
  ONLINE_USERS: 'online:',          // online:{nodeId} (ZSET: score=timestamp, member=email)
  DEVICE_ONLINE: 'device:',         // device:{clientId} (SET: ip:deviceId)
  
  // Traffic buffering
  TRAFFIC_BUFFER: 'traffic:buffer:', // traffic:buffer:{nodeId} (LIST)
  
  // Traffic counters (INCRBY atomic operations)
  TRAFFIC_NODE_UP: 'traffic:node:up:',       // traffic:node:up:{nodeId}
  TRAFFIC_NODE_DOWN: 'traffic:node:down:',   // traffic:node:down:{nodeId}
  TRAFFIC_INBOUND_UP: 'traffic:inbound:up:',     // traffic:inbound:up:{inboundId}
  TRAFFIC_INBOUND_DOWN: 'traffic:inbound:down:', // traffic:inbound:down:{inboundId}
  TRAFFIC_CLIENT_UP: 'traffic:client:up:',   // traffic:client:up:{email}
  TRAFFIC_CLIENT_DOWN: 'traffic:client:down:', // traffic:client:down:{email}
  
  // Bandwidth sliding window (ZSET: timestamp -> bytes)
  BANDWIDTH_NODE: 'bandwidth:node:',       // bandwidth:node:{nodeId}
  BANDWIDTH_INBOUND: 'bandwidth:inbound:', // bandwidth:inbound:{inboundId}
  BANDWIDTH_CLIENT: 'bandwidth:client:',   // bandwidth:client:{email}
} as const;

export const REDIS_TTL = {
  CONFIG_ETAG: 300,      // 5 minutes
  USERS_ETAG: 300,       // 5 minutes
  NODE_STATUS: 60,       // 1 minute
  NODE_TRAFFIC: 60,      // 1 minute
  ONLINE_TIMEOUT: 120,   // 2 minutes (consider offline if no heartbeat)
  TRAFFIC_COUNTER: 86400, // 24 hours (reset daily by cron)
  BANDWIDTH_WINDOW: 3600, // 1 hour sliding window
} as const;

export const QUEUE_NAMES = {
  TRAFFIC_AGGREGATION: 'traffic-aggregation',
  TRAFFIC_RESET: 'traffic-reset',
  NODE_HEALTH_CHECK: 'node-health-check',
  CLIENT_EXPIRY_CHECK: 'client-expiry-check',
  ONLINE_CLEANUP: 'online-cleanup',
  STATS_SNAPSHOT: 'stats-snapshot',
  TIMESERIES_AGGREGATION: 'timeseries-aggregation',
  TIMESERIES_CLEANUP: 'timeseries-cleanup',
} as const;
