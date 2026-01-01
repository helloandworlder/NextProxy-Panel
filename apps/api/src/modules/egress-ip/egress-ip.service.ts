import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEgressIpDto, UpdateEgressIpDto, QueryEgressIpDto, QueryAvailableEgressIpDto } from './dto/egress-ip.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EgressIpService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEgressIpDto) {
    // Verify node exists
    const node = await this.prisma.node.findUnique({ where: { id: dto.nodeId } });
    if (!node) throw new NotFoundException('Node not found');

    return this.prisma.egressIp.create({
      data: {
        nodeId: dto.nodeId,
        ip: dto.ip,
        ipVersion: dto.ipVersion || 4,
        interfaceName: dto.interfaceName,
        ipType: dto.ipType || 'datacenter',
        isp: dto.isp,
        asn: dto.asn,
        isActive: dto.isActive ?? true,
        maxUsers: dto.maxUsers || 0,
        currentUsers: 0,
      },
      include: { node: { select: { id: true, name: true, publicIp: true, countryCode: true, city: true } } },
    });
  }

  async findAll(tenantId: string, filters?: QueryEgressIpDto) {
    const where: Prisma.EgressIpWhereInput = { node: { tenantId } };
    
    if (filters?.nodeId) where.nodeId = filters.nodeId;
    if (filters?.country) where.node = { ...where.node as Prisma.NodeWhereInput, countryCode: filters.country };
    if (filters?.city) where.node = { ...where.node as Prisma.NodeWhereInput, city: { contains: filters.city, mode: 'insensitive' } };
    if (filters?.ipType) where.ipType = filters.ipType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.egressIp.findMany({
      where,
      include: { node: { select: { id: true, name: true, publicIp: true, countryCode: true, countryName: true, city: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAvailable(tenantId: string, filters?: QueryAvailableEgressIpDto) {
    const where: any = {
      isActive: true,
      node: { tenantId, status: 'online' },
      OR: [
        { maxUsers: 0 }, // unlimited
        { currentUsers: { lt: this.prisma.egressIp.fields.maxUsers } },
      ],
    };

    if (filters?.nodeId) where.nodeId = filters.nodeId;
    if (filters?.country) where.node = { ...where.node, countryCode: filters.country };
    if (filters?.city) where.node = { ...where.node, city: { contains: filters.city, mode: 'insensitive' } };
    if (filters?.ipType) where.ipType = filters.ipType;
    if (filters?.isp) where.isp = { contains: filters.isp, mode: 'insensitive' };

    // Use raw query for the complex OR condition with field comparison
    const egressIps = await this.prisma.egressIp.findMany({
      where: {
        isActive: true,
        node: { 
          tenantId, 
          status: 'online',
          ...(filters?.country && { countryCode: filters.country }),
          ...(filters?.city && { city: { contains: filters.city, mode: 'insensitive' } }),
        },
        ...(filters?.nodeId && { nodeId: filters.nodeId }),
        ...(filters?.ipType && { ipType: filters.ipType }),
        ...(filters?.isp && { isp: { contains: filters.isp, mode: 'insensitive' } }),
      },
      include: { 
        node: { 
          select: { 
            id: true, name: true, publicIp: true, 
            countryCode: true, countryName: true, city: true, isp: true, status: true 
          } 
        } 
      },
      orderBy: [{ currentUsers: 'asc' }, { createdAt: 'asc' }],
    });

    // Filter in memory for maxUsers comparison (Prisma limitation)
    return egressIps.filter(ip => ip.maxUsers === 0 || ip.currentUsers < ip.maxUsers).map(ip => ({
      ...ip,
      nodeHost: ip.node.publicIp || ip.node.name,
      country: ip.node.countryCode,
      loadPercent: ip.maxUsers > 0 ? Math.round((ip.currentUsers / ip.maxUsers) * 100) : 0,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const egressIp = await this.prisma.egressIp.findFirst({
      where: { id, node: { tenantId } },
      include: { node: { select: { id: true, name: true, publicIp: true, countryCode: true, city: true } } },
    });
    if (!egressIp) throw new NotFoundException('Egress IP not found');
    return egressIp;
  }

  async update(tenantId: string, id: string, dto: UpdateEgressIpDto) {
    await this.findOne(tenantId, id);
    return this.prisma.egressIp.update({
      where: { id },
      data: {
        interfaceName: dto.interfaceName,
        ipType: dto.ipType,
        isp: dto.isp,
        asn: dto.asn,
        isActive: dto.isActive,
        maxUsers: dto.maxUsers,
      },
      include: { node: { select: { id: true, name: true, publicIp: true, countryCode: true, city: true } } },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.egressIp.delete({ where: { id } });
  }

  async incrementUsers(tenantId: string, id: string) {
    const egressIp = await this.findOne(tenantId, id);
    
    // Check if max users limit reached
    if (egressIp.maxUsers > 0 && egressIp.currentUsers >= egressIp.maxUsers) {
      throw new BadRequestException('Max users limit reached for this egress IP');
    }

    return this.prisma.egressIp.update({
      where: { id },
      data: { currentUsers: { increment: 1 } },
    });
  }

  async decrementUsers(tenantId: string, id: string) {
    const egressIp = await this.findOne(tenantId, id);
    
    // Prevent negative count
    if (egressIp.currentUsers <= 0) {
      return egressIp; // Already at 0, no change needed
    }

    return this.prisma.egressIp.update({
      where: { id },
      data: { currentUsers: { decrement: 1 } },
    });
  }
}
