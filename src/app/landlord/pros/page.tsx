'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Wrench, Search, Plus, Star, MapPin, Phone, Mail,
  CheckCircle, Clock, X, ChevronRight, Filter, UserPlus
} from 'lucide-react';

const SERVICE_CATEGORIES = [
  { value: 'PLUMBING', label: 'Plumbing', icon: '🔧' },
  { value: 'ELECTRICAL', label: 'Electrical', icon: '⚡' },
  { value: 'HVAC', label: 'HVAC', icon: '❄️' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance Repair', icon: '🔌' },
  { value: 'ROOFING', label: 'Roofing', icon: '🏠' },
  { value: 'PAINTING', label: 'Painting', icon: '🎨' },
  { value: 'FLOORING', label: 'Flooring', icon: '🪵' },
  { value: 'CARPENTRY', label: 'Carpentry', icon: '🪚' },
  { value: 'LANDSCAPING', label: 'Landscaping', icon: '🌳' },
  { value: 'PEST_CONTROL', label: 'Pest Control', icon: '🐜' },
  { value: 'CLEANING', label: 'Cleaning', icon: '🧹' },
  { value: 'LOCKSMITH', label: 'Locksmith', icon: '🔐' },
  { value: 'GENERAL_HANDYMAN', label: 'General Handyman', icon: '🛠️' },
];

// Mock data
const mockPreferredPros = [
  {
    id: '1',
    businessName: 'Smith Plumbing Services',
    name: 'John Smith',
    phone: '(555) 123-4567',
    email: 'john@smithplumbing.com',
    serviceCategories: ['PLUMBING'],
    rating: 4.9,
    totalReviews: 47,
    totalJobs: 23,
    status: 'ACCEPTED',
    isPrimary: true,
    primaryForCategory: 'PLUMBING',
  },
  {
    id: '2',
    businessName: 'Quick Electric Co',
    name: 'Mike Johnson',
    phone: '(555) 234-5678',
    email: 'mike@quickelectric.com',
    serviceCategories: ['ELECTRICAL'],
    rating: 4.7,
    totalReviews: 32,
    totalJobs: 15,
    status: 'ACCEPTED',
    isPrimary: false,
  },
  {
    id: '3',
    businessName: 'Cool Air HVAC',
    name: 'Sarah Davis',
    phone: '(555) 345-6789',
    email: 'sarah@coolair.com',
    serviceCategories: ['HVAC'],
    rating: 4.8,
    totalReviews: 28,
    totalJobs: 8,
    status: 'PENDING',
    isPrimary: false,
  },
];

const mockMarketplacePros = [
  {
    id: '4',
    businessName: 'Pro Handyman Services',
    name: 'Bob Wilson',
    serviceCategories: ['GENERAL_HANDYMAN', 'CARPENTRY', 'PAINTING'],
    rating: 4.6,
    totalReviews: 89,
    hourlyRate: 65,
    city: 'Austin',
    distance: 5,
  },
  {
    id: '5',
    businessName: 'Elite Roofing',
    name: 'Tom Brown',
    serviceCategories: ['ROOFING'],
    rating: 4.9,
    totalReviews: 156,
    hourlyRate: 85,
    city: 'Austin',
    distance: 8,
  },
];

export default function LandlordProsPage() {
  const [activeTab, setActiveTab] = useState<'preferred' | 'marketplace' | 'invite'>('preferred');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', phone: '', message: '' });

  const getCategoryLabel = (value: string) => {
    return SERVICE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getCategoryIcon = (value: string) => {
    return SERVICE_CATEGORIES.find(c => c.value === value)?.icon || '🔧';
  };

  const handleInvite = async () => {
    // TODO: Implement invite API
    console.log('Inviting pro:', inviteForm);
    setShowInviteModal(false);
    setInviteForm({ email: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Professionals</h1>
              <p className="text-gray-500">Manage your preferred pros and find new ones</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <UserPlus className="h-5 w-5" />
              Invite a Pro
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab('preferred')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'preferred'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              My Preferred Pros ({mockPreferredPros.length})
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Find New Pros
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Preferred Pros Tab */}
        {activeTab === 'preferred' && (
          <div>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-3xl font-bold text-indigo-600">{mockPreferredPros.filter(p => p.status === 'ACCEPTED').length}</p>
                <p className="text-sm text-gray-500">Connected Pros</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-3xl font-bold text-yellow-600">{mockPreferredPros.filter(p => p.status === 'PENDING').length}</p>
                <p className="text-sm text-gray-500">Pending Invites</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-3xl font-bold text-green-600">{mockPreferredPros.reduce((acc, p) => acc + p.totalJobs, 0)}</p>
                <p className="text-sm text-gray-500">Total Jobs Completed</p>
              </div>
            </div>

            {/* Pros List */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search pros..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Categories</option>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="divide-y">
                {mockPreferredPros.map((pro) => (
                  <div key={pro.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Wrench className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{pro.businessName}</h3>
                            {pro.status === 'PENDING' && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                                Pending
                              </span>
                            )}
                            {pro.isPrimary && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                Primary for {getCategoryLabel(pro.primaryForCategory || '')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{pro.name}</p>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-amber-600">
                              <Star className="h-4 w-4 fill-current" />
                              {pro.rating} ({pro.totalReviews} reviews)
                            </span>
                            <span className="text-gray-500">
                              {pro.totalJobs} jobs completed
                            </span>
                          </div>

                          <div className="flex gap-2 mt-2">
                            {pro.serviceCategories.map((cat) => (
                              <span key={cat} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${pro.phone}`}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Phone className="h-5 w-5" />
                        </a>
                        <a
                          href={`mailto:${pro.email}`}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Mail className="h-5 w-5" />
                        </a>
                        <Link
                          href={`/landlord/pros/${pro.id}`}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, service, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Services</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  More Filters
                </button>
              </div>
            </div>

            {/* Pro Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {mockMarketplacePros.map((pro) => (
                <div key={pro.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Wrench className="h-7 w-7 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{pro.businessName}</h3>
                        <p className="text-sm text-gray-500">{pro.name}</p>
                        
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-4 w-4 fill-current" />
                            {pro.rating} ({pro.totalReviews})
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {pro.distance} mi away
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">${pro.hourlyRate}/hr</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {pro.serviceCategories.map((cat) => (
                      <span key={cat} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                      Add to Preferred
                    </button>
                    <Link
                      href={`/landlord/pros/${pro.id}`}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Invite a Service Pro</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Send an invitation to a service professional to join your preferred pros network.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="pro@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (for SMS)
                </label>
                <input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Hi! I'd like to add you to my preferred service providers..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
