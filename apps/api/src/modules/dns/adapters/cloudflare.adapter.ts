import { Injectable, Logger } from '@nestjs/common';
import { IDnsAdapter, DnsRecordConfig, DnsRecordResult, DnsCredentials } from './adapter.interface';

@Injectable()
export class CloudflareAdapter implements IDnsAdapter {
  readonly providerName = 'cloudflare';
  private readonly logger = new Logger(CloudflareAdapter.name);
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private credentials: DnsCredentials) {}

  private getHeaders(): Record<string, string> {
    if (this.credentials.apiToken) {
      return {
        'Authorization': `Bearer ${this.credentials.apiToken}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      'X-Auth-Email': this.credentials.accountId || '',
      'X-Auth-Key': this.credentials.apiKey || '',
      'Content-Type': 'application/json',
    };
  }

  async createRecord(zoneId: string, config: DnsRecordConfig): Promise<string> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        type: config.type,
        name: config.name,
        content: config.content,
        ttl: config.ttl || 300,
        proxied: config.proxied || false,
      }),
    });

    const data = await response.json() as { success: boolean; result?: { id: string }; errors?: any[] };
    if (!data.success) {
      this.logger.error('Cloudflare create record failed', data.errors);
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
    return data.result!.id;
  }

  async updateRecord(zoneId: string, externalId: string, config: DnsRecordConfig): Promise<void> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${externalId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({
        type: config.type,
        name: config.name,
        content: config.content,
        ttl: config.ttl || 300,
        proxied: config.proxied || false,
      }),
    });

    const data = await response.json() as { success: boolean; errors?: any[] };
    if (!data.success) {
      this.logger.error('Cloudflare update record failed', data.errors);
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
  }

  async deleteRecord(zoneId: string, externalId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${externalId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const data = await response.json() as { success: boolean; errors?: any[] };
    if (!data.success) {
      this.logger.error('Cloudflare delete record failed', data.errors);
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
  }

  async listRecords(zoneId: string, name?: string): Promise<DnsRecordResult[]> {
    const params = new URLSearchParams({ per_page: '100' });
    if (name) params.set('name', name);

    const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json() as { 
      success: boolean; 
      result?: Array<{ id: string; name: string; type: string; content: string; ttl: number; proxied: boolean }>;
      errors?: any[];
    };
    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return (data.result || []).map((r) => ({
      externalId: r.id,
      name: r.name,
      type: r.type,
      content: r.content,
      ttl: r.ttl,
      proxied: r.proxied,
    }));
  }

  async getZoneId(domain: string): Promise<string | null> {
    const response = await fetch(`${this.baseUrl}/zones?name=${domain}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json() as { success: boolean; result?: Array<{ id: string }> };
    if (!data.success || !data.result?.length) return null;
    return data.result[0].id;
  }
}
