import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Environment variables for initial admin setup
const SYSADMIN_USERNAME = process.env.SYSADMIN_USERNAME || 'sysadmin';
const SYSADMIN_PASSWORD = process.env.SYSADMIN_PASSWORD;
const SYSADMIN_EMAIL = process.env.SYSADMIN_EMAIL || 'sysadmin@example.com';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

async function main() {
  // Validate required passwords in production
  if (process.env.NODE_ENV === 'production') {
    if (!SYSADMIN_PASSWORD) {
      throw new Error('SYSADMIN_PASSWORD environment variable is required in production');
    }
    if (!ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD environment variable is required in production');
    }
  }

  // Use env passwords or generate random ones for development
  const sysadminPwd = SYSADMIN_PASSWORD || generateRandomPassword();
  const adminPwd = ADMIN_PASSWORD || generateRandomPassword();

  console.log('Seeding database...');

  // Create default system admin
  const sysAdminPasswordHash = await bcrypt.hash(sysadminPwd, 10);
  const systemAdmin = await prisma.systemAdmin.upsert({
    where: { username: SYSADMIN_USERNAME },
    update: {},
    create: {
      username: SYSADMIN_USERNAME,
      email: SYSADMIN_EMAIL,
      passwordHash: sysAdminPasswordHash,
      enable: true,
      permissions: ['*'],
    },
  });
  console.log(`Created system admin: ${systemAdmin.username}`);

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
      status: 'active',
      maxNodes: 100,
      maxClients: 10000,
      maxTrafficBytes: BigInt(0), // unlimited
      settings: {
        allowCustomInbound: true,
        allowCustomOutbound: true,
        allowCustomRouting: true,
        defaultClientQuotaBytes: 0,
        defaultClientExpiryDays: 30,
        subscriptionFormats: ['clash', 'v2ray', 'singbox'],
      },
    },
  });
  console.log(`Created tenant: ${tenant.name} (${tenant.slug})`);

  // Create admin user (new User model)
  const passwordHash = await bcrypt.hash(adminPwd, 10);
  const adminUser = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      enable: true,
    },
  });
  console.log(`Created admin user: ${adminUser.username}`);

  // Create tenant membership (link user to tenant)
  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
    update: {},
    create: {
      userId: adminUser.id,
      tenantId: tenant.id,
      role: 'admin',
      permissions: ['*'],
      isDefault: true,
    },
  });
  console.log(`Linked admin user to tenant with admin role`);

  // Create a demo node
  const nodeToken = uuidv4();
  const node = await prisma.node.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Demo Node' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Demo Node',
      token: nodeToken,
      countryCode: 'US',
      countryName: 'United States',
      city: 'Los Angeles',
      status: 'offline',
      tags: ['demo'],
      remark: 'Demo node for testing',
    },
  });
  console.log(`Created demo node: ${node.name} (token: ${nodeToken})`);

  // Create demo inbound (VLESS + Reality)
  const inbound = await prisma.inbound.upsert({
    where: { nodeId_tag: { nodeId: node.id, tag: 'vless-reality' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nodeId: node.id,
      tag: 'vless-reality',
      protocol: 'vless',
      port: 443,
      listen: '0.0.0.0',
      settings: JSON.stringify({ decryption: 'none', fallbacks: [] }),
      streamSettings: JSON.stringify({
        network: 'tcp',
        security: 'reality',
        realitySettings: {
          show: false,
          dest: 'www.microsoft.com:443',
          xver: 0,
          serverNames: ['www.microsoft.com'],
          privateKey: 'YOUR_PRIVATE_KEY',
          shortIds: [''],
        },
      }),
      sniffing: JSON.stringify({ enabled: true, destOverride: ['http', 'tls'] }),
      enable: true,
      remark: 'VLESS + Reality',
    },
  });
  console.log(`Created inbound: ${inbound.tag}`);

  // Create demo outbound (direct)
  const outbound = await prisma.outbound.upsert({
    where: { nodeId_tag: { nodeId: node.id, tag: 'direct' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nodeId: node.id,
      tag: 'direct',
      protocol: 'freedom',
      settings: JSON.stringify({ domainStrategy: 'UseIP' }),
      priority: 100,
      enable: true,
      remark: 'Direct outbound',
    },
  });
  console.log(`Created outbound: ${outbound.tag}`);

  // Create demo client
  const clientUuid = uuidv4();
  const client = await prisma.client.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'demo@example.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'demo@example.com',
      uuid: clientUuid,
      flow: 'xtls-rprx-vision',
      level: 0,
      totalBytes: BigInt(10 * 1024 * 1024 * 1024), // 10GB
      usedBytes: BigInt(0),
      expiryTime: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      deviceLimit: 3,
      subId: 'demo123',
      inboundTags: ['vless-reality'],
      enable: true,
      remark: 'Demo client',
    },
  });
  console.log(`Created client: ${client.email} (uuid: ${clientUuid})`);

  // Create default policy config
  await prisma.policyConfig.upsert({
    where: { nodeId: node.id },
    update: {},
    create: {
      tenantId: tenant.id,
      nodeId: node.id,
      policyConfig: JSON.stringify({
        levels: { '0': { statsUserUplink: true, statsUserDownlink: true, connIdle: 300 } },
        system: { statsInboundUplink: true, statsInboundDownlink: true },
      }),
      enable: true,
    },
  });
  console.log(`Created policy config`);

  // Output credentials
  console.log('\n=== Seed completed ===');
  console.log(`\nSystem Admin credentials:`);
  console.log(`  URL: /admin/login`);
  console.log(`  Username: ${SYSADMIN_USERNAME}`);
  if (!SYSADMIN_PASSWORD) {
    console.log(`  Password: ${sysadminPwd} (auto-generated, please change immediately!)`);
  } else {
    console.log(`  Password: [set via SYSADMIN_PASSWORD env]`);
  }
  console.log(`\nTenant User credentials:`);
  console.log(`  URL: /login`);
  console.log(`  Username: ${ADMIN_USERNAME}`);
  if (!ADMIN_PASSWORD) {
    console.log(`  Password: ${adminPwd} (auto-generated, please change immediately!)`);
  } else {
    console.log(`  Password: [set via ADMIN_PASSWORD env]`);
  }
  console.log(`\nNode token: ${nodeToken}`);
  console.log(`Client UUID: ${clientUuid}`);
}

function generateRandomPassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
