'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  X,
  Send,
  Users,
  Filter,
  ChevronRight,
  Loader2,
  Building2,
  DollarSign,
} from 'lucide-react';

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
];

// Mock data
const MOCK_PREFERRED_PROS = [
  {
    id: '1',
    businessName: 'Quick Fix Plumbing',
    name: 'Mike Johnson',
    phone: '(512) 555-1234',
    email: 'mike@quickfix.com',
    serviceCategories: ['PLUMBING'],
    hourlyRate: 75,
    rating: 4.9,
    totalReviews: 32,
    status: 'ACCEPTED',
    isPrimary: true,
    primaryForCategory: 'PLUMBING',
    totalJobsCompleted: 15,
  },
  {
    id: '2',
    businessName: 'Sparky Electric Co.',
    name: 'Sarah Chen',
    phone: '(512) 555-5678',
    email: 'sarah@sparkyelectric.com',
    serviceCategories: ['ELECTRICAL'],
    hourlyRate: 85,
    rating: 4.7,
    totalReviews: 18,
    status: 'ACCEPTED',
    isPrimary: true,
    primaryForCategory: 'ELECTRICAL',
    totalJobsCompleted: 8,
  },
  {
    id: '3',
    businessName: 'Cool Breeze HVAC',
    name: 'James Wilson',
    phone: '(512) 555-9012',
    email: 'james@coolbreeze.com',
    serviceCategories: ['HVAC'],
    hourlyRate: 95,
    rating: 4.8,
    totalReviews: 24,
    status: 'PENDING',
    isPrimary: false,
    totalJobsCompleted: 0,
  },
];

const MOCK_MARKETPLACE_PROS = [
  {
    id: '4',
    businessName: 'Handy Helpers',
    name: 'Tom Brown',
    serviceCategories: ['GENERAL_HANDYMAN', 'PAINTING', 'CARPENTRY'],
    hourlyRate: 55,
    rating: 4.6,
    totalReviews: 42,
    city: 'Austin',
    state: 'TX',
    bio: 'Over 15 years of experience in general home repairs and improvements.',
  },
  {
    id: '5',
    businessName: 'Green Lawn Care',
    name: 'Maria Garcia',
    serviceCategories: ['LANDSCAPING'],
    hourlyRate: 45,
    rating: 4.9,
    totalReviews: 67,
    city: 'Austin',
    state: 'TX',
    bio: 'Full-service landscaping including lawn care, tree trimming, and irrigation.',
  },
];

export default function LandlordProsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preferred' | 'marketplace' | 'invite'>('preferred');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', phone: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleInvite = async () => {
    // TODO: Implement invite API
    console.log('Inviting pro:', inviteData);
    setShowInviteModal(false);
    setInviteData({ email: '', phone: '', message: '' });
    alert('Invitation sent!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Professionals</h1>
            <p className="text-sm text-gray-500">Manage your preferred pros and find new ones</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Invite a Pro
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{MOCK_PREFERRED_PROS.length}</p>
                <p className="text-sm text-gray-500">Preferred Pros</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {MOCK_PREFERRED_PROS.filter(p => p.status === 'ACCEPTED').length}
                </p>
                <p className="text-sm text-gray-500">Active Connections</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {MOCK_PREFERRED_PROS.filter(p => p.status === 'PENDING').length}
                </p>
                <p className="text-sm text-gray-500">Pending Invites</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('preferred')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'preferred'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Preferred Pros
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'marketplace'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Find Pros
          </button>
        </div>

        {/* Preferred Pros Tab */}
        {activeTab === 'preferred' && (
          <div className="space-y-4">
            {MOCK_PREFERRED_PROS.map((pro) => (
              <div key={pro.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 p-3 rounded-full">
                      <Wrench className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{pro.businessName}</h3>
                        {pro.isPrimary && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Primary for {pro.primaryForCategory}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          pro.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          pro.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {pro.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{pro.name}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          {pro.rating} ({pro.totalReviews} reviews)
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${pro.hourlyRate}/hr
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {pro.totalJobsCompleted} jobs completed
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <a href={`tel:${pro.phone}`} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {pro.phone}
                        </a>
                        <a href={`mailto:${pro.email}`} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {pro.email}
                        </a>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {pro.serviceCategories.map((cat) => (
                          <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {SERVICE_CATEGORIES.find(c => c.value === cat)?.label || cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {pro.status === 'ACCEPTED' && (
                      <Link
                        href={`/landlord/service-requests/new?proId=${pro.id}`}
                        className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Dispatch Job
                      </Link>
                    )}
                    <Link
                      href={`/landlord/pros/${pro.id}`}
                      className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-center"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {MOCK_PREFERRED_PROS.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No preferred pros yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Invite pros or find them in the marketplace
                </p>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Browse Marketplace
                </button>
              </div>
            )}
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, business, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Categories</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pro Cards */}
            {MOCK_MARKETPLACE_PROS.map((pro) => (
              <div key={pro.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <Wrench className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{pro.businessName}</h3>
                      <p className="text-sm text-gray-600">{pro.name}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          {pro.rating} ({pro.totalReviews} reviews)
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${pro.hourlyRate}/hr
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {pro.city}, {pro.state}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mt-2">{pro.bio}</p>

                      <div className="flex gap-2 mt-3">
                        {pro.serviceCategories.map((cat) => (
                          <span key={cat} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {SERVICE_CATEGORIES.find(c => c.value === cat)?.label || cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // TODO: Add to preferred list
                      alert(`Adding ${pro.businessName} to your preferred list`);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm whitespace-nowrap"
                  >
                    Add to Preferred
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Invite a Service Professional</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Send an invitation to a service professional you know. They'll receive an email or SMS with instructions to join.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="pro@example.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-center text-sm text-gray-500">or</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (for SMS)</label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personal Message (optional)</label>
                <textarea
                  placeholder="Hi! I'd like to add you to my preferred service professionals..."
                  value={inviteData.message}
                  onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteData.email && !inviteData.phone}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
