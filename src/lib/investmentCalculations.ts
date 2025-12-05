/**
 * Investment Analysis Calculations
 * Real metrics for evaluating real estate deals
 */

export interface DealInputs {
  purchasePrice: number;
  estimatedRepairs: number;
  afterRepairValue: number; // ARV
  estimatedMonthlyRent: number;
  // Financing
  downPaymentPercent: number; // e.g., 20 for 20%
  interestRate: number; // e.g., 7.5 for 7.5%
  loanTermYears: number; // e.g., 30
  closingCosts: number;
  // Operating expenses (annual)
  propertyTaxes: number;
  insurance: number;
  maintenancePercent: number; // % of rent, e.g., 10
  vacancyPercent: number; // % of rent, e.g., 8
  propertyManagementPercent: number; // % of rent, e.g., 10
  hoaFees?: number;
  utilities?: number;
}

export interface DealAnalysis {
  // 70% Rule (Flip Analysis)
  seventyPercentRule: {
    maxPurchasePrice: number;
    actualPurchasePrice: number;
    difference: number;
    percentOfARV: number;
    passes: boolean;
    rating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'FAIL';
    explanation: string;
  };
  
  // 1% Rule (Rental Quick Screen)
  onePercentRule: {
    targetRent: number;
    actualRent: number;
    rentToPrice: number; // actual percentage
    passes: boolean;
    rating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'FAIL';
    explanation: string;
  };
  
  // Cash-on-Cash Return
  cashOnCash: {
    totalCashInvested: number;
    annualCashFlow: number;
    cocReturn: number; // percentage
    rating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'POOR' | 'NEGATIVE';
    explanation: string;
    breakdown: {
      grossAnnualRent: number;
      vacancyLoss: number;
      effectiveGrossIncome: number;
      operatingExpenses: number;
      netOperatingIncome: number;
      annualDebtService: number;
      cashFlow: number;
    };
  };
  
  // Overall Deal Rating
  overallRating: {
    score: number; // 0-100
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
    verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_AVOID';
    summary: string;
    passedRules: string[];
    failedRules: string[];
  };
  
  // Recommended Offer
  recommendedOffer: {
    aggressive: number; // For investors wanting max margin
    conservative: number; // For safer deals
    walkAway: number; // Price above which deal doesn't work
  };
}

/**
 * Calculate monthly mortgage payment
 */
function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) return principal / numPayments;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                  (Math.pow(1 + monthlyRate, numPayments) - 1);
  return payment;
}

/**
 * Analyze a deal using 70% rule, 1% rule, and Cash-on-Cash
 */
export function analyzeDeal(inputs: DealInputs): DealAnalysis {
  const {
    purchasePrice,
    estimatedRepairs,
    afterRepairValue,
    estimatedMonthlyRent,
    downPaymentPercent,
    interestRate,
    loanTermYears,
    closingCosts,
    propertyTaxes,
    insurance,
    maintenancePercent,
    vacancyPercent,
    propertyManagementPercent,
    hoaFees = 0,
    utilities = 0,
  } = inputs;

  const totalInvestment = purchasePrice + estimatedRepairs;
  
  // ============================================
  // 70% RULE (Flip Analysis)
  // ============================================
  const maxPurchasePrice70 = (afterRepairValue * 0.70) - estimatedRepairs;
  const percentOfARV = ((purchasePrice + estimatedRepairs) / afterRepairValue) * 100;
  const difference70 = maxPurchasePrice70 - purchasePrice;
  
  let seventyPercentRating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'FAIL';
  let seventyPercentExplanation: string;
  
  if (percentOfARV <= 65) {
    seventyPercentRating = 'EXCELLENT';
    seventyPercentExplanation = `Outstanding flip opportunity! At ${percentOfARV.toFixed(1)}% of ARV, you have a ${(70 - percentOfARV).toFixed(1)}% margin above the 70% rule. Strong profit potential.`;
  } else if (percentOfARV <= 70) {
    seventyPercentRating = 'GOOD';
    seventyPercentExplanation = `Solid flip deal at ${percentOfARV.toFixed(1)}% of ARV. Meets the 70% rule with acceptable margins for profit after holding costs.`;
  } else if (percentOfARV <= 75) {
    seventyPercentRating = 'MARGINAL';
    seventyPercentExplanation = `Marginal flip at ${percentOfARV.toFixed(1)}% of ARV. Exceeds 70% rule - profit margins are thin. Only proceed if repairs are overestimated or ARV is conservative.`;
  } else {
    seventyPercentRating = 'FAIL';
    seventyPercentExplanation = `Poor flip opportunity at ${percentOfARV.toFixed(1)}% of ARV. Significantly exceeds 70% rule. Risk of losing money after holding costs and selling expenses.`;
  }
  
  // ============================================
  // 1% RULE (Rental Quick Screen)
  // ============================================
  const targetRent = totalInvestment * 0.01;
  const rentToPrice = (estimatedMonthlyRent / totalInvestment) * 100;
  
  let onePercentRating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'FAIL';
  let onePercentExplanation: string;
  
  if (rentToPrice >= 1.5) {
    onePercentRating = 'EXCELLENT';
    onePercentExplanation = `Exceptional cash flow potential! Rent is ${rentToPrice.toFixed(2)}% of investment (${((rentToPrice - 1) * 100).toFixed(0)}% above 1% rule). Strong rental candidate.`;
  } else if (rentToPrice >= 1.0) {
    onePercentRating = 'GOOD';
    onePercentExplanation = `Meets the 1% rule at ${rentToPrice.toFixed(2)}%. Should generate positive cash flow with proper management.`;
  } else if (rentToPrice >= 0.8) {
    onePercentRating = 'MARGINAL';
    onePercentExplanation = `Below 1% rule at ${rentToPrice.toFixed(2)}%. May still work in appreciating markets but cash flow will be tight. Analyze expenses carefully.`;
  } else {
    onePercentRating = 'FAIL';
    onePercentExplanation = `Fails 1% rule at ${rentToPrice.toFixed(2)}%. Likely to be cash flow negative. Only consider for strong appreciation plays or value-add opportunities.`;
  }
  
  // ============================================
  // CASH-ON-CASH RETURN
  // ============================================
  
  // Calculate total cash invested
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const totalCashInvested = downPayment + closingCosts + estimatedRepairs;
  
  // Calculate loan amount and monthly mortgage
  const loanAmount = purchasePrice - downPayment;
  const monthlyMortgage = calculateMonthlyMortgage(loanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyMortgage * 12;
  
  // Calculate income
  const grossAnnualRent = estimatedMonthlyRent * 12;
  const vacancyLoss = grossAnnualRent * (vacancyPercent / 100);
  const effectiveGrossIncome = grossAnnualRent - vacancyLoss;
  
  // Calculate operating expenses
  const maintenanceCost = grossAnnualRent * (maintenancePercent / 100);
  const managementCost = grossAnnualRent * (propertyManagementPercent / 100);
  const totalOperatingExpenses = propertyTaxes + insurance + maintenanceCost + managementCost + (hoaFees * 12) + (utilities * 12);
  
  // Calculate NOI and Cash Flow
  const netOperatingIncome = effectiveGrossIncome - totalOperatingExpenses;
  const annualCashFlow = netOperatingIncome - annualDebtService;
  
  // Calculate Cash-on-Cash Return
  const cocReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
  
  let cocRating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'POOR' | 'NEGATIVE';
  let cocExplanation: string;
  
  if (cocReturn >= 15) {
    cocRating = 'EXCELLENT';
    cocExplanation = `Outstanding ${cocReturn.toFixed(1)}% cash-on-cash return. Exceptional cash flow relative to investment. Strong buy for cash flow investors.`;
  } else if (cocReturn >= 10) {
    cocRating = 'GOOD';
    cocExplanation = `Solid ${cocReturn.toFixed(1)}% cash-on-cash return. Above the 8-12% target range. Good rental investment.`;
  } else if (cocReturn >= 6) {
    cocRating = 'MARGINAL';
    cocExplanation = `Acceptable ${cocReturn.toFixed(1)}% cash-on-cash return. Below ideal 8%+ target but may work with appreciation potential.`;
  } else if (cocReturn >= 0) {
    cocRating = 'POOR';
    cocExplanation = `Weak ${cocReturn.toFixed(1)}% cash-on-cash return. Minimal cash flow. Only consider if expecting strong appreciation.`;
  } else {
    cocRating = 'NEGATIVE';
    cocExplanation = `Negative ${cocReturn.toFixed(1)}% cash-on-cash return. Property loses $${Math.abs(annualCashFlow).toLocaleString()}/year. Avoid unless significant value-add opportunity.`;
  }
  
  // ============================================
  // OVERALL RATING
  // ============================================
  
  const passedRules: string[] = [];
  const failedRules: string[] = [];
  
  // Score each metric
  let score = 0;
  
  // 70% rule (30 points max)
  if (seventyPercentRating === 'EXCELLENT') { score += 30; passedRules.push('70% Rule (Excellent)'); }
  else if (seventyPercentRating === 'GOOD') { score += 25; passedRules.push('70% Rule (Good)'); }
  else if (seventyPercentRating === 'MARGINAL') { score += 15; failedRules.push('70% Rule (Marginal)'); }
  else { score += 0; failedRules.push('70% Rule (Fail)'); }
  
  // 1% rule (30 points max)
  if (onePercentRating === 'EXCELLENT') { score += 30; passedRules.push('1% Rule (Excellent)'); }
  else if (onePercentRating === 'GOOD') { score += 25; passedRules.push('1% Rule (Good)'); }
  else if (onePercentRating === 'MARGINAL') { score += 15; failedRules.push('1% Rule (Marginal)'); }
  else { score += 0; failedRules.push('1% Rule (Fail)'); }
  
  // Cash-on-Cash (40 points max - most important)
  if (cocRating === 'EXCELLENT') { score += 40; passedRules.push(`CoC Return ${cocReturn.toFixed(1)}% (Excellent)`); }
  else if (cocRating === 'GOOD') { score += 32; passedRules.push(`CoC Return ${cocReturn.toFixed(1)}% (Good)`); }
  else if (cocRating === 'MARGINAL') { score += 20; failedRules.push(`CoC Return ${cocReturn.toFixed(1)}% (Marginal)`); }
  else if (cocRating === 'POOR') { score += 10; failedRules.push(`CoC Return ${cocReturn.toFixed(1)}% (Poor)`); }
  else { score += 0; failedRules.push(`CoC Return ${cocReturn.toFixed(1)}% (Negative)`); }
  
  // Determine grade and verdict
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  let verdict: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_AVOID';
  let summary: string;
  
  if (score >= 90) {
    grade = 'A+';
    verdict = 'STRONG_BUY';
    summary = `Exceptional investment opportunity. Passes all three benchmarks with strong margins. This deal offers both solid cash flow and flip potential.`;
  } else if (score >= 80) {
    grade = 'A';
    verdict = 'STRONG_BUY';
    summary = `Strong investment opportunity. Meets key benchmarks with good margins. Recommended for purchase with standard due diligence.`;
  } else if (score >= 70) {
    grade = 'B+';
    verdict = 'BUY';
    summary = `Good investment opportunity. Meets most benchmarks. Proceed with thorough inspection and expense verification.`;
  } else if (score >= 60) {
    grade = 'B';
    verdict = 'BUY';
    summary = `Acceptable investment. Some metrics are marginal but overall fundamentals are sound. Negotiate harder on price.`;
  } else if (score >= 50) {
    grade = 'C';
    verdict = 'HOLD';
    summary = `Marginal deal. Multiple benchmarks are weak. Only proceed if you can negotiate 10-15% off asking price or have value-add strategy.`;
  } else if (score >= 35) {
    grade = 'D';
    verdict = 'AVOID';
    summary = `Poor investment. Fails key benchmarks. High risk of negative cash flow or flip losses. Walk away or negotiate aggressively.`;
  } else {
    grade = 'F';
    verdict = 'STRONG_AVOID';
    summary = `Bad deal. Fails all benchmarks. Will likely lose money. Do not pursue at current pricing.`;
  }
  
  // ============================================
  // RECOMMENDED OFFERS
  // ============================================
  
  // Aggressive: Target 65% of ARV minus repairs (for max profit margin)
  const aggressiveOffer = (afterRepairValue * 0.65) - estimatedRepairs;
  
  // Conservative: Target 70% of ARV minus repairs (meets 70% rule)
  const conservativeOffer = (afterRepairValue * 0.70) - estimatedRepairs;
  
  // Walk-away: 75% of ARV minus repairs (above this, deal doesn't work)
  const walkAwayPrice = (afterRepairValue * 0.75) - estimatedRepairs;
  
  return {
    seventyPercentRule: {
      maxPurchasePrice: Math.round(maxPurchasePrice70),
      actualPurchasePrice: purchasePrice,
      difference: Math.round(difference70),
      percentOfARV: Math.round(percentOfARV * 10) / 10,
      passes: percentOfARV <= 70,
      rating: seventyPercentRating,
      explanation: seventyPercentExplanation,
    },
    onePercentRule: {
      targetRent: Math.round(targetRent),
      actualRent: estimatedMonthlyRent,
      rentToPrice: Math.round(rentToPrice * 100) / 100,
      passes: rentToPrice >= 1.0,
      rating: onePercentRating,
      explanation: onePercentExplanation,
    },
    cashOnCash: {
      totalCashInvested: Math.round(totalCashInvested),
      annualCashFlow: Math.round(annualCashFlow),
      cocReturn: Math.round(cocReturn * 10) / 10,
      rating: cocRating,
      explanation: cocExplanation,
      breakdown: {
        grossAnnualRent: Math.round(grossAnnualRent),
        vacancyLoss: Math.round(vacancyLoss),
        effectiveGrossIncome: Math.round(effectiveGrossIncome),
        operatingExpenses: Math.round(totalOperatingExpenses),
        netOperatingIncome: Math.round(netOperatingIncome),
        annualDebtService: Math.round(annualDebtService),
        cashFlow: Math.round(annualCashFlow),
      },
    },
    overallRating: {
      score,
      grade,
      verdict,
      summary,
      passedRules,
      failedRules,
    },
    recommendedOffer: {
      aggressive: Math.round(Math.max(0, aggressiveOffer)),
      conservative: Math.round(Math.max(0, conservativeOffer)),
      walkAway: Math.round(Math.max(0, walkAwayPrice)),
    },
  };
}

/**
 * Quick deal screen - returns true if deal passes basic criteria
 */
export function quickDealScreen(
  purchasePrice: number,
  estimatedRepairs: number,
  afterRepairValue: number,
  estimatedMonthlyRent: number
): { passes: boolean; reason: string } {
  const totalInvestment = purchasePrice + estimatedRepairs;
  const percentOfARV = (totalInvestment / afterRepairValue) * 100;
  const rentToPrice = (estimatedMonthlyRent / totalInvestment) * 100;
  
  // Must pass either 70% rule OR 1% rule to be worth analyzing
  if (percentOfARV > 80 && rentToPrice < 0.8) {
    return {
      passes: false,
      reason: `Deal fails both screens: ${percentOfARV.toFixed(0)}% of ARV (need ≤70%) and ${rentToPrice.toFixed(2)}% rent-to-price (need ≥1%)`,
    };
  }
  
  if (percentOfARV <= 70) {
    return { passes: true, reason: `Passes 70% rule at ${percentOfARV.toFixed(0)}% of ARV` };
  }
  
  if (rentToPrice >= 1.0) {
    return { passes: true, reason: `Passes 1% rule at ${rentToPrice.toFixed(2)}% rent-to-price` };
  }
  
  return {
    passes: true,
    reason: `Marginal: ${percentOfARV.toFixed(0)}% of ARV, ${rentToPrice.toFixed(2)}% rent-to-price. Needs deeper analysis.`,
  };
}

export default { analyzeDeal, quickDealScreen };
