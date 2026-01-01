/**
 * Outbound Configuration Validator
 * Validates outbound-specific settings and tag conflicts
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  OUTBOUND_PROTOCOLS,
} from './xray-config.validator';

export interface OutboundValidationInput {
  nodeId: string;
  tag: string;
  protocol: string;
  sendThrough?: string;
  settings?: Record<string, any>;
  streamSettings?: Record<string, any>;
  // Server settings
  serverAddress?: string;
  serverPort?: number;
}

@Injectable()
export class OutboundValidator {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate outbound configuration with database checks
   */
  async validate(input: OutboundValidationInput, excludeId?: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!input.tag || input.tag.trim() === '') {
      errors.push({ field: 'tag', message: 'Tag is required', code: 'REQUIRED_TAG' });
    }

    if (!input.protocol || !OUTBOUND_PROTOCOLS.includes(input.protocol as any)) {
      errors.push({ field: 'protocol', message: `Invalid protocol: ${input.protocol}`, code: 'INVALID_PROTOCOL' });
    }

    // Tag uniqueness check
    const tagConflict = await this.checkTagConflict(input.nodeId, input.tag, excludeId);
    if (tagConflict) {
      errors.push({ field: 'tag', message: `Tag "${input.tag}" already exists on this node`, code: 'TAG_CONFLICT' });
    }

    // Protocol-specific validation
    const protocolResult = this.validateProtocolSettings(input);
    errors.push(...protocolResult.errors);
    warnings.push(...protocolResult.warnings);

    // SendThrough IP validation
    if (input.sendThrough && !this.isValidIP(input.sendThrough)) {
      errors.push({ field: 'sendThrough', message: 'Invalid IP address format', code: 'INVALID_IP' });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if tag already exists on the node
   */
  private async checkTagConflict(nodeId: string, tag: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.outbound.findFirst({
      where: {
        nodeId,
        tag,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!existing;
  }

  /**
   * Validate protocol-specific settings
   */
  private validateProtocolSettings(input: OutboundValidationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const settings = input.settings || {};

    switch (input.protocol) {
      case 'freedom':
        // Freedom has minimal requirements
        break;

      case 'blackhole':
        // Blackhole has minimal requirements
        break;

      case 'vmess':
      case 'vless':
      case 'trojan':
      case 'shadowsocks':
        // Proxy protocols require server address
        if (!input.serverAddress) {
          errors.push({ field: 'serverAddress', message: 'Server address is required', code: 'REQUIRED_SERVER' });
        }
        if (!input.serverPort || input.serverPort < 1 || input.serverPort > 65535) {
          errors.push({ field: 'serverPort', message: 'Valid server port is required', code: 'INVALID_SERVER_PORT' });
        }
        break;

      case 'socks':
      case 'http':
        // Proxy protocols may require server
        if (settings.servers && settings.servers.length > 0) {
          for (let i = 0; i < settings.servers.length; i++) {
            const server = settings.servers[i];
            if (!server.address) {
              errors.push({ field: `settings.servers[${i}].address`, message: 'Server address required', code: 'REQUIRED_SERVER' });
            }
          }
        }
        break;

      case 'wireguard':
        if (!settings.secretKey) {
          errors.push({ field: 'settings.secretKey', message: 'WireGuard requires secretKey', code: 'WG_NO_SECRET_KEY' });
        }
        if (!settings.peers || settings.peers.length === 0) {
          errors.push({ field: 'settings.peers', message: 'WireGuard requires at least one peer', code: 'WG_NO_PEERS' });
        }
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '0.0.0.0' || ip === '::';
  }
}
