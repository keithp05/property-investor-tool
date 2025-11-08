/**
 * HUD Fair Market Rent (FMR) API Service
 * Fetches real Section 8 housing payment standards from HUD
 * API Documentation: https://www.huduser.gov/portal/dataset/fmr-api.html
 */

interface HUDFMRResponse {
  data: {
    zip_code: string;
    year: number;
    fmr_0?: number;
    fmr_1?: number;
    fmr_2?: number;
    fmr_3?: number;
    fmr_4?: number;
  };
}

export interface Section8FMRData {
  zipCode: string;
  year: number;
  bedrooms: number;
  fmrAmount: number;
  countyName?: string;
  metroArea?: string;
  source: 'HUD_API' | 'FALLBACK';
}

class HUDApiService {
  private baseUrl = 'https://www.huduser.gov/hudapi/public/fmr';

  /**
   * Fetch Section 8 Fair Market Rent for a specific ZIP code and bedroom count
   */
  async getSection8FMR(zipCode: string, bedrooms: number): Promise<Section8FMRData> {
    try {
      console.log(`🏛️ Fetching HUD FMR for ZIP: ${zipCode}, Bedrooms: ${bedrooms}`);

      // HUD API endpoint: /data/{zip-code}?year=2024
      const year = new Date().getFullYear();
      const url = `${this.baseUrl}/data/${zipCode}?year=${year}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`⚠️ HUD API returned ${response.status}, using fallback`);
        return this.getFallbackFMR(zipCode, bedrooms);
      }

      const data: HUDFMRResponse = await response.json();

      if (!data || !data.data) {
        console.warn('⚠️ No HUD data returned, using fallback');
        return this.getFallbackFMR(zipCode, bedrooms);
      }

      // Extract FMR based on bedroom count
      const fmrKey = `fmr_${Math.min(bedrooms, 4)}` as keyof typeof data.data;
      let fmrAmount = data.data[fmrKey] as number | undefined;

      // For 5+ bedrooms, HUD uses 4BR rate + 15% per additional bedroom
      if (bedrooms > 4 && data.data.fmr_4) {
        const additionalBedrooms = bedrooms - 4;
        fmrAmount = Math.round(data.data.fmr_4 * (1 + (0.15 * additionalBedrooms)));
      }

      if (!fmrAmount) {
        console.warn('⚠️ FMR amount not found in HUD data, using fallback');
        return this.getFallbackFMR(zipCode, bedrooms);
      }

      console.log(`✅ HUD FMR found: $${fmrAmount}/month for ${bedrooms}BR`);

      return {
        zipCode,
        year: data.data.year,
        bedrooms,
        fmrAmount,
        source: 'HUD_API',
      };

    } catch (error) {
      console.error('❌ Error fetching HUD FMR:', error);
      return this.getFallbackFMR(zipCode, bedrooms);
    }
  }

  /**
   * Fallback FMR data based on Texas metro areas (2024 rates)
   * Used when HUD API is unavailable
   */
  private getFallbackFMR(zipCode: string, bedrooms: number): Section8FMRData {
    // Texas ZIP code prefixes to metro area mapping
    const texasMetroAreas: { [prefix: string]: { name: string; fmr: { [br: number]: number } } } = {
      '782': { // San Antonio area
        name: 'San Antonio',
        fmr: { 0: 936, 1: 1106, 2: 1368, 3: 1881, 4: 2257, 5: 2596, 6: 2985 }
      },
      '787': { // Austin area
        name: 'Austin',
        fmr: { 0: 1254, 1: 1401, 2: 1730, 3: 2381, 4: 2912, 5: 3349, 6: 3851 }
      },
      '770': { // Houston area
        name: 'Houston',
        fmr: { 0: 949, 1: 1090, 2: 1341, 3: 1806, 4: 2208, 5: 2539, 6: 2920 }
      },
      '752': { // Dallas area
        name: 'Dallas',
        fmr: { 0: 1031, 1: 1173, 2: 1454, 3: 1980, 4: 2436, 5: 2801, 6: 3221 }
      },
      '761': { // Fort Worth area
        name: 'Fort Worth',
        fmr: { 0: 1031, 1: 1173, 2: 1454, 3: 1980, 4: 2436, 5: 2801, 6: 3221 }
      },
      '799': { // El Paso area
        name: 'El Paso',
        fmr: { 0: 749, 1: 852, 2: 1050, 3: 1456, 4: 1755, 5: 2018, 6: 2321 }
      },
    };

    // Find matching metro area by ZIP prefix
    const zipPrefix = zipCode.substring(0, 3);
    const metroArea = texasMetroAreas[zipPrefix];

    if (metroArea) {
      const clampedBedrooms = Math.min(bedrooms, 6);
      const fmrAmount = metroArea.fmr[clampedBedrooms] || metroArea.fmr[2]; // Default to 2BR if not found

      console.log(`📊 Using fallback FMR for ${metroArea.name}: $${fmrAmount}/month`);

      return {
        zipCode,
        year: 2024,
        bedrooms: clampedBedrooms,
        fmrAmount,
        metroArea: metroArea.name,
        source: 'FALLBACK',
      };
    }

    // Default fallback if ZIP not recognized
    console.warn(`⚠️ ZIP code ${zipCode} not recognized, using default rates`);
    const defaultRates = { 0: 900, 1: 1000, 2: 1300, 3: 1800, 4: 2200, 5: 2500, 6: 2900 };
    const clampedBedrooms = Math.min(bedrooms, 6);

    return {
      zipCode,
      year: 2024,
      bedrooms: clampedBedrooms,
      fmrAmount: defaultRates[clampedBedrooms],
      source: 'FALLBACK',
    };
  }

  /**
   * Get Section 8 housing assistance contact info for a ZIP code
   */
  async getHousingAuthorityContact(zipCode: string): Promise<{
    name: string;
    phone: string;
    website: string;
  } | null> {
    // This would integrate with HUD's Public Housing Authority (PHA) database
    // For now, return basic info based on region
    const zipPrefix = zipCode.substring(0, 3);

    const phaContacts: { [prefix: string]: { name: string; phone: string; website: string } } = {
      '782': {
        name: 'San Antonio Housing Authority',
        phone: '(210) 477-6000',
        website: 'https://www.saha.org'
      },
      '787': {
        name: 'Housing Authority of the City of Austin',
        phone: '(512) 477-4488',
        website: 'https://www.hacanet.org'
      },
      '770': {
        name: 'Houston Housing Authority',
        phone: '(713) 260-0500',
        website: 'https://www.housingforhouston.com'
      },
      '752': {
        name: 'Dallas Housing Authority',
        phone: '(214) 951-8300',
        website: 'https://www.dha.org'
      },
    };

    return phaContacts[zipPrefix] || null;
  }
}

export const hudApiService = new HUDApiService();
