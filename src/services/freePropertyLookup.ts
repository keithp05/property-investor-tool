/**
 * Free Property Lookup Service
 * Uses free alternatives to paid APIs:
 * 1. Zillow public website scraping
 * 2. Redfin public API
 * 3. Realtor.com scraping
 */

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  propertyType?: string;
  estimatedValue?: number;
  marketRent?: number;
  lastSoldPrice?: number;
  lastSoldDate?: string;
  taxAssessedValue?: number;
  lotSize?: number;
  zpid?: string;
  zillowUrl?: string;
  section8FMR?: number;
  section8ContactName?: string;
  section8ContactPhone?: string;
  section8ContactWebsite?: string;
}

/**
 * Search Redfin - They have a public API that returns JSON
 */
async function searchRedfin(address: string): Promise<PropertyData | null> {
  try {
    console.log('🔍 Searching Redfin for:', address);

    // Redfin's public search API
    const searchUrl = `https://www.redfin.com/stingray/do/location-autocomplete?location=${encodeURIComponent(address)}&start=0&count=10&v=2&market=dc&al=1&iss=false&ooa=true&mrs=false`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.log('⚠️  Redfin search failed:', response.status);
      return null;
    }

    const text = await response.text();
    // Redfin returns JSON wrapped in {}&&
    const jsonText = text.replace(/^{}&&/, '');
    const data = JSON.parse(jsonText);

    if (!data.payload || !data.payload.sections || data.payload.sections.length === 0) {
      console.log('⚠️  No Redfin results found');
      return null;
    }

    // Get the first result
    const results = data.payload.sections[0]?.rows || [];
    if (results.length === 0) {
      return null;
    }

    const property = results[0];

    // Now fetch property details
    if (property.url) {
      const detailsUrl = `https://www.redfin.com${property.url}`;
      console.log('📊 Fetching Redfin property details...');

      const detailsResponse = await fetch(detailsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (detailsResponse.ok) {
        const html = await detailsResponse.text();

        // Extract property data from meta tags and structured data
        const propertyData = extractRedfinData(html, property);
        console.log('✅ Found property on Redfin');
        return propertyData;
      }
    }

    return null;
  } catch (error: any) {
    console.error('❌ Redfin search error:', error.message);
    return null;
  }
}

function extractRedfinData(html: string, searchResult: any): PropertyData | null {
  try {
    // Extract structured data
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    let structuredData: any = null;

    if (ldJsonMatch) {
      try {
        structuredData = JSON.parse(ldJsonMatch[1]);
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Extract beds/baths from meta tags
    const bedsMatch = html.match(/<meta property="og:redfin_property:beds" content="(\d+)">/);
    const bathsMatch = html.match(/<meta property="og:redfin_property:baths" content="([\d.]+)">/);
    const sqftMatch = html.match(/<meta property="og:redfin_property:sqft" content="(\d+)">/);
    const yearMatch = html.match(/<meta property="og:redfin_property:year_built" content="(\d+)">/);
    const priceMatch = html.match(/<meta property="og:redfin_property:price" content="(\d+)">/);

    // Parse address from structured data
    const address = structuredData?.address || searchResult;

    return {
      address: address.streetAddress || searchResult.name?.split(',')[0] || '',
      city: address.addressLocality || searchResult.subName?.split(',')[0] || '',
      state: address.addressRegion || '',
      zipCode: address.postalCode || '',
      bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : undefined,
      bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : undefined,
      squareFeet: sqftMatch ? parseInt(sqftMatch[1]) : undefined,
      yearBuilt: yearMatch ? parseInt(yearMatch[1]) : undefined,
      estimatedValue: priceMatch ? parseInt(priceMatch[1]) : undefined,
      propertyType: searchResult.type === 1 ? 'SINGLE_FAMILY' : 'UNKNOWN',
    };
  } catch (error) {
    console.error('Error extracting Redfin data:', error);
    return null;
  }
}

/**
 * Search Zillow public website
 */
async function searchZillow(address: string): Promise<PropertyData | null> {
  try {
    console.log('🏠 Searching Zillow public website for:', address);

    // Format address for Zillow URL
    const formattedAddress = address
      .toLowerCase()
      .replace(/[^\w\s,]/g, '')
      .replace(/\s+/g, '-')
      .replace(/,/g, '');

    const zillowUrl = `https://www.zillow.com/homes/${formattedAddress}_rb/`;

    const response = await fetch(zillowUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log('⚠️  Zillow request failed:', response.status);
      return null;
    }

    const html = await response.text();

    // Look for property data in the HTML
    const propertyData = extractZillowData(html, address);

    if (propertyData) {
      console.log('✅ Found property on Zillow');
    }

    return propertyData;
  } catch (error: any) {
    console.error('❌ Zillow search error:', error.message);
    return null;
  }
}

function extractZillowData(html: string, originalAddress: string): PropertyData | null {
  try {
    // Zillow embeds data in JavaScript variables and meta tags

    // Extract ZPID
    const zpidMatch = html.match(/"zpid":(\d+)/);
    const zpid = zpidMatch ? zpidMatch[1] : null;

    // Extract property details from meta tags
    const bedsMatch = html.match(/"bedrooms":(\d+)/);
    const bathsMatch = html.match(/"bathrooms":([\d.]+)/);
    const sqftMatch = html.match(/"livingArea":(\d+)/);
    const yearMatch = html.match(/"yearBuilt":(\d+)/);
    const priceMatch = html.match(/"price":(\d+)/);
    const addressMatch = html.match(/"streetAddress":"([^"]+)"/);
    const cityMatch = html.match(/"addressLocality":"([^"]+)"/);
    const stateMatch = html.match(/"addressRegion":"([^"]+)"/);
    const zipMatch = html.match(/"postalCode":"([^"]+)"/);

    if (!addressMatch) {
      return null;
    }

    return {
      address: addressMatch[1] || originalAddress.split(',')[0],
      city: cityMatch ? cityMatch[1] : '',
      state: stateMatch ? stateMatch[1] : '',
      zipCode: zipMatch ? zipMatch[1] : '',
      bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : undefined,
      bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : undefined,
      squareFeet: sqftMatch ? parseInt(sqftMatch[1]) : undefined,
      yearBuilt: yearMatch ? parseInt(yearMatch[1]) : undefined,
      estimatedValue: priceMatch ? parseInt(priceMatch[1]) : undefined,
      zpid: zpid || undefined,
      zillowUrl: zpid ? `https://www.zillow.com/homedetails/${zpid}_zpid/` : undefined,
    };
  } catch (error) {
    console.error('Error extracting Zillow data:', error);
    return null;
  }
}

/**
 * Get HUD Fair Market Rent data for Section 8
 */
async function getSection8Data(city: string, state: string, zipCode: string, bedrooms: number = 3): Promise<Partial<PropertyData>> {
  try {
    console.log('🏛️  Fetching Section 8 FMR data...');

    // HUD's public FMR API
    const year = new Date().getFullYear();
    const hudUrl = `https://www.huduser.gov/hudapi/public/fmr/data/${zipCode}?year=${year}`;

    const response = await fetch(hudUrl);
    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    if (data.data && data.data.basicdata) {
      const fmrData = data.data.basicdata;

      // Get FMR for the specified bedroom count (default 3br)
      const fmrField = `fmr_${bedrooms}`;
      const fmr = fmrData[fmrField];

      return {
        section8FMR: fmr ? parseFloat(fmr) : undefined,
        section8ContactName: fmrData.metro_name || `${city}, ${state} Housing Authority`,
        section8ContactWebsite: `https://www.hud.gov/states/${state.toLowerCase()}/renting/tenantrights`,
      };
    }

    return {};
  } catch (error) {
    console.error('Error fetching Section 8 data:', error);
    return {};
  }
}

/**
 * Main lookup function - tries all free sources
 */
export async function freePropertyLookup(address: string): Promise<PropertyData | null> {
  console.log('🔍 Starting free property lookup for:', address);

  // Try Redfin first (most reliable free API)
  let propertyData = await searchRedfin(address);

  // If Redfin fails, try Zillow scraping
  if (!propertyData) {
    propertyData = await searchZillow(address);
  }

  if (!propertyData) {
    console.log('❌ Property not found in any free source');
    return null;
  }

  // Enrich with Section 8 data if we have location info
  if (propertyData.city && propertyData.state && propertyData.zipCode) {
    const section8Data = await getSection8Data(
      propertyData.city,
      propertyData.state,
      propertyData.zipCode,
      propertyData.bedrooms
    );

    propertyData = { ...propertyData, ...section8Data };
  }

  console.log('✅ Property lookup complete');
  return propertyData;
}
