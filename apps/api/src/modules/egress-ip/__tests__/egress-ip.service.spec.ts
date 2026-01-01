import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EgressIpService } from '../egress-ip.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService } from '../../../../test/helpers/mock-factory';
import { createTestEgressIp, createTestNode } from '../../../../test/helpers/test-data-factory';
import { IpType } from '../dto/egress-ip.dto';

describe('EgressIpService', () => {
  let service: EgressIpService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const tenantId = 'tenant-001';
  const nodeId = 'node-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EgressIpService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EgressIpService>(EgressIpService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create egress IP', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId }));
      const mockEgressIp = createTestEgressIp({ nodeId, ip: '10.0.0.1' });
      prisma.egressIp.create.mockResolvedValue(mockEgressIp);

      const result = await service.create({ nodeId, ip: '10.0.0.1' });

      expect(result.ip).toBe('10.0.0.1');
    });

    it('should throw NotFoundException if node not found', async () => {
      prisma.node.findUnique.mockResolvedValue(null);

      await expect(service.create({ nodeId: 'invalid', ip: '10.0.0.1' })).rejects.toThrow(NotFoundException);
    });

    it('should create with default ipVersion 4', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId }));
      prisma.egressIp.create.mockResolvedValue(createTestEgressIp());

      await service.create({ nodeId, ip: '10.0.0.1' });

      expect(prisma.egressIp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipVersion: 4 }),
        }),
      );
    });

    it('should create with IPv6', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId }));
      prisma.egressIp.create.mockResolvedValue(createTestEgressIp());

      await service.create({ nodeId, ip: '2001:db8::1', ipVersion: 6 });

      expect(prisma.egressIp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipVersion: 6 }),
        }),
      );
    });

    it('should create with custom ipType', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId }));
      prisma.egressIp.create.mockResolvedValue(createTestEgressIp());

      await service.create({ nodeId, ip: '10.0.0.1', ipType: IpType.RESIDENTIAL });

      expect(prisma.egressIp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ipType: 'residential' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all egress IPs for tenant', async () => {
      const ips = [createTestEgressIp(), createTestEgressIp()];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter by nodeId', async () => {
      prisma.egressIp.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { nodeId });

      expect(prisma.egressIp.findMany).toHaveBeenCalled();
    });

    it('should filter by country', async () => {
      prisma.egressIp.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { country: 'US' });

      expect(prisma.egressIp.findMany).toHaveBeenCalled();
    });

    it('should filter by ipType', async () => {
      prisma.egressIp.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { ipType: IpType.RESIDENTIAL });

      expect(prisma.egressIp.findMany).toHaveBeenCalled();
    });

    it('should filter by isActive', async () => {
      prisma.egressIp.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { isActive: true });

      expect(prisma.egressIp.findMany).toHaveBeenCalled();
    });
  });

  describe('findAvailable', () => {
    const createNodeWithDetails = () => ({
      ...createTestNode(),
      publicIp: '1.2.3.4',
      countryCode: 'US',
      countryName: 'United States',
      city: 'New York',
      isp: 'Test ISP',
      status: 'online',
    });

    it('should return available egress IPs', async () => {
      const ips = [
        { ...createTestEgressIp(), maxUsers: 0, currentUsers: 0, node: createNodeWithDetails() },
        { ...createTestEgressIp(), maxUsers: 10, currentUsers: 5, node: createNodeWithDetails() },
      ];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAvailable(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter out IPs at max capacity', async () => {
      const ips = [
        { ...createTestEgressIp(), maxUsers: 10, currentUsers: 10, node: createNodeWithDetails() },
        { ...createTestEgressIp(), maxUsers: 10, currentUsers: 5, node: createNodeWithDetails() },
      ];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAvailable(tenantId);

      expect(result).toHaveLength(1);
    });

    it('should include unlimited IPs (maxUsers=0)', async () => {
      const ips = [
        { ...createTestEgressIp(), maxUsers: 0, currentUsers: 100, node: createNodeWithDetails() },
      ];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAvailable(tenantId);

      expect(result).toHaveLength(1);
    });

    it('should calculate loadPercent correctly', async () => {
      const ips = [
        { ...createTestEgressIp(), maxUsers: 100, currentUsers: 50, node: createNodeWithDetails() },
      ];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAvailable(tenantId);

      expect(result[0].loadPercent).toBe(50);
    });

    it('should return loadPercent 0 for unlimited IPs', async () => {
      const ips = [
        { ...createTestEgressIp(), maxUsers: 0, currentUsers: 100, node: createNodeWithDetails() },
      ];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAvailable(tenantId);

      expect(result[0].loadPercent).toBe(0);
    });

    it('should include nodeHost from publicIp', async () => {
      const ips = [
        { ...createTestEgressIp(), maxUsers: 0, currentUsers: 0, node: createNodeWithDetails() },
      ];
      prisma.egressIp.findMany.mockResolvedValue(ips);

      const result = await service.findAvailable(tenantId);

      expect(result[0].nodeHost).toBe('1.2.3.4');
    });
  });

  describe('findOne', () => {
    it('should return egress IP by id', async () => {
      const mockEgressIp = createTestEgressIp({ id: 'egress-001' });
      prisma.egressIp.findFirst.mockResolvedValue(mockEgressIp);

      const result = await service.findOne(tenantId, 'egress-001');

      expect(result).toEqual(mockEgressIp);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.egressIp.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update egress IP isActive', async () => {
      const existing = createTestEgressIp({ id: 'egress-001' });
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.update.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.update(tenantId, 'egress-001', { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should update egress IP maxUsers', async () => {
      const existing = createTestEgressIp({ id: 'egress-001' });
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.update.mockResolvedValue({ ...existing, maxUsers: 50 });

      await service.update(tenantId, 'egress-001', { maxUsers: 50 });

      expect(prisma.egressIp.update).toHaveBeenCalledWith({
        where: { id: 'egress-001' },
        data: expect.objectContaining({ maxUsers: 50 }),
        include: expect.any(Object),
      });
    });

    it('should update egress IP ipType', async () => {
      const existing = createTestEgressIp({ id: 'egress-001' });
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.update.mockResolvedValue({ ...existing, ipType: 'residential' });

      await service.update(tenantId, 'egress-001', { ipType: IpType.RESIDENTIAL });

      expect(prisma.egressIp.update).toHaveBeenCalledWith({
        where: { id: 'egress-001' },
        data: expect.objectContaining({ ipType: 'residential' }),
        include: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete egress IP', async () => {
      const existing = createTestEgressIp({ id: 'egress-001' });
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.delete.mockResolvedValue(existing);

      await service.delete(tenantId, 'egress-001');

      expect(prisma.egressIp.delete).toHaveBeenCalledWith({ where: { id: 'egress-001' } });
    });
  });

  describe('incrementUsers', () => {
    it('should increment currentUsers', async () => {
      const existing = { ...createTestEgressIp({ id: 'egress-001' }), maxUsers: 10, currentUsers: 5 };
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.update.mockResolvedValue({ ...existing, currentUsers: 6 });

      await service.incrementUsers(tenantId, 'egress-001');

      expect(prisma.egressIp.update).toHaveBeenCalledWith({
        where: { id: 'egress-001' },
        data: { currentUsers: { increment: 1 } },
      });
    });

    it('should throw BadRequestException when max users reached', async () => {
      const existing = { ...createTestEgressIp({ id: 'egress-001' }), maxUsers: 10, currentUsers: 10 };
      prisma.egressIp.findFirst.mockResolvedValue(existing);

      await expect(service.incrementUsers(tenantId, 'egress-001')).rejects.toThrow(BadRequestException);
    });

    it('should allow increment when maxUsers is 0 (unlimited)', async () => {
      const existing = { ...createTestEgressIp({ id: 'egress-001' }), maxUsers: 0, currentUsers: 100 };
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.update.mockResolvedValue({ ...existing, currentUsers: 101 });

      await service.incrementUsers(tenantId, 'egress-001');

      expect(prisma.egressIp.update).toHaveBeenCalled();
    });
  });

  describe('decrementUsers', () => {
    it('should decrement currentUsers', async () => {
      const existing = { ...createTestEgressIp({ id: 'egress-001' }), currentUsers: 5 };
      prisma.egressIp.findFirst.mockResolvedValue(existing);
      prisma.egressIp.update.mockResolvedValue({ ...existing, currentUsers: 4 });

      await service.decrementUsers(tenantId, 'egress-001');

      expect(prisma.egressIp.update).toHaveBeenCalledWith({
        where: { id: 'egress-001' },
        data: { currentUsers: { decrement: 1 } },
      });
    });

    it('should not decrement below 0', async () => {
      const existing = { ...createTestEgressIp({ id: 'egress-001' }), currentUsers: 0 };
      prisma.egressIp.findFirst.mockResolvedValue(existing);

      const result = await service.decrementUsers(tenantId, 'egress-001');

      expect(prisma.egressIp.update).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });
});
