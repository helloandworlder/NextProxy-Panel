/**
 * Outbound configuration templates
 * Reference: 3x-ui / Xray-core documentation
 */
import type { ConfigTemplate } from '../components/DualModeEditor';

// Freedom (直连)
export const freedomTemplate: ConfigTemplate = {
  name: 'Freedom (Direct)',
  nameKey: 'templates.freedom',
  description: 'Direct connection without proxy',
  config: {
    domainStrategy: 'AsIs',
    redirect: '',
  },
};

// Blackhole (黑洞/阻断)
export const blackholeTemplate: ConfigTemplate = {
  name: 'Blackhole (Block)',
  nameKey: 'templates.blackhole',
  description: 'Block all traffic',
  config: {
    response: {
      type: 'none',
    },
  },
};

// SOCKS5 Outbound
export const socks5OutboundTemplate: ConfigTemplate = {
  name: 'SOCKS5',
  nameKey: 'templates.socks5Outbound',
  description: 'SOCKS5 proxy outbound',
  config: {
    servers: [
      {
        address: '127.0.0.1',
        port: 1080,
        users: [],
      },
    ],
  },
};

// HTTP Outbound
export const httpOutboundTemplate: ConfigTemplate = {
  name: 'HTTP',
  nameKey: 'templates.httpOutbound',
  description: 'HTTP proxy outbound',
  config: {
    servers: [
      {
        address: '127.0.0.1',
        port: 8080,
        users: [],
      },
    ],
  },
};

// VMess Outbound
export const vmessOutboundTemplate: ConfigTemplate = {
  name: 'VMess',
  nameKey: 'templates.vmessOutbound',
  description: 'VMess protocol outbound',
  config: {
    vnext: [
      {
        address: 'server.example.com',
        port: 443,
        users: [
          {
            id: '',
            security: 'auto',
          },
        ],
      },
    ],
  },
};

// VLESS Outbound
export const vlessOutboundTemplate: ConfigTemplate = {
  name: 'VLESS',
  nameKey: 'templates.vlessOutbound',
  description: 'VLESS protocol outbound',
  config: {
    vnext: [
      {
        address: 'server.example.com',
        port: 443,
        users: [
          {
            id: '',
            encryption: 'none',
            flow: '',
          },
        ],
      },
    ],
  },
};

// Trojan Outbound
export const trojanOutboundTemplate: ConfigTemplate = {
  name: 'Trojan',
  nameKey: 'templates.trojanOutbound',
  description: 'Trojan protocol outbound',
  config: {
    servers: [
      {
        address: 'server.example.com',
        port: 443,
        password: '',
      },
    ],
  },
};

// Shadowsocks Outbound
export const shadowsocksOutboundTemplate: ConfigTemplate = {
  name: 'Shadowsocks',
  nameKey: 'templates.shadowsocksOutbound',
  description: 'Shadowsocks protocol outbound',
  config: {
    servers: [
      {
        address: 'server.example.com',
        port: 8388,
        method: 'aes-256-gcm',
        password: '',
      },
    ],
  },
};

// WireGuard Outbound
export const wireguardOutboundTemplate: ConfigTemplate = {
  name: 'WireGuard',
  nameKey: 'templates.wireguardOutbound',
  description: 'WireGuard VPN outbound',
  config: {
    secretKey: '',
    address: ['10.0.0.2/32'],
    peers: [
      {
        publicKey: '',
        endpoint: 'server.example.com:51820',
        allowedIPs: ['0.0.0.0/0'],
      },
    ],
    mtu: 1420,
  },
};

// All outbound templates
export const outboundSettingsTemplates: ConfigTemplate[] = [
  freedomTemplate,
  blackholeTemplate,
  socks5OutboundTemplate,
  httpOutboundTemplate,
  vmessOutboundTemplate,
  vlessOutboundTemplate,
  trojanOutboundTemplate,
  shadowsocksOutboundTemplate,
  wireguardOutboundTemplate,
];
