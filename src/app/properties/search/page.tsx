'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, DollarSign, Home, TrendingUp, Navigation, History, Clock, X } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

interface SearchHistoryItem {
  id: string;
  searchParams: {
    city: string;
    state: string;
    zipcode: string;
    address: string;
    minPrice: string;
    maxPrice: string;
    minBedrooms: string;
    maxBedrooms: string;
    propertyType: string;
  };
  timestamp: number;
  resultsCount: number;
  searchType: 'city' | 'zipcode' | 'address';
}

export default function PropertySearchPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<'city' | 'zipcode' | 'address'>('city');
  const [searchParams, setSearchParams] = useState({
    city: '',
    state: '',
    zipcode: '',
    address: '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    maxBedrooms: '',
    propertyType: '',
  });
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const history = localStorage.getItem('propertySearchHistory');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  const handleGPSSearch = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get address
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const geocodeData = await geocodeResponse.json();

          // Extract address components
          const address = geocodeData.address;
          setSearchParams({
            ...searchParams,
            address: geocodeData.display_name || '',
            city: address.city || address.town || address.village || '',
            state: address.state || '',
            zipcode: address.postcode || '',
          });
          setSearchMode('address');

          // Automatically trigger search
          await handleSearch();
        } catch (error) {
          console.error('GPS error:', error);
          alert('Failed to get location. Please try again.');
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please enable location services.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveToHistory = (resultsCount: number) => {
    const historyItem: SearchHistoryItem = {
      id: Date.now().toString(),
      searchParams: { ...searchParams },
      timestamp: Date.now(),
      resultsCount,
      searchType: searchMode,
    };

    const updatedHistory = [historyItem, ...searchHistory]
      .slice(0, 10); // Keep only last 10 searches

    setSearchHistory(updatedHistory);
    localStorage.setItem('propertySearchHistory', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (item: SearchHistoryItem) => {
    setSearchParams(item.searchParams);
    setSearchMode(item.searchType);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('propertySearchHistory');
    setShowHistory(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: searchParams.city,
          state: searchParams.state,
          zipCode: searchParams.zipcode,  // Fixed: match backend camelCase
          address: searchParams.address,
          minPrice: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
          maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
          minBedrooms: searchParams.minBedrooms ? parseInt(searchParams.minBedrooms) : undefined,
          maxBedrooms: searchParams.maxBedrooms ? parseInt(searchParams.maxBedrooms) : undefined,
          propertyType: searchParams.propertyType || undefined,
          sources: ['zillow', 'realtor', 'facebook'],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
        saveToHistory(data.properties.length);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeProperty = (property: any) => {
    // Save property data to localStorage for the analysis page
    localStorage.setItem(`property-${property.id}`, JSON.stringify(property));

    // Determine property ID - prefix with source if it's an external property
    let propertyId = property.id;
    let isExternal = false;

    if (property.source && property.source !== 'database') {
      // External property - prefix with source name
      propertyId = property.id.toString().startsWith(property.source)
        ? property.id
        : `${property.source}-${property.id}`;
      isExternal = true;
    } else if (!property.source && typeof property.id === 'number') {
      // Likely a Zillow property without explicit source
      propertyId = `zillow-${property.id}`;
      isExternal = true;
    }

    // For external properties, go directly to analyze page
    if (isExternal) {
      const queryParams = new URLSearchParams({
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        price: (property.currentValue || property.estimatedValue || property.purchasePrice || 0).toString(),
        bedrooms: (property.bedrooms || 3).toString(),
        bathrooms: (property.bathrooms || 2).toString(),
        squareFeet: (property.squareFeet || 1500).toString(),
        type: property.source || 'zillow'
      });
      router.push(`/properties/${propertyId}/analyze?${queryParams.toString()}`);
    } else {
      // Database properties go to detail page
      router.push(`/properties/${propertyId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Property Search</h1>
          <p className="text-sm text-gray-600">Find investment properties from multiple sources</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {/* Search Mode Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setSearchMode('city')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchMode === 'city'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                City/State
              </button>
              <button
                onClick={() => setSearchMode('zipcode')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchMode === 'zipcode'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ZIP Code
              </button>
              <button
                onClick={() => setSearchMode('address')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  searchMode === 'address'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Specific Address
              </button>
            </div>

            {/* GPS Button */}
            <button
              onClick={handleGPSSearch}
              disabled={gpsLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              <Navigation className="h-4 w-4" />
              <span>{gpsLoading ? 'Getting Location...' : 'Use My Location'}</span>
            </button>
          </div>

          {/* Search Inputs based on mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {searchMode === 'city' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={searchParams.city}
                    onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Austin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={searchParams.state}
                    onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
              </>
            )}

            {searchMode === 'zipcode' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={searchParams.zipcode}
                  onChange={(e) => setSearchParams({ ...searchParams, zipcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="78701"
                  maxLength={5}
                />
              </div>
            )}

            {searchMode === 'address' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Address
                </label>
                <AddressAutocomplete
                  value={searchParams.address}
                  onChange={(value) => setSearchParams({ ...searchParams, address: value })}
                  onSelect={async (suggestion) => {
                    // Set the selected address
                    setSearchParams({ ...searchParams, address: suggestion.description });

                    // Automatically search for this specific property
                    setLoading(true);
                    try {
                      const response = await fetch('/api/properties/lookup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ address: suggestion.description }),
                      });

                      const data = await response.json();

                      if (data.success && data.property) {
                        // Show single property result
                        setProperties([{
                          id: data.property.zpid || `temp-${Date.now()}`,
                          address: data.property.address,
                          city: data.property.city,
                          state: data.property.state,
                          zipCode: data.property.zipCode,
                          bedrooms: data.property.bedrooms,
                          bathrooms: data.property.bathrooms,
                          squareFeet: data.property.squareFeet,
                          yearBuilt: data.property.yearBuilt,
                          propertyType: data.property.propertyType || 'SINGLE_FAMILY',
                          currentValue: data.property.estimatedValue || data.property.zestimate,
                          purchasePrice: data.property.estimatedValue || data.property.zestimate,
                          monthlyRent: data.property.rentZestimate,
                          marketRent: data.property.marketRent,
                          estimatedValue: data.property.estimatedValue || data.property.zestimate,
                          source: 'zillow', // Mark as external source
                          status: 'AVAILABLE',
                          createdAt: new Date(),
                          updatedAt: new Date(),
                        }]);
                      } else {
                        alert('Property details not found. Try a broader search using city or ZIP code.');
                      }
                    } catch (error) {
                      console.error('Property lookup error:', error);
                      alert('Failed to fetch property details. Try a broader search.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  placeholder="Start typing an address (e.g., 123 Main St...)"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={searchParams.propertyType}
                onChange={(e) => setSearchParams({ ...searchParams, propertyType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                <option value="SINGLE_FAMILY">Single Family</option>
                <option value="MULTI_FAMILY">Multi Family</option>
                <option value="CONDO">Condo</option>
                <option value="TOWNHOUSE">Townhouse</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Price
              </label>
              <input
                type="number"
                value={searchParams.minPrice}
                onChange={(e) => setSearchParams({ ...searchParams, minPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="200000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Price
              </label>
              <input
                type="number"
                value={searchParams.maxPrice}
                onChange={(e) => setSearchParams({ ...searchParams, maxPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="500000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Bedrooms
              </label>
              <input
                type="number"
                value={searchParams.minBedrooms}
                onChange={(e) => setSearchParams({ ...searchParams, minBedrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="3"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Bedrooms
              </label>
              <input
                type="number"
                value={searchParams.maxBedrooms}
                onChange={(e) => setSearchParams({ ...searchParams, maxBedrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="5"
                min="0"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={
                loading ||
                (searchMode === 'city' && (!searchParams.city || !searchParams.state)) ||
                (searchMode === 'zipcode' && !searchParams.zipcode) ||
                (searchMode === 'address' && !searchParams.address)
              }
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Search className="h-5 w-5" />
              <span>{loading ? 'Searching...' : 'Search Properties'}</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="relative bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition flex items-center space-x-2"
              title="Search History"
            >
              <History className="h-5 w-5" />
              {searchHistory.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {searchHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <History className="h-6 w-6" />
                  Search History
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {searchHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No search history yet</p>
                    <p className="text-gray-400 text-sm mt-2">Your recent searches will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchHistory.map((item) => {
                      const date = new Date(item.timestamp);
                      const searchDescription =
                        item.searchType === 'city' ? `${item.searchParams.city}, ${item.searchParams.state}` :
                        item.searchType === 'zipcode' ? `ZIP ${item.searchParams.zipcode}` :
                        item.searchParams.address;

                      return (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer"
                          onClick={() => loadFromHistory(item)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-indigo-600" />
                                <h3 className="font-semibold text-gray-900">{searchDescription}</h3>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Home className="h-3 w-3" />
                                  {item.resultsCount} {item.resultsCount === 1 ? 'result' : 'results'}
                                </span>
                              </div>

                              {/* Price Range */}
                              {(item.searchParams.minPrice || item.searchParams.maxPrice) && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <DollarSign className="h-3 w-3 inline mr-1" />
                                  {item.searchParams.minPrice && `$${parseInt(item.searchParams.minPrice).toLocaleString()}`}
                                  {item.searchParams.minPrice && item.searchParams.maxPrice && ' - '}
                                  {item.searchParams.maxPrice && `$${parseInt(item.searchParams.maxPrice).toLocaleString()}`}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => loadFromHistory(item)}
                              className="ml-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                            >
                              Load Search
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {searchHistory.length > 0 && (
                <div className="p-6 border-t bg-gray-50 flex justify-between">
                  <button
                    onClick={clearHistory}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear All History
                  </button>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {properties.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Found {properties.length} Properties
              </h2>
              <div className="text-sm text-gray-600">
                Sources: Zillow, Realtor.com, Facebook
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onAnalyze={() => analyzeProperty(property)}
                />
              ))}
            </div>
          </div>
        )}

        {properties.length === 0 && !loading && (
          <div className="text-center py-12">
            <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Enter search criteria above to find properties
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function PropertyCard({ property, onAnalyze }: { property: any; onAnalyze: () => void }) {
  const isAuction = property.metadata?.isAuction;
  const auctionType = property.metadata?.auctionType;
  const daysUntilAuction = property.metadata?.daysUntilAuction;
  const estimatedEquity = property.metadata?.estimatedEquity;
  const auctionDateFormatted = property.metadata?.auctionDateFormatted;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition ${isAuction ? 'ring-2 ring-yellow-400' : ''}`}>
      {/* Property Image */}
      <div className="h-48 bg-gray-200 relative">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-semibold">
          {property.source}
        </div>
        {isAuction && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold flex items-center space-x-1">
            <span>⚡</span>
            <span>{auctionType}</span>
          </div>
        )}
        {isAuction && daysUntilAuction !== undefined && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
            {daysUntilAuction} days until auction
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">
            ${property.purchasePrice?.toLocaleString() || 'N/A'}
          </h3>
          <span className="text-sm text-gray-600">{property.propertyType}</span>
        </div>

        {/* Auction Info Banner */}
        {isAuction && estimatedEquity && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-800 font-medium">Potential Equity:</span>
              <span className="text-green-900 font-bold">${estimatedEquity.toLocaleString()}</span>
            </div>
            {auctionDateFormatted && (
              <div className="text-xs text-green-700 mt-1">
                Auction: {auctionDateFormatted}
              </div>
            )}
          </div>
        )}

        <div className="flex items-start space-x-1 text-gray-700 mb-3">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            {property.address}, {property.city}, {property.state}
          </p>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <span>{property.bedrooms} beds</span>
          <span>{property.bathrooms} baths</span>
          {property.squareFeet && <span>{property.squareFeet.toLocaleString()} sqft</span>}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onAnalyze}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Analyze</span>
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <DollarSign className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
