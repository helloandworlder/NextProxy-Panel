/**
 * GoSea Plugin E2E Tests
 * Tests the complete GoSea API workflow
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

describe('GoSea Plugin E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let testNodeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Login to get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    authToken = loginRes.body.accessToken;
    tenantId = loginRes.body.user?.tenantId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /health - should return ok', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      
      expect(res.body.status).toBe('ok');
    });

    it('GET /ready - should check dependencies', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/ready')
        .expect(200);
      
      expect(res.body.status).toBe('ok');
      expect(res.body.checks.database.status).toBe('ok');
      expect(res.body.checks.redis.status).toBe('ok');
    });
  });

  describe('GoSea Business Types', () => {
    it('GET /plugins/gosea/business-types - should return business types', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plugins/gosea/business-types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GoSea Locations', () => {
    it('GET /plugins/gosea/locations - should return location tree', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plugins/gosea/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /plugins/gosea/locations/available - should return available locations', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plugins/gosea/locations/available')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GoSea Lines', () => {
    it('POST /plugins/gosea/lines - should search lines', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/plugins/gosea/lines')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ current: 0, size: 10 })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('records');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('GoSea Account', () => {
    it('GET /plugins/gosea/account - should return account info', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plugins/gosea/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('username');
      expect(res.body.data).toHaveProperty('statistics');
    });
  });

  describe('GoSea Instances', () => {
    it('POST /plugins/gosea/instances - should search instances', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/plugins/gosea/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ current: 0, size: 20 })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('records');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('GoSea Batch Socks5 Generation', () => {
    beforeAll(async () => {
      // Create a test node if needed
      const nodes = await prisma.node.findMany({ where: { status: 'online' }, take: 1 });
      if (nodes.length > 0) {
        testNodeId = nodes[0].id;
      }
    });

    it('POST /plugins/gosea/socks5/batch-generate - should preview batch generation', async () => {
      if (!testNodeId) {
        console.log('Skipping: No online node available');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/plugins/gosea/socks5/batch-generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nodeId: testNodeId,
          count: 2,
          ingressEqualsEgress: true,
          portMode: 'range',
          portRange: { min: 9000, max: 9010 },
          oversellCount: 1,
          dryRun: true,
        })
        .expect(200);
      
      expect(res.body).toHaveProperty('preview');
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body.created).toBe(false); // dryRun mode
    });
  });

  describe('GoSea Settings', () => {
    it('GET /plugins/gosea/settings - should return settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plugins/gosea/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body).toBeDefined();
    });
  });

  describe('Node Sync API', () => {
    it('POST /nodes/:id/sync - should sync node config', async () => {
      if (!testNodeId) {
        console.log('Skipping: No online node available');
        return;
      }

      const res = await request(app.getHttpServer())
        .post(`/api/nodes/${testNodeId}/sync`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });
});
