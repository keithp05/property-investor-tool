'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, MapPin, Home, TrendingUp, DollarSign, AlertCircle, CheckCircle, Calendar, Shield, Loader2, Users, Building } from 'lucide-react';

interface ExpertAnalysis {
  expertName: string;
  expertise: string;
  rating: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'AVOID' | 'STRONG_AVOID';
  summary: string;
  pros: string[];
  cons: string[];
  estimatedValue: number;
  confidenceLevel: number;
}

interface GovernmentHousingAnalysis {
  section8Eligible: boolean;
  fairMarketRent: number;
  section8Potential: number;
  voucherDemand: string;
  localHousingAuthority: string;
  inspectionRequirements: string[];
  potentialMonthlyIncome: number;
  occupancyRate: number;
  recommendations: string[];
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
  crimeScore: {
    overallScore: 'A' | 'B' | 'C' | 'D' | 'F';
    scoreNumber: number;
    violentCrimeRate: number;
    propertyCrimeRate: number;
    comparison: string;
    nearbyIncidents: any[];
    recommendation: string;
  };
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
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CMAReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract property details from URL
  const address = searchParams.get('address') || 'Unknown Address';
  const city = searchParams.get('city') || 'Unknown';
  const state = searchParams.get('state') || 'Unknown';
  const zipCode = searchParams.get('zipCode') || '';
  const price = searchParams.get('price') || '0';
  const propertyType = searchParams.get('type') || 'standard';

  useEffect(() => {
    loadPropertyAnalysis();
  }, [params.id]);

  async function loadPropertyAnalysis() {
    try {
      setLoading(true);

      // Build URL with all query parameters
      const queryParams = new URLSearchParams(searchParams.toString());
      const response = await fetch(`/api/properties/${params.id}/analyze?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
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

  const getRecommendationText = (recommendation: string) => {
    return recommendation.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Property</h2>
          <p className="text-gray-600">Running 3-expert AI analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-gray-600">{error || 'Unable to generate property analysis'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to {propertyType === 'tax-auction' ? 'Tax Auctions' : 'Search'}
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{address}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span>{city}, {state} {zipCode}</span>
                </div>
                {propertyType === 'tax-auction' && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                    <DollarSign className="h-4 w-4" />
                    Tax Auction Property
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Purchase Price</p>
                <p className="text-3xl font-bold text-indigo-600">${Number(price).toLocaleString()}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Estimated Value</p>
                <p className="text-2xl font-bold text-gray-900">${report.estimatedValue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Est. Monthly Rent</p>
                <p className="text-2xl font-bold text-gray-900">${report.estimatedRent.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Price/Sq Ft</p>
                <p className="text-2xl font-bold text-gray-900">${report.pricePerSqft.toFixed(0)}</p>
              </div>
              <div className={`rounded-lg p-4 border-2 ${getCrimeScoreColor(report.crimeScore.overallScore)}`}>
                <p className="text-sm mb-1">Safety Score</p>
                <p className="text-2xl font-bold">{report.crimeScore.overallScore}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Expert Analyses */}
        {report.expertAnalyses && report.expertAnalyses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Users className="h-7 w-7 text-indigo-600" />
              Expert Investment Analyses
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {report.expertAnalyses.map((expert, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Expert Header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <h3 className="text-xl font-bold mb-1">{expert.expertName}</h3>
                    <p className="text-indigo-100 text-sm mb-3">{expert.expertise}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-100">Rating</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= expert.rating ? 'text-yellow-400' : 'text-indigo-300'}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-indigo-100">Confidence</p>
                        <p className="text-xl font-bold">{expert.confidenceLevel}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Badge */}
                  <div className="p-6">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 mb-4 ${getRecommendationColor(expert.recommendation)}`}>
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-bold uppercase text-sm">{getRecommendationText(expert.recommendation)}</span>
                    </div>

                    {/* Estimated Value */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Estimated Value</p>
                      <p className="text-2xl font-bold text-gray-900">${expert.estimatedValue.toLocaleString()}</p>
                    </div>

                    {/* Summary */}
                    <p className="text-gray-700 mb-4 leading-relaxed">{expert.summary}</p>

                    {/* Pros */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {expert.pros.map((pro, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Cons */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        Concerns
                      </h4>
                      <ul className="space-y-1">
                        {expert.cons.map((con, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-orange-600 mt-1">•</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Government Housing Analysis */}
        {report.governmentHousing && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Building className="h-7 w-7 text-indigo-600" />
              Government Housing Programs
            </h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Section 8 Fair Market Rent</p>
                  <p className="text-2xl font-bold text-blue-600">${report.governmentHousing.fairMarketRent.toLocaleString()}/mo</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Potential Monthly Income</p>
                  <p className="text-2xl font-bold text-green-600">${report.governmentHousing.potentialMonthlyIncome.toLocaleString()}/mo</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Expected Occupancy Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{report.governmentHousing.occupancyRate}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Section 8 Eligibility</h4>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                    report.governmentHousing.section8Eligible
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {report.governmentHousing.section8Eligible ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                    <span className="font-semibold">
                      {report.governmentHousing.section8Eligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">Voucher Demand: {report.governmentHousing.voucherDemand}</p>
                  <p className="text-sm text-gray-600 mt-1">Housing Authority: {report.governmentHousing.localHousingAuthority}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Inspection Requirements</h4>
                  <ul className="space-y-2">
                    {report.governmentHousing.inspectionRequirements.map((req, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {report.governmentHousing.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">▸</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* AI Synthesis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-indigo-600" />
            AI Investment Analysis
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Market Summary</h3>
              <p className="text-gray-700 leading-relaxed">{report.aiAnalysis.marketSummary}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Investment Potential</h3>
              <p className="text-gray-700 leading-relaxed">{report.aiAnalysis.investmentPotential}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {report.aiAnalysis.strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Key Concerns
                </h3>
                <ul className="space-y-2">
                  {report.aiAnalysis.concerns.map((concern, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-600 mt-1">⚠</span>
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
              <h3 className="font-semibold text-indigo-900 mb-2">Final Recommendation</h3>
              <p className="text-indigo-800">{report.aiAnalysis.recommendation}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
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
