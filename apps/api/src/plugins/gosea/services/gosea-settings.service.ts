import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoSeaSettingsDto, NodeGoSeaConfigDto } from '../dto/batch-generate.dto';

const DEFAULT_GOSEA_SETTINGS: GoSeaSettingsDto = {
  defaultProtocol: 'vless',
  defaultOversellCount: 1,
  defaultSocks5Port: 1080,
  defaultRelayPort: 443,
  autoGenerateUsername: true,
  usernamePrefix: 'gs',
  passwordLength: 16,
  maxBatchSize: 1000,
};

@Injectable()
export class GoSeaSettingsService {
  constructor(private prisma: PrismaService) {}

  private getSettingsKey(tenantId: string): string {
    return `gosea_settings_${tenantId}`;
  }

  async getSettings(tenantId: string): Promise<GoSeaSettingsDto> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: this.getSettingsKey(tenantId) } });
    const settings = (setting?.value as any) || {};
    return { ...DEFAULT_GOSEA_SETTINGS, ...settings };
  }

  async updateSettings(tenantId: string, dto: GoSeaSettingsDto): Promise<GoSeaSettingsDto> {
    const key = this.getSettingsKey(tenantId);
    const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
    const currentSettings = (existing?.value as any) || {};
    const newSettings = { ...currentSettings, ...dto };

    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: newSettings },
      create: { key, value: newSettings },
    });
    return this.getSettings(tenantId);
  }

  async getNodeGoSeaConfig(tenantId: string, nodeId: string): Promise<NodeGoSeaConfigDto> {
    const node = await this.prisma.node.findFirst({ where: { id: nodeId, tenantId } });
    if (!node) throw new NotFoundException('Node not found');
    return (node.configOverrides as any)?.goSea || {};
  }

  async updateNodeGoSeaConfig(tenantId: string, nodeId: string, dto: NodeGoSeaConfigDto): Promise<NodeGoSeaConfigDto> {
    const node = await this.prisma.node.findFirst({ where: { id: nodeId, tenantId } });
    if (!node) throw new NotFoundException('Node not found');

    const currentOverrides = (node.configOverrides as any) || {};
    const newOverrides = { ...currentOverrides, goSea: { ...currentOverrides.goSea, ...dto } };

    await this.prisma.node.update({ where: { id: nodeId }, data: { configOverrides: newOverrides } });
    return newOverrides.goSea;
  }
}
