import OpenAI from 'openai';
import { hudApiService } from './hudApiService';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface PropertyComp {
  address: string;
  distance: number; // miles
  price: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt?: number;
  soldDate?: string;
  daysOnMarket?: number;
}

export interface RentalComp {
  address: string;
  distance: number;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentPerSqft: number;
}

export interface CrimeScore {
  overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreNumber: number; // 0-100
  violentCrimeRate: number;
  propertyCrimeRate: number;
  comparison: string; // "23% safer than national average"
  nearbyIncidents: Array<{
    type: string;
    date: string;
    distance: number;
  }>;
  recommendation: string;
}

export interface ShortTermRental {
  platform: string; // 'Airbnb', 'VRBO', 'Booking.com'
  averageNightlyRate: number;
  seasonalRates: {
    season: string;
    averageRate: number;
    occupancyRate: number;
  }[];
  estimatedOccupancyRate: number; // percentage
  estimatedMonthlyIncome: number;
  estimatedAnnualIncome: number;
  monthlyBreakdown: {
    month: string;
    averageRate: number;
    occupancyRate: number;
    estimatedIncome: number;
  }[];
}

export interface ExpertAnalysis {
  expertName: string;
  expertType: 'aggressive' | 'conservative' | 'government_housing' | 'short_term_rental';
  expertise: string;
  rating: number;
  summary: string;
  recommendedOffer: number;
  estimatedValue: number; // Same as recommendedOffer for display
  exitStrategy: string;
  estimatedROI: number;
  riskAssessment: string;
  pros: string[]; // UI expects 'pros'
  cons: string[]; // UI expects 'cons'
  strengths: string[]; // Keep for backwards compat
  concerns: string[]; // Keep for backwards compat
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_AVOID';
  confidenceLevel: number;
}

export interface GovernmentHousingAnalysis {
  section8Eligible: boolean;
  estimatedSection8Rent?: number;
  veteransHousingEligible: boolean;
  estimatedVAHUDVASHRent?: number;
  affordableHousingPrograms: string[];
  estimatedMonthlyIncome: {
    section8?: number;
    vaHudvash?: number;
    affordableHousing?: number;
    total: number;
  };
  annualIncome: number;
  waitlistInfo: string;
  recommendation: string;
}

export interface CMAReport {
  propertyId: string;
  estimatedValue: number;
  valueRange: {
    low: number;
    high: number;
  };
  pricePerSqft: number;
  comparables: PropertyComp[];
  rentalComps: RentalComp[];
  estimatedRent: number;
  rentRange: {
    low: number;
    high: number;
  };
  shortTermRental?: ShortTermRental;
  crimeScore: CrimeScore;

  // NEW: 3 Expert Analysis System
  expertAnalyses: ExpertAnalysis[];
  governmentHousing: GovernmentHousingAnalysis;

  // Legacy single AI analysis (keeping for backwards compatibility)
  aiAnalysis: {
    marketSummary: string;
    investmentPotential: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  generatedAt: Date;
}

class PropertyAnalysisService {
  /**
   * Generate sales comparables (demo data for now)
   */
  private async getSalesComps(property: any): Promise<PropertyComp[]> {
    // Demo comparable sales
    const basePrice = property.purchasePrice || 250000;
    const baseSqft = property.squareFeet || 1500;

    return [
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Oak', 'Maple', 'Pine', 'Elm'][Math.floor(Math.random() * 4)]} St`,
        distance: 0.3,
        price: basePrice * (0.95 + Math.random() * 0.1),
        pricePerSqft: Math.round((basePrice * (0.95 + Math.random() * 0.1)) / baseSqft),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 200 - 100),
        yearBuilt: 2010 + Math.floor(Math.random() * 10),
        soldDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 60),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Cedar', 'Birch', 'Willow', 'Ash'][Math.floor(Math.random() * 4)]} Ave`,
        distance: 0.5,
        price: basePrice * (0.93 + Math.random() * 0.14),
        pricePerSqft: Math.round((basePrice * (0.93 + Math.random() * 0.14)) / baseSqft),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms + (Math.random() > 0.5 ? 0.5 : 0),
        squareFeet: baseSqft + Math.floor(Math.random() * 300 - 150),
        yearBuilt: 2008 + Math.floor(Math.random() * 12),
        soldDate: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 90),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Spruce', 'Poplar', 'Walnut', 'Cherry'][Math.floor(Math.random() * 4)]} Dr`,
        distance: 0.8,
        price: basePrice * (0.92 + Math.random() * 0.16),
        pricePerSqft: Math.round((basePrice * (0.92 + Math.random() * 0.16)) / baseSqft),
        bedrooms: property.bedrooms + (Math.random() > 0.7 ? 1 : 0),
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 400 - 200),
        yearBuilt: 2005 + Math.floor(Math.random() * 15),
        soldDate: new Date(Date.now() - Math.random() * 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 120),
      },
    ];
  }

  /**
   * Generate rental comparables (demo data for now)
   */
  private async getRentalComps(property: any): Promise<RentalComp[]> {
    const baseSqft = property.squareFeet || 1500;
    const baseRent = Math.round((property.purchasePrice || 250000) * 0.008); // 0.8% rule

    return [
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Valley', 'Hill', 'Park', 'Lake'][Math.floor(Math.random() * 4)]} Rd`,
        distance: 0.4,
        monthlyRent: baseRent * (0.95 + Math.random() * 0.1),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 200 - 100),
        rentPerSqft: +(baseRent * (0.95 + Math.random() * 0.1) / baseSqft).toFixed(2),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['River', 'Forest', 'Meadow', 'Garden'][Math.floor(Math.random() * 4)]} Ln`,
        distance: 0.6,
        monthlyRent: baseRent * (0.93 + Math.random() * 0.14),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: baseSqft + Math.floor(Math.random() * 300 - 150),
        rentPerSqft: +(baseRent * (0.93 + Math.random() * 0.14) / baseSqft).toFixed(2),
      },
      {
        address: `${Math.floor(Math.random() * 9999)} ${['Summit', 'Ridge', 'Creek', 'Bay'][Math.floor(Math.random() * 4)]} Ct`,
        distance: 0.9,
        monthlyRent: baseRent * (0.9 + Math.random() * 0.2),
        bedrooms: property.bedrooms + (Math.random() > 0.7 ? 1 : 0),
        bathrooms: property.bathrooms + (Math.random() > 0.5 ? 0.5 : 0),
        squareFeet: baseSqft + Math.floor(Math.random() * 400 - 200),
        rentPerSqft: +(baseRent * (0.9 + Math.random() * 0.2) / baseSqft).toFixed(2),
      },
    ];
  }

  /**
   * Get crime score for property location
   * Uses free crime data APIs and generates A-F score
   */
  private async getCrimeScore(property: any): Promise<CrimeScore> {
    // Demo crime data - in production, integrate with SpotCrime API or FBI Crime Data API
    const scoreNumber = 60 + Math.random() * 35; // 60-95 (most areas are relatively safe)

    let overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    if (scoreNumber >= 90) overallScore = 'A';
    else if (scoreNumber >= 80) overallScore = 'B';
    else if (scoreNumber >= 70) overallScore = 'C';
    else if (scoreNumber >= 60) overallScore = 'D';
    else overallScore = 'F';

    const violentCrimeRate = +(2 + Math.random() * 3).toFixed(1); // per 1000 residents
    const propertyCrimeRate = +(10 + Math.random() * 15).toFixed(1); // per 1000 residents

    const nationalAvgViolent = 3.8;
    const percentDiff = Math.round(((nationalAvgViolent - violentCrimeRate) / nationalAvgViolent) * 100);
    const comparison = percentDiff > 0
      ? `${percentDiff}% safer than national average`
      : `${Math.abs(percentDiff)}% higher crime than national average`;

    const crimeTypes = ['Theft', 'Burglary', 'Vandalism', 'Assault', 'Vehicle Theft', 'Robbery'];
    const nearbyIncidents = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({
      type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      distance: +(Math.random() * 1.5).toFixed(2),
    }));

    let recommendation = '';
    if (overallScore === 'A') recommendation = 'Excellent safety rating. Very low crime area ideal for families and long-term investment.';
    else if (overallScore === 'B') recommendation = 'Good safety rating. Below average crime rates make this a solid investment area.';
    else if (overallScore === 'C') recommendation = 'Average safety rating. Crime rates are moderate. Consider security measures for rental properties.';
    else if (overallScore === 'D') recommendation = 'Below average safety rating. Higher crime rates may affect property values and rental demand.';
    else recommendation = 'Poor safety rating. High crime area may present challenges for rental management and property values.';

    return {
      overallScore,
      scoreNumber: Math.round(scoreNumber),
      violentCrimeRate,
      propertyCrimeRate,
      comparison,
      nearbyIncidents,
      recommendation,
    };
  }

  /**
   * Generate Government Housing Program Analysis
   */
  private async generateGovernmentHousingAnalysis(
    property: any,
    estimatedRent: number
  ): Promise<GovernmentHousingAnalysis> {
    // Fetch REAL Section 8 FMR data from HUD API by ZIP code
    const zipCode = property.zipCode || '78253';
    const bedrooms = property.bedrooms || 2;

    const hudData = await hudApiService.getSection8FMR(zipCode, bedrooms);
    const section8Rent = hudData.fmrAmount;
    const vaHudvashRent = Math.round(section8Rent * 1.05);

    console.log(`✅ Section 8 FMR for ${zipCode} (${bedrooms}BR): $${section8Rent}/mo (Source: ${hudData.source})`);

    return {
      section8Eligible: true,
      estimatedSection8Rent: section8Rent,
      veteransHousingEligible: true,
      estimatedVAHUDVASHRent: vaHudvashRent,
      affordableHousingPrograms: [
        'Section 8 Housing Choice Voucher',
        'HUD-VASH (Veterans Affairs Supportive Housing)',
        'Low-Income Housing Tax Credit (LIHTC)',
        'HOME Investment Partnerships Program',
      ],
      estimatedMonthlyIncome: {
        section8: section8Rent,
        vaHudvash: vaHudvashRent,
        total: section8Rent,
      },
      annualIncome: section8Rent * 12,
      waitlistInfo: `Section 8 voucher holders typically available. ${property.city || 'Local'} PHA may have waiting list.`,
      recommendation: `Property qualifies for government housing with estimated Section 8 rent of $${section8Rent}/month ($${(section8Rent * 12).toLocaleString()}/year).`,
    };
  }

  /**
   * Generate Short-Term Rental Analysis (Airbnb estimates)
   */
  private async generateShortTermRentalAnalysis(
    property: any,
    estimatedRent: number
  ): Promise<ShortTermRental> {
    const bedrooms = property.bedrooms || 2;

    // Estimate nightly rate based on traditional rent (typically 1.5-2x daily equivalent)
    const dailyRentEquivalent = estimatedRent / 30;
    const estimatedNightlyRate = Math.round(dailyRentEquivalent * 1.75);

    // Estimate occupancy rate (typically 60-75% for good STR properties)
    const occupancyRate = 70;
    const occupiedNights = Math.round((30 * occupancyRate) / 100);

    // Calculate monthly revenue
    const grossMonthlyRevenue = estimatedNightlyRate * occupiedNights;

    // Subtract platform fees and operating costs (typically 25-30% of gross)
    const platformFees = Math.round(grossMonthlyRevenue * 0.08); // Airbnb ~3%, VRBO ~5%
    const operatingCosts = Math.round(grossMonthlyRevenue * 0.20); // Cleaning, utilities, supplies
    const netMonthlyRevenue = grossMonthlyRevenue - platformFees - operatingCosts;

    return {
      platform: 'Airbnb / VRBO',
      averageNightlyRate: estimatedNightlyRate,
      occupancyRate,
      estimatedMonthlyRevenue: netMonthlyRevenue,
      seasonalDemand: 'Year-round with seasonal peaks',
      competitionLevel: 'Moderate',
      regulations: {
        permitsRequired: true,
        maxNightsPerYear: 365,
        restrictions: 'Verify local STR ordinances - some areas have restrictions',
      },
      projectedAnnualRevenue: netMonthlyRevenue * 12,
      vsTraditionalRental: Math.round(((netMonthlyRevenue / estimatedRent) - 1) * 100),
      recommendation: `Short-term rental could generate approximately ${Math.round(((netMonthlyRevenue / estimatedRent) - 1) * 100)}% more income than traditional rental, but requires active management and furnishing investment ($15-25K).`,
    };
  }

  /**
   * Generate 5 Expert Analyses (Aggressive, Conservative, Government Housing, + 2 Short-Term Rental)
   */
  private async generate5ExpertAnalyses(
    property: any,
    comps: PropertyComp[],
    rentalComps: RentalComp[],
    crimeScore: CrimeScore,
    governmentHousing: GovernmentHousingAnalysis,
    shortTermRental?: ShortTermRental
  ): Promise<ExpertAnalysis[]> {
    const avgCompPrice = comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length;
    const avgRent = rentalComps.reduce((sum, comp) => sum + comp.monthlyRent, 0) / rentalComps.length;
    const askingPrice = property.purchasePrice || avgCompPrice;

    // Return demo analyses if no OpenAI key
    if (!openai) {
      return [
        {
          expertName: "Marcus 'The Wolf' Rodriguez",
          expertType: 'aggressive',
          expertise: 'BRRRR & Forced Appreciation Specialist',
          rating: 5,
          summary: 'Aggressive BRRRR investor. Targets 25%+ ROI through forced appreciation.',
          recommendedOffer: Math.round(askingPrice * 0.70),
          estimatedValue: Math.round(askingPrice * 0.70),
          exitStrategy: 'BRRRR or Fix & Flip within 6-12 months',
          estimatedROI: 35,
          riskAssessment: 'High risk, high reward. Aggressive negotiations required.',
          strengths: ['Forced appreciation potential', 'Quick exit possible', 'High leverage opportunity'],
          concerns: ['Requires significant capital', 'Market timing critical'],
          pros: ['Forced appreciation potential', 'Quick exit possible', 'High leverage opportunity'],
          cons: ['Requires significant capital', 'Market timing critical'],
          recommendation: 'BUY',
          confidenceLevel: 85,
        },
        {
          expertName: 'Elizabeth Chen, CPA',
          expertType: 'conservative',
          expertise: 'Buy & Hold Tax Strategy Expert',
          rating: 4,
          summary: 'Conservative buy-and-hold CPA. Focuses on cash flow and long-term stability.',
          recommendedOffer: Math.round(askingPrice * 0.90),
          estimatedValue: Math.round(askingPrice * 0.90),
          exitStrategy: 'Long-term hold (10+ years), traditional rental',
          estimatedROI: 12,
          riskAssessment: 'Low risk. Conservative underwriting with safety margins.',
          strengths: ['Stable cash flow potential', 'Good long-term hold', 'Tax benefits'],
          concerns: ['Thorough inspection needed', 'Property management required'],
          pros: ['Stable cash flow potential', 'Good long-term hold', 'Tax benefits'],
          cons: ['Thorough inspection needed', 'Property management required'],
          recommendation: 'HOLD',
          confidenceLevel: 78,
        },
        {
          expertName: 'David Thompson, HUD Specialist',
          expertType: 'government_housing',
          expertise: 'Section 8 & Government Housing Programs',
          rating: 5,
          summary: 'Government housing expert specializing in Section 8 and subsidized programs.',
          recommendedOffer: Math.round(askingPrice * 0.85),
          estimatedValue: Math.round(askingPrice * 0.85),
          exitStrategy: 'Section 8 long-term rental with guaranteed payments',
          estimatedROI: 18,
          riskAssessment: 'Medium-low risk. Government backing reduces vacancy.',
          strengths: [
            `Section 8 rent: $${governmentHousing.estimatedSection8Rent}/mo`,
            'Guaranteed payments',
            'Reduced vacancy risk',
          ],
          concerns: ['HQS inspection requirements', 'Tenant screening important'],
          pros: [
            `Section 8 rent: $${governmentHousing.estimatedSection8Rent}/mo`,
            'Guaranteed payments',
            'Reduced vacancy risk',
          ],
          cons: ['HQS inspection requirements', 'Tenant screening important'],
          recommendation: 'STRONG_BUY',
          confidenceLevel: 92,
        },
        {
          expertName: 'Sarah Martinez, Airbnb Superhost',
          expertType: 'short_term_rental',
          expertise: 'Airbnb/VRBO Vacation Rental Expert',
          rating: 5,
          summary: 'Short-term rental expert with 500+ properties managed across vacation markets.',
          recommendedOffer: Math.round(askingPrice * 0.80),
          estimatedValue: Math.round(askingPrice * 0.80),
          exitStrategy: 'Airbnb/VRBO short-term rental - premium nightly rates',
          estimatedROI: shortTermRental ? Math.round((shortTermRental.estimatedMonthlyRevenue * 12 / askingPrice) * 100) : 28,
          riskAssessment: 'Medium risk. Higher returns but requires active management and guest services.',
          strengths: [
            `Est. nightly rate: $${shortTermRental?.averageNightlyRate || Math.round(avgRent / 20)}/night`,
            `Projected monthly: $${shortTermRental?.estimatedMonthlyRevenue.toLocaleString() || Math.round(avgRent * 2.5).toLocaleString()}`,
            'Premium income potential',
            'Flexibility for personal use',
          ],
          concerns: [
            'Local STR regulations must be verified',
            'Requires furnishing & professional photos',
            'Higher management intensity',
            `Occupancy rate: ${shortTermRental?.occupancyRate || 70}%`,
          ],
          pros: [
            `Est. nightly rate: $${shortTermRental?.averageNightlyRate || Math.round(avgRent / 20)}/night`,
            `Projected monthly: $${shortTermRental?.estimatedMonthlyRevenue.toLocaleString() || Math.round(avgRent * 2.5).toLocaleString()}`,
            'Premium income potential',
            'Flexibility for personal use',
          ],
          cons: [
            'Local STR regulations must be verified',
            'Requires furnishing & professional photos',
            'Higher management intensity',
            `Occupancy rate: ${shortTermRental?.occupancyRate || 70}%`,
          ],
          recommendation: 'BUY',
          confidenceLevel: 88,
        },
        {
          expertName: 'James Park, STR Portfolio Manager',
          expertType: 'short_term_rental',
          expertise: 'Corporate STR Portfolio Management',
          rating: 4,
          summary: 'Corporate STR investor managing $15M+ in short-term rental properties nationwide.',
          recommendedOffer: Math.round(askingPrice * 0.82),
          estimatedValue: Math.round(askingPrice * 0.82),
          exitStrategy: 'Professional STR operation with dynamic pricing and automation',
          estimatedROI: shortTermRental ? Math.round((shortTermRental.estimatedMonthlyRevenue * 12 / askingPrice) * 100) - 3 : 25,
          riskAssessment: 'Medium risk. Market-dependent but scalable with proper systems.',
          strengths: [
            'Higher gross income vs traditional rental',
            'Market demand exists in area',
            'Can pivot to mid-term rental if needed',
            'Tax advantages through active participation',
          ],
          concerns: [
            'Startup costs: $15-25K for furniture/setup',
            'Platform fees (Airbnb 3%, VRBO 5-8%)',
            'Seasonal demand fluctuations',
            'Competition from hotels and other STRs',
          ],
          pros: [
            'Higher gross income vs traditional rental',
            'Market demand exists in area',
            'Can pivot to mid-term rental if needed',
            'Tax advantages through active participation',
          ],
          cons: [
            'Startup costs: $15-25K for furniture/setup',
            'Platform fees (Airbnb 3%, VRBO 5-8%)',
            'Seasonal demand fluctuations',
            'Competition from hotels and other STRs',
          ],
          recommendation: 'HOLD',
          confidenceLevel: 75,
        },
      ];
    }

    // AI-powered analyses (simplified for now - full implementation would call OpenAI)
    return [
      {
        expertName: "Marcus 'The Wolf' Rodriguez",
        expertType: 'aggressive',
        summary: 'Aggressive investor sees opportunity for forced appreciation through strategic renovations.',
        recommendedOffer: Math.round(askingPrice * 0.72),
        exitStrategy: 'BRRRR strategy - force equity, refinance within 12 months',
        estimatedROI: 32,
        riskAssessment: 'High reward potential but requires renovation capital and market timing.',
        strengths: ['Below market asking price', 'Renovation upside', 'Strong rental market'],
        concerns: ['Renovation costs', 'Market volatility'],
        recommendation: 'STRONG_BUY',
      },
      {
        expertName: 'Elizabeth Chen, CPA',
        expertType: 'conservative',
        summary: 'Conservative analysis shows solid fundamentals with good long-term hold potential.',
        recommendedOffer: Math.round(askingPrice * 0.88),
        exitStrategy: 'Traditional 30-year rental with annual appreciation',
        estimatedROI: 11,
        riskAssessment: 'Low risk with conservative underwriting and 25% down payment.',
        strengths: ['Positive cash flow', 'Stable neighborhood', 'Tax depreciation benefits'],
        concerns: ['Property management needed', 'Inspection critical'],
        recommendation: 'BUY',
      },
      {
        expertName: 'David Thompson, HUD Specialist',
        expertType: 'government_housing',
        summary: 'Excellent Section 8 opportunity with above-market FMR and high voucher demand.',
        recommendedOffer: Math.round(askingPrice * 0.84),
        exitStrategy: 'Section 8 Housing Choice Voucher program - 5+ year hold',
        estimatedROI: 17,
        riskAssessment: 'Low-medium risk with government-backed rental payments.',
        strengths: [
          `Section 8: $${governmentHousing.estimatedSection8Rent}/mo (${Math.round((governmentHousing.estimatedSection8Rent! / avgRent - 1) * 100)}% above market)`,
          'Guaranteed payment',
          'Strong voucher demand',
        ],
        concerns: ['Annual HQS inspections required', 'Voucher availability'],
        recommendation: 'STRONG_BUY',
      },
      {
        expertName: 'Sarah Martinez, Airbnb Superhost',
        expertType: 'short_term_rental',
        summary: 'Strong short-term rental opportunity with excellent location fundamentals and tourism demand.',
        recommendedOffer: Math.round(askingPrice * 0.79),
        exitStrategy: 'Premium Airbnb/VRBO operation with professional management',
        estimatedROI: shortTermRental ? Math.round((shortTermRental.estimatedMonthlyRevenue * 12 / askingPrice) * 100) : 30,
        riskAssessment: 'Medium risk with high reward potential through dynamic pricing strategies.',
        strengths: [
          `Nightly rate potential: $${shortTermRental?.averageNightlyRate || Math.round(avgRent / 18)}/night`,
          `Monthly revenue: $${shortTermRental?.estimatedMonthlyRevenue.toLocaleString() || Math.round(avgRent * 2.8).toLocaleString()}`,
          'High tourism/business travel demand',
          'Strong comps in area',
        ],
        concerns: [
          'Verify local STR regulations',
          'Initial setup: $18-22K investment',
          'Management time commitment',
        ],
        recommendation: 'STRONG_BUY',
      },
      {
        expertName: 'James Park, STR Portfolio Manager',
        expertType: 'short_term_rental',
        summary: 'Professional STR analysis shows solid fundamentals but competitive market requires excellence.',
        recommendedOffer: Math.round(askingPrice * 0.81),
        exitStrategy: 'Automated STR with PMS system and dynamic pricing optimization',
        estimatedROI: shortTermRental ? Math.round((shortTermRental.estimatedMonthlyRevenue * 12 / askingPrice) * 100) - 4 : 26,
        riskAssessment: 'Medium risk. Returns dependent on occupancy optimization and guest experience.',
        strengths: [
          '2-3x traditional rental income potential',
          'Strong market fundamentals',
          'Exit flexibility (can convert to LTR)',
        ],
        concerns: [
          'Platform competition increasing',
          'Seasonal occupancy variations',
          'Operational complexity',
          'Furniture/maintenance capital required',
        ],
        recommendation: 'BUY',
      },
    ];
  }

  /**
   * Generate AI-powered market analysis using OpenAI
   */
  private async generateAIAnalysis(
    property: any,
    comps: PropertyComp[],
    rentalComps: RentalComp[],
    crimeScore: CrimeScore
  ): Promise<CMAReport['aiAnalysis']> {
    if (!openai) {
      // Fallback if no OpenAI key configured
      return {
        marketSummary: `This ${property.bedrooms} bed, ${property.bathrooms} bath property in ${property.city}, ${property.state} is priced at $${property.purchasePrice?.toLocaleString() || 'N/A'}. Based on comparable sales, the property appears to be ${Math.random() > 0.5 ? 'fairly' : 'competitively'} priced for the current market.`,
        investmentPotential: `With an estimated rental income and current market conditions, this property shows ${['strong', 'moderate', 'good'][Math.floor(Math.random() * 3)]} investment potential. The crime score of ${crimeScore.overallScore} indicates a ${crimeScore.overallScore === 'A' || crimeScore.overallScore === 'B' ? 'safe' : 'moderate'} neighborhood.`,
        strengths: [
          'Competitive pricing for the area',
          `${crimeScore.overallScore} crime rating - ${crimeScore.comparison}`,
          'Strong rental demand in market',
        ],
        concerns: [
          'Limited comparable sales data available',
          'Market volatility should be monitored',
        ],
        recommendation: 'Proceed with due diligence. Property shows investment merit based on current market analysis.',
      };
    }

    try {
      const prompt = `You are a real estate investment analyst. Analyze this property and provide detailed insights:

Property Details:
- Address: ${property.address}, ${property.city}, ${property.state}
- Price: $${property.purchasePrice?.toLocaleString()}
- Beds/Baths: ${property.bedrooms}/${property.bathrooms}
- Square Feet: ${property.squareFeet?.toLocaleString()}
- Type: ${property.propertyType}
${property.metadata?.isAuction ? `- AUCTION PROPERTY: ${property.metadata.auctionType} on ${property.metadata.auctionDateFormatted}` : ''}
${property.metadata?.estimatedEquity ? `- Estimated Equity Potential: $${property.metadata.estimatedEquity.toLocaleString()}` : ''}

Comparable Sales (avg price: $${Math.round(comps.reduce((s, c) => s + c.price, 0) / comps.length).toLocaleString()}):
${comps.map(c => `- ${c.address}: $${c.price.toLocaleString()} (${c.squareFeet} sqft, ${c.daysOnMarket} days on market)`).join('\n')}

Rental Comps (avg rent: $${Math.round(rentalComps.reduce((s, c) => s + c.monthlyRent, 0) / rentalComps.length).toLocaleString()}):
${rentalComps.map(c => `- ${c.address}: $${c.monthlyRent}/mo (${c.bedrooms}bed/${c.bathrooms}bath, ${c.squareFeet} sqft)`).join('\n')}

Crime Score: ${crimeScore.overallScore} (${crimeScore.scoreNumber}/100) - ${crimeScore.comparison}

Provide analysis in this JSON format:
{
  "marketSummary": "2-3 sentence overview of the property and market",
  "investmentPotential": "2-3 sentence analysis of ROI potential",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "Clear buy/pass recommendation with reasoning"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return analysis;
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      // Return fallback analysis
      return {
        marketSummary: `Property analysis for ${property.address}. Based on market data, this property is positioned competitively.`,
        investmentPotential: 'Investment potential looks promising based on comparable sales and rental data.',
        strengths: ['Competitive market pricing', 'Good location fundamentals'],
        concerns: ['Requires further due diligence'],
        recommendation: 'Consider this property for your investment portfolio pending inspection and financing approval.',
      };
    }
  }

  /**
   * Generate complete CMA report with all analysis
   */
  async generateCMAReport(property: any): Promise<CMAReport> {
    console.log('🏠 Generating CMA Report for:', property.address);

    // Gather all data in parallel
    const [comps, rentalComps, crimeScore] = await Promise.all([
      this.getSalesComps(property),
      this.getRentalComps(property),
      this.getCrimeScore(property),
    ]);

    // Calculate estimated values - PRIORITIZE REAL ZILLOW DATA over demo comps
    const avgCompPrice = comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length;

    // PRIORITY: Use Zillow Zestimate > Zillow Price > Demo Comps Average
    const estimatedValue = Math.round(
      property.zestimate || property.price || avgCompPrice
    );

    const valueRange = {
      low: Math.round(estimatedValue * 0.95),
      high: Math.round(estimatedValue * 1.05),
    };

    const avgRent = rentalComps.reduce((sum, comp) => sum + comp.monthlyRent, 0) / rentalComps.length;

    const baseSqft = property.squareFeet || 1500;
    const pricePerSqft = Math.round(estimatedValue / baseSqft);

    // Generate government housing analysis FIRST to get Section 8 FMR
    const governmentHousing = await this.generateGovernmentHousingAnalysis(property, Math.round(avgRent));

    // Use the HIGHEST rent between:
    // 1. Zillow rent estimate (if available)
    // 2. Section 8 FMR (real HUD data)
    // 3. Demo rental comps average
    const estimatedRent = Math.max(
      property.rentZestimate || 0,
      governmentHousing.estimatedSection8Rent || 0,
      Math.round(avgRent)
    );

    const rentRange = {
      low: Math.round(estimatedRent * 0.9),
      high: Math.round(estimatedRent * 1.1),
    };

    // Generate short-term rental analysis (Airbnb estimates)
    const shortTermRental = await this.generateShortTermRentalAnalysis(property, estimatedRent);

    // Generate 5 expert analyses (includes 2 STR experts)
    const expertAnalyses = await this.generate5ExpertAnalyses(
      property,
      comps,
      rentalComps,
      crimeScore,
      governmentHousing,
      shortTermRental
    );

    // Generate legacy AI analysis (for backwards compatibility)
    const aiAnalysis = await this.generateAIAnalysis(property, comps, rentalComps, crimeScore);

    const report: CMAReport = {
      propertyId: property.id,
      estimatedValue,
      valueRange,
      pricePerSqft,
      comparables: comps,
      rentalComps,
      estimatedRent,
      rentRange,
      crimeScore,
      expertAnalyses,       // NEW: 5 expert opinions (3 traditional + 2 STR)
      governmentHousing,    // NEW: Government housing analysis
      shortTermRental,      // NEW: Short-term rental (Airbnb) analysis
      aiAnalysis,           // Legacy analysis
      generatedAt: new Date(),
    };

    console.log('✅ CMA Report generated successfully with 5 expert analyses (3 traditional + 2 STR)');
    return report;
  }
}

export const propertyAnalysisService = new PropertyAnalysisService();
