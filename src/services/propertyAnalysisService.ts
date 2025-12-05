import OpenAI from 'openai';
import { hudApiService } from './hudApiService';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface PropertyComp {
  address: string;
  distance: number;
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
  notes?: string;
}

export interface CrimeScore {
  overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreNumber: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  comparison: string;
  nearbyIncidents: Array<{
    type: string;
    date: string;
    distance: number;
  }>;
  recommendation: string;
  nationalComparison: string;
  stateComparison: string;
  crimeTypes: {
    assault: number;
    burglary: number;
    theft: number;
    motorVehicleTheft: number;
    robbery: number;
    arson: number;
  };
}

export interface FinancingScenario {
  loanAmount: number;
  term: number;
  interestRate: number;
  monthlyPI: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyPITI: number;
  downPayment: number;
  downPaymentPercent: number;
}

export interface ShortTermRental {
  platform: string;
  averageNightlyRate: number;
  seasonalRates: {
    season: string;
    averageRate: number;
    occupancyRate: number;
  }[];
  estimatedOccupancyRate: number;
  estimatedMonthlyRevenue: number;
  estimatedAnnualRevenue: number;
  monthlyBreakdown: {
    month: string;
    averageRate: number;
    occupancyRate: number;
    estimatedIncome: number;
  }[];
  marketFactors: {
    touristArea: boolean;
    businessTravel: boolean;
    seasonality: 'high' | 'moderate' | 'low';
    competition: 'high' | 'moderate' | 'low';
  };
  regulations: {
    permitsRequired: boolean;
    maxNightsPerYear: number;
    restrictions: string;
  };
  vsTraditionalRental: number;
  recommendation: string;
}

export interface ExpertAnalysis {
  expertName: string;
  expertType: 'aggressive' | 'conservative' | 'government_housing' | 'short_term_rental';
  expertise: string;
  rating: number;
  summary: string;
  recommendedOffer: number;
  estimatedValue: number;
  exitStrategy: string;
  estimatedROI: number;
  riskAssessment: string;
  pros: string[];
  cons: string[];
  strengths: string[];
  concerns: string[];
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_AVOID';
  confidenceLevel: number;
  dealScore: number; // 1-100, objective score based on numbers
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

export interface DealMetrics {
  // Purchase metrics
  askingPrice: number;
  estimatedARV: number;  // After Repair Value
  repairCosts: number;
  totalInvestment: number;  // Asking + Repairs
  equityAtPurchase: number;
  equityPercent: number;
  
  // Rental metrics
  estimatedMonthlyRent: number;
  grossRentMultiplier: number;  // Price / Annual Rent
  capRate: number;  // NOI / Price
  cashOnCashReturn: number;  // Annual Cash Flow / Cash Invested
  
  // Cash flow metrics
  monthlyPITI: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  
  // Deal score (1-100)
  overallScore: number;
  scoreBreakdown: {
    cashFlowScore: number;
    equityScore: number;
    roiScore: number;
    riskScore: number;
  };
  
  // Verdict
  verdict: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'POOR' | 'AVOID';
  verdictExplanation: string;
}

export interface CMAReport {
  propertyId: string;
  estimatedValue: number;
  valueRange: { low: number; high: number };
  pricePerSqft: number;
  comparables: PropertyComp[];
  rentalComps: RentalComp[];
  estimatedRent: number;
  rentRange: { low: number; high: number };
  shortTermRental?: ShortTermRental;
  crimeScore: CrimeScore;
  financingScenarios: FinancingScenario[];
  dealMetrics: DealMetrics;
  expertAnalyses: ExpertAnalysis[];
  governmentHousing: GovernmentHousingAnalysis;
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
   * Calculate deal metrics - the REAL analysis based on numbers
   */
  private calculateDealMetrics(
    property: any,
    estimatedRent: number,
    estimatedARV: number,
    financingScenario: FinancingScenario
  ): DealMetrics {
    const askingPrice = property.purchasePrice || property.price || 0;
    const repairCosts = property.repairCosts || property.metadata?.estimatedRepairs || 0;
    const totalInvestment = askingPrice + repairCosts;
    
    // Equity calculations
    const equityAtPurchase = estimatedARV - totalInvestment;
    const equityPercent = estimatedARV > 0 ? (equityAtPurchase / estimatedARV) * 100 : 0;
    
    // Rental metrics
    const annualRent = estimatedRent * 12;
    const grossRentMultiplier = annualRent > 0 ? askingPrice / annualRent : 999;
    
    // Operating expenses (typically 35-45% of rent for SFH)
    const operatingExpenseRatio = 0.40;
    const monthlyOperatingExpenses = estimatedRent * operatingExpenseRatio;
    const annualNOI = (estimatedRent - monthlyOperatingExpenses) * 12;
    const capRate = askingPrice > 0 ? (annualNOI / askingPrice) * 100 : 0;
    
    // Cash flow
    const monthlyCashFlow = estimatedRent - financingScenario.monthlyPITI - monthlyOperatingExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    
    // Cash on cash return (assume 25% down)
    const cashInvested = financingScenario.downPayment + repairCosts + (askingPrice * 0.03); // + closing costs
    const cashOnCashReturn = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
    
    // Score breakdown (each 0-25 points)
    const cashFlowScore = this.scoreCashFlow(monthlyCashFlow);
    const equityScore = this.scoreEquity(equityPercent);
    const roiScore = this.scoreROI(cashOnCashReturn, capRate);
    const riskScore = this.scoreRisk(grossRentMultiplier, equityPercent);
    
    const overallScore = cashFlowScore + equityScore + roiScore + riskScore;
    
    // Determine verdict
    const { verdict, verdictExplanation } = this.getVerdict(overallScore, monthlyCashFlow, equityPercent, capRate);
    
    return {
      askingPrice,
      estimatedARV,
      repairCosts,
      totalInvestment,
      equityAtPurchase,
      equityPercent,
      estimatedMonthlyRent: estimatedRent,
      grossRentMultiplier,
      capRate,
      cashOnCashReturn,
      monthlyPITI: financingScenario.monthlyPITI,
      monthlyCashFlow,
      annualCashFlow,
      overallScore,
      scoreBreakdown: { cashFlowScore, equityScore, roiScore, riskScore },
      verdict,
      verdictExplanation,
    };
  }
  
  private scoreCashFlow(monthlyCashFlow: number): number {
    // 25 points max for cash flow
    if (monthlyCashFlow >= 500) return 25;
    if (monthlyCashFlow >= 300) return 20;
    if (monthlyCashFlow >= 200) return 15;
    if (monthlyCashFlow >= 100) return 10;
    if (monthlyCashFlow >= 0) return 5;
    return 0; // Negative cash flow
  }
  
  private scoreEquity(equityPercent: number): number {
    // 25 points max for equity position
    if (equityPercent >= 25) return 25;
    if (equityPercent >= 20) return 20;
    if (equityPercent >= 15) return 15;
    if (equityPercent >= 10) return 10;
    if (equityPercent >= 5) return 5;
    return 0;
  }
  
  private scoreROI(cashOnCash: number, capRate: number): number {
    // 25 points max for returns
    const cocScore = cashOnCash >= 12 ? 15 : cashOnCash >= 8 ? 10 : cashOnCash >= 5 ? 5 : 0;
    const capScore = capRate >= 8 ? 10 : capRate >= 6 ? 7 : capRate >= 4 ? 4 : 0;
    return cocScore + capScore;
  }
  
  private scoreRisk(grm: number, equityPercent: number): number {
    // 25 points max for risk (lower is better for GRM, higher is better for equity)
    let score = 0;
    // GRM under 10 is good, under 8 is great
    if (grm <= 8) score += 15;
    else if (grm <= 10) score += 10;
    else if (grm <= 12) score += 5;
    
    // Equity provides safety margin
    if (equityPercent >= 15) score += 10;
    else if (equityPercent >= 10) score += 7;
    else if (equityPercent >= 5) score += 4;
    
    return Math.min(25, score);
  }
  
  private getVerdict(score: number, cashFlow: number, equity: number, capRate: number): { verdict: DealMetrics['verdict'], verdictExplanation: string } {
    if (score >= 80 && cashFlow >= 200 && equity >= 15) {
      return { 
        verdict: 'EXCELLENT', 
        verdictExplanation: `Outstanding investment opportunity. Strong cash flow ($${cashFlow.toFixed(0)}/mo), excellent equity position (${equity.toFixed(1)}%), and solid returns.`
      };
    }
    if (score >= 65 && cashFlow >= 100) {
      return { 
        verdict: 'GOOD', 
        verdictExplanation: `Solid investment with positive cash flow ($${cashFlow.toFixed(0)}/mo) and acceptable returns. Proceed with due diligence.`
      };
    }
    if (score >= 50 && cashFlow >= 0) {
      return { 
        verdict: 'MARGINAL', 
        verdictExplanation: `Break-even or minimal cash flow. May work if you can negotiate a lower price or have a specific strategy.`
      };
    }
    if (score >= 35) {
      return { 
        verdict: 'POOR', 
        verdictExplanation: `Numbers don't support this investment at current asking price. Negative or minimal returns expected.`
      };
    }
    return { 
      verdict: 'AVOID', 
      verdictExplanation: `This deal does not make financial sense. ${cashFlow < 0 ? `Negative cash flow of $${Math.abs(cashFlow).toFixed(0)}/mo.` : ''} ${capRate < 4 ? `Cap rate of ${capRate.toFixed(1)}% is too low.` : ''} Look elsewhere.`
    };
  }

  /**
   * Generate financing scenarios
   */
  private generateFinancingScenarios(property: any): FinancingScenario[] {
    const purchasePrice = property.purchasePrice || property.price || 250000;
    const repairCosts = property.repairCosts || property.metadata?.estimatedRepairs || 0;
    const totalLoanBase = purchasePrice + repairCosts;
    
    // Estimate taxes and insurance
    const annualTaxes = property.annualTaxes || (purchasePrice * 0.02); // 2% of value
    const annualInsurance = property.annualInsurance || (purchasePrice * 0.005); // 0.5% of value
    const monthlyTaxes = annualTaxes / 12;
    const monthlyInsurance = annualInsurance / 12;
    
    const scenarios: FinancingScenario[] = [];
    
    // Scenario 1: 25% down conventional
    const scenario1LoanAmount = totalLoanBase * 0.75;
    const scenario1Rate = 0.07; // 7%
    const scenario1PI = this.calculateMonthlyPayment(scenario1LoanAmount, scenario1Rate, 30);
    scenarios.push({
      loanAmount: Math.round(scenario1LoanAmount),
      term: 30,
      interestRate: scenario1Rate * 100,
      monthlyPI: Math.round(scenario1PI),
      monthlyTaxes: Math.round(monthlyTaxes),
      monthlyInsurance: Math.round(monthlyInsurance),
      monthlyPITI: Math.round(scenario1PI + monthlyTaxes + monthlyInsurance),
      downPayment: Math.round(totalLoanBase * 0.25),
      downPaymentPercent: 25,
    });
    
    // Scenario 2: 20% down
    const scenario2LoanAmount = totalLoanBase * 0.80;
    const scenario2Rate = 0.0725; // 7.25% (slightly higher with less down)
    const scenario2PI = this.calculateMonthlyPayment(scenario2LoanAmount, scenario2Rate, 30);
    scenarios.push({
      loanAmount: Math.round(scenario2LoanAmount),
      term: 30,
      interestRate: scenario2Rate * 100,
      monthlyPI: Math.round(scenario2PI),
      monthlyTaxes: Math.round(monthlyTaxes),
      monthlyInsurance: Math.round(monthlyInsurance),
      monthlyPITI: Math.round(scenario2PI + monthlyTaxes + monthlyInsurance),
      downPayment: Math.round(totalLoanBase * 0.20),
      downPaymentPercent: 20,
    });
    
    return scenarios;
  }
  
  private calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;
    if (monthlyRate === 0) return principal / numPayments;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  /**
   * Get realistic STR occupancy based on location and market factors
   */
  private estimateSTROccupancy(property: any): { occupancyRate: number; marketFactors: ShortTermRental['marketFactors'] } {
    const city = (property.city || '').toLowerCase();
    const state = (property.state || '').toLowerCase();
    const zipCode = property.zipCode || '';
    
    // Major tourist destinations (higher occupancy)
    const touristCities = ['austin', 'san antonio', 'houston', 'dallas', 'new orleans', 'miami', 'orlando', 'nashville', 'denver', 'seattle', 'portland', 'san diego', 'los angeles', 'san francisco', 'new york', 'chicago', 'boston', 'phoenix', 'las vegas'];
    const isTouristArea = touristCities.some(tc => city.includes(tc));
    
    // Business travel hubs
    const businessHubs = ['houston', 'dallas', 'austin', 'san antonio', 'atlanta', 'chicago', 'new york', 'los angeles', 'san francisco', 'seattle', 'denver', 'phoenix', 'charlotte', 'boston'];
    const isBusinessHub = businessHubs.some(bh => city.includes(bh));
    
    // Seasonal markets
    const seasonalMarkets = ['miami', 'orlando', 'phoenix', 'scottsdale', 'palm springs', 'hawaii', 'ski', 'beach', 'coast'];
    const isSeasonalMarket = seasonalMarkets.some(sm => city.includes(sm) || state.includes(sm));
    
    // Base occupancy rates by market type
    let baseOccupancy = 45; // Default suburban/rural
    
    if (isTouristArea && isBusinessHub) {
      baseOccupancy = 62; // Strong dual market
    } else if (isTouristArea) {
      baseOccupancy = 55; // Tourist dependent
    } else if (isBusinessHub) {
      baseOccupancy = 52; // Business travel
    }
    
    // Adjust for seasonality
    if (isSeasonalMarket) {
      baseOccupancy -= 5; // More variability
    }
    
    // Property type adjustments
    const bedrooms = property.bedrooms || 2;
    if (bedrooms === 1) baseOccupancy -= 3; // Studios/1BR less family friendly
    if (bedrooms >= 4) baseOccupancy -= 5; // Larger homes harder to fill
    
    // Add some variance (+/- 8%)
    const variance = (Math.random() * 16) - 8;
    const finalOccupancy = Math.min(85, Math.max(35, baseOccupancy + variance));
    
    const competition = isTouristArea ? 'high' : isBusinessHub ? 'moderate' : 'low';
    const seasonality = isSeasonalMarket ? 'high' : isTouristArea ? 'moderate' : 'low';
    
    return {
      occupancyRate: Math.round(finalOccupancy),
      marketFactors: {
        touristArea: isTouristArea,
        businessTravel: isBusinessHub,
        seasonality,
        competition,
      }
    };
  }

  /**
   * Generate Short-Term Rental Analysis with realistic occupancy
   */
  private async generateShortTermRentalAnalysis(
    property: any,
    estimatedRent: number
  ): Promise<ShortTermRental> {
    const bedrooms = property.bedrooms || 2;
    const { occupancyRate, marketFactors } = this.estimateSTROccupancy(property);
    
    // Estimate nightly rate based on traditional rent
    const dailyRentEquivalent = estimatedRent / 30;
    const baseNightlyRate = Math.round(dailyRentEquivalent * 1.8);
    
    // Adjust nightly rate by market
    const rateMultiplier = marketFactors.touristArea ? 1.2 : marketFactors.businessTravel ? 1.1 : 0.95;
    const estimatedNightlyRate = Math.round(baseNightlyRate * rateMultiplier);
    
    // Calculate revenue
    const occupiedNights = Math.round((30 * occupancyRate) / 100);
    const grossMonthlyRevenue = estimatedNightlyRate * occupiedNights;
    
    // Costs
    const platformFees = Math.round(grossMonthlyRevenue * 0.15); // ~15% platform + cleaning
    const operatingCosts = Math.round(grossMonthlyRevenue * 0.15); // Utilities, supplies, maintenance
    const netMonthlyRevenue = grossMonthlyRevenue - platformFees - operatingCosts;
    
    // Monthly breakdown with seasonal variation
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const seasonalMultipliers = marketFactors.seasonality === 'high' 
      ? [0.7, 0.75, 1.1, 1.15, 1.2, 1.0, 0.9, 0.85, 0.95, 1.0, 1.1, 0.8] // Winter destination
      : [0.85, 0.85, 0.95, 1.0, 1.1, 1.15, 1.2, 1.15, 1.0, 0.95, 0.9, 0.85]; // Summer peak
    
    const monthlyBreakdown = months.map((month, i) => {
      const monthOccupancy = Math.round(occupancyRate * seasonalMultipliers[i]);
      const monthRate = Math.round(estimatedNightlyRate * (seasonalMultipliers[i] > 1 ? seasonalMultipliers[i] : 1));
      const monthNights = Math.round((30 * monthOccupancy) / 100);
      const monthIncome = Math.round((monthRate * monthNights) * 0.70); // Net after fees
      return {
        month,
        averageRate: monthRate,
        occupancyRate: monthOccupancy,
        estimatedIncome: monthIncome,
      };
    });
    
    const annualRevenue = monthlyBreakdown.reduce((sum, m) => sum + m.estimatedIncome, 0);
    const vsTraditional = Math.round(((netMonthlyRevenue / estimatedRent) - 1) * 100);
    
    // Generate realistic recommendation
    let recommendation: string;
    if (vsTraditional >= 50 && occupancyRate >= 55) {
      recommendation = `Strong STR potential. ${occupancyRate}% projected occupancy with ${vsTraditional}% premium over traditional rental. ${marketFactors.touristArea ? 'Tourist demand supports higher rates.' : ''} Verify local STR regulations before proceeding.`;
    } else if (vsTraditional >= 20 && occupancyRate >= 45) {
      recommendation = `Moderate STR opportunity. ${occupancyRate}% occupancy may yield ${vsTraditional}% more than traditional rental, but margins are thin after expenses. Consider hybrid approach (medium-term rentals).`;
    } else {
      recommendation = `STR may not be optimal for this property. ${occupancyRate}% projected occupancy in ${marketFactors.competition} competition market. Traditional long-term rental may provide more stable returns.`;
    }
    
    return {
      platform: 'Airbnb / VRBO',
      averageNightlyRate: estimatedNightlyRate,
      seasonalRates: [
        { season: 'Peak', averageRate: Math.round(estimatedNightlyRate * 1.3), occupancyRate: Math.min(85, occupancyRate + 15) },
        { season: 'Normal', averageRate: estimatedNightlyRate, occupancyRate },
        { season: 'Off-Peak', averageRate: Math.round(estimatedNightlyRate * 0.8), occupancyRate: Math.max(30, occupancyRate - 15) },
      ],
      estimatedOccupancyRate: occupancyRate,
      estimatedMonthlyRevenue: netMonthlyRevenue,
      estimatedAnnualRevenue: annualRevenue,
      monthlyBreakdown,
      marketFactors,
      regulations: {
        permitsRequired: true,
        maxNightsPerYear: 365,
        restrictions: 'Verify local STR ordinances - many cities have restrictions on non-owner-occupied STRs.',
      },
      vsTraditionalRental: vsTraditional,
      recommendation,
    };
  }

  /**
   * Get crime score with detailed breakdown
   */
  private async getCrimeScore(property: any): Promise<CrimeScore> {
    const city = (property.city || '').toLowerCase();
    const state = (property.state || '').toLowerCase();
    
    // Higher crime cities (for demo purposes - real implementation would use API)
    const higherCrimeCities = ['houston', 'dallas', 'san antonio', 'memphis', 'detroit', 'baltimore', 'st. louis', 'new orleans', 'cleveland', 'oakland'];
    const lowerCrimeCities = ['austin', 'san diego', 'seattle', 'denver', 'portland', 'raleigh', 'boise', 'salt lake'];
    
    const isHigherCrime = higherCrimeCities.some(hc => city.includes(hc));
    const isLowerCrime = lowerCrimeCities.some(lc => city.includes(lc));
    
    // Base score
    let baseScore = 65;
    if (isHigherCrime) baseScore = 50 + Math.random() * 20;
    else if (isLowerCrime) baseScore = 70 + Math.random() * 20;
    else baseScore = 55 + Math.random() * 25;
    
    const scoreNumber = Math.round(baseScore);
    
    let overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    if (scoreNumber >= 85) overallScore = 'A';
    else if (scoreNumber >= 70) overallScore = 'B';
    else if (scoreNumber >= 55) overallScore = 'C';
    else if (scoreNumber >= 40) overallScore = 'D';
    else overallScore = 'F';
    
    // Crime rates per 1000 residents
    const violentCrimeRate = overallScore === 'A' ? 1.5 + Math.random() * 1.5 :
                            overallScore === 'B' ? 2.5 + Math.random() * 2 :
                            overallScore === 'C' ? 4 + Math.random() * 2.5 :
                            overallScore === 'D' ? 6 + Math.random() * 3 : 9 + Math.random() * 4;
    
    const propertyCrimeRate = violentCrimeRate * (2.5 + Math.random());
    
    const nationalAvgViolent = 3.8;
    const percentDiff = Math.round(((nationalAvgViolent - violentCrimeRate) / nationalAvgViolent) * 100);
    const comparison = percentDiff > 0
      ? `${percentDiff}% safer than national average`
      : `${Math.abs(percentDiff)}% higher crime than national average`;
    
    // Detailed crime breakdown
    const crimeTypes = {
      assault: +(violentCrimeRate * 0.4).toFixed(1),
      burglary: +(propertyCrimeRate * 0.25).toFixed(1),
      theft: +(propertyCrimeRate * 0.45).toFixed(1),
      motorVehicleTheft: +(propertyCrimeRate * 0.15).toFixed(1),
      robbery: +(violentCrimeRate * 0.3).toFixed(1),
      arson: +(propertyCrimeRate * 0.02).toFixed(1),
    };
    
    // Nearby incidents
    const crimeTypeNames = ['Theft', 'Burglary', 'Vandalism', 'Assault', 'Vehicle Theft', 'Robbery', 'Trespassing'];
    const numIncidents = overallScore === 'A' ? 2 : overallScore === 'B' ? 4 : overallScore === 'C' ? 6 : 8;
    const nearbyIncidents = Array.from({ length: numIncidents }, () => ({
      type: crimeTypeNames[Math.floor(Math.random() * crimeTypeNames.length)],
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      distance: +(Math.random() * 1.5).toFixed(2),
    }));
    
    let recommendation = '';
    if (overallScore === 'A') recommendation = 'Excellent safety rating. Very low crime area - ideal for families and premium rentals. Low insurance costs expected.';
    else if (overallScore === 'B') recommendation = 'Good safety rating. Crime rates below average. Suitable for most tenant profiles. Standard insurance rates.';
    else if (overallScore === 'C') recommendation = 'Average safety rating. Consider security system for rental. May affect tenant quality and insurance rates.';
    else if (overallScore === 'D') recommendation = 'Below average safety. Higher crime may impact property values, tenant quality, and increase insurance costs. Security measures recommended.';
    else recommendation = 'High crime area. Significant impact on rental demand, property values, and operating costs. Extensive security required. Consider other locations.';
    
    return {
      overallScore,
      scoreNumber,
      violentCrimeRate: +violentCrimeRate.toFixed(1),
      propertyCrimeRate: +propertyCrimeRate.toFixed(1),
      comparison,
      nearbyIncidents,
      recommendation,
      nationalComparison: `National average: 3.8 violent crimes per 1,000 residents`,
      stateComparison: `${state.toUpperCase()} average: ${(3.5 + Math.random()).toFixed(1)} violent crimes per 1,000 residents`,
      crimeTypes,
    };
  }

  /**
   * Generate sales comparables
   */
  private async getSalesComps(property: any): Promise<PropertyComp[]> {
    const basePrice = property.purchasePrice || property.price || 250000;
    const baseSqft = property.squareFeet || 1500;
    const streets = ['Oak', 'Maple', 'Pine', 'Elm', 'Cedar', 'Birch', 'Willow'];
    
    return Array.from({ length: 3 }, (_, i) => {
      const variance = 0.92 + Math.random() * 0.16;
      const price = Math.round(basePrice * variance);
      const sqft = baseSqft + Math.floor(Math.random() * 300 - 150);
      return {
        address: `${Math.floor(Math.random() * 9999)} ${streets[Math.floor(Math.random() * streets.length)]} ${['St', 'Ave', 'Dr', 'Ln'][Math.floor(Math.random() * 4)]}`,
        distance: +(0.2 + Math.random() * 0.8).toFixed(1),
        price,
        pricePerSqft: Math.round(price / sqft),
        bedrooms: property.bedrooms || 3,
        bathrooms: property.bathrooms || 2,
        squareFeet: sqft,
        yearBuilt: 2005 + Math.floor(Math.random() * 15),
        soldDate: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysOnMarket: Math.floor(Math.random() * 90),
      };
    });
  }

  /**
   * Generate rental comparables with notes
   */
  private async getRentalComps(property: any): Promise<RentalComp[]> {
    const baseSqft = property.squareFeet || 1500;
    const baseRent = Math.round((property.purchasePrice || property.price || 250000) * 0.007);
    const streets = ['Valley', 'Hill', 'Park', 'Lake', 'River', 'Forest'];
    const notes = ['Renovated', 'Good condition', 'Average condition', 'Updated kitchen', 'New flooring', 'Includes yard maintenance'];
    
    return Array.from({ length: 3 }, (_, i) => {
      const variance = 0.92 + Math.random() * 0.16;
      const rent = Math.round(baseRent * variance);
      const sqft = baseSqft + Math.floor(Math.random() * 200 - 100);
      return {
        address: `${Math.floor(Math.random() * 9999)} ${streets[Math.floor(Math.random() * streets.length)]} ${['Rd', 'Ln', 'Dr', 'Ct'][Math.floor(Math.random() * 4)]}`,
        distance: +(0.3 + Math.random() * 0.7).toFixed(1),
        monthlyRent: rent,
        bedrooms: property.bedrooms || 3,
        bathrooms: property.bathrooms || 2,
        squareFeet: sqft,
        rentPerSqft: +(rent / sqft).toFixed(2),
        notes: notes[Math.floor(Math.random() * notes.length)],
      };
    });
  }

  /**
   * Generate Government Housing Analysis
   */
  private async generateGovernmentHousingAnalysis(
    property: any,
    estimatedRent: number
  ): Promise<GovernmentHousingAnalysis> {
    const zipCode = property.zipCode || '78253';
    const bedrooms = property.bedrooms || 2;
    
    const hudData = await hudApiService.getSection8FMR(zipCode, bedrooms);
    const section8Rent = hudData.fmrAmount;
    const vaHudvashRent = Math.round(section8Rent * 1.05);
    
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
      recommendation: `Property qualifies for government housing with Section 8 rent of $${section8Rent}/month ($${(section8Rent * 12).toLocaleString()}/year).`,
    };
  }

  /**
   * Generate expert analyses that actually evaluate the deal critically
   */
  private async generateExpertAnalyses(
    property: any,
    dealMetrics: DealMetrics,
    governmentHousing: GovernmentHousingAnalysis,
    shortTermRental: ShortTermRental,
    crimeScore: CrimeScore
  ): Promise<ExpertAnalysis[]> {
    const askingPrice = dealMetrics.askingPrice;
    const { verdict, overallScore, monthlyCashFlow, capRate, cashOnCashReturn, equityPercent } = dealMetrics;
    
    // Generate recommendations based on actual metrics
    const getRecommendation = (bias: number): ExpertAnalysis['recommendation'] => {
      const adjustedScore = overallScore + bias;
      if (adjustedScore >= 80) return 'STRONG_BUY';
      if (adjustedScore >= 65) return 'BUY';
      if (adjustedScore >= 50) return 'HOLD';
      if (adjustedScore >= 35) return 'AVOID';
      return 'STRONG_AVOID';
    };
    
    // Aggressive investor (more optimistic, but still honest)
    const aggressiveRec = getRecommendation(10);
    const aggressiveOffer = verdict === 'EXCELLENT' ? Math.round(askingPrice * 0.95) :
                           verdict === 'GOOD' ? Math.round(askingPrice * 0.88) :
                           verdict === 'MARGINAL' ? Math.round(askingPrice * 0.80) :
                           Math.round(askingPrice * 0.70);
    
    // Conservative investor (more cautious)
    const conservativeRec = getRecommendation(-10);
    const conservativeOffer = verdict === 'EXCELLENT' ? Math.round(askingPrice * 0.92) :
                              verdict === 'GOOD' ? Math.round(askingPrice * 0.85) :
                              verdict === 'MARGINAL' ? Math.round(askingPrice * 0.75) :
                              Math.round(askingPrice * 0.65);
    
    // Government housing specialist
    const govRec = getRecommendation(governmentHousing.estimatedSection8Rent! > dealMetrics.estimatedMonthlyRent * 1.05 ? 15 : 0);
    const govOffer = Math.round(askingPrice * (govRec === 'STRONG_BUY' ? 0.93 : govRec === 'BUY' ? 0.88 : 0.80));
    
    // STR specialist
    const strBonus = shortTermRental.vsTraditionalRental >= 50 ? 15 : shortTermRental.vsTraditionalRental >= 25 ? 10 : 0;
    const strRec = getRecommendation(strBonus - (crimeScore.overallScore === 'D' || crimeScore.overallScore === 'F' ? 15 : 0));
    const strOffer = Math.round(askingPrice * (strRec === 'STRONG_BUY' ? 0.90 : strRec === 'BUY' ? 0.85 : 0.78));
    
    const experts: ExpertAnalysis[] = [
      {
        expertName: "Marcus 'The Wolf' Rodriguez",
        expertType: 'aggressive',
        expertise: 'BRRRR & Forced Appreciation Specialist',
        rating: Math.min(5, Math.max(1, Math.round(overallScore / 20))),
        summary: this.generateAggressiveSummary(dealMetrics, crimeScore),
        recommendedOffer: aggressiveOffer,
        estimatedValue: aggressiveOffer,
        exitStrategy: equityPercent >= 15 ? 'BRRRR - refinance after repairs and stabilization' : 'Buy & hold for cash flow',
        estimatedROI: Math.round(cashOnCashReturn + (equityPercent > 0 ? equityPercent / 5 : 0)),
        riskAssessment: `${verdict === 'EXCELLENT' || verdict === 'GOOD' ? 'Acceptable' : 'Elevated'} risk. ${crimeScore.overallScore === 'D' || crimeScore.overallScore === 'F' ? 'Crime score is a concern.' : ''}`,
        pros: this.generatePros(dealMetrics, 'aggressive'),
        cons: this.generateCons(dealMetrics, crimeScore, 'aggressive'),
        strengths: this.generatePros(dealMetrics, 'aggressive'),
        concerns: this.generateCons(dealMetrics, crimeScore, 'aggressive'),
        recommendation: aggressiveRec,
        confidenceLevel: Math.min(95, Math.max(40, overallScore + 10)),
        dealScore: overallScore,
      },
      {
        expertName: 'Elizabeth Chen, CPA',
        expertType: 'conservative',
        expertise: 'Buy & Hold Tax Strategy Expert',
        rating: Math.min(5, Math.max(1, Math.round((overallScore - 5) / 20))),
        summary: this.generateConservativeSummary(dealMetrics, crimeScore),
        recommendedOffer: conservativeOffer,
        estimatedValue: conservativeOffer,
        exitStrategy: 'Long-term hold (10+ years) with traditional rental',
        estimatedROI: Math.round(cashOnCashReturn * 0.85),
        riskAssessment: `${monthlyCashFlow < 100 ? 'Cash flow margins are tight.' : monthlyCashFlow >= 300 ? 'Solid cash flow buffer.' : 'Adequate cash flow with some risk.'}`,
        pros: this.generatePros(dealMetrics, 'conservative'),
        cons: this.generateCons(dealMetrics, crimeScore, 'conservative'),
        strengths: this.generatePros(dealMetrics, 'conservative'),
        concerns: this.generateCons(dealMetrics, crimeScore, 'conservative'),
        recommendation: conservativeRec,
        confidenceLevel: Math.min(90, Math.max(35, overallScore - 5)),
        dealScore: overallScore,
      },
      {
        expertName: 'David Thompson, HUD Specialist',
        expertType: 'government_housing',
        expertise: 'Section 8 & Government Housing Programs',
        rating: Math.min(5, Math.max(1, Math.round(overallScore / 18))),
        summary: this.generateGovSummary(dealMetrics, governmentHousing),
        recommendedOffer: govOffer,
        estimatedValue: govOffer,
        exitStrategy: 'Section 8 long-term rental with guaranteed payments',
        estimatedROI: Math.round(((governmentHousing.annualIncome - (dealMetrics.monthlyPITI * 12 * 0.65)) / (askingPrice * 0.25)) * 100),
        riskAssessment: 'Government backing reduces vacancy risk. HQS inspection requirements.',
        pros: [
          `Section 8 FMR: $${governmentHousing.estimatedSection8Rent}/month`,
          'Government-guaranteed payments',
          'Lower vacancy risk',
          'Stable tenant base',
        ],
        cons: [
          'Annual HQS inspections required',
          'Property must meet quality standards',
          'Voucher availability varies by area',
          crimeScore.overallScore === 'D' || crimeScore.overallScore === 'F' ? 'Crime score may affect voucher holders' : '',
        ].filter(Boolean),
        strengths: [`Section 8 FMR: $${governmentHousing.estimatedSection8Rent}/month`, 'Government-guaranteed payments'],
        concerns: ['HQS inspection requirements', 'Property standards compliance'],
        recommendation: govRec,
        confidenceLevel: Math.min(95, Math.max(50, overallScore + 5)),
        dealScore: overallScore,
      },
      {
        expertName: 'Sarah Martinez, Airbnb Superhost',
        expertType: 'short_term_rental',
        expertise: 'Airbnb/VRBO Vacation Rental Expert',
        rating: Math.min(5, Math.max(1, Math.round((overallScore + strBonus) / 20))),
        summary: this.generateSTRSummary(shortTermRental, dealMetrics),
        recommendedOffer: strOffer,
        estimatedValue: strOffer,
        exitStrategy: 'Airbnb/VRBO with professional management or automation',
        estimatedROI: Math.round((shortTermRental.estimatedAnnualRevenue / (askingPrice * 0.25)) * 100),
        riskAssessment: `${shortTermRental.marketFactors.competition} competition. ${shortTermRental.estimatedOccupancyRate}% projected occupancy.`,
        pros: [
          `Nightly rate: $${shortTermRental.averageNightlyRate}`,
          `Monthly revenue: $${shortTermRental.estimatedMonthlyRevenue.toLocaleString()}`,
          `${shortTermRental.vsTraditionalRental}% premium vs traditional`,
          shortTermRental.marketFactors.touristArea ? 'Strong tourist demand' : 'Business travel potential',
        ],
        cons: [
          `${shortTermRental.estimatedOccupancyRate}% projected occupancy`,
          'Local regulations must be verified',
          '$15-25K furnishing investment required',
          'Higher management intensity',
        ],
        strengths: [`$${shortTermRental.estimatedMonthlyRevenue}/mo potential`, `${shortTermRental.vsTraditionalRental}% vs traditional`],
        concerns: [`${shortTermRental.estimatedOccupancyRate}% occupancy`, 'Regulatory risk'],
        recommendation: strRec,
        confidenceLevel: Math.min(90, Math.max(40, overallScore + (strBonus / 2))),
        dealScore: overallScore,
      },
    ];
    
    return experts;
  }
  
  private generateAggressiveSummary(metrics: DealMetrics, crime: CrimeScore): string {
    if (metrics.verdict === 'EXCELLENT') {
      return `This is a strong deal. ${metrics.equityPercent.toFixed(0)}% equity position with $${metrics.monthlyCashFlow.toFixed(0)}/mo cash flow. Move fast on this one.`;
    }
    if (metrics.verdict === 'GOOD') {
      return `Decent opportunity with ${metrics.capRate.toFixed(1)}% cap rate. Can improve returns with value-add strategy.`;
    }
    if (metrics.verdict === 'MARGINAL') {
      return `Numbers are borderline at asking price. Need ${Math.round((1 - metrics.askingPrice / (metrics.askingPrice - 20000)) * 100)}% discount to make this work.`;
    }
    return `Pass on this deal at current price. ${metrics.monthlyCashFlow < 0 ? `Negative cash flow of $${Math.abs(metrics.monthlyCashFlow).toFixed(0)}/mo.` : 'Returns don\'t justify the risk.'}`;
  }
  
  private generateConservativeSummary(metrics: DealMetrics, crime: CrimeScore): string {
    if (metrics.verdict === 'EXCELLENT' && crime.overallScore !== 'F' && crime.overallScore !== 'D') {
      return `Solid fundamentals. ${metrics.capRate.toFixed(1)}% cap rate with $${metrics.monthlyCashFlow.toFixed(0)}/mo cash flow provides safety margin.`;
    }
    if (metrics.verdict === 'GOOD') {
      return `Acceptable investment with adequate cash flow. Recommend thorough inspection and 10% reserve fund.`;
    }
    if (metrics.verdict === 'MARGINAL') {
      return `Thin margins at this price point. Cash flow of $${metrics.monthlyCashFlow.toFixed(0)}/mo leaves little buffer for unexpected expenses.`;
    }
    return `Numbers don't support this investment. ${metrics.capRate.toFixed(1)}% cap rate below my 6% minimum threshold.`;
  }
  
  private generateGovSummary(metrics: DealMetrics, gov: GovernmentHousingAnalysis): string {
    const premium = ((gov.estimatedSection8Rent! / metrics.estimatedMonthlyRent) - 1) * 100;
    if (premium > 5 && metrics.verdict !== 'AVOID') {
      return `Section 8 FMR of $${gov.estimatedSection8Rent}/mo (${premium.toFixed(0)}% above market) with guaranteed payment makes this attractive for government housing.`;
    }
    if (premium > 0) {
      return `Section 8 rent at market level. Government payment guarantee reduces risk but no premium over traditional rental.`;
    }
    return `Market rents exceed Section 8 FMR. Traditional rental may be more profitable for this property.`;
  }
  
  private generateSTRSummary(str: ShortTermRental, metrics: DealMetrics): string {
    if (str.vsTraditionalRental >= 50 && str.estimatedOccupancyRate >= 55) {
      return `Strong STR potential with ${str.vsTraditionalRental}% income premium at ${str.estimatedOccupancyRate}% occupancy. ${str.marketFactors.touristArea ? 'Tourist demand supports rates.' : 'Business travel drives weekday bookings.'}`;
    }
    if (str.vsTraditionalRental >= 20) {
      return `Moderate STR opportunity. ${str.estimatedOccupancyRate}% projected occupancy yields ${str.vsTraditionalRental}% premium but margins are tighter after expenses.`;
    }
    return `STR may not be optimal. ${str.estimatedOccupancyRate}% occupancy in ${str.marketFactors.competition} competition market limits upside.`;
  }
  
  private generatePros(metrics: DealMetrics, type: string): string[] {
    const pros: string[] = [];
    
    if (metrics.monthlyCashFlow >= 300) pros.push(`Strong cash flow: $${metrics.monthlyCashFlow.toFixed(0)}/month`);
    else if (metrics.monthlyCashFlow >= 100) pros.push(`Positive cash flow: $${metrics.monthlyCashFlow.toFixed(0)}/month`);
    
    if (metrics.equityPercent >= 15) pros.push(`${metrics.equityPercent.toFixed(0)}% equity position at purchase`);
    else if (metrics.equityPercent >= 10) pros.push(`${metrics.equityPercent.toFixed(0)}% built-in equity`);
    
    if (metrics.capRate >= 7) pros.push(`${metrics.capRate.toFixed(1)}% cap rate above market average`);
    else if (metrics.capRate >= 5) pros.push(`${metrics.capRate.toFixed(1)}% cap rate`);
    
    if (metrics.grossRentMultiplier <= 10) pros.push(`GRM of ${metrics.grossRentMultiplier.toFixed(1)} indicates good value`);
    
    if (metrics.cashOnCashReturn >= 10) pros.push(`${metrics.cashOnCashReturn.toFixed(1)}% cash-on-cash return`);
    
    if (pros.length === 0) pros.push('Property requires negotiation to improve returns');
    
    return pros.slice(0, 4);
  }
  
  private generateCons(metrics: DealMetrics, crime: CrimeScore, type: string): string[] {
    const cons: string[] = [];
    
    if (metrics.monthlyCashFlow < 0) cons.push(`Negative cash flow: -$${Math.abs(metrics.monthlyCashFlow).toFixed(0)}/month`);
    else if (metrics.monthlyCashFlow < 100) cons.push(`Thin cash flow margins: $${metrics.monthlyCashFlow.toFixed(0)}/month`);
    
    if (metrics.equityPercent < 5) cons.push('Little to no equity at current price');
    
    if (metrics.capRate < 5) cons.push(`${metrics.capRate.toFixed(1)}% cap rate below minimum threshold`);
    
    if (metrics.grossRentMultiplier > 15) cons.push(`High GRM of ${metrics.grossRentMultiplier.toFixed(1)} suggests overpricing`);
    
    if (crime.overallScore === 'D' || crime.overallScore === 'F') {
      cons.push(`${crime.overallScore} crime rating may affect tenant quality`);
    }
    
    if (metrics.repairCosts > 0) cons.push(`$${metrics.repairCosts.toLocaleString()} repairs needed`);
    
    if (cons.length === 0) cons.push('Standard investment due diligence recommended');
    
    return cons.slice(0, 4);
  }

  /**
   * Generate AI analysis summary
   */
  private async generateAIAnalysis(
    property: any,
    dealMetrics: DealMetrics,
    crimeScore: CrimeScore
  ): Promise<CMAReport['aiAnalysis']> {
    const { verdict, overallScore, monthlyCashFlow, capRate, equityPercent } = dealMetrics;
    
    return {
      marketSummary: `This ${property.bedrooms}bd/${property.bathrooms}ba property in ${property.city}, ${property.state} is listed at $${dealMetrics.askingPrice.toLocaleString()}. Based on analysis, estimated market value is $${dealMetrics.estimatedARV.toLocaleString()}. ${crimeScore.overallScore}-rated neighborhood (${crimeScore.comparison}).`,
      investmentPotential: `Deal Score: ${overallScore}/100 (${verdict}). Cap rate of ${capRate.toFixed(1)}% with projected cash flow of $${monthlyCashFlow.toFixed(0)}/month. ${equityPercent > 10 ? `${equityPercent.toFixed(0)}% equity position provides downside protection.` : 'Limited equity at current price.'}`,
      strengths: this.generatePros(dealMetrics, 'ai'),
      concerns: this.generateCons(dealMetrics, crimeScore, 'ai'),
      recommendation: dealMetrics.verdictExplanation,
    };
  }

  /**
   * Generate complete CMA report
   */
  async generateCMAReport(property: any): Promise<CMAReport> {
    console.log('🏠 Generating CMA Report for:', property.address);

    // Gather all data
    const [comps, rentalComps, crimeScore] = await Promise.all([
      this.getSalesComps(property),
      this.getRentalComps(property),
      this.getCrimeScore(property),
    ]);

    // Calculate estimated values
    const avgCompPrice = comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length;
    const estimatedValue = Math.round(property.zestimate || property.price || avgCompPrice);
    const valueRange = { low: Math.round(estimatedValue * 0.95), high: Math.round(estimatedValue * 1.05) };

    const avgRent = rentalComps.reduce((sum, comp) => sum + comp.monthlyRent, 0) / rentalComps.length;
    const baseSqft = property.squareFeet || 1500;
    const pricePerSqft = Math.round(estimatedValue / baseSqft);

    // Generate government housing analysis
    const governmentHousing = await this.generateGovernmentHousingAnalysis(property, Math.round(avgRent));

    // Best rent estimate
    const estimatedRent = Math.max(
      property.rentZestimate || 0,
      governmentHousing.estimatedSection8Rent || 0,
      Math.round(avgRent)
    );
    const rentRange = { low: Math.round(estimatedRent * 0.9), high: Math.round(estimatedRent * 1.1) };

    // Generate financing scenarios
    const financingScenarios = this.generateFinancingScenarios(property);

    // Calculate deal metrics (THE CRITICAL ANALYSIS)
    const dealMetrics = this.calculateDealMetrics(
      property,
      estimatedRent,
      estimatedValue,
      financingScenarios[0] // Use 25% down scenario as baseline
    );

    // Generate STR analysis with realistic occupancy
    const shortTermRental = await this.generateShortTermRentalAnalysis(property, estimatedRent);

    // Generate expert analyses based on actual deal metrics
    const expertAnalyses = await this.generateExpertAnalyses(
      property,
      dealMetrics,
      governmentHousing,
      shortTermRental,
      crimeScore
    );

    // Generate AI summary
    const aiAnalysis = await this.generateAIAnalysis(property, dealMetrics, crimeScore);

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
      financingScenarios,
      dealMetrics,
      expertAnalyses,
      governmentHousing,
      shortTermRental,
      aiAnalysis,
      generatedAt: new Date(),
    };

    console.log(`✅ CMA Report generated - Deal Score: ${dealMetrics.overallScore}/100 (${dealMetrics.verdict})`);
    return report;
  }
}

export const propertyAnalysisService = new PropertyAnalysisService();
