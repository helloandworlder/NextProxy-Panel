import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { IDnsAdapter, DnsRecordConfig, DnsRecordResult, DnsCredentials } from './adapter.interface';

@Injectable()
export class TencentAdapter implements IDnsAdapter {
  readonly providerName = 'tencent';
  private readonly logger = new Logger(TencentAdapter.name);
  private readonly baseUrl = 'https://dnspod.tencentcloudapi.com';

  constructor(private credentials: DnsCredentials) {}

  private sign(params: Record<string, any>, timestamp: number): string {
    const secretId = this.credentials.apiKey || '';
    const secretKey = this.credentials.apiSecret || '';
    const service = 'dnspod';
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    
    const canonicalRequest = [
      'POST', '/', '', 'content-type:application/json',
      'host:dnspod.tencentcloudapi.com', '',
      'content-type;host', 
      createHmac('sha256', '').update(JSON.stringify(params)).digest('hex'),
    ].join('\n');

    const stringToSign = [
      'TC3-HMAC-SHA256', timestamp, `${date}/${service}/tc3_request`,
      createHmac('sha256', '').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const secretDate = createHmac('sha256', `TC3${secretKey}`).update(date).digest();
    const secretService = createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = createHmac('sha256', secretService).update('tc3_request').digest();
    const signature = createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    return `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`;
  }

  private async request(action: string, params: Record<string, any>): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'dnspod.tencentcloudapi.com',
        'X-TC-Action': action,
        'X-TC-Version': '2021-03-23',
        'X-TC-Timestamp': String(timestamp),
        'Authorization': this.sign(params, timestamp),
      },
      body: JSON.stringify(params),
    });
    const data = await response.json() as { Response: { Error?: { Code: string; Message: string }; [key: string]: any } };
    if (data.Response.Error) {
      this.logger.error(`Tencent DNS error: ${data.Response.Error.Code}`);
      throw new Error(`Tencent DNS error: ${data.Response.Error.Message}`);
    }
    return data.Response;
  }

  async createRecord(zoneId: string, config: DnsRecordConfig): Promise<string> {
    const [subDomain] = config.name.replace(`.${zoneId}`, '').split('.');
    const data = await this.request('CreateRecord', {
      Domain: zoneId,
      SubDomain: subDomain || '@',
      RecordType: config.type,
      RecordLine: '默认',
      Value: config.content,
      TTL: config.ttl || 600,
    });
    return String(data.RecordId);
  }

  async updateRecord(zoneId: string, externalId: string, config: DnsRecordConfig): Promise<void> {
    const [subDomain] = config.name.replace(`.${zoneId}`, '').split('.');
    await this.request('ModifyRecord', {
      Domain: zoneId,
      RecordId: parseInt(externalId),
      SubDomain: subDomain || '@',
      RecordType: config.type,
      RecordLine: '默认',
      Value: config.content,
      TTL: config.ttl || 600,
    });
  }

  async deleteRecord(zoneId: string, externalId: string): Promise<void> {
    await this.request('DeleteRecord', { Domain: zoneId, RecordId: parseInt(externalId) });
  }

  async listRecords(zoneId: string, name?: string): Promise<DnsRecordResult[]> {
    const params: Record<string, any> = { Domain: zoneId, Limit: 100 };
    if (name) params.Subdomain = name.replace(`.${zoneId}`, '');
    const data = await this.request('DescribeRecordList', params);
    return (data.RecordList || []).map((r: any) => ({
      externalId: String(r.RecordId),
      name: r.Name === '@' ? zoneId : `${r.Name}.${zoneId}`,
      type: r.Type,
      content: r.Value,
      ttl: r.TTL,
      proxied: false,
    }));
  }

  async getZoneId(domain: string): Promise<string | null> {
    return domain;
  }
}
