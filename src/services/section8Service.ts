/**
 * Section 8 / HUD Fair Market Rent Service
 * Fetches Fair Market Rent (FMR) data by ZIP code and bedroom count
 */

export interface Section8Data {
  zipCode: string;
  county: string;
  metroArea: string;
  year: number;
  fmr: {
    studio: number;
    oneBedroom: number;
    twoBedroom: number;
    threeBedroom: number;
    fourBedroom: number;
  };
  fmrForBedrooms: number; // FMR for the specific bedroom count
  housingAuthorityName: string;
  housingAuthorityPhone?: string;
  housingAuthorityWebsite?: string;
  percentile: number; // 40th or 50th percentile
}

/**
 * Get Section 8 Fair Market Rent data from HUD
 */
export async function getSection8FMR(
  zipCode: string,
  bedrooms: number = 3
): Promise<Section8Data | null> {
  try {
    console.log(`🏛️  Fetching Section 8 FMR for ZIP ${zipCode}, ${bedrooms} bedrooms`);

    const year = new Date().getFullYear();

    // HUD USER API - Public, free, no key required
    const response = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${zipCode}?year=${year}`,
      {
        headers: {
          'User-Agent': 'RentalIQ/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`⚠️  HUD API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.data || !data.data.basicdata) {
      console.log('⚠️  No FMR data found for this ZIP code');
      return null;
    }

    const fmrData = data.data.basicdata;

    // Extract FMR values for each bedroom count
    const fmr = {
      studio: parseFloat(fmrData.fmr_0) || 0,
      oneBedroom: parseFloat(fmrData.fmr_1) || 0,
      twoBedroom: parseFloat(fmrData.fmr_2) || 0,
      threeBedroom: parseFloat(fmrData.fmr_3) || 0,
      fourBedroom: parseFloat(fmrData.fmr_4) || 0,
    };

    // Get FMR for specific bedroom count
    let fmrForBedrooms = fmr.threeBedroom; // Default to 3BR
    switch (bedrooms) {
      case 0:
        fmrForBedrooms = fmr.studio;
        break;
      case 1:
        fmrForBedrooms = fmr.oneBedroom;
        break;
      case 2:
        fmrForBedrooms = fmr.twoBedroom;
        break;
      case 3:
        fmrForBedrooms = fmr.threeBedroom;
        break;
      case 4:
      default:
        fmrForBedrooms = fmr.fourBedroom;
        break;
    }

    // Extract housing authority info
    const state = fmrData.state_alpha || '';
    const county = fmrData.county_name || fmrData.countyname || '';
    const metroArea = fmrData.metro_name || fmrData.areaname || '';

    // Build housing authority contact info
    const housingAuthorityName = `${county} Housing Authority` || `${metroArea} Housing Authority`;
    const housingAuthorityWebsite = `https://www.hud.gov/states/${state.toLowerCase()}/renting/localresources`;

    console.log(`✅ Section 8 FMR: $${fmrForBedrooms}/month for ${bedrooms} BR`);

    return {
      zipCode,
      county,
      metroArea,
      year,
      fmr,
      fmrForBedrooms,
      housingAuthorityName,
      housingAuthorityWebsite,
      percentile: 40, // HUD FMR is typically 40th percentile
    };
  } catch (error: any) {
    console.error('❌ Section 8 FMR lookup error:', error.message);
    return null;
  }
}

/**
 * Calculate if property qualifies for Section 8 based on rent vs FMR
 */
export function isSection8Eligible(
  monthlyRent: number,
  fmr: number
): { eligible: boolean; reason: string; maxRent: number } {
  const maxRent = fmr; // FMR is the maximum rent for Section 8

  if (monthlyRent <= maxRent) {
    return {
      eligible: true,
      reason: `Rent of $${monthlyRent}/mo is at or below Section 8 FMR of $${maxRent}/mo`,
      maxRent,
    };
  } else {
    const overage = monthlyRent - maxRent;
    return {
      eligible: false,
      reason: `Rent of $${monthlyRent}/mo exceeds Section 8 FMR of $${maxRent}/mo by $${overage}`,
      maxRent,
    };
  }
}

/**
 * Get housing authority contact information by state and county
 */
export async function getHousingAuthorityContact(
  state: string,
  county: string
): Promise<any> {
  try {
    // This would ideally call a database or API with housing authority contacts
    // For now, return HUD's state page
    return {
      name: `${county} Housing Authority`,
      website: `https://www.hud.gov/states/${state.toLowerCase()}/renting/localresources`,
      phone: 'Contact local HUD office',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get historical Section 8 FMR trends (last 3 years)
 */
export async function getSection8Trends(
  zipCode: string,
  bedrooms: number = 3
): Promise<any[]> {
  try {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];

    const promises = years.map(async (year) => {
      try {
        const response = await fetch(
          `https://www.huduser.gov/hudapi/public/fmr/data/${zipCode}?year=${year}`
        );

        if (!response.ok) return null;

        const data = await response.json();
        const fmrData = data.data?.basicdata;

        if (!fmrData) return null;

        const fmrField = `fmr_${bedrooms}`;
        const fmrValue = parseFloat(fmrData[fmrField]) || 0;

        return {
          year,
          fmr: fmrValue,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r) => r !== null);
  } catch (error) {
    console.error('Section 8 trends error:', error);
    return [];
  }
}
