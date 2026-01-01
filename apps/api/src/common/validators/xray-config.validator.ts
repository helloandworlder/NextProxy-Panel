/**
 * Xray Configuration Validator
 * Validates Xray/Singbox configuration before pushing to Agent
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Supported protocols
export const INBOUND_PROTOCOLS = ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'dokodemo-door'] as const;
export const OUTBOUND_PROTOCOLS = ['freedom', 'blackhole', 'dns', 'socks', 'http', 'vmess', 'vless', 'trojan', 'shadowsocks', 'wireguard', 'loopback'] as const;

// Security types
export const SECURITY_TYPES = ['none', 'tls', 'reality'] as const;

// Transport types
export const TRANSPORT_TYPES = ['tcp', 'ws', 'grpc', 'h2', 'quic', 'kcp', 'httpupgrade', 'xhttp'] as const;

// Shadowsocks methods
export const SS_METHODS = [
  'aes-128-gcm', 'aes-256-gcm', 'chacha20-poly1305', 'chacha20-ietf-poly1305',
  '2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305',
] as const;

// VMess security options
export const VMESS_SECURITY = ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'] as const;

// VLESS flow options
export const VLESS_FLOWS = ['', 'xtls-rprx-vision', 'xtls-rprx-vision-udp443'] as const;

/**
 * Validate complete Xray configuration
 */
export function validateXrayConfig(config: {
  inbounds?: any[];
  outbounds?: any[];
  routing?: any;
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate inbounds
  if (config.inbounds) {
    for (let i = 0; i < config.inbounds.length; i++) {
      const inboundResult = validateInboundConfig(config.inbounds[i]);
      errors.push(...inboundResult.errors.map(e => ({ ...e, field: `inbounds[${i}].${e.field}` })));
      warnings.push(...inboundResult.warnings.map(w => ({ ...w, field: `inbounds[${i}].${w.field}` })));
    }
  }

  // Validate outbounds
  if (config.outbounds) {
    for (let i = 0; i < config.outbounds.length; i++) {
      const outboundResult = validateOutboundConfig(config.outbounds[i]);
      errors.push(...outboundResult.errors.map(e => ({ ...e, field: `outbounds[${i}].${e.field}` })));
      warnings.push(...outboundResult.warnings.map(w => ({ ...w, field: `outbounds[${i}].${w.field}` })));
    }
  }

  // Validate routing
  if (config.routing) {
    const routingResult = validateRoutingConfig(config.routing);
    errors.push(...routingResult.errors);
    warnings.push(...routingResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate inbound configuration
 */
export function validateInboundConfig(inbound: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!inbound.tag) {
    errors.push({ field: 'tag', message: 'Tag is required', code: 'REQUIRED_TAG' });
  }

  if (!inbound.protocol) {
    errors.push({ field: 'protocol', message: 'Protocol is required', code: 'REQUIRED_PROTOCOL' });
  } else if (!INBOUND_PROTOCOLS.includes(inbound.protocol)) {
    errors.push({ field: 'protocol', message: `Invalid protocol: ${inbound.protocol}`, code: 'INVALID_PROTOCOL' });
  }

  if (!inbound.port || inbound.port < 1 || inbound.port > 65535) {
    errors.push({ field: 'port', message: 'Port must be between 1 and 65535', code: 'INVALID_PORT' });
  }

  // Protocol-specific validation
  if (inbound.protocol === 'vless') {
    const vlessResult = validateVlessInbound(inbound);
    errors.push(...vlessResult.errors);
    warnings.push(...vlessResult.warnings);
  } else if (inbound.protocol === 'vmess') {
    const vmessResult = validateVmessInbound(inbound);
    errors.push(...vmessResult.errors);
    warnings.push(...vmessResult.warnings);
  } else if (inbound.protocol === 'trojan') {
    const trojanResult = validateTrojanInbound(inbound);
    errors.push(...trojanResult.errors);
    warnings.push(...trojanResult.warnings);
  } else if (inbound.protocol === 'shadowsocks') {
    const ssResult = validateShadowsocksInbound(inbound);
    errors.push(...ssResult.errors);
    warnings.push(...ssResult.warnings);
  }

  // Stream settings validation
  if (inbound.streamSettings) {
    const streamResult = validateStreamSettings(inbound.streamSettings, inbound.protocol);
    errors.push(...streamResult.errors);
    warnings.push(...streamResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate outbound configuration
 */
export function validateOutboundConfig(outbound: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!outbound.tag) {
    errors.push({ field: 'tag', message: 'Tag is required', code: 'REQUIRED_TAG' });
  }

  if (!outbound.protocol) {
    errors.push({ field: 'protocol', message: 'Protocol is required', code: 'REQUIRED_PROTOCOL' });
  } else if (!OUTBOUND_PROTOCOLS.includes(outbound.protocol)) {
    errors.push({ field: 'protocol', message: `Invalid protocol: ${outbound.protocol}`, code: 'INVALID_PROTOCOL' });
  }

  // Validate sendThrough IP format
  if (outbound.sendThrough && !isValidIP(outbound.sendThrough)) {
    errors.push({ field: 'sendThrough', message: 'Invalid IP address format', code: 'INVALID_IP' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate routing configuration
 */
export function validateRoutingConfig(routing: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (routing.rules && Array.isArray(routing.rules)) {
    for (let i = 0; i < routing.rules.length; i++) {
      const rule = routing.rules[i];
      if (!rule.outboundTag && !rule.balancerTag) {
        errors.push({
          field: `routing.rules[${i}]`,
          message: 'Rule must have outboundTag or balancerTag',
          code: 'MISSING_OUTBOUND',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Protocol-specific validators
function validateVlessInbound(inbound: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const settings = inbound.settings || {};
  
  // VLESS requires decryption setting
  if (settings.decryption && settings.decryption !== 'none') {
    warnings.push({
      field: 'settings.decryption',
      message: 'VLESS decryption should be "none"',
      code: 'VLESS_DECRYPTION',
    });
  }

  // Validate clients
  if (settings.clients && Array.isArray(settings.clients)) {
    for (let i = 0; i < settings.clients.length; i++) {
      const client = settings.clients[i];
      if (!client.id || !isValidUUID(client.id)) {
        errors.push({
          field: `settings.clients[${i}].id`,
          message: 'Invalid UUID format',
          code: 'INVALID_UUID',
        });
      }
      if (client.flow && !VLESS_FLOWS.includes(client.flow)) {
        errors.push({
          field: `settings.clients[${i}].flow`,
          message: `Invalid flow: ${client.flow}`,
          code: 'INVALID_FLOW',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateVmessInbound(inbound: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const settings = inbound.settings || {};

  if (settings.clients && Array.isArray(settings.clients)) {
    for (let i = 0; i < settings.clients.length; i++) {
      const client = settings.clients[i];
      if (!client.id || !isValidUUID(client.id)) {
        errors.push({
          field: `settings.clients[${i}].id`,
          message: 'Invalid UUID format',
          code: 'INVALID_UUID',
        });
      }
      if (client.alterId && client.alterId > 0) {
        warnings.push({
          field: `settings.clients[${i}].alterId`,
          message: 'alterId > 0 is deprecated, recommend using 0',
          code: 'DEPRECATED_ALTERID',
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateTrojanInbound(inbound: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const settings = inbound.settings || {};

  if (settings.clients && Array.isArray(settings.clients)) {
    for (let i = 0; i < settings.clients.length; i++) {
      const client = settings.clients[i];
      if (!client.password || client.password.length < 8) {
        errors.push({
          field: `settings.clients[${i}].password`,
          message: 'Password must be at least 8 characters',
          code: 'WEAK_PASSWORD',
        });
      }
    }
  }

  // Trojan typically requires TLS
  const streamSettings = inbound.streamSettings || {};
  if (streamSettings.security !== 'tls' && streamSettings.security !== 'reality') {
    warnings.push({
      field: 'streamSettings.security',
      message: 'Trojan typically requires TLS or Reality',
      code: 'TROJAN_NO_TLS',
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateShadowsocksInbound(inbound: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const settings = inbound.settings || {};

  if (!settings.method) {
    errors.push({ field: 'settings.method', message: 'Encryption method is required', code: 'REQUIRED_METHOD' });
  } else if (!SS_METHODS.includes(settings.method)) {
    errors.push({ field: 'settings.method', message: `Invalid method: ${settings.method}`, code: 'INVALID_METHOD' });
  }

  if (!settings.password || settings.password.length < 8) {
    errors.push({ field: 'settings.password', message: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateStreamSettings(stream: any, _protocol: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const security = stream.security || 'none';
  const network = stream.network || 'tcp';

  // Validate security type
  if (!SECURITY_TYPES.includes(security)) {
    errors.push({ field: 'streamSettings.security', message: `Invalid security: ${security}`, code: 'INVALID_SECURITY' });
  }

  // Validate transport type
  if (!TRANSPORT_TYPES.includes(network)) {
    errors.push({ field: 'streamSettings.network', message: `Invalid network: ${network}`, code: 'INVALID_NETWORK' });
  }

  // Reality validation
  if (security === 'reality') {
    const realitySettings = stream.realitySettings || {};
    if (!realitySettings.privateKey) {
      errors.push({
        field: 'streamSettings.realitySettings.privateKey',
        message: 'Reality requires privateKey',
        code: 'REALITY_NO_PRIVATE_KEY',
      });
    }
    if (!realitySettings.serverNames || realitySettings.serverNames.length === 0) {
      errors.push({
        field: 'streamSettings.realitySettings.serverNames',
        message: 'Reality requires at least one serverName',
        code: 'REALITY_NO_SERVER_NAMES',
      });
    }
    if (!realitySettings.shortIds || realitySettings.shortIds.length === 0) {
      errors.push({
        field: 'streamSettings.realitySettings.shortIds',
        message: 'Reality requires at least one shortId',
        code: 'REALITY_NO_SHORT_IDS',
      });
    }
  }

  // TLS validation
  if (security === 'tls') {
    const tlsSettings = stream.tlsSettings || {};
    if (!tlsSettings.serverName) {
      warnings.push({
        field: 'streamSettings.tlsSettings.serverName',
        message: 'TLS serverName is recommended',
        code: 'TLS_NO_SERVER_NAME',
      });
    }
  }

  // Transport-specific validation
  if (network === 'ws') {
    const wsSettings = stream.wsSettings || {};
    if (!wsSettings.path) {
      warnings.push({ field: 'streamSettings.wsSettings.path', message: 'WebSocket path is recommended', code: 'WS_NO_PATH' });
    }
  }

  if (network === 'grpc') {
    const grpcSettings = stream.grpcSettings || {};
    if (!grpcSettings.serviceName) {
      errors.push({
        field: 'streamSettings.grpcSettings.serviceName',
        message: 'gRPC requires serviceName',
        code: 'GRPC_NO_SERVICE_NAME',
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Utility functions
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '0.0.0.0' || ip === '::';
}
