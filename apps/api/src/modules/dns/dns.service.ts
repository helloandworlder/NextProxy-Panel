import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDnsProviderDto, UpdateDnsProviderDto, CreateDnsRecordDto, UpdateDnsRecordDto } from './dto/dns.dto';
import { IDnsAdapter, DnsCredentials, CloudflareAdapter, AliyunAdapter, TencentAdapter } from './adapters';

@Injectable()
export class DnsService {
  private readonly logger = new Logger(DnsService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================
  // DNS Provider Management
  // ============================================

  private createAdapter(provider: string, credentials: DnsCredentials): IDnsAdapter {
    switch (provider) {
      case 'cloudflare':
        return new CloudflareAdapter(credentials);
      case 'aliyun':
        return new AliyunAdapter(credentials);
      case 'tencent':
      case 'dnspod':
        return new TencentAdapter(credentials);
      default:
        throw new BadRequestException(`Unsupported DNS provider: ${provider}`);
    }
  }

  async createProvider(tenantId: string, dto: CreateDnsProviderDto) {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.dnsProvider.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.dnsProvider.create({
      data: {
        tenantId,
        name: dto.name,
        provider: dto.provider,
        rootDomain: dto.rootDomain,
        zoneId: dto.zoneId,
        credentials: dto.credentials as any,
        domainPattern: dto.domainPattern || '{prefix}-{tag}.{root}',
        isDefault: dto.isDefault || false,
      },
    });
  }

  async findAllProviders(tenantId: string) {
    return this.prisma.dnsProvider.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProviderById(tenantId: string, id: string) {
    const provider = await this.prisma.dnsProvider.findFirst({ where: { id, tenantId } });
    if (!provider) throw new NotFoundException('DNS Provider not found');
    return provider;
  }

  async updateProvider(tenantId: string, id: string, dto: UpdateDnsProviderDto) {
    await this.findProviderById(tenantId, id);
    if (dto.isDefault) {
      await this.prisma.dnsProvider.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.dnsProvider.update({ where: { id }, data: dto as any });
  }

  async deleteProvider(tenantId: string, id: string) {
    await this.findProviderById(tenantId, id);
    return this.prisma.dnsProvider.delete({ where: { id } });
  }

  async getDefaultProvider(tenantId: string) {
    return this.prisma.dnsProvider.findFirst({ where: { tenantId, isDefault: true, enable: true } });
  }

  // ============================================
  // DNS Record Management
  // ============================================

  async createRecord(tenantId: string, dto: CreateDnsRecordDto) {
    const provider = await this.findProviderById(tenantId, dto.providerId);
    const adapter = this.createAdapter(provider.provider, provider.credentials as DnsCredentials);

    // Create record in DNS provider
    const externalId = await adapter.createRecord(provider.zoneId || provider.rootDomain, {
      type: dto.recordType as 'A' | 'AAAA' | 'CNAME',
      name: dto.name,
      content: dto.content,
      ttl: dto.ttl,
      proxied: dto.proxied,
    });

    return this.prisma.dnsRecord.create({
      data: {
        tenantId,
        providerId: dto.providerId,
        nodeId: dto.nodeId,
        recordType: dto.recordType,
        name: dto.name,
        content: dto.content,
        proxied: dto.proxied || false,
        ttl: dto.ttl || 300,
        externalId,
        status: 'active',
        lastSyncAt: new Date(),
      },
    });
  }

  async findAllRecords(tenantId: string, providerId?: string, nodeId?: string) {
    return this.prisma.dnsRecord.findMany({
      where: { tenantId, ...(providerId && { providerId }), ...(nodeId && { nodeId }) },
      include: { provider: { select: { name: true, rootDomain: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecordById(tenantId: string, id: string) {
    const record = await this.prisma.dnsRecord.findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('DNS Record not found');
    return record;
  }

  async updateRecord(tenantId: string, id: string, dto: UpdateDnsRecordDto) {
    const record = await this.prisma.dnsRecord.findFirst({
      where: { id, tenantId },
      include: { provider: true },
    });
    if (!record) throw new NotFoundException('DNS Record not found');

    const adapter = this.createAdapter(record.provider.provider, record.provider.credentials as DnsCredentials);
    if (record.externalId) {
      await adapter.updateRecord(record.provider.zoneId || record.provider.rootDomain, record.externalId, {
        type: record.recordType as 'A' | 'AAAA' | 'CNAME',
        name: record.name,
        content: dto.content || record.content,
        ttl: dto.ttl || record.ttl,
        proxied: dto.proxied ?? record.proxied,
      });
    }
    return this.prisma.dnsRecord.update({
      where: { id },
      data: { ...dto, lastSyncAt: new Date(), status: 'active' },
    });
  }

  async deleteRecord(tenantId: string, id: string) {
    const record = await this.prisma.dnsRecord.findFirst({
      where: { id, tenantId },
      include: { provider: true },
    });
    if (!record) throw new NotFoundException('DNS Record not found');

    if (record.externalId) {
      try {
        const adapter = this.createAdapter(record.provider.provider, record.provider.credentials as DnsCredentials);
        await adapter.deleteRecord(record.provider.zoneId || record.provider.rootDomain, record.externalId);
      } catch (e) {
        this.logger.warn(`Failed to delete DNS record from provider: ${e}`);
      }
    }
    return this.prisma.dnsRecord.delete({ where: { id } });
  }

  // ============================================
  // Node Domain Management (Auto DNS)
  // ============================================

  async ensureNodeDomain(tenantId: string, nodeId: string): Promise<string | null> {
    const node = await this.prisma.node.findFirst({ where: { id: nodeId, tenantId } });
    if (!node) throw new NotFoundException('Node not found');

    const provider = await this.getDefaultProvider(tenantId);
    if (!provider) {
      this.logger.warn(`No default DNS provider for tenant ${tenantId}`);
      return null;
    }

    const ingressConfig = node.ingressConfig as { ingressIp?: string; domainPrefix?: string } | null;
    const ip = ingressConfig?.ingressIp || node.publicIp;
    if (!ip) return null;

    const domainName = this.generateDomainName(provider.domainPattern, provider.rootDomain, node, ingressConfig);
    const existing = await this.prisma.dnsRecord.findFirst({ where: { providerId: provider.id, nodeId } });

    if (existing) {
      if (existing.content !== ip) await this.updateRecord(tenantId, existing.id, { content: ip });
      return existing.name;
    }

    await this.createRecord(tenantId, {
      providerId: provider.id,
      nodeId,
      recordType: ip.includes(':') ? 'AAAA' : 'A',
      name: domainName,
      content: ip,
      ttl: 300,
    });
    return domainName;
  }

  async removeNodeDomain(tenantId: string, nodeId: string): Promise<void> {
    const records = await this.prisma.dnsRecord.findMany({ 
      where: { tenantId, nodeId },
      include: { provider: true },
    });
    
    if (records.length === 0) return;

    // Delete from DNS providers in parallel
    await Promise.all(records.map(async (record) => {
      try {
        if (record.externalId) {
          const adapter = this.createAdapter(record.provider.provider, record.provider.credentials as DnsCredentials);
          await adapter.deleteRecord(record.provider.zoneId || record.provider.rootDomain, record.externalId);
        }
      } catch {
        // Ignore DNS provider errors during cleanup
      }
    }));

    // Batch delete from database
    await this.prisma.dnsRecord.deleteMany({ where: { tenantId, nodeId } });
  }

  private generateDomainName(
    pattern: string, rootDomain: string,
    node: { name: string; countryCode?: string | null },
    ingressConfig?: { domainPrefix?: string } | null,
  ): string {
    const prefix = ingressConfig?.domainPrefix || node.countryCode?.toLowerCase() || 'node';
    const tag = node.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return pattern.replace('{prefix}', prefix).replace('{tag}', tag).replace('{region}', node.countryCode?.toLowerCase() || 'default').replace('{root}', rootDomain);
  }

  async syncAllRecords(tenantId: string): Promise<{ synced: number; failed: number }> {
    const records = await this.prisma.dnsRecord.findMany({ where: { tenantId }, include: { provider: true } });
    let synced = 0, failed = 0;
    for (const record of records) {
      try {
        const adapter = this.createAdapter(record.provider.provider, record.provider.credentials as DnsCredentials);
        const existing = await adapter.listRecords(record.provider.zoneId || record.provider.rootDomain, record.name);
        if (existing.length > 0) {
          await this.prisma.dnsRecord.update({ where: { id: record.id }, data: { externalId: existing[0].externalId, status: 'active', lastSyncAt: new Date() } });
        }
        synced++;
      } catch {
        await this.prisma.dnsRecord.update({ where: { id: record.id }, data: { status: 'failed' } });
        failed++;
      }
    }
    return { synced, failed };
  }
}
