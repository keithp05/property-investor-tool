/**
 * Airbnb Scraper Service
 * Scrapes Airbnb data for short-term rental market analysis
 */

export interface AirbnbListing {
  id: string;
  title: string;
  address: string;
  price: number; // Per night
  bedrooms: number;
  bathrooms: number;
  accommodates: number;
  rating: number;
  reviewCount: number;
  url: string;
  imageUrl?: string;
  amenities?: string[];
  superhost?: boolean;
  monthlyPrice?: number;
  weeklyPrice?: number;
}

export interface ShortTermRentalAnalysis {
  averageDailyRate: number;
  averageMonthlyRevenue: number;
  occupancyRate: number;
  totalListings: number;
  competitionLevel: 'Low' | 'Medium' | 'High';
  profitabilityScore: number; // 0-100
  listings: AirbnbListing[];
  insights: {
    bestPriceRange: string;
    mostCommonBedrooms: number;
    averageRating: number;
    superhostPercentage: number;
  };
}

/**
 * Search Airbnb listings in an area
 */
export async function searchAirbnbListings(
  city: string,
  state: string,
  zipCode?: string,
  bedrooms?: number
): Promise<AirbnbListing[]> {
  try {
    console.log(`🏠 Searching Airbnb listings in ${city}, ${state}`);

    const searchQuery = zipCode || `${city}, ${state}`;
    const airbnbUrl = `https://www.airbnb.com/s/${encodeURIComponent(searchQuery)}/homes`;

    // Use Bright Data to scrape Airbnb
    const response = await fetch('https://api.brightdata.com/datasets/v3/trigger', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_id: process.env.BRIGHT_DATA_DATASET_ID,
        include_errors: true,
        discover_by: [
          {
            url: airbnbUrl,
            filters: bedrooms ? { bedrooms } : undefined,
          }
        ],
      }),
    });

    const triggerResult = await response.json();
    const snapshotId = triggerResult.snapshot_id || triggerResult;

    if (!snapshotId) {
      console.log('⚠️  No Airbnb snapshot ID');
      return [];
    }

    console.log(`📊 Polling Airbnb listings snapshot: ${snapshotId}`);

    // Poll for results (max 30 seconds for Airbnb)
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const snapshotResponse = await fetch(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
          },
        }
      );

      if (snapshotResponse.ok) {
        const data = await snapshotResponse.json();

        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ Found ${data.length} Airbnb listings`);

          return data.map((listing: any) => ({
            id: listing.id || listing.listing_id || '',
            title: listing.title || listing.name || '',
            address: listing.address || `${city}, ${state}`,
            price: parseFloat(listing.price || listing.price_per_night || 0),
            bedrooms: parseInt(listing.bedrooms || listing.bedroom_count || 1),
            bathrooms: parseFloat(listing.bathrooms || listing.bathroom_count || 1),
            accommodates: parseInt(listing.guests || listing.accommodates || 2),
            rating: parseFloat(listing.rating || listing.average_rating || 0),
            reviewCount: parseInt(listing.reviews || listing.review_count || 0),
            url: listing.url || listing.listing_url || '',
            imageUrl: listing.image || listing.photo_url,
            amenities: listing.amenities || [],
            superhost: listing.superhost || listing.is_superhost || false,
            monthlyPrice: listing.monthly_price || listing.price * 30 * 0.7, // Estimate with discount
            weeklyPrice: listing.weekly_price || listing.price * 7 * 0.85, // Estimate with discount
          }));
        }
      }
    }

    console.log('⚠️  Timeout waiting for Airbnb data');
    return [];
  } catch (error: any) {
    console.error('❌ Airbnb scraper error:', error.message);
    return [];
  }
}

/**
 * Analyze short-term rental market for a property
 */
export async function analyzeShortTermRentalMarket(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  bedrooms: number,
  squareFeet?: number
): Promise<ShortTermRentalAnalysis> {
  try {
    console.log(`📊 Analyzing STR market for ${bedrooms}BR in ${city}, ${state}`);

    // Search comparable Airbnb listings
    const listings = await searchAirbnbListings(city, state, zipCode, bedrooms);

    if (listings.length === 0) {
      // Return default analysis if no data
      return {
        averageDailyRate: 100,
        averageMonthlyRevenue: 2000,
        occupancyRate: 65,
        totalListings: 0,
        competitionLevel: 'Low',
        profitabilityScore: 50,
        listings: [],
        insights: {
          bestPriceRange: '$80-120/night',
          mostCommonBedrooms: bedrooms,
          averageRating: 4.5,
          superhostPercentage: 30,
        },
      };
    }

    // Calculate metrics
    const prices = listings.map(l => l.price).filter(p => p > 0);
    const averageDailyRate = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Estimate occupancy rate based on competition
    const competitionLevel = listings.length > 50 ? 'High' : listings.length > 20 ? 'Medium' : 'Low';
    const baseOccupancy = competitionLevel === 'High' ? 60 : competitionLevel === 'Medium' ? 70 : 75;

    // Adjust occupancy based on average rating
    const averageRating = listings.reduce((a, b) => a + b.rating, 0) / listings.length;
    const ratingAdjustment = (averageRating - 4.0) * 5; // +/- 5% per 0.1 rating
    const occupancyRate = Math.max(40, Math.min(90, baseOccupancy + ratingAdjustment));

    // Calculate monthly revenue
    const daysPerMonth = 30;
    const occupiedDays = daysPerMonth * (occupancyRate / 100);
    const averageMonthlyRevenue = Math.round(averageDailyRate * occupiedDays);

    // Calculate profitability score
    const profitabilityScore = Math.min(100, Math.round(
      (averageDailyRate / 100) * 20 + // Price factor
      occupancyRate * 0.5 + // Occupancy factor
      (75 - listings.length) * 0.3 // Competition factor (inverse)
    ));

    // Find most common bedroom count
    const bedroomCounts = listings.reduce((acc: any, l) => {
      acc[l.bedrooms] = (acc[l.bedrooms] || 0) + 1;
      return acc;
    }, {});
    const mostCommonBedrooms = parseInt(
      Object.entries(bedroomCounts)
        .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || bedrooms
    );

    // Calculate superhosts percentage
    const superhosts = listings.filter(l => l.superhost).length;
    const superhostPercentage = Math.round((superhosts / listings.length) * 100);

    // Determine best price range
    const sortedPrices = prices.sort((a, b) => a - b);
    const p25 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const p75 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
    const bestPriceRange = `$${Math.round(p25)}-${Math.round(p75)}/night`;

    return {
      averageDailyRate: Math.round(averageDailyRate),
      averageMonthlyRevenue,
      occupancyRate: Math.round(occupancyRate),
      totalListings: listings.length,
      competitionLevel,
      profitabilityScore,
      listings: listings.slice(0, 10), // Return top 10 comparables
      insights: {
        bestPriceRange,
        mostCommonBedrooms,
        averageRating: Math.round(averageRating * 10) / 10,
        superhostPercentage,
      },
    };
  } catch (error: any) {
    console.error('❌ STR analysis error:', error.message);
    throw error;
  }
}

/**
 * Get VRBO/HomeAway listings (alternative to Airbnb)
 */
export async function searchVRBOListings(
  city: string,
  state: string,
  zipCode?: string
): Promise<any[]> {
  try {
    console.log(`🏠 Searching VRBO listings in ${city}, ${state}`);

    const searchQuery = zipCode || `${city}-${state}`;
    const vrboUrl = `https://www.vrbo.com/search/keywords:${encodeURIComponent(searchQuery)}`;

    const response = await fetch('https://api.brightdata.com/datasets/v3/trigger', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_id: process.env.BRIGHT_DATA_DATASET_ID,
        include_errors: true,
        discover_by: [{ url: vrboUrl }],
      }),
    });

    const triggerResult = await response.json();
    const snapshotId = triggerResult.snapshot_id || triggerResult;

    if (!snapshotId) {
      return [];
    }

    // Poll for results
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const snapshotResponse = await fetch(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
          },
        }
      );

      if (snapshotResponse.ok) {
        const data = await snapshotResponse.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ Found ${data.length} VRBO listings`);
          return data;
        }
      }
    }

    return [];
  } catch (error: any) {
    console.error('❌ VRBO scraper error:', error.message);
    return [];
  }
}
