'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Loader2, CheckCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

const SERVICE_CATEGORIES = [
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair' },
  { value: 'ROOFING', label: 'Roofing' },
  { value: 'PAINTING', label: 'Painting' },
  { value: 'FLOORING', label: 'Flooring' },
  { value: 'CARPENTRY', label: 'Carpentry' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'PEST_CONTROL', label: 'Pest Control' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'LOCKSMITH', label: 'Locksmith' },
  { value: 'GENERAL_HANDYMAN', label: 'General Handyman' },
  { value: 'OTHER', label: 'Other' },
];

export default function ProRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    // Account
    email: '',
    password: '',
    confirmPassword: '',
    name: '',

    // Business Info
    businessName: '',
    phone: '',
    businessAddress: '',
    city: '',
    state: '',
    zipCode: '',
    serviceRadius: '25',

    // Services
    serviceCategories: [] as string[],
    specialties: '',

    // Rates
    hourlyRate: '',
    callOutFee: '',
    emergencyRate: '',
    acceptsEmergency: false,

    // Credentials
    licenseNumber: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',

    // Bio
    bio: '',
  });

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(category)
        ? prev.serviceCategories.filter(c => c !== category)
        : [...prev.serviceCategories, category],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.serviceCategories.length === 0) {
      setError('Please select at least one service category');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/pro/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/pro/dashboard?welcome=true');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-full">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join as a Service Professional</h1>
          <p className="text-gray-600 mt-2">
            Connect with landlords and grow your property service business
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 ${s < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Account */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Your Account</h2>
              <input
                type="text"
                placeholder="Your Full Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="email"
                placeholder="Email Address *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="password"
                placeholder="Password *"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="password"
                placeholder="Confirm Password *"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
              <input
                type="text"
                placeholder="Business Name *"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="tel"
                placeholder="Business Phone *"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Business Address"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="State"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Radius (miles)
                </label>
                <select
                  value={formData.serviceRadius}
                  onChange={(e) => setFormData({ ...formData, serviceRadius: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="10">10 miles</option>
                  <option value="25">25 miles</option>
                  <option value="50">50 miles</option>
                  <option value="100">100 miles</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Services & Rates */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Services & Rates</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Categories * (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_CATEGORIES.map((cat) => (
                    <label
                      key={cat.value}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition ${
                        formData.serviceCategories.includes(cat.value)
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-300 hover:border-indigo-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.serviceCategories.includes(cat.value)}
                        onChange={() => toggleCategory(cat.value)}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-sm">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Specialties (e.g., Water heaters, Smart home installation...)"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($)</label>
                  <input
                    type="number"
                    placeholder="75"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Call-out Fee ($)</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={formData.callOutFee}
                    onChange={(e) => setFormData({ ...formData, callOutFee: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Rate ($)</label>
                  <input
                    type="number"
                    placeholder="125"
                    value={formData.emergencyRate}
                    onChange={(e) => setFormData({ ...formData, emergencyRate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.acceptsEmergency}
                  onChange={(e) => setFormData({ ...formData, acceptsEmergency: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-700">I accept emergency/after-hours calls</span>
              </label>
            </div>
          )}

          {/* Step 4: Credentials & Bio */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Credentials & Profile</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Optional but recommended:</strong> Adding license and insurance info helps build trust with landlords.
                </p>
              </div>

              <input
                type="text"
                placeholder="License Number (if applicable)"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Insurance Provider"
                value={formData.insuranceProvider}
                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Insurance Policy Number"
                value={formData.insurancePolicyNumber}
                onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">About Your Business</label>
                <textarea
                  placeholder="Tell landlords about your experience, specialties, and what makes your service stand out..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  By registering, you agree to our terms of service and privacy policy. 
                  You'll be able to set up Stripe Connect for payments after registration.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Already have an account?
              </Link>
            )}

            {step < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Complete Registration
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <Building2 className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Connect with Landlords</p>
            <p className="text-xs text-gray-500 mt-1">Get invited to their preferred list</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <Wrench className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Manage Jobs</p>
            <p className="text-xs text-gray-500 mt-1">Calendar, scheduling, invoicing</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <CheckCircle className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Get Paid Fast</p>
            <p className="text-xs text-gray-500 mt-1">Stripe Connect integration</p>
          </div>
        </div>
      </div>
    </div>
  );
}
