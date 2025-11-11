'use client';

import { useState, useEffect } from 'react';
import { Home, Plus, Search, DollarSign, Users, TrendingUp, Edit, Trash2, Loader2 } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';

interface LandlordProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Auto-fetched property details
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  yearBuilt?: number;
  propertyType: string;
  estimatedValue?: number;

  // Ownership details
  purchasePrice?: number;
  purchaseDate?: string;
  monthlyMortgage?: number;
  monthlyRent?: number;

  // Tenant info
  currentTenant?: string;
  leaseEndDate?: string;

  status: 'VACANT' | 'RENTED' | 'MAINTENANCE';
}

export default function MyPropertiesPage() {
  const [properties, setProperties] = useState<LandlordProperty[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchAddress, setSearchAddress] = useState('');

  const [newProperty, setNewProperty] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    purchasePrice: '',
    purchaseDate: '',
    monthlyMortgage: '',
    monthlyRent: '',
    mortgageBalance: '',
    mortgageRate: '',
    mortgageTerm: '',
    lenderName: '',
    loanNumber: '',
  });

  const [fetchedPropertyDetails, setFetchedPropertyDetails] = useState<any>(null);

  // Fetch properties on mount
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties/my-properties');
      const data = await response.json();

      if (data.success) {
        setProperties(data.properties);
      } else {
        console.error('Failed to fetch properties:', data.error);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSearchProperty = async () => {
    if (!searchAddress.trim()) {
      alert('Please enter an address to search');
      return;
    }

    setLoading(true);
    setFetchedPropertyDetails(null);

    try {
      // Search Zillow for property details
      const response = await fetch('/api/properties/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchAddress }),
      });

      const data = await response.json();

      if (data.success && data.property) {
        // Auto-populate form with fetched data
        setNewProperty({
          ...newProperty,
          address: data.property.address,
          city: data.property.city,
          state: data.property.state,
          zipCode: data.property.zipCode,
        });

        // Store full property details for display
        setFetchedPropertyDetails(data.property);

        alert('✅ Property found! Review the details below and add your purchase information.');
      } else {
        alert(data.error || 'Property not found. Please enter details manually.');
      }
    } catch (error) {
      console.error('Property lookup error:', error);
      alert('Failed to fetch property details. Please enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async () => {
    setLoading(true);
    try {
      // Fetch full property details from Zillow
      const response = await fetch('/api/properties/add-landlord-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty),
      });

      const data = await response.json();
      if (data.success) {
        setProperties([...properties, data.property]);
        setShowAddModal(false);
        setNewProperty({
          address: '',
          city: '',
          state: '',
          zipCode: '',
          purchasePrice: '',
          purchaseDate: '',
          monthlyMortgage: '',
          monthlyRent: '',
        });
        setSearchAddress('');
        setFetchedPropertyDetails(null);
      } else {
        alert('Failed to add property: ' + data.error);
      }
    } catch (error) {
      console.error('Add property error:', error);
      alert('Failed to add property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to remove this property?')) {
      return;
    }

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setProperties(properties.filter(p => p.id !== id));
      } else {
        alert('Failed to delete property: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Home className="h-8 w-8 text-indigo-600" />
              My Properties
            </h1>
            <p className="mt-2 text-gray-600">Manage your rental portfolio</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
          >
            <Plus className="h-5 w-5" />
            Add Property
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
              </div>
              <Home className="h-10 w-10 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Occupied</p>
                <p className="text-2xl font-bold text-green-600">
                  {properties.filter(p => p.status === 'RENTED').length}
                </p>
              </div>
              <Users className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vacant</p>
                <p className="text-2xl font-bold text-orange-600">
                  {properties.filter(p => p.status === 'VACANT').length}
                </p>
              </div>
              <Home className="h-10 w-10 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Income</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ${properties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Properties List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
          </div>
          {initialLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Loading your properties...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No properties added yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Add your first property
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {properties.map((property) => (
                <div key={property.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{property.address}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          property.status === 'RENTED' ? 'bg-green-100 text-green-800' :
                          property.status === 'VACANT' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {property.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{property.city}, {property.state} {property.zipCode}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Bedrooms</p>
                          <p className="font-semibold">{property.bedrooms} beds</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Bathrooms</p>
                          <p className="font-semibold">{property.bathrooms} baths</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Square Feet</p>
                          <p className="font-semibold">{property.squareFeet?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Year Built</p>
                          <p className="font-semibold">{property.yearBuilt || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                        <div>
                          <p className="text-gray-500">Purchase Price</p>
                          <p className="font-semibold">${property.purchasePrice?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Estimated Value</p>
                          <p className="font-semibold text-green-600">
                            ${property.estimatedValue?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Monthly Rent</p>
                          <p className="font-semibold text-indigo-600">
                            ${property.monthlyRent?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Monthly Mortgage</p>
                          <p className="font-semibold">${property.monthlyMortgage?.toLocaleString() || 'N/A'}</p>
                        </div>
                      </div>

                      {property.currentTenant && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>Tenant: {property.currentTenant}</span>
                          {property.leaseEndDate && (
                            <span className="text-gray-400">• Lease ends: {property.leaseEndDate}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => window.location.href = `/properties/${property.id}`}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View/Edit Property"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Property</h2>
              <p className="text-gray-600 mt-1">Search by address to auto-fill property details</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Address Search with Autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Property Address (Optional)
                </label>
                <div className="flex gap-2">
                  <AddressAutocomplete
                    value={searchAddress}
                    onChange={setSearchAddress}
                    onSelect={(suggestion) => {
                      // Automatically search when an address is selected
                      setSearchAddress(suggestion.description);
                      // Trigger search after a brief delay to allow state update
                      setTimeout(() => {
                        handleSearchProperty();
                      }, 100);
                    }}
                    placeholder="Start typing an address..."
                    className="flex-1"
                  />
                  <button
                    onClick={handleSearchProperty}
                    disabled={loading || !searchAddress}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                    Search
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Search Zillow for property details, or skip and enter manually below.
                </p>
              </div>

              {/* Fetched Property Details Preview */}
              {fetchedPropertyDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">✅</span> Property Found on Zillow
                  </h3>

                  {/* Basic Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="col-span-2">
                      <span className="text-gray-600">Full Address:</span>
                      <p className="font-semibold">
                        {fetchedPropertyDetails.address}, {fetchedPropertyDetails.city}, {fetchedPropertyDetails.state} {fetchedPropertyDetails.zipCode}
                      </p>
                    </div>
                    {fetchedPropertyDetails.bedrooms && (
                      <div>
                        <span className="text-gray-600">Bedrooms:</span>
                        <p className="font-semibold">{fetchedPropertyDetails.bedrooms} beds</p>
                      </div>
                    )}
                    {fetchedPropertyDetails.bathrooms && (
                      <div>
                        <span className="text-gray-600">Bathrooms:</span>
                        <p className="font-semibold">{fetchedPropertyDetails.bathrooms} baths</p>
                      </div>
                    )}
                    {fetchedPropertyDetails.squareFeet && (
                      <div>
                        <span className="text-gray-600">Living Area:</span>
                        <p className="font-semibold">{fetchedPropertyDetails.squareFeet.toLocaleString()} sq ft</p>
                      </div>
                    )}
                    {fetchedPropertyDetails.yearBuilt && (
                      <div>
                        <span className="text-gray-600">Year Built:</span>
                        <p className="font-semibold">{fetchedPropertyDetails.yearBuilt}</p>
                      </div>
                    )}
                  </div>

                  {/* Financial Details */}
                  {(fetchedPropertyDetails.estimatedValue || fetchedPropertyDetails.lastSoldPrice || fetchedPropertyDetails.taxAssessedValue) && (
                    <div className="border-t border-green-200 pt-3 mb-4">
                      <h4 className="font-semibold text-green-900 mb-2">Financial Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {fetchedPropertyDetails.estimatedValue && (
                          <div>
                            <span className="text-gray-600">Current Value:</span>
                            <p className="font-semibold text-green-700">
                              ${fetchedPropertyDetails.estimatedValue.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {fetchedPropertyDetails.lastSoldPrice && (
                          <div>
                            <span className="text-gray-600">Last Sold Price:</span>
                            <p className="font-semibold">
                              ${fetchedPropertyDetails.lastSoldPrice.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {fetchedPropertyDetails.lastSoldDate && (
                          <div>
                            <span className="text-gray-600">Last Sold Date:</span>
                            <p className="font-semibold">
                              {new Date(fetchedPropertyDetails.lastSoldDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {fetchedPropertyDetails.taxAssessedValue && (
                          <div>
                            <span className="text-gray-600">Tax Assessed Value:</span>
                            <p className="font-semibold">
                              ${fetchedPropertyDetails.taxAssessedValue.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {fetchedPropertyDetails.hoaFee && (
                          <div>
                            <span className="text-gray-600">HOA Fee:</span>
                            <p className="font-semibold">
                              ${fetchedPropertyDetails.hoaFee}/month
                            </p>
                          </div>
                        )}
                        {fetchedPropertyDetails.lotSize && (
                          <div>
                            <span className="text-gray-600">Lot Size:</span>
                            <p className="font-semibold">
                              {fetchedPropertyDetails.lotSize.toLocaleString()} sq ft
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* County Tax Records */}
                  {fetchedPropertyDetails.countyRecords && Object.keys(fetchedPropertyDetails.countyRecords).length > 0 && (
                    <div className="border-t border-green-200 pt-3 mt-4">
                      <h4 className="font-semibold text-green-900 mb-2">🏛️ County Tax Records</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {fetchedPropertyDetails.countyRecords.ownerName && (
                          <div>
                            <span className="text-gray-600">Owner:</span>
                            <p className="font-semibold">{fetchedPropertyDetails.countyRecords.ownerName}</p>
                          </div>
                        )}
                        {fetchedPropertyDetails.countyRecords.appraisedValue && (
                          <div>
                            <span className="text-gray-600">Appraised Value:</span>
                            <p className="font-semibold">${Number(fetchedPropertyDetails.countyRecords.appraisedValue).toLocaleString()}</p>
                          </div>
                        )}
                        {fetchedPropertyDetails.countyRecords.taxAmount && (
                          <div>
                            <span className="text-gray-600">Annual Tax:</span>
                            <p className="font-semibold">${Number(fetchedPropertyDetails.countyRecords.taxAmount).toLocaleString()}</p>
                          </div>
                        )}
                        {fetchedPropertyDetails.countyRecords.saleDate && (
                          <div>
                            <span className="text-gray-600">Last Sale Date:</span>
                            <p className="font-semibold">{fetchedPropertyDetails.countyRecords.saleDate}</p>
                          </div>
                        )}
                        {fetchedPropertyDetails.countyRecords.salePrice && (
                          <div>
                            <span className="text-gray-600">Last Sale Price:</span>
                            <p className="font-semibold">${Number(fetchedPropertyDetails.countyRecords.salePrice).toLocaleString()}</p>
                          </div>
                        )}
                        {fetchedPropertyDetails.countyRecords.parcelNumber && (
                          <div>
                            <span className="text-gray-600">Parcel #:</span>
                            <p className="font-semibold">{fetchedPropertyDetails.countyRecords.parcelNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Zillow Link */}
                  {fetchedPropertyDetails.zillowUrl && (
                    <div className="pt-2">
                      <a
                        href={fetchedPropertyDetails.zillowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        View on Zillow →
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold mb-4">Property Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <AddressAutocomplete
                      value={newProperty.address}
                      onChange={(value) => setNewProperty({ ...newProperty, address: value })}
                      onSelect={(suggestion) => {
                        // Parse the address to extract components
                        const fullAddress = suggestion.description;
                        const parts = fullAddress.split(', ');

                        // Extract city, state, zip from the address
                        let city = '';
                        let state = '';
                        let zipCode = '';

                        if (parts.length >= 3) {
                          city = parts[parts.length - 3] || '';
                          const stateZip = parts[parts.length - 2] || '';
                          const stateZipParts = stateZip.split(' ');
                          state = stateZipParts[0] || '';
                          zipCode = stateZipParts[1] || '';
                        }

                        setNewProperty({
                          ...newProperty,
                          address: parts[0] || fullAddress,
                          city: city,
                          state: state,
                          zipCode: zipCode,
                        });
                      }}
                      placeholder="Start typing address..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={newProperty.city}
                        onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                        placeholder="San Antonio"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={newProperty.state}
                        onChange={(e) => setNewProperty({ ...newProperty, state: e.target.value.toUpperCase() })}
                        maxLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                        placeholder="TX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        value={newProperty.zipCode}
                        onChange={(e) => setNewProperty({ ...newProperty, zipCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                        placeholder="78253"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold mb-4">Purchase Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
                    <input
                      type="number"
                      value={newProperty.purchasePrice}
                      onChange={(e) => setNewProperty({ ...newProperty, purchasePrice: e.target.value })}
                      placeholder="250000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                    <input
                      type="date"
                      value={newProperty.purchaseDate}
                      onChange={(e) => setNewProperty({ ...newProperty, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent</label>
                    <input
                      type="number"
                      value={newProperty.monthlyRent}
                      onChange={(e) => setNewProperty({ ...newProperty, monthlyRent: e.target.value })}
                      placeholder="2000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold mb-4">💰 Mortgage & Equity Tracking</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Mortgage Payment</label>
                    <input
                      type="number"
                      value={newProperty.monthlyMortgage}
                      onChange={(e) => setNewProperty({ ...newProperty, monthlyMortgage: e.target.value })}
                      placeholder="1500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Mortgage Balance</label>
                    <input
                      type="number"
                      value={newProperty.mortgageBalance}
                      onChange={(e) => setNewProperty({ ...newProperty, mortgageBalance: e.target.value })}
                      placeholder="200000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProperty.mortgageRate}
                      onChange={(e) => setNewProperty({ ...newProperty, mortgageRate: e.target.value })}
                      placeholder="3.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term (years)</label>
                    <input
                      type="number"
                      value={newProperty.mortgageTerm}
                      onChange={(e) => setNewProperty({ ...newProperty, mortgageTerm: e.target.value })}
                      placeholder="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lender Name</label>
                    <input
                      type="text"
                      value={newProperty.lenderName}
                      onChange={(e) => setNewProperty({ ...newProperty, lenderName: e.target.value })}
                      placeholder="Wells Fargo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Number</label>
                    <input
                      type="text"
                      value={newProperty.loanNumber}
                      onChange={(e) => setNewProperty({ ...newProperty, loanNumber: e.target.value })}
                      placeholder="123456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Equity Calculation Display */}
                {newProperty.mortgageBalance && fetchedPropertyDetails?.estimatedValue && (
                  <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">📊 Equity Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Current Value</p>
                        <p className="text-lg font-bold text-green-600">
                          ${Number(fetchedPropertyDetails.estimatedValue).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount Owed</p>
                        <p className="text-lg font-bold text-orange-600">
                          ${Number(newProperty.mortgageBalance).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available Equity</p>
                        <p className="text-lg font-bold text-indigo-600">
                          ${(Number(fetchedPropertyDetails.estimatedValue) - Number(newProperty.mortgageBalance)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchAddress('');
                  setFetchedPropertyDetails(null);
                  setNewProperty({
                    address: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    purchasePrice: '',
                    purchaseDate: '',
                    monthlyMortgage: '',
                    monthlyRent: '',
                    mortgageBalance: '',
                    mortgageRate: '',
                    mortgageTerm: '',
                    lenderName: '',
                    loanNumber: '',
                  });
                }}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProperty}
                disabled={loading || !newProperty.address || !newProperty.city || !newProperty.state}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold"
              >
                {loading ? 'Adding...' : 'Add Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
