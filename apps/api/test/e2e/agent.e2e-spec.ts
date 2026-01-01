/**
 * Agent API E2E Tests
 * Tests the Agent registration and heartbeat workflow
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

describe('Agent API E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Agent Registration', () => {
    it('POST /api/agent/register - should register new node', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/agent/register')
        .send({
          nodeKey: 'test-node-key-e2e',
          hostname: 'test-node-e2e',
          publicIp: '192.168.1.100',
          xrayVersion: '1.8.0',
          version: '1.0.0',
        })
        .expect(201);
      
      expect(res.body).toHaveProperty('nodeId');
      expect(res.body).toHaveProperty('config');
      testNodeId = res.body.nodeId;
    });

    it('POST /api/agent/register - should update existing node', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/agent/register')
        .send({
          nodeKey: 'test-node-key-e2e',
          hostname: 'test-node-e2e-updated',
          publicIp: '192.168.1.101',
        })
        .expect(201);
      
      expect(res.body.nodeId).toBe(testNodeId);
    });
  });

  describe('Agent Heartbeat', () => {
    it('POST /api/agent/heartbeat - should update node status', async () => {
      if (!testNodeId) {
        console.log('Skipping: No test node available');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/agent/heartbeat')
        .send({
          nodeId: testNodeId,
          cpuUsage: 25.5,
          memoryUsage: 60.2,
          diskUsage: 45.0,
          networkIn: 1024000,
          networkOut: 512000,
          activeConnections: 10,
          xrayRunning: true,
        })
        .expect(201);
      
      expect(res.body).toHaveProperty('configVersion');
      expect(res.body).toHaveProperty('needsUpdate');
    });
  });

  describe('Agent Config', () => {
    it('GET /api/agent/config/:nodeId - should return node config', async () => {
      if (!testNodeId) {
        console.log('Skipping: No test node available');
        return;
      }

      const res = await request(app.getHttpServer())
        .get(`/api/agent/config/${testNodeId}`)
        .expect(200);
      
      expect(res.body).toHaveProperty('inbounds');
      expect(res.body).toHaveProperty('outbounds');
      expect(res.body).toHaveProperty('routing');
    });
  });

  describe('Agent Stats', () => {
    it('POST /api/agent/stats - should report traffic stats', async () => {
      if (!testNodeId) {
        console.log('Skipping: No test node available');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/agent/stats')
        .send({
          nodeId: testNodeId,
          stats: [
            { tag: 'inbound-1', uplink: 1024, downlink: 2048 },
            { tag: 'outbound-1', uplink: 512, downlink: 1024 },
          ],
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
    });
  });

  describe('Cleanup', () => {
    afterAll(async () => {
      // Clean up test node
      if (testNodeId) {
        await prisma.node.deleteMany({ where: { nodeKey: 'test-node-key-e2e' } });
      }
    });
  });
});
