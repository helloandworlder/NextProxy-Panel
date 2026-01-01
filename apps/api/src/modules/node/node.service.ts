import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNodeDto, UpdateNodeDto, QuickCreateNodeDto } from './dto/node.dto';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class NodeService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  /**
   * Quick create node - only name required, returns install command
   */
  async quickCreate(tenantId: string, dto: QuickCreateNodeDto) {
    const token = `node_${uuidv4().replace(/-/g, '')}`;
    
    const node = await this.prisma.node.create({
      data: {
        tenantId,
        name: dto.name,
        token,
        nodeGroupId: dto.nodeGroupId,
        remark: dto.remark,
      },
    });

    const panelUrl = this.configService.get('PANEL_URL', 'http://localhost:3001');
    const installCommand = this.generateInstallCommand(token, panelUrl);

    return {
      ...node,
      installCommand,
    };
  }

  async create(tenantId: string, dto: CreateNodeDto) {
    const token = `node_${uuidv4().replace(/-/g, '')}`;
    
    return this.prisma.node.create({
      data: {
        tenantId,
        nodeGroupId: dto.nodeGroupId,
        name: dto.name,
        token,
        countryCode: dto.countryCode,
        countryName: dto.countryName,
        city: dto.city,
        isp: dto.isp,
        tags: dto.tags || [],
        remark: dto.remark,
      },
    });
  }

  async findAll(tenantId: string, filters?: { status?: string; countryCode?: string; nodeGroupId?: string }) {
    return this.prisma.node.findMany({
      where: {
        tenantId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.countryCode && { countryCode: filters.countryCode }),
        ...(filters?.nodeGroupId && { nodeGroupId: filters.nodeGroupId }),
      },
      include: { nodeGroup: true, egressIps: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const node = await this.prisma.node.findFirst({
      where: { id, tenantId },
      include: { nodeGroup: true, egressIps: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    return node;
  }

  async update(tenantId: string, id: string, dto: UpdateNodeDto) {
    await this.findOne(tenantId, id);
    return this.prisma.node.update({
      where: { id },
      data: {
        name: dto.name,
        nodeGroupId: dto.nodeGroupId,
        countryCode: dto.countryCode,
        countryName: dto.countryName,
        city: dto.city,
        isp: dto.isp,
        status: dto.status,
        tags: dto.tags,
        remark: dto.remark,
        configOverrides: dto.configOverrides,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.node.delete({ where: { id } });
  }

  async regenerateToken(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const token = `node_${uuidv4().replace(/-/g, '')}`;
    return this.prisma.node.update({ where: { id }, data: { token } });
  }

  async updateStatus(nodeId: string, status: string) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: { status, lastSeenAt: new Date() },
    });
  }

  async updateRuntimeStats(nodeId: string, stats: Record<string, any>) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: { runtimeStats: stats, lastSeenAt: new Date() },
    });
  }

  /**
   * Update node info from Agent registration (auto-fill geo info)
   */
  async updateFromAgent(nodeId: string, agentInfo: {
    hostname?: string;
    os?: string;
    arch?: string;
    publicIp?: string;
    countryCode?: string;
    countryName?: string;
    city?: string;
    isp?: string;
    version?: string;
    coreType?: string;
    coreVersion?: string;
  }) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        publicIp: agentInfo.publicIp,
        countryCode: agentInfo.countryCode,
        countryName: agentInfo.countryName,
        city: agentInfo.city,
        isp: agentInfo.isp,
        systemInfo: {
          hostname: agentInfo.hostname,
          os: agentInfo.os,
          arch: agentInfo.arch,
          version: agentInfo.version,
          coreType: agentInfo.coreType,
          coreVersion: agentInfo.coreVersion,
        },
        status: 'online',
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Generate install command for a node
   */
  private generateInstallCommand(token: string, panelUrl: string): string {
    return `curl -fsSL ${panelUrl}/api/v1/agent/install.sh | bash -s -- --token=${token} --panel=${panelUrl}`;
  }

  /**
   * Get install command for existing node
   */
  async getInstallCommand(tenantId: string, nodeId: string) {
    const node = await this.findOne(tenantId, nodeId);
    const panelUrl = this.configService.get('PANEL_URL', 'http://localhost:3001');
    return {
      token: node.token,
      installCommand: this.generateInstallCommand(node.token, panelUrl),
    };
  }

  /**
   * Force sync node configuration - invalidates cache to trigger config refresh
   */
  async syncNode(tenantId: string, nodeId: string) {
    const node = await this.findOne(tenantId, nodeId);
    await this.redis.invalidateNodeCache(nodeId);
    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      message: 'Node cache invalidated. Agent will fetch new config on next poll.',
    };
  }
}
