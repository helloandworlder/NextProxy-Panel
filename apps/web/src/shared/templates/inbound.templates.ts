/**
 * Inbound configuration templates
 * Reference: 3x-ui / Xray-core documentation
 */
import type { JsonObject } from '../types/json';
import type { ConfigTemplate } from '../components/DualModeEditor';

// VLESS + Reality (推荐)
export const vlessRealityTemplate: ConfigTemplate = {
  name: 'VLESS + Reality',
  nameKey: 'templates.vlessReality',
  description: 'VLESS with Reality TLS, recommended for anti-detection',
  config: {
    decryption: 'none',
    fallbacks: [],
  },
};

export const vlessRealityStreamSettings: JsonObject = {
  network: 'tcp',
  security: 'reality',
  realitySettings: {
    show: false,
    dest: 'www.microsoft.com:443',
    xver: 0,
    serverNames: ['www.microsoft.com'],
    privateKey: '', // Generate with: xray x25519
    shortIds: [''],
  },
};

// VLESS + WebSocket + TLS
export const vlessWsTlsTemplate: ConfigTemplate = {
  name: 'VLESS + WS + TLS',
  nameKey: 'templates.vlessWsTls',
  description: 'VLESS with WebSocket transport and TLS',
  config: {
    decryption: 'none',
    fallbacks: [],
  },
};

export const vlessWsTlsStreamSettings: JsonObject = {
  network: 'ws',
  security: 'tls',
  wsSettings: {
    path: '/ws',
    headers: {},
  },
  tlsSettings: {
    serverName: '',
    certificates: [
      {
        certificateFile: '/path/to/cert.pem',
        keyFile: '/path/to/key.pem',
      },
    ],
  },
};

// VMess + WebSocket + TLS
export const vmessWsTlsTemplate: ConfigTemplate = {
  name: 'VMess + WS + TLS',
  nameKey: 'templates.vmessWsTls',
  description: 'VMess with WebSocket transport and TLS',
  config: {
    // VMess in Xray-core no longer requires alterId (deprecated)
  },
};

export const vmessWsTlsStreamSettings: JsonObject = {
  network: 'ws',
  security: 'tls',
  wsSettings: {
    path: '/vmess',
    headers: {},
  },
  tlsSettings: {
    serverName: '',
    certificates: [
      {
        certificateFile: '/path/to/cert.pem',
        keyFile: '/path/to/key.pem',
      },
    ],
  },
};

// Trojan + TCP + TLS
export const trojanTcpTlsTemplate: ConfigTemplate = {
  name: 'Trojan + TCP + TLS',
  nameKey: 'templates.trojanTcpTls',
  description: 'Trojan protocol with TLS',
  config: {
    fallbacks: [],
  },
};

export const trojanTcpTlsStreamSettings: JsonObject = {
  network: 'tcp',
  security: 'tls',
  tlsSettings: {
    serverName: '',
    certificates: [
      {
        certificateFile: '/path/to/cert.pem',
        keyFile: '/path/to/key.pem',
      },
    ],
  },
};

// Shadowsocks 2022
export const shadowsocks2022Template: ConfigTemplate = {
  name: 'Shadowsocks 2022',
  nameKey: 'templates.shadowsocks2022',
  description: 'Shadowsocks 2022 with AEAD-2022 encryption',
  config: {
    method: '2022-blake3-aes-128-gcm',
    password: '', // Base64 encoded key
    network: 'tcp,udp',
  },
};

// SOCKS5
export const socks5Template: ConfigTemplate = {
  name: 'SOCKS5',
  nameKey: 'templates.socks5',
  description: 'SOCKS5 proxy with optional authentication',
  config: {
    auth: 'noauth',
    accounts: [],
    udp: true,
    ip: '127.0.0.1',
  },
};

// HTTP Proxy
export const httpProxyTemplate: ConfigTemplate = {
  name: 'HTTP Proxy',
  nameKey: 'templates.httpProxy',
  description: 'HTTP proxy with optional authentication',
  config: {
    accounts: [],
    allowTransparent: false,
  },
};

// Dokodemo-door (透明代理)
export const dokodemoTemplate: ConfigTemplate = {
  name: 'Dokodemo-door',
  nameKey: 'templates.dokodemo',
  description: 'Transparent proxy for any protocol',
  config: {
    address: '',
    port: 0,
    network: 'tcp,udp',
    followRedirect: true,
  },
};

// All inbound templates
export const inboundSettingsTemplates: ConfigTemplate[] = [
  vlessRealityTemplate,
  vlessWsTlsTemplate,
  vmessWsTlsTemplate,
  trojanTcpTlsTemplate,
  shadowsocks2022Template,
  socks5Template,
  httpProxyTemplate,
  dokodemoTemplate,
];

// Stream settings templates
export const streamSettingsTemplates: ConfigTemplate[] = [
  {
    name: 'TCP',
    config: { network: 'tcp', security: 'none' },
  },
  {
    name: 'TCP + TLS',
    config: {
      network: 'tcp',
      security: 'tls',
      tlsSettings: {
        serverName: '',
        certificates: [{ certificateFile: '', keyFile: '' }],
      },
    },
  },
  {
    name: 'TCP + Reality',
    config: vlessRealityStreamSettings,
  },
  {
    name: 'WebSocket',
    config: {
      network: 'ws',
      security: 'none',
      wsSettings: { path: '/ws', headers: {} },
    },
  },
  {
    name: 'WebSocket + TLS',
    config: vlessWsTlsStreamSettings,
  },
  {
    name: 'gRPC',
    config: {
      network: 'grpc',
      security: 'tls',
      grpcSettings: { serviceName: 'grpc' },
      tlsSettings: {
        serverName: '',
        certificates: [{ certificateFile: '', keyFile: '' }],
      },
    },
  },
  {
    name: 'HTTP/2',
    config: {
      network: 'h2',
      security: 'tls',
      httpSettings: { path: '/h2', host: [] },
      tlsSettings: {
        serverName: '',
        certificates: [{ certificateFile: '', keyFile: '' }],
      },
    },
  },
];

// Sniffing templates
export const sniffingTemplates: ConfigTemplate[] = [
  {
    name: 'Enabled (HTTP + TLS)',
    config: {
      enabled: true,
      destOverride: ['http', 'tls'],
      routeOnly: false,
    },
  },
  {
    name: 'Enabled (All)',
    config: {
      enabled: true,
      destOverride: ['http', 'tls', 'quic', 'fakedns'],
      routeOnly: false,
    },
  },
  {
    name: 'Route Only',
    config: {
      enabled: true,
      destOverride: ['http', 'tls'],
      routeOnly: true,
    },
  },
  {
    name: 'Disabled',
    config: {
      enabled: false,
    },
  },
];
