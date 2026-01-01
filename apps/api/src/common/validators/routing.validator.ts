/**
 * Routing Configuration Validator
 * Validates routing rules and references
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './xray-config.validator';

export interface RoutingRuleInput {
  type?: string;
  domain?: string[];
  ip?: string[];
  port?: string;
  sourcePort?: string;
  network?: string;
  source?: string[];
  user?: string[];
  inboundTag?: string[];
  protocol?: string[];
  attrs?: Record<string, any>;
  outboundTag?: string;
  balancerTag?: string;
}

export interface RoutingValidationInput {
  nodeId: string;
  domainStrategy?: string;
  domainMatcher?: string;
  rules?: RoutingRuleInput[];
  balancers?: Array<{
    tag: string;
    selector: string[];
    strategy?: { type: string };
  }>;
}

const DOMAIN_STRATEGIES = ['AsIs', 'IPIfNonMatch', 'IPOnDemand'] as const;
const DOMAIN_MATCHERS = ['linear', 'mph'] as const;
const NETWORK_TYPES = ['tcp', 'udp', 'tcp,udp'] as const;

@Injectable()
export class RoutingValidator {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate routing configuration
   */
  async validate(input: RoutingValidationInput): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate domain strategy
    if (input.domainStrategy && !DOMAIN_STRATEGIES.includes(input.domainStrategy as any)) {
      errors.push({
        field: 'domainStrategy',
        message: `Invalid domainStrategy: ${input.domainStrategy}`,
        code: 'INVALID_DOMAIN_STRATEGY',
      });
    }

    // Validate domain matcher
    if (input.domainMatcher && !DOMAIN_MATCHERS.includes(input.domainMatcher as any)) {
      errors.push({
        field: 'domainMatcher',
        message: `Invalid domainMatcher: ${input.domainMatcher}`,
        code: 'INVALID_DOMAIN_MATCHER',
      });
    }

    // Get available tags for reference validation
    const [inboundTags, outboundTags] = await Promise.all([
      this.getInboundTags(input.nodeId),
      this.getOutboundTags(input.nodeId),
    ]);

    const balancerTags = (input.balancers || []).map(b => b.tag);

    // Validate rules
    if (input.rules) {
      for (let i = 0; i < input.rules.length; i++) {
        const ruleResult = this.validateRule(input.rules[i], i, inboundTags, outboundTags, balancerTags);
        errors.push(...ruleResult.errors);
        warnings.push(...ruleResult.warnings);
      }
    }

    // Validate balancers
    if (input.balancers) {
      for (let i = 0; i < input.balancers.length; i++) {
        const balancer = input.balancers[i];
        if (!balancer.tag) {
          errors.push({ field: `balancers[${i}].tag`, message: 'Balancer tag is required', code: 'REQUIRED_BALANCER_TAG' });
        }
        if (!balancer.selector || balancer.selector.length === 0) {
          errors.push({ field: `balancers[${i}].selector`, message: 'Balancer selector is required', code: 'REQUIRED_BALANCER_SELECTOR' });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate a single routing rule
   */
  private validateRule(
    rule: RoutingRuleInput,
    index: number,
    inboundTags: string[],
    outboundTags: string[],
    balancerTags: string[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const prefix = `rules[${index}]`;

    // Must have outboundTag or balancerTag
    if (!rule.outboundTag && !rule.balancerTag) {
      errors.push({
        field: prefix,
        message: 'Rule must have outboundTag or balancerTag',
        code: 'MISSING_OUTBOUND',
      });
    }

    // Validate outboundTag reference
    if (rule.outboundTag && !outboundTags.includes(rule.outboundTag)) {
      warnings.push({
        field: `${prefix}.outboundTag`,
        message: `Outbound tag "${rule.outboundTag}" not found`,
        code: 'UNKNOWN_OUTBOUND_TAG',
      });
    }

    // Validate balancerTag reference
    if (rule.balancerTag && !balancerTags.includes(rule.balancerTag)) {
      errors.push({
        field: `${prefix}.balancerTag`,
        message: `Balancer tag "${rule.balancerTag}" not found`,
        code: 'UNKNOWN_BALANCER_TAG',
      });
    }

    // Validate inboundTag references
    if (rule.inboundTag) {
      for (const tag of rule.inboundTag) {
        if (!inboundTags.includes(tag)) {
          warnings.push({
            field: `${prefix}.inboundTag`,
            message: `Inbound tag "${tag}" not found`,
            code: 'UNKNOWN_INBOUND_TAG',
          });
        }
      }
    }

    // Validate network type
    if (rule.network && !NETWORK_TYPES.includes(rule.network as any)) {
      errors.push({
        field: `${prefix}.network`,
        message: `Invalid network: ${rule.network}`,
        code: 'INVALID_NETWORK',
      });
    }

    // Validate port format
    if (rule.port && !this.isValidPortRange(rule.port)) {
      errors.push({
        field: `${prefix}.port`,
        message: 'Invalid port format',
        code: 'INVALID_PORT_FORMAT',
      });
    }

    // Validate domain patterns
    if (rule.domain) {
      for (let i = 0; i < rule.domain.length; i++) {
        if (!this.isValidDomainPattern(rule.domain[i])) {
          warnings.push({
            field: `${prefix}.domain[${i}]`,
            message: `Potentially invalid domain pattern: ${rule.domain[i]}`,
            code: 'INVALID_DOMAIN_PATTERN',
          });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private async getInboundTags(nodeId: string): Promise<string[]> {
    const inbounds = await this.prisma.inbound.findMany({
      where: { nodeId },
      select: { tag: true },
    });
    return inbounds.map(i => i.tag);
  }

  private async getOutboundTags(nodeId: string): Promise<string[]> {
    const outbounds = await this.prisma.outbound.findMany({
      where: { nodeId },
      select: { tag: true },
    });
    return outbounds.map(o => o.tag);
  }

  private isValidPortRange(port: string): boolean {
    // Supports: "80", "80-443", "80,443,8080"
    const portRangeRegex = /^(\d{1,5}(-\d{1,5})?(,\d{1,5}(-\d{1,5})?)*)$/;
    return portRangeRegex.test(port);
  }

  private isValidDomainPattern(pattern: string): boolean {
    // Supports: domain:xxx, full:xxx, regexp:xxx, geosite:xxx, ext:xxx
    const prefixes = ['domain:', 'full:', 'regexp:', 'geosite:', 'ext:', 'keyword:'];
    if (prefixes.some(p => pattern.startsWith(p))) {
      return true;
    }
    // Plain domain
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    return domainRegex.test(pattern);
  }
}
