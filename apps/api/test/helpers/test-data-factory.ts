/**
 * Test Data Factory - Centralized test data creation
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Tenant Test Data
// ============================================

export const createTestTenant = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  name: 'Test Tenant',
  slug: 'test-tenant',
  status: 'active',
  maxNodes: 100,
  maxClients: 10000,
  maxTrafficBytes: BigInt(0),
  settings: {},
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestTenantMembership = (overrides: Partial<any> = {}) => ({
  userId: overrides.userId || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  role: 'admin',
  permissions: [],
  isDefault: true,
  createdAt: new Date(),
  ...overrides,
});

export const createTestApiKey = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  name: 'Test API Key',
  keyPrefix: 'pk_test1',
  keyHash: 'hashed-key-value',
  scopes: ['*'],
  rateLimit: 1000,
  allowedIps: [],
  expiresAt: null,
  lastUsedAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ============================================
// User Test Data
// ============================================

export const createTestUser = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  enable: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestSystemAdmin = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  username: 'sysadmin',
  email: 'admin@system.local',
  passwordHash: '$2b$10$hashedpassword',
  enable: true,
  permissions: [],
  lastLoginAt: null,
  lastLoginIp: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================
// Node Test Data
// ============================================

export const createTestNode = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  nodeGroupId: null,
  name: 'Test Node',
  token: `node_${uuidv4().replace(/-/g, '')}`,
  status: 'online',
  publicIp: '1.2.3.4',
  countryCode: 'US',
  countryName: 'United States',
  city: 'Los Angeles',
  isp: 'Test ISP',
  tags: [],
  remark: null,
  systemInfo: {},
  runtimeStats: {},
  configOverrides: {},
  lastSeenAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestNodeGroup = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  name: 'Test Group',
  remark: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================
// Client Test Data
// ============================================

export const createTestClient = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  email: 'client@example.com',
  uuid: uuidv4(),
  password: null,
  flow: 'xtls-rprx-vision',
  alterId: 0,
  security: 'auto',
  method: null,
  level: 0,
  enable: true,
  expiryTime: BigInt(0),
  totalBytes: BigInt(10737418240), // 10GB
  usedBytes: BigInt(0),
  uploadLimit: BigInt(0),
  downloadLimit: BigInt(0),
  deviceLimit: 0,
  limitIp: 0,
  reset: 0,
  delayedStart: false,
  firstConnectAt: null,
  tgId: null,
  comment: null,
  outboundTag: null,
  inboundTags: [],
  subId: uuidv4().substring(0, 8),
  remark: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================
// Inbound Test Data
// ============================================

export const createTestInbound = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  nodeId: overrides.nodeId || uuidv4(),
  tag: 'vless-tcp-tls',
  protocol: 'vless',
  port: 443,
  listen: '0.0.0.0',
  settings: JSON.stringify({ decryption: 'none', clients: [] }),
  streamSettings: JSON.stringify({ network: 'tcp', security: 'tls' }),
  sniffing: JSON.stringify({ enabled: true, destOverride: ['http', 'tls'] }),
  allocate: null,
  enable: true,
  remark: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createVlessRealityInbound = (overrides: Partial<any> = {}) =>
  createTestInbound({
    tag: 'vless-reality',
    protocol: 'vless',
    port: 443,
    streamSettings: JSON.stringify({
      network: 'tcp',
      security: 'reality',
      realitySettings: {
        show: false,
        dest: 'www.microsoft.com:443',
        xver: 0,
        serverNames: ['www.microsoft.com'],
        privateKey: 'test-private-key',
        shortIds: [''],
      },
    }),
    ...overrides,
  });

export const createSocks5Inbound = (overrides: Partial<any> = {}) =>
  createTestInbound({
    tag: 'socks5-in',
    protocol: 'socks',
    port: 1080,
    settings: JSON.stringify({ auth: 'password', accounts: [], udp: true }),
    streamSettings: JSON.stringify({ network: 'tcp' }),
    ...overrides,
  });

export const createTrojanInbound = (overrides: Partial<any> = {}) =>
  createTestInbound({
    tag: 'trojan-tcp-tls',
    protocol: 'trojan',
    port: 443,
    settings: JSON.stringify({ clients: [] }),
    streamSettings: JSON.stringify({
      network: 'tcp',
      security: 'tls',
      tlsSettings: { serverName: 'example.com' },
    }),
    ...overrides,
  });

// ============================================
// Outbound Test Data
// ============================================

export const createTestOutbound = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  nodeId: overrides.nodeId || uuidv4(),
  tag: 'direct',
  protocol: 'freedom',
  sendThrough: null,
  egressIpId: null,
  settings: JSON.stringify({ domainStrategy: 'AsIs' }),
  streamSettings: '{}',
  proxySettings: '{}',
  muxSettings: '{}',
  priority: 100,
  enable: true,
  remark: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createBlackholeOutbound = (overrides: Partial<any> = {}) =>
  createTestOutbound({
    tag: 'block',
    protocol: 'blackhole',
    settings: JSON.stringify({ response: { type: 'http' } }),
    ...overrides,
  });

export const createProxyOutbound = (overrides: Partial<any> = {}) =>
  createTestOutbound({
    tag: 'proxy-out',
    protocol: 'vless',
    settings: JSON.stringify({
      vnext: [{ address: 'proxy.example.com', port: 443, users: [{ id: 'uuid', flow: '' }] }],
    }),
    streamSettings: JSON.stringify({ network: 'ws', security: 'tls' }),
    ...overrides,
  });

// ============================================
// Routing Test Data
// ============================================

export const createTestRoutingRule = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  nodeId: overrides.nodeId || uuidv4(),
  ruleTag: 'default-route',
  priority: 100,
  ruleConfig: JSON.stringify({
    type: 'field',
    inboundTag: ['vless-tcp-tls'],
    outboundTag: 'direct',
  }),
  enable: true,
  remark: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createDomainRoutingRule = (overrides: Partial<any> = {}) =>
  createTestRoutingRule({
    ruleTag: 'block-ads',
    priority: 50,
    ruleConfig: JSON.stringify({
      type: 'field',
      domain: ['geosite:category-ads-all'],
      outboundTag: 'block',
    }),
    ...overrides,
  });

// ============================================
// Egress IP Test Data
// ============================================

export const createTestEgressIp = (overrides: Partial<any> = {}) => ({
  id: overrides.id || uuidv4(),
  tenantId: overrides.tenantId || uuidv4(),
  nodeId: overrides.nodeId || uuidv4(),
  ip: '10.0.0.1',
  remark: 'Test Egress IP',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
