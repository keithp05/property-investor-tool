/**
 * Short-Term Rental (STR) Data Service
 * Gets real occupancy rates, nightly rates, and revenue projections
 * 
 * Integrations:
 * - AirDNA API (primary - requires subscription)
 * - Mashvisor API (backup)
 * - Realistic estimation model (fallback)
 */

import axios from 'axios';

export interface STRMarketData {
  averageOccupancy: number; // percentage (0-100)
  averageDailyRate: number;
  revenuePerAvailableNight: number; // RevPAN
  seasonality: SeasonalData[];
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high';
  totalActiveListings: number;
  averageRating: number;
  regulationStatus: 'permitted' | 'restricted' | 'banned' | 'unknown';
  dataSource: 'airdna' | 'mashvisor' | 'estimated';
  lastUpdated: Date;
}

export interface SeasonalData {
  month: string;
  occupancyRate: number;
  averageDailyRate: number;
  demand: 'low' | 'medium' | 'high' | 'peak';
}

export interface STRPropertyProjection {
  estimatedOccupancy: number;
  estimatedDailyRate: number;
  estimatedMonthlyRevenue: number;
  estimatedAnnualRevenue: number;
  monthlyBreakdown: MonthlyProjection[];
  comparisonToMarket: {
    occupancyVsMarket: number; // percentage difference
    rateVsMarket: number;
    revenueVsMarket: number;
  };
  operatingCosts: {
    platformFees: number; // ~15% of revenue
    cleaning: number;
    utilities: number;
    supplies: number;
    maintenance: number;
    propertyManagement: number;
    insurance: number;
    total: number;
  };
  netOperatingIncome: number;
  setupCosts: {
    furniture: number;
    photography: number;
    initialSupplies: number;
    smartLocks: number;
    total: number;
  };
}

export interface MonthlyProjection {
  month: string;
  occupancyRate: number;
  averageDailyRate: number;
  bookedNights: number;
  grossRevenue: number;
  netRevenue: number;
}

// Seasonal occupancy patterns by region type
const SEASONAL_PATTERNS: Record<string, number[]> = {
  // Month multipliers (1.0 = average, >1 = peak, <1 = slow)
  beach: [0.6, 0.65, 0.85, 0.95, 1.1, 1.35, 1.4, 1.35, 1.0, 0.75, 0.6, 0.7],
  mountain: [0.9, 0.95, 0.85, 0.7, 0.6, 0.75, 0.9, 0.85, 0.8, 0.95, 1.0, 1.3],
  urban: [0.85, 0.85, 0.95, 1.0, 1.05, 1.1, 1.1, 1.05, 1.0, 1.0, 0.9, 0.85],
  suburban: [0.8, 0.8, 0.9, 0.95, 1.0, 1.15, 1.2, 1.15, 0.95, 0.9, 0.85, 0.85],
  rural: [0.7, 0.7, 0.8, 0.9, 1.0, 1.2, 1.3, 1.25, 1.0, 0.9, 0.75, 0.8],
  default: [0.8, 0.8, 0.9, 0.95, 1.0, 1.1, 1.15, 1.1, 1.0, 0.95, 0.85, 0.9],
};

// Base occupancy rates by market type
const BASE_OCCUPANCY_BY_MARKET: Record<string, number> = {
  'hot_tourist': 72,
  'major_city': 65,
  'college_town': 58,
  'suburban': 52,
  'rural': 45,
  'default': 55,
};

// State-level STR regulation status
const STR_REGULATIONS: Record<string, 'permitted' | 'restricted' | 'banned' | 'unknown'> = {
  'TX': 'permitted',
  'FL': 'restricted', // Many cities have restrictions
  'CA': 'restricted', // Heavy restrictions in many cities
  'AZ': 'permitted',
  'TN': 'restricted', // Nashville has strict rules
  'CO': 'restricted', // Denver/mountain towns regulated
  'NY': 'restricted', // NYC effectively banned
  'NV': 'permitted', // Vegas allows
  'HI': 'restricted',
  'GA': 'permitted',
  'NC': 'permitted',
  'SC': 'permitted',
};

class STRDataService {
  private airdnaApiKey: string | undefined;
  private mashvisorApiKey: string | undefined;

  constructor() {
    this.airdnaApiKey = process.env.AIRDNA_API_KEY;
    this.mashvisorApiKey = process.env.MASHVISOR_API_KEY;
  }

  /**
   * Get market data for a location
   */
  async getMarketData(
    city: string,
    state: string,
    zipCode: string,
    propertyType: string = 'single_family',
    bedrooms: number = 3
  ): Promise<STRMarketData> {
    // Try AirDNA first
    if (this.airdnaApiKey) {
      try {
        return await this.fetchAirDNAData(city, state, zipCode, bedrooms);
      } catch (error) {
        console.log('AirDNA API failed, falling back to estimation');
      }
    }

    // Try Mashvisor
    if (this.mashvisorApiKey) {
      try {
        return await this.fetchMashvisorData(city, state, zipCode, bedrooms);
      } catch (error) {
        console.log('Mashvisor API failed, falling back to estimation');
      }
    }

    // Fall back to estimation model
    return this.estimateMarketData(city, state, zipCode, propertyType, bedrooms);
  }

  /**
   * Fetch data from AirDNA API
   */
  private async fetchAirDNAData(
    city: string,
    state: string,
    zipCode: string,
    bedrooms: number
  ): Promise<STRMarketData> {
    // AirDNA API integration
    // Docs: https://www.airdna.co/api-documentation
    const response = await axios.get('https://api.airdna.co/v1/market/overview', {
      headers: {
        'Authorization': `Bearer ${this.airdnaApiKey}`,
      },
      params: {
        city,
        state,
        zipcode: zipCode,
        bedrooms,
      },
    });

    const data = response.data;

    return {
      averageOccupancy: data.occupancy_rate || 55,
      averageDailyRate: data.adr || 150,
      revenuePerAvailableNight: data.revpar || 82,
      seasonality: this.parseAirDNASeasonality(data.monthly_data),
      competitionLevel: this.getCompetitionLevel(data.active_listings || 0),
      totalActiveListings: data.active_listings || 0,
      averageRating: data.average_rating || 4.5,
      regulationStatus: STR_REGULATIONS[state] || 'unknown',
      dataSource: 'airdna',
      lastUpdated: new Date(),
    };
  }

  /**
   * Fetch data from Mashvisor API
   */
  private async fetchMashvisorData(
    city: string,
    state: string,
    zipCode: string,
    bedrooms: number
  ): Promise<STRMarketData> {
    // Mashvisor API integration
    // Docs: https://www.mashvisor.com/api
    const response = await axios.get(`https://api.mashvisor.com/v1.1/client/neighborhood/${zipCode}/airbnb`, {
      headers: {
        'x-api-key': this.mashvisorApiKey,
      },
      params: {
        state,
        bedrooms,
      },
    });

    const data = response.data.content;

    return {
      averageOccupancy: data.occupancy || 55,
      averageDailyRate: data.night_price || 150,
      revenuePerAvailableNight: (data.occupancy / 100) * (data.night_price || 150),
      seasonality: this.generateSeasonalData('suburban', data.occupancy, data.night_price),
      competitionLevel: this.getCompetitionLevel(data.num_of_listings || 0),
      totalActiveListings: data.num_of_listings || 0,
      averageRating: data.reviews || 4.5,
      regulationStatus: STR_REGULATIONS[state] || 'unknown',
      dataSource: 'mashvisor',
      lastUpdated: new Date(),
    };
  }

  /**
   * Estimate market data based on location characteristics
   */
  private estimateMarketData(
    city: string,
    state: string,
    zipCode: string,
    propertyType: string,
    bedrooms: number
  ): STRMarketData {
    // Determine market type based on city characteristics
    const marketType = this.classifyMarket(city, state);
    const locationType = this.classifyLocation(city, state);

    // Get base occupancy for market type
    let baseOccupancy = BASE_OCCUPANCY_BY_MARKET[marketType] || 55;

    // Adjust for bedrooms (2-3 BR typically perform best)
    if (bedrooms === 2 || bedrooms === 3) {
      baseOccupancy += 3;
    } else if (bedrooms >= 5) {
      baseOccupancy -= 5; // Larger homes have lower occupancy
    }

    // Estimate daily rate based on bedrooms and market
    const baseRate = this.estimateDailyRate(bedrooms, marketType, state);

    // Generate seasonal data
    const seasonality = this.generateSeasonalData(locationType, baseOccupancy, baseRate);

    // Calculate annual average occupancy (weighted by seasonal patterns)
    const annualOccupancy = Math.round(
      seasonality.reduce((sum, month) => sum + month.occupancyRate, 0) / 12
    );

    return {
      averageOccupancy: annualOccupancy,
      averageDailyRate: baseRate,
      revenuePerAvailableNight: Math.round((annualOccupancy / 100) * baseRate),
      seasonality,
      competitionLevel: 'medium',
      totalActiveListings: 0, // Unknown without API
      averageRating: 4.5,
      regulationStatus: STR_REGULATIONS[state] || 'unknown',
      dataSource: 'estimated',
      lastUpdated: new Date(),
    };
  }

  /**
   * Classify market type based on city
   */
  private classifyMarket(city: string, state: string): string {
    const cityLower = city.toLowerCase();
    
    // Hot tourist destinations
    const touristCities = ['miami', 'orlando', 'las vegas', 'san diego', 'honolulu', 'new orleans', 'nashville', 'austin', 'charleston', 'savannah'];
    if (touristCities.some(t => cityLower.includes(t))) return 'hot_tourist';
    
    // Major cities
    const majorCities = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'dallas', 'san jose', 'denver', 'seattle', 'boston', 'atlanta'];
    if (majorCities.some(c => cityLower.includes(c))) return 'major_city';
    
    // College towns
    const collegeTowns = ['ann arbor', 'college station', 'boulder', 'madison', 'athens', 'gainesville', 'tuscaloosa', 'clemson'];
    if (collegeTowns.some(c => cityLower.includes(c))) return 'college_town';
    
    return 'suburban';
  }

  /**
   * Classify location type for seasonality
   */
  private classifyLocation(city: string, state: string): string {
    const beachStates = ['FL', 'HI', 'CA', 'SC', 'NC'];
    const mountainStates = ['CO', 'UT', 'MT', 'WY', 'ID', 'VT'];
    
    if (beachStates.includes(state)) return 'beach';
    if (mountainStates.includes(state)) return 'mountain';
    
    const cityLower = city.toLowerCase();
    const majorCities = ['new york', 'chicago', 'los angeles', 'san francisco', 'boston', 'seattle', 'denver', 'atlanta', 'dallas', 'houston'];
    if (majorCities.some(c => cityLower.includes(c))) return 'urban';
    
    return 'suburban';
  }

  /**
   * Estimate daily rate based on property and market
   */
  private estimateDailyRate(bedrooms: number, marketType: string, state: string): number {
    // Base rates by bedroom count
    const baseRates: Record<number, number> = {
      1: 85,
      2: 120,
      3: 165,
      4: 210,
      5: 275,
      6: 350,
    };

    let rate = baseRates[bedrooms] || 165;

    // Market multipliers
    const marketMultipliers: Record<string, number> = {
      'hot_tourist': 1.6,
      'major_city': 1.3,
      'college_town': 1.0,
      'suburban': 0.9,
      'rural': 0.75,
    };

    rate *= marketMultipliers[marketType] || 1.0;

    // State cost-of-living adjustments
    const stateMultipliers: Record<string, number> = {
      'CA': 1.4,
      'NY': 1.35,
      'HI': 1.5,
      'MA': 1.25,
      'WA': 1.2,
      'CO': 1.15,
      'FL': 1.1,
      'TX': 1.0,
      'AZ': 0.95,
      'GA': 0.9,
    };

    rate *= stateMultipliers[state] || 1.0;

    return Math.round(rate);
  }

  /**
   * Generate seasonal data
   */
  private generateSeasonalData(
    locationType: string,
    baseOccupancy: number,
    baseRate: number
  ): SeasonalData[] {
    const pattern = SEASONAL_PATTERNS[locationType] || SEASONAL_PATTERNS.default;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return months.map((month, i) => {
      const multiplier = pattern[i];
      const occupancy = Math.min(95, Math.round(baseOccupancy * multiplier));
      const rate = Math.round(baseRate * (0.85 + multiplier * 0.3)); // Rate varies less than occupancy

      let demand: 'low' | 'medium' | 'high' | 'peak';
      if (multiplier >= 1.2) demand = 'peak';
      else if (multiplier >= 1.0) demand = 'high';
      else if (multiplier >= 0.8) demand = 'medium';
      else demand = 'low';

      return {
        month,
        occupancyRate: occupancy,
        averageDailyRate: rate,
        demand,
      };
    });
  }

  /**
   * Get competition level based on listing count
   */
  private getCompetitionLevel(listings: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (listings < 50) return 'low';
    if (listings < 200) return 'medium';
    if (listings < 500) return 'high';
    return 'very_high';
  }

  /**
   * Parse AirDNA seasonality data
   */
  private parseAirDNASeasonality(monthlyData: any[]): SeasonalData[] {
    if (!monthlyData || !Array.isArray(monthlyData)) {
      return this.generateSeasonalData('default', 55, 150);
    }

    return monthlyData.map(m => ({
      month: m.month,
      occupancyRate: m.occupancy || 55,
      averageDailyRate: m.adr || 150,
      demand: m.occupancy >= 75 ? 'peak' : m.occupancy >= 60 ? 'high' : m.occupancy >= 45 ? 'medium' : 'low',
    }));
  }

  /**
   * Generate property-specific revenue projection
   */
  async getPropertyProjection(
    city: string,
    state: string,
    zipCode: string,
    bedrooms: number,
    bathrooms: number,
    squareFeet: number,
    propertyType: string = 'single_family',
    amenities: string[] = []
  ): Promise<STRPropertyProjection> {
    // Get market data first
    const marketData = await this.getMarketData(city, state, zipCode, propertyType, bedrooms);

    // Adjust rates based on property specifics
    let rateMultiplier = 1.0;
    let occupancyMultiplier = 1.0;

    // Bathroom bonus (more bathrooms = higher rate)
    if (bathrooms >= bedrooms) rateMultiplier += 0.05;
    if (bathrooms >= bedrooms + 1) rateMultiplier += 0.05;

    // Size adjustments
    const avgSqftPerBedroom = 400;
    const expectedSqft = bedrooms * avgSqftPerBedroom + 600; // Base + per bedroom
    if (squareFeet > expectedSqft * 1.3) rateMultiplier += 0.1; // Large property
    if (squareFeet < expectedSqft * 0.7) rateMultiplier -= 0.1; // Small property

    // Amenity bonuses
    const premiumAmenities = ['pool', 'hot_tub', 'waterfront', 'view', 'game_room', 'theater'];
    const amenityBonus = amenities.filter(a => premiumAmenities.includes(a.toLowerCase())).length * 0.05;
    rateMultiplier += Math.min(amenityBonus, 0.2); // Cap at 20% bonus

    // Calculate adjusted rates
    const adjustedDailyRate = Math.round(marketData.averageDailyRate * rateMultiplier);
    const adjustedOccupancy = Math.min(90, Math.round(marketData.averageOccupancy * occupancyMultiplier));

    // Generate monthly breakdown
    const monthlyBreakdown: MonthlyProjection[] = marketData.seasonality.map(month => {
      const adjustedMonthOccupancy = Math.min(95, Math.round(month.occupancyRate * occupancyMultiplier));
      const adjustedMonthRate = Math.round(month.averageDailyRate * rateMultiplier);
      const daysInMonth = 30;
      const bookedNights = Math.round((adjustedMonthOccupancy / 100) * daysInMonth);
      const grossRevenue = bookedNights * adjustedMonthRate;
      const platformFees = Math.round(grossRevenue * 0.15);
      const cleaningCost = bookedNights * 75; // $75 per turnover (estimated)
      const netRevenue = grossRevenue - platformFees - cleaningCost;

      return {
        month: month.month,
        occupancyRate: adjustedMonthOccupancy,
        averageDailyRate: adjustedMonthRate,
        bookedNights,
        grossRevenue,
        netRevenue,
      };
    });

    // Calculate annual totals
    const annualGrossRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.grossRevenue, 0);
    const annualNetRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.netRevenue, 0);
    const averageMonthlyRevenue = Math.round(annualNetRevenue / 12);

    // Operating costs breakdown (annual)
    const operatingCosts = {
      platformFees: Math.round(annualGrossRevenue * 0.15),
      cleaning: monthlyBreakdown.reduce((sum, m) => sum + m.bookedNights * 75, 0),
      utilities: 2400, // ~$200/month
      supplies: 1200, // ~$100/month
      maintenance: Math.round(annualGrossRevenue * 0.05),
      propertyManagement: 0, // Self-managed assumed
      insurance: 2400, // ~$200/month for STR insurance
      total: 0,
    };
    operatingCosts.total = Object.values(operatingCosts).reduce((a, b) => a + b, 0) - operatingCosts.total;

    // Setup costs
    const setupCosts = {
      furniture: bedrooms * 3500 + 5000, // Per bedroom + common areas
      photography: 350,
      initialSupplies: 500,
      smartLocks: 250,
      total: 0,
    };
    setupCosts.total = Object.values(setupCosts).reduce((a, b) => a + b, 0) - setupCosts.total;

    return {
      estimatedOccupancy: adjustedOccupancy,
      estimatedDailyRate: adjustedDailyRate,
      estimatedMonthlyRevenue: averageMonthlyRevenue,
      estimatedAnnualRevenue: annualNetRevenue,
      monthlyBreakdown,
      comparisonToMarket: {
        occupancyVsMarket: Math.round(((adjustedOccupancy / marketData.averageOccupancy) - 1) * 100),
        rateVsMarket: Math.round(((adjustedDailyRate / marketData.averageDailyRate) - 1) * 100),
        revenueVsMarket: 0, // Would need market revenue data
      },
      operatingCosts,
      netOperatingIncome: annualNetRevenue - operatingCosts.total + operatingCosts.platformFees + operatingCosts.cleaning, // NOI before platform fees
      setupCosts,
    };
  }
}

export const strDataService = new STRDataService();
export default strDataService;
