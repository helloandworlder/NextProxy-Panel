/**
 * Routing rule configuration templates
 * Reference: 3x-ui / Xray-core documentation
 */
import type { ConfigTemplate } from '../components/DualModeEditor';

// Block ads
export const blockAdsTemplate: ConfigTemplate = {
  name: 'Block Ads',
  nameKey: 'templates.blockAds',
  description: 'Block advertisement domains',
  config: {
    type: 'field',
    domain: ['geosite:category-ads-all'],
    outboundTag: 'block',
  },
};

// Direct China traffic
export const directChinaTemplate: ConfigTemplate = {
  name: 'Direct China',
  nameKey: 'templates.directChina',
  description: 'Direct connection for China domains and IPs',
  config: {
    type: 'field',
    domain: ['geosite:cn'],
    ip: ['geoip:cn', 'geoip:private'],
    outboundTag: 'direct',
  },
};

// Proxy foreign traffic
export const proxyForeignTemplate: ConfigTemplate = {
  name: 'Proxy Foreign',
  nameKey: 'templates.proxyForeign',
  description: 'Proxy non-China traffic',
  config: {
    type: 'field',
    domain: ['geosite:geolocation-!cn'],
    outboundTag: 'proxy',
  },
};

// Block BitTorrent
export const blockBtTemplate: ConfigTemplate = {
  name: 'Block BitTorrent',
  nameKey: 'templates.blockBt',
  description: 'Block BitTorrent protocol',
  config: {
    type: 'field',
    protocol: ['bittorrent'],
    outboundTag: 'block',
  },
};

// Per-user routing
export const perUserTemplate: ConfigTemplate = {
  name: 'Per-User Routing',
  nameKey: 'templates.perUser',
  description: 'Route specific users to specific outbound',
  config: {
    type: 'field',
    user: ['user@example.com'],
    outboundTag: 'specific-outbound',
  },
};

// Domain routing
export const domainRoutingTemplate: ConfigTemplate = {
  name: 'Domain Routing',
  nameKey: 'templates.domainRouting',
  description: 'Route specific domains',
  config: {
    type: 'field',
    domain: ['domain:example.com', 'full:www.example.com', 'regexp:\\.google\\..*'],
    outboundTag: 'proxy',
  },
};

// IP routing
export const ipRoutingTemplate: ConfigTemplate = {
  name: 'IP Routing',
  nameKey: 'templates.ipRouting',
  description: 'Route specific IP ranges',
  config: {
    type: 'field',
    ip: ['192.168.0.0/16', '10.0.0.0/8'],
    outboundTag: 'direct',
  },
};

// Port routing
export const portRoutingTemplate: ConfigTemplate = {
  name: 'Port Routing',
  nameKey: 'templates.portRouting',
  description: 'Route by destination port',
  config: {
    type: 'field',
    port: '80,443,8080-8090',
    outboundTag: 'proxy',
  },
};

// All routing templates
export const routingRuleTemplates: ConfigTemplate[] = [
  blockAdsTemplate,
  directChinaTemplate,
  proxyForeignTemplate,
  blockBtTemplate,
  perUserTemplate,
  domainRoutingTemplate,
  ipRoutingTemplate,
  portRoutingTemplate,
];
