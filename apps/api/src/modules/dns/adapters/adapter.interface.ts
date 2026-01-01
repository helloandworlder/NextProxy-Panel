export interface DnsRecordConfig {
  type: 'A' | 'AAAA' | 'CNAME';
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

export interface DnsRecordResult {
  externalId: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

export interface IDnsAdapter {
  readonly providerName: string;

  createRecord(zoneId: string, config: DnsRecordConfig): Promise<string>;

  updateRecord(zoneId: string, externalId: string, config: DnsRecordConfig): Promise<void>;

  deleteRecord(zoneId: string, externalId: string): Promise<void>;

  listRecords(zoneId: string, name?: string): Promise<DnsRecordResult[]>;

  getZoneId?(domain: string): Promise<string | null>;
}

export interface DnsCredentials {
  apiKey?: string;
  apiSecret?: string;
  apiToken?: string;
  accountId?: string;
}
