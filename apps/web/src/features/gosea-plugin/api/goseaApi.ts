import { apiClient } from '@/shared/api/apiClient';

// ==================== Types ====================

export interface Socks5Proxy {
  id: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  countryCode: string;
  cityCode?: string;
  ispType?: string;
  status: string;
  maxAllocations: number;
  currentAllocations: number;
  source?: string;
  sourceProxyId?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AddProxyRequest {
  ip: string;
  port: number;
  username: string;
  password: string;
  countryCode: string;
  cityCode?: string;
  ispType?: string;
  maxAllocations?: number;
  expiresAt?: string;
  source?: string;
  sourceProxyId?: string;
}

export interface AddToPoolRequest {
  proxies: AddProxyRequest[];
}

export interface InventoryItem {
  countryCode: string;
  cityCode?: string;
  total: number;
  available: number;
  allocated: number;
}

export interface Allocation {
  id: string;
  poolEntryId: string;
  externalOrderId: string;
  externalUserId: string;
  status: string;
  allocatedAt: string;
  expiresAt: string;
  releasedAt?: string;
  poolEntry?: Socks5Proxy;
}

export interface AllocateRequest {
  externalOrderId: string;
  externalUserId: string;
  countryCode: string;
  cityCode?: string;
  quantity: number;
  days: number;
}

export interface ReleaseRequest {
  allocationIds: string[];
}

export interface Relay {
  id: string;
  externalOrderId: string;
  externalUserId: string;
  allocationId?: string;
  nodeId: string;
  inboundId: string;
  protocol: string;
  listenPort: number;
  targetIp: string;
  targetPort: number;
  targetUsername: string;
  targetPassword: string;
  status: string;
  connectionInfo: {
    host: string;
    port: number;
    uuid?: string;
    password?: string;
    method?: string;
  };
  createdAt: string;
  node?: { name: string; countryCode: string };
}

export interface CreateRelayRequest {
  externalOrderId: string;
  externalUserId: string;
  allocationId?: string;
  targetSocks5?: {
    ip: string;
    port: number;
    username: string;
    password: string;
  };
  protocol?: 'vless' | 'shadowsocks';
  preferredRegion?: string;
}

export interface UpdateRelayRequest {
  status?: 'active' | 'suspended';
}

// Single Port Multi-Egress Types
export interface SinglePortMultiEgressRequest {
  nodeId: string;
  port: number;
  egressIps: string[];
  countPerIp: number;
  expiresAt?: string;
  dryRun?: boolean;
}

export interface SinglePortMultiEgressPreviewItem {
  username: string;
  password: string;
  egressIp: string;
  proxyUrl: string;
}

export interface SinglePortMultiEgressResponse {
  preview: SinglePortMultiEgressPreviewItem[];
  totalCount: number;
  inboundTag?: string;
  created?: boolean;
}

// ==================== API ====================

export const goseaApi = {
  // Pool Management
  getPool: (status?: string, countryCode?: string) =>
    apiClient.get<Socks5Proxy[]>('/plugins/gosea/pool', { params: { status, countryCode } }).then(r => r.data),

  addToPool: (data: AddToPoolRequest) =>
    apiClient.post<{ added: number }>('/plugins/gosea/pool', data).then(r => r.data),

  deleteFromPool: (id: string) =>
    apiClient.delete(`/plugins/gosea/pool/${id}`).then(r => r.data),

  // Inventory
  getInventory: () =>
    apiClient.get<InventoryItem[]>('/plugins/gosea/inventory').then(r => r.data),

  // Allocations
  getAllocations: (status?: string, externalOrderId?: string) =>
    apiClient.get<Allocation[]>('/plugins/gosea/allocations', { params: { status, externalOrderId } }).then(r => r.data),

  allocate: (data: AllocateRequest) =>
    apiClient.post<Allocation[]>('/plugins/gosea/allocate', data).then(r => r.data),

  release: (data: ReleaseRequest) =>
    apiClient.post<{ released: number }>('/plugins/gosea/release', data).then(r => r.data),

  // Relay Management
  getRelays: (status?: string, externalOrderId?: string) =>
    apiClient.get<Relay[]>('/plugins/gosea/relay', { params: { status, externalOrderId } }).then(r => r.data),

  getRelay: (id: string) =>
    apiClient.get<Relay>(`/plugins/gosea/relay/${id}`).then(r => r.data),

  createRelay: (data: CreateRelayRequest) =>
    apiClient.post<Relay>('/plugins/gosea/relay', data).then(r => r.data),

  updateRelay: (id: string, data: UpdateRelayRequest) =>
    apiClient.put<Relay>(`/plugins/gosea/relay/${id}`, data).then(r => r.data),

  deleteRelay: (id: string) =>
    apiClient.delete(`/plugins/gosea/relay/${id}`).then(r => r.data),

  // Single Port Multi-Egress
  generateSinglePortMultiEgress: (data: SinglePortMultiEgressRequest) =>
    apiClient.post<SinglePortMultiEgressResponse>('/plugins/gosea/single-port-multi-egress', data).then(r => r.data),

  // Export
  exportProxies: (nodeId: string, format: 'txt' | 'csv' | 'json' = 'txt') =>
    apiClient.get<string>('/plugins/gosea/export', { 
      params: { nodeId, format },
      responseType: 'text',
    }).then(r => r.data),
};
