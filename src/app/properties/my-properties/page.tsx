'use client';

import { useState } from 'react';
import { Home, Plus, Search, DollarSign, Users, TrendingUp, Edit, Trash2, Loader2 } from 'lucide-react';

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
  });

  const handleSearchProperty = async () => {
    setLoading(true);
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

        // Store fetched property data for later use
        setLoading(false);
        alert('Property found! Details auto-populated. Please fill in your purchase information.');
      } else {
        alert('Property not found. Please enter details manually.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Property lookup error:', error);
      alert('Failed to fetch property details. Please enter manually.');
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

  const handleDeleteProperty = (id: string) => {
    if (confirm('Are you sure you want to remove this property?')) {
      setProperties(properties.filter(p => p.id !== id));
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
          {properties.length === 0 ? (
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
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
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
              {/* Address Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Property Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="123 Main St, San Antonio, TX 78253"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  We&apos;ll automatically fetch property details from public records
                </p>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold mb-4">Property Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={newProperty.address}
                      onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Mortgage</label>
                    <input
                      type="number"
                      value={newProperty.monthlyMortgage}
                      onChange={(e) => setNewProperty({ ...newProperty, monthlyMortgage: e.target.value })}
                      placeholder="1500"
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
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
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
