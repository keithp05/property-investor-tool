'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Home, TrendingUp, DollarSign, AlertCircle, CheckCircle, Calendar, Shield, BarChart3, Wallet, Building2, RefreshCw, TrendingDown } from 'lucide-react';

interface CMAReport {
  propertyId: string;
  estimatedValue: number;
  valueRange: { low: number; high: number };
  pricePerSqft: number;
  comparables: any[];
  rentalComps: any[];
  estimatedRent: number;
  rentRange: { low: number; high: number };
  crimeScore: {
    overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    scoreNumber: number;
    violentCrimeRate: number;
    propertyCrimeRate: number;
    comparison: string;
    nearbyIncidents: any[];
    recommendation: string;
  };
  aiAnalysis: {
    marketSummary: string;
    investmentPotential: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  generatedAt: Date;
}

interface PortfolioHealthReport {
  propertyId: string;
  currentEstimatedValue: number;
  purchasePrice: number;
  appreciation: {
    amount: number;
    percentage: number;
  };
  currentAreaRents: number;
  currentRentCharged: number;
  rentDelta: number;
  crimeScore: {
    overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    scoreNumber: number;
    violentCrimeRate: number;
    propertyCrimeRate: number;
    comparison: string;
    nearbyIncidents: any[];
    recommendation: string;
  };
  valueTrend: { date: string; value: number }[];
  rentTrend: { date: string; rent: number }[];
  recommendation: string;
  recommendationReason: string;
  generatedAt: Date;
}

interface PropertyData {
  id?: string;
  status?: string;
  purchasePrice?: number;
  monthlyRent?: number;
  address?: string;
  [key: string]: any;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CMAReport | null>(null);
  const [portfolioReport, setPortfolioReport] = useState<PortfolioHealthReport | null>(null);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  const isOwnedProperty = property?.status === 'OWNED' || property?.status === 'RENTED';

  useEffect(() => {
    loadPropertyAnalysis();
  }, [params.id]);

  async function loadPropertyAnalysis() {
    try {
      setLoading(true);

      const propertyDataStr = localStorage.getItem(`property-${params.id}`);
      let propertyData: PropertyData | null = null;

      if (propertyDataStr) {
        propertyData = JSON.parse(propertyDataStr);
        localStorage.removeItem(`property-${params.id}`);
      }

      if (propertyData) {
        setProperty(propertyData);
      }

      const owned = propertyData?.status === 'OWNED' || propertyData?.status === 'RENTED';

      if (owned) {
        if (propertyData) {
          const response = await fetch(`/api/properties/${params.id}/portfolio-health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(propertyData),
          });
          const data = await response.json();
          if (data.success) {
            setPortfolioReport(data.report);
          } else {
            setError(data.error);
          }
        } else {
          const response = await fetch(`/api/properties/${params.id}/portfolio-health`);
          const data = await response.json();
          if (data.success) {
            setPortfolioReport(data.report);
          } else {
            setError(data.error);
          }
        }
      } else {
        if (propertyData) {
          const response = await fetch(`/api/properties/${params.id}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(propertyData),
          });
          const data = await response.json();
          if (data.success) {
            setReport(data.report);
          } else {
            setError(data.error);
          }
        } else {
          const response = await fetch(`/api/properties/${params.id}/analyze`);
          const data = await response.json();
          if (data.success) {
            setReport(data.report);
          } else {
            setError(data.error);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReanalyze() {
    try {
      setReanalyzing(true);
      const response = await fetch(`/api/properties/${params.id}/portfolio-health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(property || {}),
      });
      const data = await response.json();
      if (data.success) {
        setPortfolioReport(data.report);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
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

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'RAISE_RENT': return 'bg-green-100 text-green-800 border border-green-300';
      case 'HOLD': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'SELL': return 'bg-red-100 text-red-800 border border-red-300';
      case 'REFINANCE': return 'bg-purple-100 text-purple-800 border border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'RAISE_RENT': return '📈';
      case 'HOLD': return '⏸️';
      case 'SELL': return '🏷️';
      case 'REFINANCE': return '🔄';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isOwnedProperty ? 'Loading Portfolio Dashboard...' : 'Generating AI-powered CMA Report...'}</p>
          <p className="text-sm text-gray-500 mt-2">
            {isOwnedProperty ? 'Fetching portfolio health metrics' : 'Analyzing comps, rental data, and crime statistics'}
          </p>
        </div>
      </div>
    );
  }

  if (error || (!report && !portfolioReport)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Error Loading Report</h2>
          <p className="text-gray-600 text-center mb-4">{error || 'Failed to load property analysis'}</p>
          <button
            onClick={() => router.back()}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ─── PORTFOLIO DASHBOARD (OWNED / RENTED) ───────────────────────────────────
  if (isOwnedProperty && portfolioReport) {
    const appreciationPositive = portfolioReport.appreciation.amount >= 0;
    const rentDeltaPositive = portfolioReport.rentDelta >= 0;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-3"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Portfolio</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    property?.status === 'RENTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {property?.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Last analyzed {new Date(portfolioReport.generatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
                <span>{reanalyzing ? 'Analyzing...' : 'Re-analyze Now'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Recommendation Banner */}
          <div className={`rounded-lg p-5 mb-8 flex items-start space-x-4 ${getRecommendationStyle(portfolioReport.recommendation)}`}>
            <span className="text-3xl">{getRecommendationIcon(portfolioReport.recommendation)}</span>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">AI Recommendation</span>
                <span className="font-bold text-lg">{portfolioReport.recommendation.replace('_', ' ')}</span>
              </div>
              <p className="text-sm opacity-90">{portfolioReport.recommendationReason}</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            {/* Current Value */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Est. Current Value</h3>
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">${portfolioReport.currentEstimatedValue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Purchased for ${portfolioReport.purchasePrice.toLocaleString()}
              </p>
            </div>

            {/* Appreciation */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Appreciation</h3>
                {appreciationPositive
                  ? <TrendingUp className="h-5 w-5 text-green-600" />
                  : <TrendingDown className="h-5 w-5 text-red-600" />}
              </div>
              <p className={`text-2xl font-bold ${appreciationPositive ? 'text-green-600' : 'text-red-600'}`}>
                {appreciationPositive ? '+' : ''}{portfolioReport.appreciation.percentage.toFixed(1)}%
              </p>
              <p className={`text-xs mt-1 font-medium ${appreciationPositive ? 'text-green-500' : 'text-red-500'}`}>
                {appreciationPositive ? '+' : ''}${portfolioReport.appreciation.amount.toLocaleString()}
              </p>
            </div>

            {/* Rent Analysis */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Your Rent vs Market</h3>
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">${portfolioReport.currentRentCharged.toLocaleString()}</p>
              <p className={`text-xs mt-1 font-medium ${
                rentDeltaPositive ? 'text-green-500' : 'text-orange-500'
              }`}>
                Market avg: ${portfolioReport.currentAreaRents.toLocaleString()} &nbsp;
                ({rentDeltaPositive ? '+' : ''}{portfolioReport.rentDelta.toLocaleString()} vs market)
              </p>
            </div>

            {/* Crime Score */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Crime Score</h3>
                <Shield className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{portfolioReport.crimeScore.overallScore}</p>
                <p className="text-sm text-gray-500">({portfolioReport.crimeScore.scoreNumber}/100)</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{portfolioReport.crimeScore.comparison}</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Property Value Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                  <span>Property Value</span>
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                    <p className="text-xl font-bold text-gray-900">${portfolioReport.purchasePrice.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Current Value</p>
                    <p className="text-xl font-bold text-indigo-600">${portfolioReport.currentEstimatedValue.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${appreciationPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Gain / Loss</p>
                    <p className={`text-xl font-bold ${appreciationPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {appreciationPositive ? '+' : ''}${portfolioReport.appreciation.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${appreciationPositive ? 'text-green-500' : 'text-red-500'}`}>
                      ({appreciationPositive ? '+' : ''}{portfolioReport.appreciation.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                {/* Value Trend Placeholder */}
                <div className="mt-6 border border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Value Trend Chart</p>
                    <p className="text-xs text-gray-400 mt-1">Quarterly snapshots will appear after the first automated analysis runs</p>
                  </div>
                </div>
              </div>

              {/* Rent Analysis Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Wallet className="h-6 w-6 text-blue-600" />
                  <span>Rent Analysis</span>
                </h2>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">You Charge</p>
                    <p className="text-xl font-bold text-gray-900">${portfolioReport.currentRentCharged.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">/month</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">Market Average</p>
                    <p className="text-xl font-bold text-blue-600">${portfolioReport.currentAreaRents.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">/month</p>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${rentDeltaPositive ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Delta</p>
                    <p className={`text-xl font-bold ${rentDeltaPositive ? 'text-green-600' : 'text-orange-600'}`}>
                      {rentDeltaPositive ? '+' : ''}${portfolioReport.rentDelta.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">/month</p>
                  </div>
                </div>

                {!rentDeltaPositive && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-orange-800">
                      <span className="font-semibold">Suggestion:</span> Your rent is ${Math.abs(portfolioReport.rentDelta).toLocaleString()} below market rate.
                      Consider raising rent at the next lease renewal to improve cash flow.
                    </p>
                  </div>
                )}

                {/* Rent Trend Placeholder */}
                <div className="mt-2 border border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Rent Trend Chart</p>
                    <p className="text-xs text-gray-400 mt-1">Monthly rent tracking will appear after rental data is recorded over time</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="space-y-6">

              {/* Crime Report */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-yellow-600" />
                  <span>Crime Report</span>
                </h2>

                <div className={`border-2 rounded-lg p-4 mb-4 ${getCrimeScoreColor(portfolioReport.crimeScore.overallScore)}`}>
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">{portfolioReport.crimeScore.overallScore}</div>
                    <div className="text-sm font-medium mb-1">Safety Score: {portfolioReport.crimeScore.scoreNumber}/100</div>
                    <div className="text-xs">{portfolioReport.crimeScore.comparison}</div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Violent Crime Rate:</span>
                    <span className="text-sm font-semibold text-gray-900">{portfolioReport.crimeScore.violentCrimeRate} per 1K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Property Crime Rate:</span>
                    <span className="text-sm font-semibold text-gray-900">{portfolioReport.crimeScore.propertyCrimeRate} per 1K</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-700">{portfolioReport.crimeScore.recommendation}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Incidents Nearby</h3>
                  <div className="space-y-2">
                    {portfolioReport.crimeScore.nearbyIncidents.slice(0, 5).map((incident, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs">
                        <Calendar className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">{incident.type}</div>
                          <div className="text-gray-500">{incident.distance} mi away • {incident.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Property Status Card */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h3 className="font-semibold text-indigo-900 mb-3">Portfolio Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Status:</span>
                    <span className="font-semibold text-indigo-900">{property?.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Purchase Price:</span>
                    <span className="font-semibold text-indigo-900">${portfolioReport.purchasePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Current Value:</span>
                    <span className="font-semibold text-indigo-900">${portfolioReport.currentEstimatedValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Monthly Rent:</span>
                    <span className="font-semibold text-indigo-900">${portfolioReport.currentRentCharged.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-700">Annual Income:</span>
                    <span className="font-semibold text-indigo-900">${(portfolioReport.currentRentCharged * 12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-indigo-300">
                    <span className="text-indigo-700">Gross Yield:</span>
                    <span className="font-bold text-indigo-900">
                      {portfolioReport.purchasePrice > 0
                        ? ((portfolioReport.currentRentCharged * 12 / portfolioReport.purchasePrice) * 100).toFixed(2)
                        : '0.00'}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="w-full mt-4 flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
                  <span>{reanalyzing ? 'Analyzing...' : 'Re-analyze Now'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CMA REPORT VIEW (SEARCHING / ANALYZING / UNDER_CONTRACT / FOR_SALE) ─────
  if (!report) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Search</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Property Analysis Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Estimated Value</h3>
              <Home className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${report.estimatedValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              Range: ${report.valueRange.low.toLocaleString()} - ${report.valueRange.high.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Price/SqFt</h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${report.pricePerSqft}</p>
            <p className="text-xs text-gray-500 mt-1">Based on comparable sales</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Est. Monthly Rent</h3>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${report.estimatedRent.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              Range: ${report.rentRange.low.toLocaleString()} - ${report.rentRange.high.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Crime Score</h3>
              <Shield className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{report.crimeScore.overallScore}</p>
              <p className="text-sm text-gray-500">({report.crimeScore.scoreNumber}/100)</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">{report.crimeScore.comparison}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <span>🤖</span>
                <span>AI-Powered Analysis</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Market Summary</h3>
                  <p className="text-gray-700">{report.aiAnalysis.marketSummary}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Investment Potential</h3>
                  <p className="text-gray-700">{report.aiAnalysis.investmentPotential}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Strengths</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {report.aiAnalysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-700">{strength}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span>Concerns</span>
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {report.aiAnalysis.concerns.map((concern, idx) => (
                      <li key={idx} className="text-gray-700">{concern}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-indigo-900 mb-2">Recommendation</h3>
                  <p className="text-indigo-800">{report.aiAnalysis.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Sales Comparables */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Comparables</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">$/SqFt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bed/Bath</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.comparables.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{comp.address}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.distance} mi</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">${comp.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">${comp.pricePerSqft}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.bedrooms}/{comp.bathrooms}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.soldDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rental Comparables */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Rental Comparables</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">$/SqFt</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bed/Bath</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SqFt</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.rentalComps.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{comp.address}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.distance} mi</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">${comp.monthlyRent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">${comp.rentPerSqft}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.bedrooms}/{comp.bathrooms}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comp.squareFeet.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Crime Report */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Shield className="h-6 w-6 text-yellow-600" />
                <span>Crime Report</span>
              </h2>

              <div className={`border-2 rounded-lg p-4 mb-4 ${getCrimeScoreColor(report.crimeScore.overallScore)}`}>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">{report.crimeScore.overallScore}</div>
                  <div className="text-sm font-medium mb-1">Safety Score: {report.crimeScore.scoreNumber}/100</div>
                  <div className="text-xs">{report.crimeScore.comparison}</div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Violent Crime Rate:</span>
                  <span className="text-sm font-semibold text-gray-900">{report.crimeScore.violentCrimeRate} per 1K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Property Crime Rate:</span>
                  <span className="text-sm font-semibold text-gray-900">{report.crimeScore.propertyCrimeRate} per 1K</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-700">{report.crimeScore.recommendation}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Incidents Nearby</h3>
                <div className="space-y-2">
                  {report.crimeScore.nearbyIncidents.slice(0, 5).map((incident, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs">
                      <Calendar className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">{incident.type}</div>
                        <div className="text-gray-500">{incident.distance} mi away • {incident.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Investment Calculator Preview */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-3">Investment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo-700">Est. Purchase Price:</span>
                  <span className="font-semibold text-indigo-900">${report.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Est. Monthly Rent:</span>
                  <span className="font-semibold text-indigo-900">${report.estimatedRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Est. Annual Income:</span>
                  <span className="font-semibold text-indigo-900">${(report.estimatedRent * 12).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-indigo-300">
                  <span className="text-indigo-700">Gross Yield:</span>
                  <span className="font-bold text-indigo-900">
                    {((report.estimatedRent * 12 / report.estimatedValue) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <button className="w-full mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                Full ROI Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
