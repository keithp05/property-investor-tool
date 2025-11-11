/**
 * Comparative Market Analysis (CMA) Service
 * Analyzes comparable properties to estimate market value and rent
 */

import axios from 'axios';

export interface ComparableProperty {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  price: number;
  rentEstimate?: number;
  daysOnMarket?: number;
  yearBuilt?: number;
  propertyType: string;
  distanceMiles?: number;
  similarity: number; // 0-100 score
}

export interface CMAResult {
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  estimatedRent: number;
  rentLow: number;
  rentHigh: number;
  pricePerSqFt: number;
  rentPerSqFt: number;
  comparableCount: number;
  comparables: ComparableProperty[];
  confidence: 'Low' | 'Medium' | 'High';
  marketTrend: 'Declining' | 'Stable' | 'Appreciating';
  insights: string[];
}

/**
 * Calculate similarity score between subject property and comparable
 */
function calculateSimilarity(
  subject: {
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    yearBuilt?: number;
    propertyType: string;
  },
  comp: ComparableProperty
): number {
  let score = 100;

  // Bedroom difference (max -20 points)
  const bedroomDiff = Math.abs(subject.bedrooms - comp.bedrooms);
  score -= Math.min(bedroomDiff * 10, 20);

  // Bathroom difference (max -15 points)
  const bathroomDiff = Math.abs(subject.bathrooms - comp.bathrooms);
  score -= Math.min(bathroomDiff * 7.5, 15);

  // Square footage difference (max -25 points)
  const sqFtDiff = Math.abs(subject.squareFeet - comp.squareFeet);
  const sqFtPercentDiff = sqFtDiff / subject.squareFeet;
  score -= Math.min(sqFtPercentDiff * 100, 25);

  // Year built difference (max -15 points)
  if (subject.yearBuilt && comp.yearBuilt) {
    const yearDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
    score -= Math.min(yearDiff / 2, 15);
  }

  // Property type mismatch (-20 points)
  if (subject.propertyType !== comp.propertyType) {
    score -= 20;
  }

  // Distance penalty (max -10 points)
  if (comp.distanceMiles) {
    score -= Math.min(comp.distanceMiles * 2, 10);
  }

  return Math.max(score, 0);
}

/**
 * Generate CMA using RapidAPI Zillow comparable properties
 */
export async function generateCMA(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  bedrooms: number,
  bathrooms: number,
  squareFeet: number,
  yearBuilt?: number,
  propertyType: string = 'SINGLE_FAMILY'
): Promise<CMAResult | null> {
  try {
    console.log(`📊 Generating CMA for ${address}, ${city}, ${state}`);

    // Search for comparable properties in the area
    const apiKey = process.env.ZILLOW_API_KEY || '';
    if (!apiKey) {
      console.error('❌ ZILLOW_API_KEY not configured');
      return null;
    }

    // Search for properties in the same ZIP code
    const searchResponse = await axios.get(
      'https://zillow-com1.p.rapidapi.com/propertyExtendedSearch',
      {
        params: {
          location: `${city}, ${state} ${zipCode}`,
          status_type: 'RecentlySold',
          page: 1,
          home_type: propertyType,
        },
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
        },
        timeout: 15000,
      }
    );

    const comparables: ComparableProperty[] = [];

    // Process search results
    if (searchResponse.data && Array.isArray(searchResponse.data)) {
      for (const property of searchResponse.data.slice(0, 20)) {
        // Skip if missing critical data
        if (!property.price || !property.bedrooms || !property.livingArea) {
          continue;
        }

        const comp: ComparableProperty = {
          address: property.streetAddress || property.address || 'N/A',
          city: property.city || city,
          state: property.state || state,
          zipCode: property.zipcode || zipCode,
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 0,
          squareFeet: property.livingArea || 0,
          price: property.price || 0,
          rentEstimate: property.rentZestimate || undefined,
          daysOnMarket: property.daysOnZillow || undefined,
          yearBuilt: property.yearBuilt || undefined,
          propertyType: property.homeType || propertyType,
          similarity: 0,
        };

        // Calculate similarity
        comp.similarity = calculateSimilarity(
          { bedrooms, bathrooms, squareFeet, yearBuilt, propertyType },
          comp
        );

        comparables.push(comp);
      }
    }

    // Sort by similarity
    comparables.sort((a, b) => b.similarity - a.similarity);

    // Take top 10 most similar
    const topComparables = comparables.slice(0, 10);

    if (topComparables.length === 0) {
      console.log('⚠️  No comparable properties found');
      return null;
    }

    console.log(`✅ Found ${topComparables.length} comparable properties`);

    // Calculate estimated value (weighted by similarity)
    let totalWeightedValue = 0;
    let totalWeight = 0;

    topComparables.forEach((comp) => {
      const weight = comp.similarity / 100;
      totalWeightedValue += comp.price * weight;
      totalWeight += weight;
    });

    const estimatedValue = Math.round(totalWeightedValue / totalWeight);

    // Calculate value range (±10%)
    const valueLow = Math.round(estimatedValue * 0.9);
    const valueHigh = Math.round(estimatedValue * 1.1);

    // Calculate estimated rent (weighted by similarity)
    let totalWeightedRent = 0;
    let rentWeight = 0;

    topComparables.forEach((comp) => {
      if (comp.rentEstimate && comp.rentEstimate > 0) {
        const weight = comp.similarity / 100;
        totalWeightedRent += comp.rentEstimate * weight;
        rentWeight += weight;
      }
    });

    const estimatedRent =
      rentWeight > 0 ? Math.round(totalWeightedRent / rentWeight) : Math.round(estimatedValue * 0.005);

    // Calculate rent range (±10%)
    const rentLow = Math.round(estimatedRent * 0.9);
    const rentHigh = Math.round(estimatedRent * 1.1);

    // Calculate price per sqft
    const pricePerSqFt = Math.round(estimatedValue / squareFeet);
    const rentPerSqFt = parseFloat((estimatedRent / squareFeet).toFixed(2));

    // Determine confidence level
    const avgSimilarity =
      topComparables.reduce((sum, c) => sum + c.similarity, 0) / topComparables.length;
    const confidence: 'Low' | 'Medium' | 'High' =
      avgSimilarity >= 80 ? 'High' : avgSimilarity >= 60 ? 'Medium' : 'Low';

    // Determine market trend (simplified - based on days on market)
    const avgDaysOnMarket =
      topComparables.filter((c) => c.daysOnMarket).reduce((sum, c) => sum + (c.daysOnMarket || 0), 0) /
      topComparables.filter((c) => c.daysOnMarket).length;

    const marketTrend: 'Declining' | 'Stable' | 'Appreciating' =
      avgDaysOnMarket < 30 ? 'Appreciating' : avgDaysOnMarket < 60 ? 'Stable' : 'Declining';

    // Generate insights
    const insights: string[] = [];

    insights.push(`Analyzed ${topComparables.length} comparable properties in ${city}, ${state}`);
    insights.push(`Average similarity score: ${avgSimilarity.toFixed(0)}%`);
    insights.push(`Price per square foot: $${pricePerSqFt}`);
    insights.push(`Estimated monthly rent: $${estimatedRent}`);

    if (marketTrend === 'Appreciating') {
      insights.push('⬆️ Market is appreciating - properties selling quickly');
    } else if (marketTrend === 'Declining') {
      insights.push('⬇️ Market is cooling - properties taking longer to sell');
    } else {
      insights.push('➡️ Market is stable');
    }

    return {
      estimatedValue,
      valueLow,
      valueHigh,
      estimatedRent,
      rentLow,
      rentHigh,
      pricePerSqFt,
      rentPerSqFt,
      comparableCount: topComparables.length,
      comparables: topComparables,
      confidence,
      marketTrend,
      insights,
    };
  } catch (error: any) {
    console.error('❌ CMA generation error:', error.message);
    return null;
  }
}

/**
 * Get area rent analysis from multiple sources
 */
export async function getAreaRentAnalysis(
  city: string,
  state: string,
  zipCode: string,
  bedrooms: number
): Promise<{
  averageRent: number;
  medianRent: number;
  rentLow: number;
  rentHigh: number;
  sampleSize: number;
  sources: string[];
}> {
  try {
    console.log(`🏘️  Analyzing area rents for ${city}, ${state} (${bedrooms} BR)`);

    const apiKey = process.env.ZILLOW_API_KEY || '';

    // Search for rental listings in the area
    const response = await axios.get(
      'https://zillow-com1.p.rapidapi.com/propertyExtendedSearch',
      {
        params: {
          location: `${city}, ${state} ${zipCode}`,
          status_type: 'ForRent',
          page: 1,
          bedsMin: bedrooms,
          bedsMax: bedrooms,
        },
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
        },
        timeout: 15000,
      }
    );

    const rents: number[] = [];

    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((property: any) => {
        if (property.price && property.price > 0) {
          rents.push(property.price);
        }
      });
    }

    if (rents.length === 0) {
      console.log('⚠️  No rental data found');
      return {
        averageRent: 0,
        medianRent: 0,
        rentLow: 0,
        rentHigh: 0,
        sampleSize: 0,
        sources: ['Zillow'],
      };
    }

    // Sort rents
    rents.sort((a, b) => a - b);

    // Calculate statistics
    const averageRent = Math.round(rents.reduce((sum, r) => sum + r, 0) / rents.length);
    const medianRent = rents[Math.floor(rents.length / 2)];
    const rentLow = rents[Math.floor(rents.length * 0.25)]; // 25th percentile
    const rentHigh = rents[Math.floor(rents.length * 0.75)]; // 75th percentile

    console.log(`✅ Area rent analysis: $${averageRent}/mo average (${rents.length} samples)`);

    return {
      averageRent,
      medianRent,
      rentLow,
      rentHigh,
      sampleSize: rents.length,
      sources: ['Zillow'],
    };
  } catch (error: any) {
    console.error('❌ Area rent analysis error:', error.message);
    return {
      averageRent: 0,
      medianRent: 0,
      rentLow: 0,
      rentHigh: 0,
      sampleSize: 0,
      sources: [],
    };
  }
}
