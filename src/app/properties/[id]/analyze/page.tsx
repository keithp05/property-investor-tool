'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, MapPin, Home, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Calendar, Shield, Loader2, Users, Building, Play, Calculator, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface DealAnalysis {
  seventyPercentRule: {
    maxPurchasePrice: number;
    percentOfARV: number;
    passes: boolean;
    difference: number;
  };
  onePercentRule: {
    rentToPrice: number;
    passes: boolean;
    minimumRent: number;
  };
  cashOnCash: {
    cocReturn: number;
    annualCashFlow: number;
    monthlyCashFlow: number;
    totalCashInvested: number;
  };
  recommendedOffer: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  overallRating: {
    score: number;
    grade: string;
    verdict: string;
    summary: string;
    passedRules: string[];
    failedRules: string[];
  };
}

interface ExpertAnalysis {
  expertName: string;
  expertType: string;
  expertise: string;
  rating: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_AVOID';
  summary: string;
  recommendedOffer: number;
  estimatedROI: number;
  riskAssessment: string;
  pros: string[];
  cons: string[];
  estimatedValue: number;
  confidenceLevel: number;
}

interface GovernmentHousingAnalysis {
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

interface STRProjection {
  estimatedDailyRate: number;
  estimatedOccupancy: number;
  estimatedMonthlyRevenue: number;
  estimatedAnnualRevenue: number;
  setupCosts: { furniture: number; photography: number; supplies: number; total: number };
  operatingCosts: { cleaning: number; supplies: number; platformFees: number; utilities: number; total: number };
  netOperatingIncome: number;
  vsTraditionalRental: number;
  recommendation: string;
}

interface STRMarketData {
  marketName: string;
  averageDailyRate: number;
  occupancyRate: number;
  regulations?: {
    permitsRequired: boolean;
    maxNightsPerYear: number;
    restrictions: string;
  };
}

interface HistoricalCrimeData {
  year: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  totalCrimeRate: number;
}

interface CrimeTrendAnalysis {
  historicalData: HistoricalCrimeData[];
  fiveYearChange: number;
  tenYearChange: number;
  trend: 'improving' | 'worsening' | 'stable';
  trendDescription: string;
  projectedNextYear: number;
}

interface CrimeScore {
  overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreNumber: number;
  violentCrimeRate: number;
  propertyCrimeRate: number;
  comparison: string;
  nearbyIncidents: any[];
  recommendation: string;
  historicalTrend?: CrimeTrendAnalysis;
  riskFactors?: string[];
  safetyFeatures?: string[];
}

interface CMAReport {
  propertyId: string;
  estimatedValue: number;
  valueRange: { low: number; high: number };
  pricePerSqft: number;
  comparables: any[];
  rentalComps: any[];
  estimatedRent: number;
  rentRange: { low: number; high: number };
  dealAnalysis: DealAnalysis;
  shortTermRental: STRProjection;
  strMarketData: STRMarketData;
  crimeScore: CrimeScore;
  expertAnalyses?: ExpertAnalysis[];
  governmentHousing?: GovernmentHousingAnalysis;
  aiAnalysis: {
    marketSummary: string;
    investmentPotential: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  generatedAt: Date;
}

function PropertyAnalysisContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Analysis state
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CMAReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Deal Input Form State (BEFORE analysis)
  const [offerPrice, setOfferPrice] = useState(0);
  const [afterRepairValue, setAfterRepairValue] = useState(0);
  const [estimatedRepairs, setEstimatedRepairs] = useState(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7.5);
  const [loanTermYears, setLoanTermYears] = useState(30);

  // Extract property details from URL
  const address = searchParams.get('address') || 'Unknown Address';
  const city = searchParams.get('city') || 'Unknown';
  const state = searchParams.get('state') || 'TX';
  const zipCode = searchParams.get('zipCode') || '';
  const listingPrice = Number(searchParams.get('price') || '0');
  const propertyType = searchParams.get('type') || 'standard';
  const bedrooms = searchParams.get('bedrooms') || '3';
  const bathrooms = searchParams.get('bathrooms') || '2';
  const squareFeet = searchParams.get('squareFeet') || '1500';

  // Initialize form values from listing price
  useEffect(() => {
    if (listingPrice > 0 && offerPrice === 0) {
      setOfferPrice(listingPrice);
      setAfterRepairValue(Math.round(listingPrice * 1.15)); // Default ARV 15% above listing
    }
  }, [listingPrice]);

  // Run the AI analysis with user inputs
  async function runAnalysis() {
    if (offerPrice <= 0) {
      setError('Please enter your offer price');
      return;
    }
    if (afterRepairValue <= 0) {
      setError('Please enter the After Repair Value (ARV)');
      return;
    }

    setAnalysisStarted(true);
    setLoading(true);
    setError(null);

    try {
      // Build query params with user's deal inputs
      const queryParams = new URLSearchParams({
        address,
        city,
        state,
        zipCode,
        price: offerPrice.toString(), // Use offer price, not listing price
        type: propertyType,
        bedrooms,
        bathrooms,
        squareFeet,
        // Additional deal inputs
        afterRepairValue: afterRepairValue.toString(),
        estimatedRepairs: estimatedRepairs.toString(),
        downPaymentPercent: downPaymentPercent.toString(),
        interestRate: interestRate.toString(),
        loanTermYears: loanTermYears.toString(),
      });

      const response = await fetch(`/api/properties/${params.id}/analyze?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  }

  const getCrimeScoreColor = (score: string) => {
    switch (score) {
      case 'A': return 'text-green-600 bg-green-50 border-green-200';
      case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'F': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY': return 'text-green-700 bg-green-100 border-green-300';
      case 'BUY': return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'HOLD': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'AVOID': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'STRONG_AVOID': return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': case 'A': case 'A-': return 'text-green-600 bg-green-100';
      case 'B+': case 'B': case 'B-': return 'text-blue-600 bg-blue-100';
      case 'C+': case 'C': case 'C-': return 'text-yellow-600 bg-yellow-100';
      case 'D+': case 'D': case 'D-': return 'text-orange-600 bg-orange-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'worsening': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="h-5 w-5 text-green-600" />;
      case 'worsening': return <TrendingUp className="h-5 w-5 text-red-600" />;
      default: return <BarChart3 className="h-5 w-5 text-gray-600" />;
    }
  };

  // ========== STEP 1: Deal Input Form (Before Analysis) ==========
  if (!analysisStarted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>

          {/* Property Info Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{address}</h1>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin className="h-5 w-5" />
              <span>{city}, {state} {zipCode}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>{bedrooms} bed</span>
              <span>{bathrooms} bath</span>
              <span>{Number(squareFeet).toLocaleString()} sqft</span>
              <span className="font-semibold text-indigo-600">Listed: ${listingPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Deal Input Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <Calculator className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Investment Analysis</h2>
              <p className="text-gray-600">Enter your deal numbers to get AI-powered investment analysis</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Main Deal Inputs */}
            <div className="space-y-8">
              {/* Purchase Section */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  Your Offer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Offer Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={offerPrice || ''}
                        onChange={(e) => setOfferPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">What you plan to offer the seller</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      After Repair Value (ARV) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={afterRepairValue || ''}
                        onChange={(e) => setAfterRepairValue(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Property value after repairs/improvements</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estimated Repairs
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={estimatedRepairs || ''}
                        onChange={(e) => setEstimatedRepairs(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cost of repairs/renovations needed</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats Preview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Investment</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${(offerPrice + estimatedRepairs).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">70% of ARV</p>
                    <p className="text-xl font-bold text-indigo-600">
                      ${Math.round(afterRepairValue * 0.7).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Max Purchase (70% Rule)</p>
                    <p className="text-xl font-bold text-green-600">
                      ${Math.max(0, Math.round(afterRepairValue * 0.7 - estimatedRepairs)).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Potential Equity</p>
                    <p className={`text-xl font-bold ${afterRepairValue - offerPrice - estimatedRepairs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(afterRepairValue - offerPrice - estimatedRepairs).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financing Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  Financing Assumptions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Down Payment %</label>
                    <input
                      type="number"
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Interest Rate %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Loan Term</label>
                    <select
                      value={loanTermYears}
                      onChange={(e) => setLoanTermYears(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="15">15 Years</option>
                      <option value="20">20 Years</option>
                      <option value="30">30 Years</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Run Analysis Button */}
              <div className="pt-6">
                <button
                  onClick={runAnalysis}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                >
                  <Play className="h-6 w-6" />
                  Run Investment Analysis
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  AI will analyze: 70% Rule, 1% Rule, Cash-on-Cash, Section 8, STR potential, Crime Trends, and more
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== STEP 2: Loading State ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Deal</h2>
          <p className="text-gray-600 mb-4">Running 5-expert AI analysis...</p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✓ Checking 70% Rule</p>
            <p>✓ Checking 1% Rule</p>
            <p>✓ Calculating Cash-on-Cash Return</p>
            <p>✓ Analyzing Section 8 Potential</p>
            <p>✓ Evaluating STR Opportunity</p>
            <p>✓ Fetching Crime Data & Trends</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== STEP 3: Error State ==========
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setAnalysisStarted(false);
              setError(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Input Form
          </button>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to generate property analysis'}</p>
            <button
              onClick={() => {
                setAnalysisStarted(false);
                setError(null);
              }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== STEP 4: Analysis Results ==========
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              setAnalysisStarted(false);
              setReport(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Input Form
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{address}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span>{city}, {state} {zipCode}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Your Offer Price</p>
                <p className="text-3xl font-bold text-indigo-600">${offerPrice.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Listed: ${listingPrice.toLocaleString()}</p>
              </div>
            </div>

            {/* Deal Grade & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
              <div className={`rounded-lg p-4 text-center ${getGradeColor(report.dealAnalysis?.overallRating?.grade || 'C')}`}>
                <p className="text-sm mb-1">Deal Grade</p>
                <p className="text-4xl font-bold">{report.dealAnalysis?.overallRating?.grade || 'N/A'}</p>
                <p className="text-xs mt-1">{report.dealAnalysis?.overallRating?.verdict || ''}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">70% Rule</p>
                <p className={`text-2xl font-bold ${report.dealAnalysis?.seventyPercentRule?.passes ? 'text-green-600' : 'text-red-600'}`}>
                  {report.dealAnalysis?.seventyPercentRule?.passes ? '✓ PASS' : '✗ FAIL'}
                </p>
                <p className="text-xs text-gray-500">{report.dealAnalysis?.seventyPercentRule?.percentOfARV?.toFixed(1)}% of ARV</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">1% Rule</p>
                <p className={`text-2xl font-bold ${report.dealAnalysis?.onePercentRule?.passes ? 'text-green-600' : 'text-red-600'}`}>
                  {report.dealAnalysis?.onePercentRule?.passes ? '✓ PASS' : '✗ FAIL'}
                </p>
                <p className="text-xs text-gray-500">{report.dealAnalysis?.onePercentRule?.rentToPrice?.toFixed(2)}% rent/price</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Cash-on-Cash</p>
                <p className={`text-2xl font-bold ${(report.dealAnalysis?.cashOnCash?.cocReturn || 0) >= 8 ? 'text-green-600' : 'text-orange-600'}`}>
                  {report.dealAnalysis?.cashOnCash?.cocReturn?.toFixed(1) || '0'}%
                </p>
                <p className="text-xs text-gray-500">${report.dealAnalysis?.cashOnCash?.annualCashFlow?.toLocaleString() || '0'}/yr</p>
              </div>
              <div className={`rounded-lg p-4 border-2 ${getCrimeScoreColor(report.crimeScore?.overallScore || 'C')}`}>
                <p className="text-sm mb-1">Safety Score</p>
                <p className="text-2xl font-bold">{report.crimeScore?.overallScore || 'N/A'}</p>
                {report.crimeScore?.historicalTrend && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {getTrendIcon(report.crimeScore.historicalTrend.trend)}
                    <span className={`text-xs ${getTrendColor(report.crimeScore.historicalTrend.trend)}`}>
                      {report.crimeScore.historicalTrend.trend === 'improving' ? 'Improving' : 
                       report.crimeScore.historicalTrend.trend === 'worsening' ? 'Worsening' : 'Stable'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Offers */}
        {report.dealAnalysis?.recommendedOffer && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended Offer Prices</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <p className="text-sm text-green-700 font-semibold mb-1">Conservative</p>
                <p className="text-3xl font-bold text-green-600">
                  ${report.dealAnalysis.recommendedOffer.conservative?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-2">Lower risk, higher margin</p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <p className="text-sm text-blue-700 font-semibold mb-1">Moderate</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${report.dealAnalysis.recommendedOffer.moderate?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-2">Balanced risk/reward</p>
              </div>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                <p className="text-sm text-orange-700 font-semibold mb-1">Aggressive</p>
                <p className="text-3xl font-bold text-orange-600">
                  ${report.dealAnalysis.recommendedOffer.aggressive?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-2">Higher risk, competitive offer</p>
              </div>
            </div>
          </div>
        )}

        {/* Crime Trend Chart */}
        {report.crimeScore?.historicalTrend && report.crimeScore.historicalTrend.historicalData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Shield className="h-7 w-7 text-blue-600" />
              Crime Trend Analysis
            </h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              {/* Trend Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className={`rounded-lg p-4 ${
                  report.crimeScore.historicalTrend.trend === 'improving' ? 'bg-green-50 border border-green-200' :
                  report.crimeScore.historicalTrend.trend === 'worsening' ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getTrendIcon(report.crimeScore.historicalTrend.trend)}
                    <p className="text-sm font-semibold text-gray-700">Trend Status</p>
                  </div>
                  <p className={`text-2xl font-bold capitalize ${getTrendColor(report.crimeScore.historicalTrend.trend)}`}>
                    {report.crimeScore.historicalTrend.trend}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-2">5-Year Change</p>
                  <p className={`text-2xl font-bold ${report.crimeScore.historicalTrend.fiveYearChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.crimeScore.historicalTrend.fiveYearChange > 0 ? '+' : ''}{report.crimeScore.historicalTrend.fiveYearChange}%
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-2">10-Year Change</p>
                  <p className={`text-2xl font-bold ${report.crimeScore.historicalTrend.tenYearChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.crimeScore.historicalTrend.tenYearChange > 0 ? '+' : ''}{report.crimeScore.historicalTrend.tenYearChange}%
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <p className="text-sm text-gray-600 mb-2">Projected 2025</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {report.crimeScore.historicalTrend.projectedNextYear}/1K
                  </p>
                </div>
              </div>

              {/* Crime Trend Chart */}
              <div className="h-80 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={report.crimeScore.historicalTrend.historicalData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorViolent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProperty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickLine={{ stroke: '#d1d5db' }}
                      label={{ value: 'Rate per 1,000', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => [value.toFixed(1) + '/1K', '']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="violentCrimeRate"
                      name="Violent Crime"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorViolent)"
                    />
                    <Area
                      type="monotone"
                      dataKey="propertyCrimeRate"
                      name="Property Crime"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorProperty)"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalCrimeRate"
                      name="Total Crime"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Trend Description */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{report.crimeScore.historicalTrend.trendDescription}</p>
              </div>

              {/* Risk Factors & Safety Features */}
              {(report.crimeScore.riskFactors?.length > 0 || report.crimeScore.safetyFeatures?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {report.crimeScore.safetyFeatures && report.crimeScore.safetyFeatures.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Safety Features
                      </h4>
                      <ul className="space-y-2">
                        {report.crimeScore.safetyFeatures.map((feature, i) => (
                          <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                            <span className="mt-1">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.crimeScore.riskFactors && report.crimeScore.riskFactors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        Risk Factors
                      </h4>
                      <ul className="space-y-2">
                        {report.crimeScore.riskFactors.map((risk, i) => (
                          <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                            <span className="mt-1">!</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly Cash Flow by Strategy */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Income Projections by Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                Traditional Rental
              </h3>
              <p className="text-3xl font-bold text-blue-600">${report.estimatedRent?.toLocaleString()}/mo</p>
              <p className="text-sm text-gray-600 mt-2">
                Cash Flow: <span className={`font-bold ${report.dealAnalysis?.cashOnCash?.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${report.dealAnalysis?.cashOnCash?.monthlyCashFlow?.toLocaleString()}/mo
                </span>
              </p>
            </div>
            {report.governmentHousing && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Section 8
                </h3>
                <p className="text-3xl font-bold text-green-600">${report.governmentHousing.estimatedSection8Rent?.toLocaleString()}/mo</p>
                <p className="text-sm text-gray-600 mt-2">Government guaranteed payment</p>
              </div>
            )}
            {report.shortTermRental && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Short-Term Rental
                </h3>
                <p className="text-3xl font-bold text-purple-600">${report.shortTermRental.estimatedMonthlyRevenue?.toLocaleString()}/mo</p>
                <p className="text-sm text-gray-600 mt-2">
                  {report.shortTermRental.estimatedOccupancy}% occupancy @ ${report.shortTermRental.estimatedDailyRate}/night
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Expert Analyses */}
        {report.expertAnalyses && report.expertAnalyses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Users className="h-7 w-7 text-indigo-600" />
              Expert Investment Analyses
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {report.expertAnalyses.slice(0, 3).map((expert, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <h3 className="text-xl font-bold mb-1">{expert.expertName}</h3>
                    <p className="text-indigo-100 text-sm mb-3">{expert.expertise}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-100">Rating</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= expert.rating ? 'text-yellow-400' : 'text-indigo-300'}>★</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-indigo-100">Confidence</p>
                        <p className="text-xl font-bold">{expert.confidenceLevel}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 mb-4 ${getRecommendationColor(expert.recommendation)}`}>
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-bold uppercase text-sm">{expert.recommendation.replace(/_/g, ' ')}</span>
                    </div>

                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Recommended Offer</p>
                      <p className="text-2xl font-bold text-gray-900">${expert.recommendedOffer?.toLocaleString()}</p>
                    </div>

                    <p className="text-gray-700 mb-4 leading-relaxed text-sm">{expert.summary}</p>

                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {(expert.pros || []).slice(0, 3).map((pro, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        Concerns
                      </h4>
                      <ul className="space-y-1">
                        {(expert.cons || []).slice(0, 3).map((con, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                            <span className="text-orange-600 mt-0.5">•</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional STR Experts */}
            {report.expertAnalyses.length > 3 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Short-Term Rental Experts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.expertAnalyses.slice(3).map((expert, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{expert.expertName}</h4>
                          <p className="text-sm text-gray-600">{expert.expertise}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${getRecommendationColor(expert.recommendation)}`}>
                          {expert.recommendation.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{expert.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Short-Term Rental Details */}
        {report.shortTermRental && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Calendar className="h-7 w-7 text-purple-600" />
              Short-Term Rental Analysis
            </h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Daily Rate</p>
                  <p className="text-2xl font-bold text-purple-600">${report.shortTermRental.estimatedDailyRate}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Occupancy</p>
                  <p className="text-2xl font-bold text-blue-600">{report.shortTermRental.estimatedOccupancy}%</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Monthly Net</p>
                  <p className="text-2xl font-bold text-green-600">${report.shortTermRental.estimatedMonthlyRevenue?.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Annual Net</p>
                  <p className="text-2xl font-bold text-indigo-600">${report.shortTermRental.estimatedAnnualRevenue?.toLocaleString()}</p>
                </div>
              </div>

              {report.strMarketData?.regulations && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Local Regulations</h4>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                    report.strMarketData.regulations?.permitsRequired
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {report.strMarketData.regulations?.permitsRequired ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span>Permits Required</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>No Permits Required</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {report.strMarketData.regulations?.maxNightsPerYear !== undefined && 
                      `Max ${report.strMarketData.regulations.maxNightsPerYear || 'N/A'} nights/year. `}
                    {report.strMarketData.regulations?.restrictions || 'No specific restrictions listed'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Government Housing */}
        {report.governmentHousing && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Building className="h-7 w-7 text-green-600" />
              Government Housing Programs
            </h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Section 8 FMR</p>
                  <p className="text-2xl font-bold text-green-600">${report.governmentHousing.estimatedSection8Rent?.toLocaleString()}/mo</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">VA-HUD VASH</p>
                  <p className="text-2xl font-bold text-purple-600">${report.governmentHousing.estimatedVAHUDVASHRent?.toLocaleString()}/mo</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Annual Income</p>
                  <p className="text-2xl font-bold text-blue-600">${report.governmentHousing.annualIncome?.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700">{report.governmentHousing.recommendation}</p>
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-indigo-600" />
            AI Investment Summary
          </h2>
          
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Deal Summary</h3>
            <p className="text-gray-700">{report.dealAnalysis?.overallRating?.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Rules Passed
              </h3>
              <ul className="space-y-2">
                {(report.dealAnalysis?.overallRating?.passedRules || []).map((rule, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="mt-1">✓</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Rules Failed
              </h3>
              <ul className="space-y-2">
                {(report.dealAnalysis?.overallRating?.failedRules || []).map((rule, i) => (
                  <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                    <span className="mt-1">✗</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
            <h3 className="font-semibold text-indigo-900 mb-2">Final Recommendation</h3>
            <p className="text-indigo-800">{report.aiAnalysis?.recommendation}</p>
          </div>
        </div>

        {/* Re-analyze Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => {
              setAnalysisStarted(false);
              setReport(null);
            }}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            ← Adjust Numbers & Re-analyze
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Analysis generated on {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function PropertyAnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
      </div>
    }>
      <PropertyAnalysisContent />
    </Suspense>
  );
}
