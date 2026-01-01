/**
 * Mock Factory - Centralized mock creation for unit tests
 */

// Jest globals are available in test environment

// ============================================
// Prisma Service Mock
// ============================================

export const createMockPrismaService = () => ({
  tenant: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  tenantMembership: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  tenantApiKey: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  systemAdmin: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  node: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  nodeGroup: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  clientStats: {
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  clientIpLog: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  inbound: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  outbound: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  routingRule: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  balancer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  egressIp: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    fields: { maxUsers: 'maxUsers' },
  },
  dnsConfig: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  policyConfig: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  systemSetting: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(createMockPrismaService())),
});

// ============================================
// Redis Service Mock
// ============================================

export const createMockRedisService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidateNodeCache: jest.fn().mockResolvedValue(undefined),
  getNodeConfig: jest.fn(),
  setNodeConfig: jest.fn(),
  getNodeUsers: jest.fn(),
  setNodeUsers: jest.fn(),
  // Agent service methods
  getConfigEtag: jest.fn().mockResolvedValue(null),
  setConfigEtag: jest.fn().mockResolvedValue(undefined),
  getUsersEtag: jest.fn().mockResolvedValue(null),
  setUsersEtag: jest.fn().mockResolvedValue(undefined),
  incrTraffic: jest.fn().mockResolvedValue(undefined),
  pushTraffic: jest.fn().mockResolvedValue(undefined),
  recordBandwidthSample: jest.fn().mockResolvedValue(undefined),
  setNodeStatus: jest.fn().mockResolvedValue(undefined),
  updateOnlineUser: jest.fn().mockResolvedValue(undefined),
  addDeviceOnline: jest.fn().mockResolvedValue(undefined),
  countDevicesOnline: jest.fn().mockResolvedValue(1),
});

// ============================================
// Config Service Mock
// ============================================

export const createMockConfigService = () => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      PANEL_URL: 'http://localhost:3001',
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRES_IN: '7d',
    };
    return config[key] ?? defaultValue;
  }),
});

// ============================================
// JWT Service Mock
// ============================================

export const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id', tenantId: 'tenant-id' }),
  decode: jest.fn(),
});

// ============================================
// XrayConfigBuilder Mock
// ============================================

export const createMockXrayConfigBuilder = () => ({
  buildInbound: jest.fn().mockReturnValue({
    settings: '{}',
    streamSettings: '{}',
    sniffing: '{"enabled":true}',
  }),
  buildOutbound: jest.fn().mockReturnValue({
    settings: '{}',
    streamSettings: '{}',
  }),
  buildClient: jest.fn().mockReturnValue({
    email: 'test@example.com',
    level: 0,
    id: 'test-uuid',
  }),
});

// ============================================
// Validators Mock
// ============================================

export const createMockRoutingValidator = () => ({
  validate: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
});

export const createMockOutboundValidator = () => ({
  validate: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
});

// ============================================
// NestJS Testing Utilities
// ============================================

export const createMockExecutionContext = (request: any = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      user: { tenantId: 'tenant-001', role: 'admin' },
      headers: {},
      ...request,
    }),
    getResponse: () => ({}),
  }),
  getHandler: () => ({}),
  getClass: () => ({}),
});

export const createMockReflector = () => ({
  getAllAndOverride: jest.fn(),
  get: jest.fn(),
});
