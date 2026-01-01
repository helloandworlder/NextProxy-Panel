// User types
export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: 'admin' | 'operator' | 'readonly';
  isDefault: boolean;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  currentTenant: TenantInfo;
  tenants: TenantInfo[];
}

export interface SwitchTenantRequest {
  tenantId: string;
}

export interface SwitchTenantResponse {
  accessToken: string;
  currentTenant: TenantInfo;
}

// Node types
export interface Node {
  id: string;
  tenantId: string;
  nodeGroupId?: string;
  name: string;
  token: string;
  publicIp?: string;
  grpcPort: number;
  countryCode?: string;
  countryName?: string;
  city?: string;
  isp?: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeenAt?: string;
  systemInfo: Record<string, unknown>;
  runtimeStats: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    onlineUsers?: number;
    uptimeSeconds?: number;
  };
  configOverrides: Record<string, unknown>;
  tags: string[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
  nodeGroup?: NodeGroup;
  egressIps?: EgressIp[];
}

export interface NodeGroup {
  id: string;
  tenantId: string;
  name: string;
  lbStrategy: string;
  lbSettings: Record<string, unknown>;
  healthCheck: Record<string, unknown>;
  remark?: string;
}

export interface EgressIp {
  id: string;
  nodeId: string;
  ip: string;
  ipVersion: number;
  interfaceName?: string;
  ipType: 'datacenter' | 'residential' | 'mobile';
  isp?: string;
  asn?: string;
  isActive: boolean;
  currentUsers: number;
  maxUsers: number;
}

export interface CreateNodeRequest {
  name: string;
  nodeGroupId?: string;
  countryCode?: string;
  countryName?: string;
  city?: string;
  isp?: string;
  tags?: string[];
  remark?: string;
}

export interface UpdateNodeRequest extends Partial<CreateNodeRequest> {
  status?: 'online' | 'offline' | 'maintenance';
  configOverrides?: Record<string, unknown>;
}

// Client types (v3 schema - 3x-ui style)
export interface Client {
  id: string;
  tenantId: string;
  email: string;
  uuid?: string;
  password?: string;
  flow?: string;
  method?: string;
  level: number;
  totalBytes: number;
  usedBytes: number;
  expiryTime: number;
  uploadLimit: number;
  downloadLimit: number;
  deviceLimit: number;
  // 3x-ui style fields
  limitIp: number;
  reset: number;
  delayedStart: boolean;
  tgId?: string;
  comment?: string;
  firstConnectAt?: string;
  // v3: tag-based routing instead of ID references
  inboundTags: string[];
  outboundTag?: string;
  subId?: string;
  remark?: string;
  enable: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Runtime stats (from ClientStats)
  stats?: ClientStats[];
}

export interface ClientStats {
  id: string;
  clientId: string;
  nodeId: string;
  inboundId: string;
  up: number;
  down: number;
  recordedAt: string;
}

export interface CreateClientRequest {
  email: string;
  uuid?: string;
  password?: string;
  flow?: string;
  method?: string;
  level?: number;
  totalBytes?: number;
  expiryTime?: number;
  uploadLimit?: number;
  downloadLimit?: number;
  deviceLimit?: number;
  // 3x-ui style fields
  limitIp?: number;
  reset?: number;
  delayedStart?: boolean;
  tgId?: string;
  comment?: string;
  // v3: tag-based
  inboundTags?: string[];
  outboundTag?: string;
  remark?: string;
  enable?: boolean;
}

export type UpdateClientRequest = Partial<CreateClientRequest>;

// Stats types
export interface StatsOverview {
  totalNodes: number;
  onlineNodes: number;
  totalClients: number;
  activeClients: number;
  totalTrafficToday: number;
  totalTrafficMonth: number;
}

export interface NodeStats {
  onlineUsers: number;
  trafficToday: number;
  trafficMonth: number;
  topClients: { email: string; traffic: number }[];
}

// Real-time node status (3x-ui style)
export interface NodeRuntimeStatus {
  nodeId: string;
  status: 'online' | 'offline' | 'maintenance';
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  xrayVersion?: string;
  xrayState: 'running' | 'stopped' | 'error';
  onlineUsers: number;
  tcpConnections: number;
  udpConnections: number;
  networkUp: number;  // bytes/s
  networkDown: number;  // bytes/s
  totalSent: number;
  totalReceived: number;
  lastUpdated: string;
}

// Traffic types
export interface TrafficRecord {
  id: string;
  clientId: string;
  nodeId: string;
  inboundId?: string;
  upload: number;
  download: number;
  recordedAt: string;
}
