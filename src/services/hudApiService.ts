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
   * Fallback FMR data based on official 2025 HUD payment standards
   * Bexar County data from Housing Authority of Bexar County (HABC)
   * Used when HUD API is unavailable
   */
  private getFallbackFMR(zipCode: string, bedrooms: number): Section8FMRData {
    // 2025 Bexar County (San Antonio) Payment Standards - Official HABC Data
    const bexarCountyZipGroups: { [zip: string]: string } = {
      // Group A - Lowest rates
      '78069': 'A',
      // Group B
      '78208': 'B', '78203': 'B', '78207': 'B', '78214': 'B', '78226': 'B',
      '78237': 'B', '78225': 'B', '78073': 'B',
      // Group C
      '78211': 'C', '78228': 'C', '78210': 'C', '78227': 'C', '78223': 'C',
      '78221': 'C', '78201': 'C', '78219': 'C', '78242': 'C', '78202': 'C',
      '78224': 'C', '78238': 'C', '78218': 'C', '78264': 'C', '78002': 'C',
      // Group D
      '78263': 'D', '78280': 'D', '78213': 'D', '78283': 'D', '78054': 'D',
      '78285': 'D', '78150': 'D', '78288': 'D', '78206': 'D', '78291': 'D',
      '78241': 'D', '78292': 'D', '78246': 'D', '78293': 'D', '78265': 'D',
      '78294': 'D', '78268': 'D', '78295': 'D', '78269': 'D', '78296': 'D',
      '78270': 'D', '78297': 'D', '78278': 'D', '78298': 'D', '78279': 'D',
      '78299': 'D', '78112': 'D', '78148': 'D', '78212': 'D', '78217': 'D',
      '78220': 'D',
      // Group E
      '78222': 'E', '78230': 'E', '78243': 'E', '78245': 'E', '78204': 'E',
      '78250': 'E', '78205': 'E', '78239': 'E', '78216': 'E', '78240': 'E',
      '78229': 'E', '78248': 'E', '78231': 'E', '78152': 'E', '78235': 'E',
      '78251': 'E',
      // Group F
      '78244': 'F', '78209': 'F', '78233': 'F', '78232': 'F', '78259': 'F',
      '78247': 'F', '78253': 'F', '78109': 'F', '78256': 'F', '78249': 'F',
      '78252': 'F',
      // Group G - Highest rates
      '78255': 'G', '78254': 'G', '78215': 'G', '78023': 'G', '78260': 'G',
      '78234': 'G', '78236': 'G', '78260': 'G', '78266': 'G', '78261': 'G',
      '78258': 'G', '78257': 'G', '78015': 'G',
    };

    // 2025 HABC Payment Standards by Group (effective 01/01/2025)
    const bexarCountyRates: { [group: string]: { [br: number]: number } } = {
      'A': { 0: 800, 1: 890, 2: 1080, 3: 1370, 4: 1500 },
      'B': { 0: 900, 1: 990, 2: 1210, 3: 1540, 4: 1810 },
      'C': { 0: 980, 1: 1100, 2: 1340, 3: 1700, 4: 2030 },
      'D': { 0: 1100, 1: 1190, 2: 1500, 3: 1900, 4: 2200 },
      'E': { 0: 1200, 1: 1330, 2: 1620, 3: 2060, 4: 2450 },
      'F': { 0: 1300, 1: 1450, 2: 1770, 3: 2240, 4: 2690 },
      'G': { 0: 1540, 1: 1700, 2: 2070, 3: 2640, 4: 3100 },
    };

    // Check if ZIP is in Bexar County
    const group = bexarCountyZipGroups[zipCode];
    if (group) {
      const clampedBedrooms = Math.min(bedrooms, 4); // HABC only has 0-4BR
      const fmrAmount = bexarCountyRates[group][clampedBedrooms];

      console.log(`✅ Section 8 FMR for ${zipCode} (${clampedBedrooms}BR): $${fmrAmount}/mo (Source: HABC Group ${group})`);

      return {
        zipCode,
        year: 2025,
        bedrooms: clampedBedrooms,
        fmrAmount,
        countyName: 'Bexar County',
        metroArea: 'San Antonio',
        source: 'FALLBACK',
      };
    }

    // Texas metro areas for non-Bexar County ZIPs
    const texasMetroAreas: { [prefix: string]: { name: string; fmr: { [br: number]: number } } } = {
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
    // Check if ZIP is in Bexar County (using same mapping)
    const bexarCountyZips = [
      '78069', '78208', '78203', '78207', '78214', '78226', '78237', '78225', '78073',
      '78211', '78228', '78210', '78227', '78223', '78221', '78201', '78219', '78242',
      '78202', '78224', '78238', '78218', '78264', '78002', '78263', '78280', '78213',
      '78283', '78054', '78285', '78150', '78288', '78206', '78291', '78241', '78292',
      '78246', '78293', '78265', '78294', '78268', '78295', '78269', '78296', '78270',
      '78297', '78278', '78298', '78279', '78299', '78112', '78148', '78212', '78217',
      '78220', '78222', '78230', '78243', '78245', '78204', '78250', '78205', '78239',
      '78216', '78240', '78229', '78248', '78231', '78152', '78235', '78251', '78244',
      '78209', '78233', '78232', '78259', '78247', '78253', '78109', '78256', '78249',
      '78252', '78255', '78254', '78215', '78023', '78260', '78234', '78236', '78266',
      '78261', '78258', '78257', '78015'
    ];

    if (bexarCountyZips.includes(zipCode)) {
      return {
        name: 'Housing Authority of Bexar County (HABC)',
        phone: '(210) 477-6000',
        website: 'https://www.habctx.org'
      };
    }

    // Other Texas metro areas
    const zipPrefix = zipCode.substring(0, 3);
    const phaContacts: { [prefix: string]: { name: string; phone: string; website: string } } = {
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
