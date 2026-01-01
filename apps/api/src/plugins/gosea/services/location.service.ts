import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Continent mapping
const CONTINENT_MAP: Record<string, { code: string; name: string }> = {
  // Asia
  CN: { code: 'AS', name: 'Asia' }, HK: { code: 'AS', name: 'Asia' }, TW: { code: 'AS', name: 'Asia' },
  JP: { code: 'AS', name: 'Asia' }, KR: { code: 'AS', name: 'Asia' }, SG: { code: 'AS', name: 'Asia' },
  MY: { code: 'AS', name: 'Asia' }, TH: { code: 'AS', name: 'Asia' }, VN: { code: 'AS', name: 'Asia' },
  ID: { code: 'AS', name: 'Asia' }, PH: { code: 'AS', name: 'Asia' }, IN: { code: 'AS', name: 'Asia' },
  // Europe
  GB: { code: 'EU', name: 'Europe' }, DE: { code: 'EU', name: 'Europe' }, FR: { code: 'EU', name: 'Europe' },
  NL: { code: 'EU', name: 'Europe' }, IT: { code: 'EU', name: 'Europe' }, ES: { code: 'EU', name: 'Europe' },
  RU: { code: 'EU', name: 'Europe' }, PL: { code: 'EU', name: 'Europe' }, UA: { code: 'EU', name: 'Europe' },
  // North America
  US: { code: 'NA', name: 'North America' }, CA: { code: 'NA', name: 'North America' },
  MX: { code: 'NA', name: 'North America' },
  // South America
  BR: { code: 'SA', name: 'South America' }, AR: { code: 'SA', name: 'South America' },
  CL: { code: 'SA', name: 'South America' },
  // Africa
  ZA: { code: 'AF', name: 'Africa' }, EG: { code: 'AF', name: 'Africa' },
  // Oceania
  AU: { code: 'OC', name: 'Oceania' }, NZ: { code: 'OC', name: 'Oceania' },
};

export interface LocationNode {
  code: string;
  name: string;
  nameEn: string;
  type: 'continent' | 'country' | 'city';
  parentCode?: string;
  availableCount: number;
  children?: LocationNode[];
}

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  async getLocationsTree(tenantId: string): Promise<LocationNode[]> {
    const pools = await this.prisma.goSeaSocks5Pool.findMany({
      where: { tenantId, status: { in: ['available', 'allocated'] } },
      select: {
        continentCode: true, continentName: true,
        countryCode: true, countryName: true,
        cityCode: true, cityName: true,
        maxAllocations: true, currentAllocations: true,
      },
    });

    // Build tree structure
    const continentMap = new Map<string, LocationNode>();

    for (const pool of pools) {
      const available = pool.maxAllocations - pool.currentAllocations;
      if (available <= 0) continue;

      const continentCode = pool.continentCode || CONTINENT_MAP[pool.countryCode]?.code || 'OT';
      const continentName = pool.continentName || CONTINENT_MAP[pool.countryCode]?.name || 'Other';

      // Get or create continent
      if (!continentMap.has(continentCode)) {
        continentMap.set(continentCode, {
          code: continentCode, name: continentName, nameEn: continentName,
          type: 'continent', availableCount: 0, children: [],
        });
      }
      const continent = continentMap.get(continentCode)!;
      continent.availableCount += available;

      // Get or create country
      let country = continent.children!.find(c => c.code === pool.countryCode);
      if (!country) {
        country = {
          code: pool.countryCode, name: pool.countryName || pool.countryCode,
          nameEn: pool.countryName || pool.countryCode, type: 'country',
          parentCode: continentCode, availableCount: 0, children: [],
        };
        continent.children!.push(country);
      }
      country.availableCount += available;

      // Add city if exists
      if (pool.cityCode) {
        let city = country.children!.find(c => c.code === pool.cityCode);
        if (!city) {
          city = {
            code: pool.cityCode, name: pool.cityName || pool.cityCode,
            nameEn: pool.cityName || pool.cityCode, type: 'city',
            parentCode: pool.countryCode, availableCount: 0,
          };
          country.children!.push(city);
        }
        city.availableCount += available;
      }
    }

    return Array.from(continentMap.values());
  }

  async getAvailableLocations(tenantId: string, filters?: { countryCode?: string; ispType?: string }) {
    const where: any = { tenantId, status: { in: ['available', 'allocated'] } };
    if (filters?.countryCode) where.countryCode = filters.countryCode;
    if (filters?.ispType) where.ispType = filters.ispType;

    const pools = await this.prisma.goSeaSocks5Pool.groupBy({
      by: ['continentCode', 'continentName', 'countryCode', 'countryName', 'cityCode', 'cityName'],
      where,
      _sum: { maxAllocations: true, currentAllocations: true },
      _count: true,
    });

    return pools.map(p => ({
      continentCode: p.continentCode, continentName: p.continentName,
      countryCode: p.countryCode, countryName: p.countryName,
      cityCode: p.cityCode, cityName: p.cityName,
      totalProxies: p._count,
      availableCount: (p._sum.maxAllocations || 0) - (p._sum.currentAllocations || 0),
    })).filter(p => p.availableCount > 0);
  }

  async getInventoryByCountry(tenantId: string, countryCode: string) {
    const pools = await this.prisma.goSeaSocks5Pool.groupBy({
      by: ['cityCode', 'cityName', 'ispType'],
      where: { tenantId, countryCode, status: { in: ['available', 'allocated'] } },
      _sum: { maxAllocations: true, currentAllocations: true },
      _count: true,
    });

    return pools.map(p => ({
      cityCode: p.cityCode, cityName: p.cityName, ispType: p.ispType,
      totalProxies: p._count,
      totalCapacity: p._sum.maxAllocations || 0,
      allocated: p._sum.currentAllocations || 0,
      available: (p._sum.maxAllocations || 0) - (p._sum.currentAllocations || 0),
    }));
  }
}
