import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { IDnsAdapter, DnsRecordConfig, DnsRecordResult, DnsCredentials } from './adapter.interface';

@Injectable()
export class AliyunAdapter implements IDnsAdapter {
  readonly providerName = 'aliyun';
  private readonly logger = new Logger(AliyunAdapter.name);
  private readonly baseUrl = 'https://alidns.aliyuncs.com';

  constructor(private credentials: DnsCredentials) {}

  private sign(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const canonicalizedQuery = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
    const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalizedQuery)}`;
    const hmac = createHmac('sha1', `${this.credentials.apiSecret}&`);
    return hmac.update(stringToSign).digest('base64');
  }

  private async request(action: string, params: Record<string, string>): Promise<any> {
    const commonParams: Record<string, string> = {
      Format: 'JSON',
      Version: '2015-01-09',
      AccessKeyId: this.credentials.apiKey || '',
      SignatureMethod: 'HMAC-SHA1',
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      SignatureVersion: '1.0',
      SignatureNonce: Math.random().toString(36).substring(2),
      Action: action,
      ...params,
    };

    commonParams.Signature = this.sign(commonParams);
    const query = Object.entries(commonParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const response = await fetch(`${this.baseUrl}/?${query}`);
    const data = await response.json() as { Code?: string; Message?: string; RecordId?: string; DomainRecords?: { Record?: any[] }; [key: string]: any };
    if (data.Code) {
      this.logger.error(`Aliyun DNS error: ${data.Code} - ${data.Message}`);
      throw new Error(`Aliyun DNS error: ${data.Message}`);
    }
    return data;
  }

  async createRecord(zoneId: string, config: DnsRecordConfig): Promise<string> {
    // zoneId is the domain name for Aliyun
    const [rr] = config.name.split('.');
    const data = await this.request('AddDomainRecord', {
      DomainName: zoneId,
      RR: rr || '@',
      Type: config.type,
      Value: config.content,
      TTL: String(config.ttl || 600),
    });
    return data.RecordId;
  }

  async updateRecord(zoneId: string, externalId: string, config: DnsRecordConfig): Promise<void> {
    const [rr] = config.name.split('.');
    await this.request('UpdateDomainRecord', {
      RecordId: externalId,
      RR: rr || '@',
      Type: config.type,
      Value: config.content,
      TTL: String(config.ttl || 600),
    });
  }

  async deleteRecord(zoneId: string, externalId: string): Promise<void> {
    await this.request('DeleteDomainRecord', { RecordId: externalId });
  }

  async listRecords(zoneId: string, name?: string): Promise<DnsRecordResult[]> {
    const params: Record<string, string> = { DomainName: zoneId, PageSize: '100' };
    if (name) {
      const [rr] = name.split('.');
      params.RRKeyWord = rr;
    }
    const data = await this.request('DescribeDomainRecords', params);
    return (data.DomainRecords?.Record || []).map((r: any) => ({
      externalId: r.RecordId,
      name: `${r.RR}.${r.DomainName}`,
      type: r.Type,
      content: r.Value,
      ttl: r.TTL,
      proxied: false,
    }));
  }

  async getZoneId(domain: string): Promise<string | null> {
    // For Aliyun, zoneId is the domain name itself
    return domain;
  }
}
