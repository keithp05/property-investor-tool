'use client';

import { useState, useEffect } from 'react';
import { Gavel, MapPin, DollarSign, Calendar, AlertCircle, Search, Loader2, TrendingUp } from 'lucide-react';

interface TaxAuction {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  auctionDate: string;
  minimumBid: number;
  taxesOwed: number;
  judgmentAmount: number;
  caseNumber: string;
  defendant: string;
  parcelNumber: string;
  propertyType: string;
  legalDescription: string;
  auctionLocation: string;
  auctionTime: string;
  status: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  appraisedValue?: number;
}

export default function TaxAuctionsPage() {
  const [auctions, setAuctions] = useState<TaxAuction[]>([]);
  const [loading, setLoading] = useState(false);
  const [county, setCounty] = useState('Bexar');
  const [state, setState] = useState('TX');
  const [zipCode, setZipCode] = useState('78253');

  const fetchTaxAuctions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auctions/tax-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ county, state, zipCode }),
      });

      const data = await response.json();

      if (data.success) {
        setAuctions(data.auctions);
      } else {
        console.error('Failed to fetch tax auctions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tax auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Gavel className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">County Tax Auctions</h1>
          </div>
          <p className="text-gray-600">
            Find properties at tax foreclosure sales - great investment opportunities with below-market prices
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="Bexar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="TX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="78253"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTaxAuctions}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Fetching tax auction listings from county records...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Gavel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No tax auctions found</p>
            <p className="text-sm text-gray-400">Try searching for a different county or check back later</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">{auctions.length}</span> tax auction{auctions.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {auctions.map((auction, index) => (
                <div key={index} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {auction.address}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{auction.city}, {auction.state} {auction.zipCode}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        auction.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' :
                        auction.status === 'SOLD' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {auction.status}
                      </span>
                    </div>

                    {/* Financial Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {auction.minimumBid && (
                        <div className="bg-indigo-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Minimum Bid</p>
                          <p className="text-lg font-bold text-indigo-600">
                            ${Number(auction.minimumBid).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {auction.taxesOwed && (
                        <div className="bg-orange-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">Taxes Owed</p>
                          <p className="text-lg font-bold text-orange-600">
                            ${Number(auction.taxesOwed).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Auction Details */}
                    <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
                      {auction.auctionDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Auction Date:</span>
                          <span className="font-semibold">{auction.auctionDate}</span>
                        </div>
                      )}
                      {auction.auctionTime && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Time:</span>
                          <span className="font-semibold">{auction.auctionTime}</span>
                        </div>
                      )}
                      {auction.auctionLocation && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <span className="text-gray-600">Location:</span>
                            <p className="font-semibold">{auction.auctionLocation}</p>
                          </div>
                        </div>
                      )}
                      {auction.caseNumber && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Case #:</span>
                          <span className="font-semibold">{auction.caseNumber}</span>
                        </div>
                      )}
                      {auction.parcelNumber && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Parcel #:</span>
                          <span className="font-semibold">{auction.parcelNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    {auction.defendant && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Defendant: {auction.defendant}</p>
                      </div>
                    )}

                    {/* Analysis Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // Create a tax-auction property ID
                          const auctionId = `tax-auction-${auction.parcelNumber || index}`;
                          const params = new URLSearchParams({
                            address: auction.address,
                            city: auction.city,
                            state: auction.state,
                            zipCode: auction.zipCode,
                            price: String(auction.minimumBid || auction.appraisedValue || 0),
                            bedrooms: String(auction.bedrooms || 3),
                            bathrooms: String(auction.bathrooms || 2),
                            squareFeet: String(auction.squareFeet || 1500),
                            yearBuilt: String(auction.yearBuilt || 2000),
                            type: 'tax-auction',
                          });
                          window.location.href = `/properties/${auctionId}/analyze?${params.toString()}`;
                        }}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center gap-2"
                      >
                        <TrendingUp className="h-5 w-5" />
                        Analyze Property
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
