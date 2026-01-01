/**
 * Inbound Configuration Validator
 * Validates inbound-specific settings and port conflicts
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  validateInboundConfig as _validateInboundConfig,
  INBOUND_PROTOCOLS,
  SECURITY_TYPES as _SECURITY_TYPES,
  TRANSPORT_TYPES as _TRANSPORT_TYPES,
} from './xray-config.validator';

export interface InboundValidationInput {
  nodeId: string;
  tag: string;
  protocol: string;
  port: number;
  listen?: string;
  settings?: Record<string, any>;
  streamSettings?: Record<string, any>;
  sniffing?: Record<string, any>;
  // Structured fields
  securityType?: string;
  transportType?: string;
  realityPrivateKey?: string;
  realityServerNames?: string[];
  realityShortIds?: string[];
  tlsServerName?: string;
  wsPath?: string;
  grpcServiceName?: string;
}

@Injectable()
export class InboundValidator {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate inbound configuration with database checks
   */
  async validate(input: InboundValidationInput, excludeId?: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!input.tag || input.tag.trim() === '') {
      errors.push({ field: 'tag', message: 'Tag is required', code: 'REQUIRED_TAG' });
    }

    if (!input.protocol || !INBOUND_PROTOCOLS.includes(input.protocol as any)) {
      errors.push({ field: 'protocol', message: `Invalid protocol: ${input.protocol}`, code: 'INVALID_PROTOCOL' });
    }

    if (!input.port || input.port < 1 || input.port > 65535) {
      errors.push({ field: 'port', message: 'Port must be between 1 and 65535', code: 'INVALID_PORT' });
    }

    // Port conflict check
    const portConflict = await this.checkPortConflict(input.nodeId, input.port, input.listen, excludeId);
    if (portConflict) {
      errors.push({ field: 'port', message: `Port ${input.port} is already in use on this node`, code: 'PORT_CONFLICT' });
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

    // Security validation
    const securityResult = this.validateSecuritySettings(input);
    errors.push(...securityResult.errors);
    warnings.push(...securityResult.warnings);

    // Transport validation
    const transportResult = this.validateTransportSettings(input);
    errors.push(...transportResult.errors);
    warnings.push(...transportResult.warnings);

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if port is already in use on the node
   */
  private async checkPortConflict(nodeId: string, port: number, listen?: string, excludeId?: string): Promise<boolean> {
    const normalizedListen = listen || '0.0.0.0';
    const wildcardListens = ['0.0.0.0', '::', '::0', ''];

    const where: any = {
      nodeId,
      port,
      ...(excludeId && { id: { not: excludeId } }),
    };

    // If new inbound listens on wildcard, check all ports
    // If new inbound listens on specific IP, check wildcard and same IP
    if (wildcardListens.includes(normalizedListen)) {
      // Wildcard conflicts with any listen on same port
    } else {
      where.OR = [
        { listen: { in: wildcardListens } },
        { listen: normalizedListen },
      ];
    }

    const existing = await this.prisma.inbound.findFirst({ where });
    return !!existing;
  }

  /**
   * Check if tag already exists on the node
   */
  private async checkTagConflict(nodeId: string, tag: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.inbound.findFirst({
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
  private validateProtocolSettings(input: InboundValidationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const settings = input.settings || {};

    switch (input.protocol) {
      case 'vless':
        if (settings.decryption && settings.decryption !== 'none') {
          warnings.push({ field: 'settings.decryption', message: 'VLESS decryption should be "none"', code: 'VLESS_DECRYPTION' });
        }
        break;

      case 'vmess':
        // VMess validation
        break;

      case 'trojan':
        // Trojan typically requires TLS
        if (input.securityType !== 'tls' && input.securityType !== 'reality') {
          warnings.push({ field: 'securityType', message: 'Trojan typically requires TLS or Reality', code: 'TROJAN_NO_TLS' });
        }
        break;

      case 'shadowsocks':
        if (!settings.method) {
          errors.push({ field: 'settings.method', message: 'Shadowsocks requires encryption method', code: 'SS_NO_METHOD' });
        }
        if (!settings.password) {
          errors.push({ field: 'settings.password', message: 'Shadowsocks requires password', code: 'SS_NO_PASSWORD' });
        }
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate security settings (TLS/Reality)
   */
  private validateSecuritySettings(input: InboundValidationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const securityType = input.securityType || 'none';

    if (securityType === 'reality') {
      if (!input.realityPrivateKey) {
        errors.push({ field: 'realityPrivateKey', message: 'Reality requires privateKey', code: 'REALITY_NO_PRIVATE_KEY' });
      }
      if (!input.realityServerNames || input.realityServerNames.length === 0) {
        errors.push({ field: 'realityServerNames', message: 'Reality requires at least one serverName', code: 'REALITY_NO_SERVER_NAMES' });
      }
      if (!input.realityShortIds || input.realityShortIds.length === 0) {
        errors.push({ field: 'realityShortIds', message: 'Reality requires at least one shortId', code: 'REALITY_NO_SHORT_IDS' });
      }
    }

    if (securityType === 'tls') {
      if (!input.tlsServerName) {
        warnings.push({ field: 'tlsServerName', message: 'TLS serverName is recommended', code: 'TLS_NO_SERVER_NAME' });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate transport settings
   */
  private validateTransportSettings(input: InboundValidationInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const transportType = input.transportType || 'tcp';

    if (transportType === 'grpc') {
      if (!input.grpcServiceName) {
        errors.push({ field: 'grpcServiceName', message: 'gRPC requires serviceName', code: 'GRPC_NO_SERVICE_NAME' });
      }
    }

    if (transportType === 'ws') {
      if (!input.wsPath) {
        warnings.push({ field: 'wsPath', message: 'WebSocket path is recommended', code: 'WS_NO_PATH' });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
