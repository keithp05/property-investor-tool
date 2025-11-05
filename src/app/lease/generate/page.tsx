'use client';

import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';

export default function LeaseGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [generatedLease, setGeneratedLease] = useState('');
  const [formData, setFormData] = useState({
    // Property Details
    propertyAddress: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'SINGLE_FAMILY',

    // Lease Terms
    monthlyRent: '',
    securityDeposit: '',
    leaseStartDate: '',
    leaseDuration: '12',

    // Landlord Details
    landlordName: '',
    landlordEmail: '',
    landlordPhone: '',

    // Tenant Details
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',

    // Additional Terms
    petPolicy: 'no_pets',
    utilitiesIncluded: [] as string[],
    smokingAllowed: false,
    lateFeeAmount: '',
    lateFeeGracePeriod: '5',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/lease/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedLease(data.leaseDocument);
      } else {
        alert('Failed to generate lease: ' + data.error);
      }
    } catch (error) {
      console.error('Lease generation error:', error);
      alert('Failed to generate lease. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedLease], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-${formData.propertyAddress.replace(/\s/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUtilityToggle = (utility: string) => {
    setFormData(prev => ({
      ...prev,
      utilitiesIncluded: prev.utilitiesIncluded.includes(utility)
        ? prev.utilitiesIncluded.filter(u => u !== utility)
        : [...prev.utilitiesIncluded, utility],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            Lease Agreement Generator
          </h1>
          <p className="mt-2 text-gray-600">
            Generate professional, legally compliant lease agreements in seconds
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Details */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.propertyAddress}
                      onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="TX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SINGLE_FAMILY">Single Family Home</option>
                      <option value="MULTI_FAMILY">Multi-Family</option>
                      <option value="CONDO">Condo</option>
                      <option value="TOWNHOUSE">Townhouse</option>
                      <option value="APARTMENT">Apartment</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lease Terms */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Lease Terms</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent *</label>
                      <input
                        type="number"
                        required
                        value={formData.monthlyRent}
                        onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="1500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit *</label>
                      <input
                        type="number"
                        required
                        value={formData.securityDeposit}
                        onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="1500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.leaseStartDate}
                        onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lease Duration (months)</label>
                      <select
                        value={formData.leaseDuration}
                        onChange={(e) => setFormData({ ...formData, leaseDuration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="6">6 months</option>
                        <option value="12">12 months</option>
                        <option value="18">18 months</option>
                        <option value="24">24 months</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Landlord & Tenant Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Landlord Details</h2>
                  <div className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={formData.landlordName}
                      onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={formData.landlordEmail}
                      onChange={(e) => setFormData({ ...formData, landlordEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone"
                      value={formData.landlordPhone}
                      onChange={(e) => setFormData({ ...formData, landlordPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Tenant Details</h2>
                  <div className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={formData.tenantName}
                      onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={formData.tenantEmail}
                      onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone"
                      value={formData.tenantPhone}
                      onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Terms */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Terms</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pet Policy</label>
                    <select
                      value={formData.petPolicy}
                      onChange={(e) => setFormData({ ...formData, petPolicy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="no_pets">No Pets Allowed</option>
                      <option value="cats_only">Cats Only</option>
                      <option value="dogs_only">Dogs Only</option>
                      <option value="cats_and_dogs">Cats and Dogs Allowed</option>
                      <option value="all_pets">All Pets Allowed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Utilities Included</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Water', 'Electric', 'Gas', 'Internet', 'Trash', 'Lawn Care'].map(utility => (
                        <label key={utility} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.utilitiesIncluded.includes(utility)}
                            onChange={() => handleUtilityToggle(utility)}
                            className="rounded text-indigo-600"
                          />
                          <span className="text-sm text-gray-700">{utility}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee Amount</label>
                      <input
                        type="number"
                        value={formData.lateFeeAmount}
                        onChange={(e) => setFormData({ ...formData, lateFeeAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (days)</label>
                      <input
                        type="number"
                        value={formData.lateFeeGracePeriod}
                        onChange={(e) => setFormData({ ...formData, lateFeeGracePeriod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.smokingAllowed}
                      onChange={(e) => setFormData({ ...formData, smokingAllowed: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Smoking Allowed</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Lease...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Generate Lease Agreement
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Lease Preview</h2>
              {generatedLease && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              )}
            </div>

            {generatedLease ? (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-[800px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {generatedLease}
                </pre>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Fill out the form and click &quot;Generate Lease Agreement&quot; to see your lease here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
