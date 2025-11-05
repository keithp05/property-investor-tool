import axios from 'axios';
import { Property, PropertySearchParams } from '@/types/property';
import { countyRecordsScraper } from './countyRecordsScraper';
import { craigslistScraper } from './craigslistScraper';
import { courthouseAuctionScraper } from './courthouseAuctionScraper';
import { demoDataService } from './demoDataService';
import { BrightDataService } from './brightDataService';

/**
 * Property Aggregator Service
 * Fetches properties from multiple sources:
 * - BULK DATA: Bright Data (100K records for $250)
 * - FREE: County Records, Craigslist
 * - CHEAP: Zillow (RapidAPI), Realtor.com (RapidAPI)
 * - DEMO: Sample data when no real sources return results
 */

export class PropertyAggregator {

  /**
   * Search properties across all sources
   * Now includes FREE county records and Craigslist!
   * Falls back to demo data if no results found
   */
  async searchProperties(params: PropertySearchParams): Promise<Property[]> {
    console.log('🔍 Searching with params:', params);

    const results = await Promise.allSettled([
      // WORKING SOURCES
      this.searchZillow(params),

      // OFF-MARKET DEAL SOURCES (your primary focus!)
      courthouseAuctionScraper.searchByLocation(
        params.city || '',
        params.state || '',
        params.zipCode
      ),

      // DISABLED - not working sources until we fix them
      // this.searchBrightData(params),  // 401 Unauthorized
      // this.searchRealtor(params),     // 401 Unauthorized
      // countyRecordsScraper.searchByLocation(params.city, params.state),  // Empty city/state issue
      // craigslistScraper.searchOwnerFinance(params.city, params.state),   // Empty city/state issue
      // craigslistScraper.searchFSBO(params.city, params.state),            // Empty city/state issue
    ]);

    const properties: Property[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        properties.push(...result.value);
      }
    });

    // Add metadata about sources used
    console.log(`Property search completed:
      - Total properties found: ${properties.length}
      - Zillow: ${properties.filter(p => p.source === 'zillow').length}
      - Courthouse Auctions: ${properties.filter(p => p.source === 'courthouse-auction').length}
    `);

    const deduplicated = this.deduplicateProperties(properties);

    // NO MORE DEMO DATA - return what we actually found (even if empty)
    console.log(`✅ Returning ${deduplicated.length} real properties`);
    return deduplicated;
  }

  /**
   * Search only FREE sources (for testing without API keys)
   */
  async searchFreeSourcesOnly(params: PropertySearchParams): Promise<Property[]> {
    const results = await Promise.allSettled([
      countyRecordsScraper.searchByLocation(params.city, params.state),
      craigslistScraper.searchOwnerFinance(params.city, params.state),
      craigslistScraper.searchFSBO(params.city, params.state),
    ]);

    const properties: Property[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        properties.push(...result.value);
      }
    });

    return this.deduplicateProperties(properties);
  }

  /**
   * Search Bright Data (100K real estate records)
   */
  private async searchBrightData(params: PropertySearchParams): Promise<Property[]> {
    try {
      if (!process.env.BRIGHT_DATA_API_TOKEN || !process.env.BRIGHT_DATA_DATASET_ID) {
        console.log('⚠️  Bright Data API credentials not configured');
        return [];
      }

      const brightData = new BrightDataService({
        apiToken: process.env.BRIGHT_DATA_API_TOKEN,
        datasetId: process.env.BRIGHT_DATA_DATASET_ID,
      });

      console.log('🔍 Searching Bright Data for properties...');
      const properties = await brightData.searchProperties(params);
      console.log(`✅ Bright Data returned ${properties.length} properties`);

      return properties;
    } catch (error) {
      console.error('Bright Data search error:', error);
      return [];
    }
  }

  /**
   * Search Zillow
   */
  private async searchZillow(params: PropertySearchParams): Promise<Property[]> {
    try {
      // Note: Zillow doesn't have an official API. In production, you'd use:
      // 1. RapidAPI's Zillow API
      // 2. Web scraping (with proper legal compliance)
      // 3. Zillow Bridge API (for partners)

      // Fetch first 3 pages (41 results per page = ~120 properties)
      // This balances API cost vs number of results
      const pagesToFetch = 3;
      const allProperties: Property[] = [];

      for (let page = 1; page <= pagesToFetch; page++) {
        try {
          // Build location string - prefer zipCode if provided, otherwise use city/state
          const location = params.zipCode || `${params.city}, ${params.state}`;

          const response = await axios.get('https://zillow-com1.p.rapidapi.com/propertyExtendedSearch', {
            params: {
              location: location,
              status_type: 'ForSale',
              page: page,
              ...(params.minPrice && { price_min: params.minPrice }),
              ...(params.maxPrice && { price_max: params.maxPrice }),
              ...(params.minBedrooms && { beds_min: params.minBedrooms }),
              ...(params.maxBedrooms && { beds_max: params.maxBedrooms }),
            },
            headers: {
              'X-RapidAPI-Key': process.env.ZILLOW_API_KEY || '',
              'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
            },
          });

          const pageProperties = this.normalizeZillowData(response.data);
          allProperties.push(...pageProperties);

          console.log(`✅ Zillow page ${page}: ${pageProperties.length} properties (Total: ${allProperties.length})`);

          // If this page returned fewer results than expected, we've reached the end
          if (pageProperties.length < 40) {
            break;
          }
        } catch (error) {
          console.error(`Error fetching Zillow page ${page}:`, error);
          // Continue with other pages even if one fails
        }
      }

      return allProperties;
    } catch (error) {
      console.error('Zillow search error:', error);
      return [];
    }
  }

  /**
   * Search Realtor.com
   */
  private async searchRealtor(params: PropertySearchParams): Promise<Property[]> {
    try {
      // Realtor.com API via RapidAPI
      const response = await axios.get('https://realtor.p.rapidapi.com/properties/v2/list-for-sale', {
        params: {
          city: params.city,
          state_code: params.state,
          limit: 50,
          offset: 0,
          ...(params.minPrice && { price_min: params.minPrice }),
          ...(params.maxPrice && { price_max: params.maxPrice }),
          ...(params.minBedrooms && { beds_min: params.minBedrooms }),
        },
        headers: {
          'X-RapidAPI-Key': process.env.REALTOR_API_KEY || '',
          'X-RapidAPI-Host': 'realtor.p.rapidapi.com',
        },
      });

      return this.normalizeRealtorData(response.data);
    } catch (error) {
      console.error('Realtor search error:', error);
      return [];
    }
  }

  /**
   * Search Facebook Marketplace
   */
  private async searchFacebook(params: PropertySearchParams): Promise<Property[]> {
    try {
      // Facebook Marketplace requires Facebook Graph API
      // This is a simplified example
      const query = `${params.city} ${params.state} house for sale`;

      const response = await axios.get('https://graph.facebook.com/v18.0/marketplace_search', {
        params: {
          query: query,
          type: 'REAL_ESTATE',
          fields: 'id,name,description,price,location,images',
        },
        headers: {
          'Authorization': `Bearer ${process.env.FACEBOOK_GRAPH_API_KEY}`,
        },
      });

      return this.normalizeFacebookData(response.data);
    } catch (error) {
      console.error('Facebook search error:', error);
      return [];
    }
  }

  /**
   * Normalize Zillow data to our Property format
   */
  private normalizeZillowData(data: any): Property[] {
    console.log('🔍 Normalizing Zillow data. Keys:', Object.keys(data || {}));
    console.log('🔍 Data sample:', JSON.stringify(data).substring(0, 500));

    if (!data?.props) {
      console.log('⚠️  No props found in Zillow response');
      return [];
    }

    console.log(`🔍 Found ${data.props.length} properties in Zillow response`);

    const normalized = data.props.map((prop: any) => {
      // Zillow address can be either:
      // 1. Object: { streetAddress: "123 Main", city: "Austin", state: "TX", zipcode: "78701" }
      // 2. String: "123 Main, Austin, TX 78701"
      let address = '';
      let city = '';
      let state = '';
      let zipCode = '';

      if (typeof prop.address === 'string') {
        // Parse string format: "2211 Geneva, Castroville, TX 78009"
        address = prop.address;
        const parts = prop.address.split(',').map((s: string) => s.trim());
        if (parts.length >= 3) {
          const stateZip = parts[parts.length - 1].split(' ');
          city = parts[parts.length - 2];
          state = stateZip[0];
          zipCode = stateZip[1] || '';
        }
      } else if (prop.address) {
        // Object format
        address = prop.address.streetAddress || '';
        city = prop.address.city || '';
        state = prop.address.state || '';
        zipCode = prop.address.zipcode || '';
      }

      return {
        id: `zillow-${prop.zpid}`,
        address,
        city,
        state,
        zipCode,
        latitude: prop.latitude,
        longitude: prop.longitude,
        propertyType: this.mapPropertyType(prop.propertyType),
        bedrooms: prop.bedrooms || 0,
        bathrooms: prop.bathrooms || 0,
        squareFeet: prop.livingArea,
        lotSize: prop.lotAreaValue,
        yearBuilt: prop.yearBuilt,
        purchasePrice: prop.price,
        currentValue: prop.price,
        status: 'SEARCHING' as const,
        source: 'zillow',
        externalId: prop.zpid?.toString(),
        sourceUrl: prop.detailUrl,
        images: prop.imgSrc ? [prop.imgSrc] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    console.log(`✅ Normalized ${normalized.length} properties`);
    console.log('📍 Sample address:', normalized[0]?.address, normalized[0]?.city, normalized[0]?.zipCode);

    return normalized;
  }

  /**
   * Normalize Realtor.com data
   */
  private normalizeRealtorData(data: any): Property[] {
    if (!data?.properties) return [];

    return data.properties.map((prop: any) => ({
      id: `realtor-${prop.property_id}`,
      address: prop.address?.line || '',
      city: prop.address?.city || '',
      state: prop.address?.state_code || '',
      zipCode: prop.address?.postal_code || '',
      latitude: prop.address?.lat,
      longitude: prop.address?.lon,
      propertyType: this.mapPropertyType(prop.prop_type),
      bedrooms: prop.beds || 0,
      bathrooms: prop.baths || 0,
      squareFeet: prop.building_size?.size,
      lotSize: prop.lot_size?.size,
      yearBuilt: prop.year_built,
      purchasePrice: prop.price,
      currentValue: prop.price,
      status: 'SEARCHING' as const,
      source: 'realtor',
      externalId: prop.property_id,
      sourceUrl: prop.rdc_web_url,
      images: prop.photos?.map((p: any) => p.href) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Normalize Facebook Marketplace data
   */
  private normalizeFacebookData(data: any): Property[] {
    if (!data?.data) return [];

    return data.data.map((item: any) => ({
      id: `facebook-${item.id}`,
      address: item.location?.address || '',
      city: item.location?.city || '',
      state: item.location?.state || '',
      zipCode: item.location?.zip || '',
      latitude: item.location?.latitude,
      longitude: item.location?.longitude,
      propertyType: 'SINGLE_FAMILY' as const, // Facebook doesn't always specify
      bedrooms: 0, // Parse from description if available
      bathrooms: 0,
      purchasePrice: parseFloat(item.price?.amount || '0'),
      currentValue: parseFloat(item.price?.amount || '0'),
      status: 'SEARCHING' as const,
      source: 'facebook',
      externalId: item.id,
      sourceUrl: `https://facebook.com/marketplace/item/${item.id}`,
      images: item.images?.map((img: any) => img.url) || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Map various property type formats to our enum
   */
  private mapPropertyType(type: string): any {
    const typeMap: Record<string, string> = {
      'single_family': 'SINGLE_FAMILY',
      'multi_family': 'MULTI_FAMILY',
      'condo': 'CONDO',
      'townhouse': 'TOWNHOUSE',
      'apartment': 'APARTMENT',
    };

    return typeMap[type?.toLowerCase()] || 'SINGLE_FAMILY';
  }

  /**
   * Remove duplicate properties from different sources
   */
  private deduplicateProperties(properties: Property[]): Property[] {
    const seen = new Map<string, Property>();

    properties.forEach((prop) => {
      const key = `${prop.address}-${prop.city}-${prop.zipCode}`.toLowerCase();

      if (!seen.has(key)) {
        seen.set(key, prop);
      } else {
        // Keep the one with more data
        const existing = seen.get(key)!;
        if (prop.images.length > existing.images.length) {
          seen.set(key, prop);
        }
      }
    });

    return Array.from(seen.values());
  }
}

export const propertyAggregator = new PropertyAggregator();
