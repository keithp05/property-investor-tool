'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, MapPin, Home, TrendingUp, DollarSign, AlertCircle, CheckCircle, Calendar, Shield, Loader2, Users, Building, Camera, X, Upload, Plus, Edit3 } from 'lucide-react';

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

  // Cash flow calculator state
  const [offerPrice, setOfferPrice] = useState(0); // YOUR offer price
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7.5);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [repairAmount, setRepairAmount] = useState(200);
  const [repairPeriod, setRepairPeriod] = useState<'monthly' | 'annual' | 'project'>('monthly');
  const [enableRepairFund, setEnableRepairFund] = useState(false);
  const [repairFundPercent, setRepairFundPercent] = useState(5);
  const [propertyTax, setPropertyTax] = useState(0);
  const [insurance, setInsurance] = useState(150);
  const [hoa, setHoa] = useState(0);
  const [includeRemodelInFinancing, setIncludeRemodelInFinancing] = useState(true); // Finance total investment

  // Remodel cost tracking
  const [remodelCosts, setRemodelCosts] = useState({
    kitchen: 0,
    bathrooms: 0,
    flooring: 0,
    paint: 0,
    roofing: 0,
    hvac: 0,
    electrical: 0,
    plumbing: 0,
    windows: 0,
    landscaping: 0,
    other: 0,
  });
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Manual comps upload
  const [manualComps, setManualComps] = useState<any[]>([]);
  const [showCompForm, setShowCompForm] = useState(false);
  const [newComp, setNewComp] = useState({
    address: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    soldDate: '',
  });

  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentUploadStatus, setDocumentUploadStatus] = useState('');

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

  // Initialize offer price to listing price
  useEffect(() => {
    if (price && offerPrice === 0) {
      setOfferPrice(Number(price));
    }
  }, [price]);

  // Auto-calculate property tax based on offer price
  useEffect(() => {
    if (offerPrice > 0) {
      const estimatedAnnualTax = offerPrice * 0.015; // 1.5% for Texas
      setPropertyTax(Math.round(estimatedAnnualTax / 12));
    }
  }, [offerPrice]);

  // Calculate mortgage payment using total investment (offer + remodel)
  const calculateMortgage = () => {
    const purchasePrice = offerPrice || Number(price);
    const totalInvestment = includeRemodelInFinancing 
      ? purchasePrice + getTotalRemodelCost() 
      : purchasePrice;
    const downPayment = totalInvestment * (downPaymentPercent / 100);
    const loanAmount = totalInvestment - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;

    if (monthlyRate === 0) {
      return Math.round(loanAmount / numPayments);
    }

    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return Math.round(monthlyPayment);
  };

  // Calculate monthly repair cost based on period
  const getMonthlyRepairs = () => {
    if (repairPeriod === 'monthly') {
      return repairAmount;
    } else if (repairPeriod === 'annual') {
      return Math.round(repairAmount / 12);
    } else {
      // Project - don't include in monthly cash flow
      return 0;
    }
  };

  // Calculate repair fund reserve
  const getRepairFundReserve = (monthlyIncome: number) => {
    if (!enableRepairFund) return 0;
    return Math.round(monthlyIncome * (repairFundPercent / 100));
  };

  // Calculate total monthly expenses
  const calculateMonthlyExpenses = (monthlyIncome: number = 0) => {
    const mortgage = calculateMortgage();
    const monthlyRepairs = getMonthlyRepairs();
    const repairFund = getRepairFundReserve(monthlyIncome);

    return {
      mortgage,
      propertyTax,
      insurance,
      repairs: monthlyRepairs,
      repairFund,
      hoa,
      total: mortgage + propertyTax + insurance + monthlyRepairs + repairFund + hoa
    };
  };

  // Calculate cash flow for different rental strategies
  const calculateCashFlow = (monthlyIncome: number) => {
    const expenses = calculateMonthlyExpenses(monthlyIncome);
    return monthlyIncome - expenses.total;
  };

  // Calculate total remodel costs
  const getTotalRemodelCost = () => {
    return Object.values(remodelCosts).reduce((sum, cost) => sum + cost, 0);
  };

  // Update remodel cost category
  const updateRemodelCost = (category: keyof typeof remodelCosts, value: number) => {
    setRemodelCosts(prev => ({ ...prev, [category]: value }));
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const newPhotos: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        await new Promise((resolve) => {
          reader.onload = (event) => {
            if (event.target?.result) {
              newPhotos.push(event.target.result as string);
            }
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      }

      setPropertyPhotos(prev => [...prev, ...newPhotos]);
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setPropertyPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Add manual comp
  const addManualComp = () => {
    if (!newComp.address || !newComp.price) {
      alert('Please enter at least an address and price');
      return;
    }

    const comp = {
      id: Date.now().toString(),
      address: newComp.address,
      price: Number(newComp.price),
      bedrooms: Number(newComp.bedrooms) || 0,
      bathrooms: Number(newComp.bathrooms) || 0,
      sqft: Number(newComp.sqft) || 0,
      soldDate: newComp.soldDate || new Date().toISOString().split('T')[0],
      source: 'manual',
    };

    setManualComps(prev => [...prev, comp]);
    setNewComp({
      address: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      sqft: '',
      soldDate: '',
    });
    setShowCompForm(false);
  };

  // Remove manual comp
  const removeManualComp = (id: string) => {
    setManualComps(prev => prev.filter(comp => comp.id !== id));
  };

  // Handle document upload (supports multiple files for repair photos)
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: 'comps' | 'estimate' | 'inspection' | 'repair_photo') => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // IMPORTANT: Copy FileList to array immediately before any async operations
    // FileList can become stale/empty during async processing
    const filesArray: File[] = Array.from(fileList);
    
    // Reset the input immediately so user can select same files again if needed
    e.target.value = '';

    setUploadingDocument(true);
    const totalFiles = filesArray.length;
    let processedCount = 0;
    let successCount = 0;

    console.log(`Starting upload of ${totalFiles} files for ${documentType}`);

    try {
      for (const file of filesArray) {
        processedCount++;
        setDocumentUploadStatus(`Processing ${processedCount}/${totalFiles}: ${file.name}...`);
        console.log(`Processing file ${processedCount}/${totalFiles}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', documentType);
        formData.append('propertyId', params.id as string);

        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (result.success) {
            successCount++;
            console.log(`Successfully processed: ${file.name}`);
            setUploadedDocuments(prev => [...prev, result.document]);

            // Auto-populate data based on document type
            if (documentType === 'comps' && result.extractedData?.comps) {
              const extractedComps = result.extractedData.comps.map((comp: any) => ({
                id: Date.now().toString() + Math.random(),
                address: comp.address,
                price: comp.price || comp.rentPrice || 0,
                bedrooms: comp.bedrooms || 0,
                bathrooms: comp.bathrooms || 0,
                sqft: comp.sqft || 0,
                soldDate: comp.soldDate || new Date().toISOString().split('T')[0],
                source: 'document',
              }));
              setManualComps(prev => [...prev, ...extractedComps]);
            } else if (documentType === 'estimate' && result.extractedData?.lineItems) {
              setRemodelCosts(prev => {
                const updated = { ...prev };
                result.extractedData.lineItems.forEach((item: any) => {
                  const category = item.category as keyof typeof remodelCosts;
                  if (category in updated) {
                    updated[category] += item.cost || 0;
                  }
                });
                return updated;
              });
            } else if (documentType === 'repair_photo' && result.extractedData?.estimatedCost) {
              const avgCost = result.extractedData.estimatedCost.average || 0;
              const category = result.extractedData.issueType as keyof typeof remodelCosts;
              if (category && category in remodelCosts) {
                setRemodelCosts(prev => ({
                  ...prev,
                  [category]: (prev[category] || 0) + avgCost
                }));
              }
            }
          } else {
            console.error(`Failed to process ${file.name}:`, result.error);
          }
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
        }
      }

      if (successCount === totalFiles) {
        setDocumentUploadStatus(`✓ Successfully processed ${successCount} file${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        setDocumentUploadStatus(`Processed ${successCount}/${totalFiles} files successfully`);
      } else {
        setDocumentUploadStatus(`Failed to process files`);
      }
      setTimeout(() => setDocumentUploadStatus(''), 5000);

    } catch (error) {
      console.error('Document upload error:', error);
      setDocumentUploadStatus('Upload failed');
    } finally {
      setUploadingDocument(false);
    }
  };

  // Remove uploaded document
  const removeDocument = (id: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== id));
  };

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
          <p className="text-gray-600">Running 5-expert AI analysis (3 traditional + 2 short-term rental)...</p>
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
                <p className="text-2xl font-bold text-gray-900">${report.estimatedValue?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Est. Monthly Rent</p>
                <p className="text-2xl font-bold text-gray-900">${report.estimatedRent?.toLocaleString() || '0'}</p>
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

        {/* Cash Flow Calculator */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-indigo-600" />
            Monthly Cash Flow Calculator
          </h2>
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Offer Price Section */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-yellow-600" />
                Your Offer Price
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Listing Price (Asking)</label>
                  <div className="text-2xl font-bold text-gray-500">${Number(price).toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">Seller's asking price</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Your Offer Price *</label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    className="w-full px-4 py-2 text-2xl font-bold border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white"
                    placeholder="Enter your offer"
                  />
                  <p className="text-xs text-gray-600 mt-1">This will be used for all calculations</p>
                </div>
              </div>
            </div>

            {/* Manual Comps Section */}
            <div className="border-t pt-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Home className="h-5 w-5 text-indigo-600" />
                  Your Comparable Sales (Comps)
                </h3>
                <button
                  onClick={() => setShowCompForm(!showCompForm)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Comp
                </button>
              </div>

              {/* Comp Form */}
              {showCompForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Add New Comparable</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Address *</label>
                      <input
                        type="text"
                        value={newComp.address}
                        onChange={(e) => setNewComp({...newComp, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="123 Main St, City, ST"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Sold Price *</label>
                      <input
                        type="number"
                        value={newComp.price}
                        onChange={(e) => setNewComp({...newComp, price: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="250000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Bedrooms</label>
                      <input
                        type="number"
                        value={newComp.bedrooms}
                        onChange={(e) => setNewComp({...newComp, bedrooms: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Bathrooms</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newComp.bathrooms}
                        onChange={(e) => setNewComp({...newComp, bathrooms: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Square Feet</label>
                      <input
                        type="number"
                        value={newComp.sqft}
                        onChange={(e) => setNewComp({...newComp, sqft: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="1500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Sold Date</label>
                      <input
                        type="date"
                        value={newComp.soldDate}
                        onChange={(e) => setNewComp({...newComp, soldDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addManualComp}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Save Comp
                    </button>
                    <button
                      onClick={() => setShowCompForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Comp List */}
              {manualComps.length > 0 && (
                <div className="space-y-2">
                  {manualComps.map((comp) => (
                    <div key={comp.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{comp.address}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="font-bold text-green-600">${comp.price.toLocaleString()}</span>
                          {comp.bedrooms > 0 && <span>{comp.bedrooms} BR</span>}
                          {comp.bathrooms > 0 && <span>{comp.bathrooms} BA</span>}
                          {comp.sqft > 0 && <span>{comp.sqft.toLocaleString()} sqft</span>}
                          {comp.sqft > 0 && comp.price > 0 && <span>${Math.round(comp.price / comp.sqft)}/sqft</span>}
                          <span className="text-gray-400">Sold: {new Date(comp.soldDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeManualComp(comp.id)}
                        className="ml-4 text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <div className="bg-blue-50 rounded-lg p-3 mt-4">
                    <p className="text-sm font-semibold text-gray-700">Average Comp Price: ${Math.round(manualComps.reduce((sum, comp) => sum + comp.price, 0) / manualComps.length).toLocaleString()}</p>
                    {manualComps.some(c => c.sqft > 0) && (
                      <p className="text-sm text-gray-600 mt-1">Average Price/Sqft: ${Math.round(manualComps.filter(c => c.sqft > 0).reduce((sum, comp) => sum + (comp.price / comp.sqft), 0) / manualComps.filter(c => c.sqft > 0).length)}/sqft</p>
                    )}
                  </div>
                </div>
              )}

              {manualComps.length === 0 && !showCompForm && (
                <div className="text-center py-8 text-gray-500">
                  <Home className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No comps added yet. Add your own comparable sales data.</p>
                </div>
              )}
            </div>

            {/* Document Upload Section */}
            <div className="border-t pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                Upload Documents & Photos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Upload Comps Document */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4 hover:shadow-md transition">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center text-center">
                      <Home className="h-8 w-8 text-blue-600 mb-2" />
                      <p className="font-semibold text-gray-900 mb-1">Comp Packet</p>
                      <p className="text-xs text-gray-600 mb-3">PDF with comparable sales</p>
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                        Choose File
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, 'comps')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </label>
                </div>

                {/* Upload Estimate */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4 hover:shadow-md transition">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center text-center">
                      <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                      <p className="font-semibold text-gray-900 mb-1">Contractor Estimate</p>
                      <p className="text-xs text-gray-600 mb-3">Repair/remodel quote</p>
                      <div className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium">
                        Choose File
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, 'estimate')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </label>
                </div>

                {/* Upload Inspection */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-4 hover:shadow-md transition">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center text-center">
                      <Shield className="h-8 w-8 text-purple-600 mb-2" />
                      <p className="font-semibold text-gray-900 mb-1">Inspection Report</p>
                      <p className="text-xs text-gray-600 mb-3">Property inspection</p>
                      <div className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium">
                        Choose File
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, 'inspection')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </label>
                </div>

                {/* Upload Repair Photos */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-4 hover:shadow-md transition">
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center text-center">
                      <Camera className="h-8 w-8 text-orange-600 mb-2" />
                      <p className="font-semibold text-gray-900 mb-1">Repair Photos</p>
                      <p className="text-xs text-gray-600 mb-3">Photos of damage/repairs</p>
                      <div className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium">
                        Choose Files
                      </div>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload(e, 'repair_photo')}
                      className="hidden"
                      disabled={uploadingDocument}
                    />
                  </label>
                </div>
              </div>

              {/* Upload Status */}
              {uploadingDocument && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <p className="text-blue-900 font-medium">{documentUploadStatus}</p>
                </div>
              )}

              {documentUploadStatus && !uploadingDocument && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-900 font-medium">{documentUploadStatus}</p>
                </div>
              )}

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 mb-2">Uploaded Documents</h4>
                  {uploadedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{doc.fileName}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="capitalize">{doc.documentType.replace('_', ' ')}</span>
                          <span className="text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span className="text-gray-400">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="ml-4 text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mortgage & Expense Inputs */}
            <div className="border-t pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financing Details</h3>
              
              {/* Include Remodel in Financing Toggle */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRemodelInFinancing}
                    onChange={(e) => setIncludeRemodelInFinancing(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900">Finance Total Investment (Offer + Remodel)</span>
                    <p className="text-xs text-gray-600 mt-1">
                      {includeRemodelInFinancing 
                        ? `Loan based on ${(offerPrice + getTotalRemodelCost()).toLocaleString()} total investment`
                        : `Loan based on ${offerPrice.toLocaleString()} offer price only`
                      }
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Down Payment %</label>
                  <input
                    type="number"
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Loan Term (Years)</label>
                  <select
                    value={loanTermYears}
                    onChange={(e) => setLoanTermYears(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="15">15 Years</option>
                    <option value="20">20 Years</option>
                    <option value="30">30 Years</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Remodel Cost Tracking Section */}
            <div className="border-t pt-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">One-Time Remodel Costs</h3>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Remodel Cost</p>
                  <p className="text-2xl font-bold text-indigo-600">${getTotalRemodelCost().toLocaleString()}</p>
                </div>
              </div>

              {/* Photo Upload */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Property Condition Photos</label>
                <div className="flex items-center gap-4 mb-4">
                  <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Upload Photos
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhotos}
                    />
                  </label>
                  <p className="text-sm text-gray-500">{propertyPhotos.length} photo{propertyPhotos.length !== 1 ? 's' : ''} uploaded</p>
                </div>

                {/* Photo Grid */}
                {propertyPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {propertyPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Property ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remodel Cost Categories */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kitchen</label>
                  <input
                    type="number"
                    value={remodelCosts.kitchen}
                    onChange={(e) => updateRemodelCost('kitchen', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
                  <input
                    type="number"
                    value={remodelCosts.bathrooms}
                    onChange={(e) => updateRemodelCost('bathrooms', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Flooring</label>
                  <input
                    type="number"
                    value={remodelCosts.flooring}
                    onChange={(e) => updateRemodelCost('flooring', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Paint</label>
                  <input
                    type="number"
                    value={remodelCosts.paint}
                    onChange={(e) => updateRemodelCost('paint', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Roofing</label>
                  <input
                    type="number"
                    value={remodelCosts.roofing}
                    onChange={(e) => updateRemodelCost('roofing', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">HVAC</label>
                  <input
                    type="number"
                    value={remodelCosts.hvac}
                    onChange={(e) => updateRemodelCost('hvac', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Electrical</label>
                  <input
                    type="number"
                    value={remodelCosts.electrical}
                    onChange={(e) => updateRemodelCost('electrical', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Plumbing</label>
                  <input
                    type="number"
                    value={remodelCosts.plumbing}
                    onChange={(e) => updateRemodelCost('plumbing', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Windows</label>
                  <input
                    type="number"
                    value={remodelCosts.windows}
                    onChange={(e) => updateRemodelCost('windows', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Landscaping</label>
                  <input
                    type="number"
                    value={remodelCosts.landscaping}
                    onChange={(e) => updateRemodelCost('landscaping', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Other</label>
                  <input
                    type="number"
                    value={remodelCosts.other}
                    onChange={(e) => updateRemodelCost('other', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="$0"
                  />
                </div>
              </div>

              {getTotalRemodelCost() > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Total Investment</p>
                      <p className="text-lg text-gray-600">${(offerPrice + getTotalRemodelCost()).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Your Offer Price</p>
                      <p className="text-lg text-gray-600">${offerPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Remodel Costs</p>
                      <p className="text-lg font-bold text-indigo-600">${getTotalRemodelCost().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Repair & Expense Section */}
            <div className="border-t pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Repairs & Reserves</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Repair Amount</label>
                  <input
                    type="number"
                    value={repairAmount}
                    onChange={(e) => setRepairAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Repair Period</label>
                  <select
                    value={repairPeriod}
                    onChange={(e) => setRepairPeriod(e.target.value as 'monthly' | 'annual' | 'project')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="project">One-Time Project</option>
                  </select>
                  {repairPeriod === 'annual' && (
                    <p className="text-xs text-gray-500 mt-1">${Math.round(repairAmount / 12)}/mo average</p>
                  )}
                  {repairPeriod === 'project' && (
                    <p className="text-xs text-gray-500 mt-1">Not included in monthly cash flow</p>
                  )}
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableRepairFund}
                      onChange={(e) => setEnableRepairFund(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">Enable Repair Fund Reserve</span>
                  </label>
                </div>
              </div>
              {enableRepairFund && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Repair Fund Reserve (%  of monthly rent)</label>
                  <input
                    type="number"
                    value={repairFundPercent}
                    onChange={(e) => setRepairFundPercent(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    min="0"
                    max="20"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Recommended: 5-10% for long-term reserves (roof, HVAC, etc.)
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Property Tax/mo</label>
                <input
                  type="number"
                  value={propertyTax}
                  onChange={(e) => setPropertyTax(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance/mo</label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">HOA/mo</label>
                <input
                  type="number"
                  value={hoa}
                  onChange={(e) => setHoa(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Monthly Expenses Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Monthly Expenses Breakdown</h3>
              <div className={`grid grid-cols-2 ${enableRepairFund ? 'md:grid-cols-7' : 'md:grid-cols-6'} gap-4`}>
                <div>
                  <p className="text-xs text-gray-600">Mortgage (P&I)</p>
                  <p className="text-lg font-bold text-gray-900">${calculateMonthlyExpenses().mortgage.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Property Tax</p>
                  <p className="text-lg font-bold text-gray-900">${propertyTax.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Insurance</p>
                  <p className="text-lg font-bold text-gray-900">${insurance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Repairs {repairPeriod === 'annual' && '(avg)'}</p>
                  <p className="text-lg font-bold text-gray-900">${calculateMonthlyExpenses().repairs.toLocaleString()}</p>
                  {repairPeriod === 'project' && (
                    <p className="text-xs text-gray-500 mt-1">Project: ${repairAmount.toLocaleString()}</p>
                  )}
                </div>
                {enableRepairFund && (
                  <div>
                    <p className="text-xs text-gray-600">Repair Fund</p>
                    <p className="text-lg font-bold text-blue-600">${calculateMonthlyExpenses().repairFund.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{repairFundPercent}% reserve</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-600">HOA</p>
                  <p className="text-lg font-bold text-gray-900">${hoa.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-100 rounded-lg p-2">
                  <p className="text-xs text-indigo-700 font-semibold">Total Expenses</p>
                  <p className="text-lg font-bold text-indigo-900">${calculateMonthlyExpenses().total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Cash Flow Projections */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Monthly Cash Flow by Strategy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Traditional Rental</p>
                  <p className="text-xl font-bold text-blue-600">${report.estimatedRent?.toLocaleString() || '0'}/mo</p>
                  <p className={`text-sm font-semibold mt-2 ${calculateCashFlow(report.estimatedRent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Cash Flow: ${calculateCashFlow(report.estimatedRent || 0).toLocaleString()}/mo
                  </p>
                </div>
                {report.governmentHousing && (
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Section 8</p>
                    <p className="text-xl font-bold text-green-600">${report.governmentHousing.estimatedSection8Rent?.toLocaleString() || '0'}/mo</p>
                    <p className={`text-sm font-semibold mt-2 ${calculateCashFlow(report.governmentHousing.estimatedSection8Rent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Cash Flow: ${calculateCashFlow(report.governmentHousing.estimatedSection8Rent || 0).toLocaleString()}/mo
                    </p>
                  </div>
                )}
                {report.shortTermRental && (
                  <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Short-Term Rental</p>
                    <p className="text-xl font-bold text-purple-600">${report.shortTermRental.estimatedMonthlyRevenue?.toLocaleString() || '0'}/mo</p>
                    <p className={`text-sm font-semibold mt-2 ${calculateCashFlow(report.shortTermRental.estimatedMonthlyRevenue || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Cash Flow: ${calculateCashFlow(report.shortTermRental.estimatedMonthlyRevenue || 0).toLocaleString()}/mo
                    </p>
                  </div>
                )}
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
                      <p className="text-2xl font-bold text-gray-900">${expert.estimatedValue?.toLocaleString() || '0'}</p>
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
                        {(expert.pros || []).map((pro, i) => (
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
                        {(expert.cons || []).map((con, i) => (
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

        {/* Short-Term Rental Analysis */}
        {report.shortTermRental && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Home className="h-7 w-7 text-indigo-600" />
              Short-Term Rental Analysis (Airbnb / VRBO)
            </h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Average Nightly Rate</p>
                  <p className="text-2xl font-bold text-purple-600">${report.shortTermRental.averageNightlyRate}/night</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Est. Monthly Revenue (Net)</p>
                  <p className="text-2xl font-bold text-green-600">${report.shortTermRental.estimatedMonthlyRevenue?.toLocaleString() || '0'}/mo</p>
                  {report.shortTermRental.vsTraditionalRental !== undefined && (
                    <p className={`text-xs mt-1 font-semibold ${report.shortTermRental.vsTraditionalRental >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {report.shortTermRental.vsTraditionalRental >= 0 ? '+' : ''}{report.shortTermRental.vsTraditionalRental}% vs traditional
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Expected Occupancy</p>
                  <p className="text-2xl font-bold text-blue-600">{report.shortTermRental.occupancyRate}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Market Info</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700"><span className="font-semibold">Platform:</span> {report.shortTermRental.platform}</p>
                    <p className="text-sm text-gray-700"><span className="font-semibold">Seasonal Demand:</span> {report.shortTermRental.seasonalDemand}</p>
                    <p className="text-sm text-gray-700"><span className="font-semibold">Competition:</span> {report.shortTermRental.competitionLevel}</p>
                    <p className="text-sm text-gray-700"><span className="font-semibold">Annual Revenue:</span> ${report.shortTermRental.projectedAnnualRevenue?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Regulations & Requirements</h4>
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                      report.shortTermRental.regulations.permitsRequired
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {report.shortTermRental.regulations.permitsRequired ? (
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
                    <p className="text-sm text-gray-700 mt-2"><span className="font-semibold">Max Nights/Year:</span> {report.shortTermRental.regulations.maxNightsPerYear}</p>
                    <p className="text-sm text-gray-600 italic">{report.shortTermRental.regulations.restrictions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">Recommendation</h4>
                <p className="text-purple-800 text-sm">{report.shortTermRental.recommendation}</p>
              </div>
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
                  <p className="text-2xl font-bold text-blue-600">${report.governmentHousing.estimatedSection8Rent?.toLocaleString() || '0'}/mo</p>
                  <p className="text-xs text-gray-500 mt-1">${((report.governmentHousing.estimatedSection8Rent || 0) * 12).toLocaleString()}/year</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Potential Monthly Income</p>
                  <p className="text-2xl font-bold text-green-600">${report.governmentHousing.estimatedMonthlyIncome?.total?.toLocaleString() || '0'}/mo</p>
                  <p className="text-xs text-gray-500 mt-1">Annual: ${report.governmentHousing.annualIncome?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">VA-HUD VASH Rent</p>
                  <p className="text-2xl font-bold text-purple-600">${report.governmentHousing.estimatedVAHUDVASHRent?.toLocaleString() || '0'}/mo</p>
                  <p className="text-xs text-gray-500 mt-1">Veterans housing program</p>
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
                  <p className="text-sm text-gray-600 mt-3">{report.governmentHousing.waitlistInfo}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Affordable Housing Programs</h4>
                  <ul className="space-y-2">
                    {report.governmentHousing.affordableHousingPrograms.map((program, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{program}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Recommendation</h4>
                <p className="text-sm text-gray-700">{report.governmentHousing.recommendation}</p>
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
                  {(report.aiAnalysis.strengths || []).map((strength, i) => (
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
                  {(report.aiAnalysis.concerns || []).map((concern, i) => (
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
