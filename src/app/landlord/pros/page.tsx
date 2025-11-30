'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Plus,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  X,
  Search,
  UserPlus,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface PreferredPro {
  id: string;
  status: string;
  isPrimary: boolean;
  primaryForCategory: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  pro: {
    id: string;
    businessName: string;
    phone: string;
    city: string | null;
    state: string | null;
    serviceCategories: string[];
    averageRating: number;
    totalReviews: number;
    totalJobsCompleted: number;
    hourlyRate: number | null;
    user: {
      name: string;
      email: string;
    };
  };
}

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

export default function LandlordProsPage() {
  const { data: session, status } = useSession();
  const [pros, setPros] = useState<PreferredPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    phone: '',
    name: '',
  });
  const [inviting, setInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPros();
    }
  }, [status]);

  const fetchPros = async () => {
    try {
      const res = await fetch('/api/landlord/pros');
      const data = await res.json();
      if (data.success) {
        setPros(data.pros);
      }
    } catch (error) {
      console.error('Failed to fetch pros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteData.email && !inviteData.phone) {
      alert('Please provide an email or phone number');
      return;
    }

    setInviting(true);
    try {
      const res = await fetch('/api/landlord/pros/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });
      const data = await res.json();
      if (data.success) {
        alert('Invitation sent!');
        setShowInviteModal(false);
        setInviteData({ email: '', phone: '', name: '' });
        fetchPros();
      } else {
        alert(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      alert('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (proConnectionId: string) => {
    if (!confirm('Are you sure you want to remove this pro from your preferred list?')) {
      return;
    }

    try {
      const res = await fetch(`/api/landlord/pros/${proConnectionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchPros();
      }
    } catch (error) {
      console.error('Failed to remove pro:', error);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  // Filter pros
  const filteredPros = pros.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.pro.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pro.user.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !filterCategory || p.pro.serviceCategories.includes(filterCategory);

    return matchesSearch && matchesCategory;
  });

  // Group by status
  const acceptedPros = filteredPros.filter((p) => p.status === 'ACCEPTED');
  const pendingPros = filteredPros.filter((p) => p.status === 'PENDING');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Preferred Pros</h1>
              <p className="text-sm text-gray-500">Manage your service professional network</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/landlord/pros/find"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Find Pros
              </Link>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite Pro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pros..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pending Invitations */}
        {pendingPros.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Pending Invitations ({pendingPros.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingPros.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {connection.pro.businessName}
                      </h3>
                      <p className="text-sm text-gray-500">{connection.pro.user.name}</p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Invited {new Date(connection.invitedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Pros */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Your Pros ({acceptedPros.length})
          </h2>

          {acceptedPros.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Preferred Pros Yet</h3>
              <p className="text-gray-500 mb-4">
                Invite service professionals to build your network
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Invite Your First Pro
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptedPros.map((connection) => (
                <div key={connection.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {connection.pro.businessName}
                        </h3>
                        <p className="text-sm text-gray-500">{connection.pro.user.name}</p>
                      </div>
                      {connection.isPrimary && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">
                          {connection.pro.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        ({connection.pro.totalReviews} reviews)
                      </span>
                      <span className="text-sm text-gray-500">
                        • {connection.pro.totalJobsCompleted} jobs
                      </span>
                    </div>

                    {/* Services */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {connection.pro.serviceCategories.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {cat.replace('_', ' ')}
                        </span>
                      ))}
                      {connection.pro.serviceCategories.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{connection.pro.serviceCategories.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {connection.pro.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {connection.pro.user.email}
                      </div>
                      {connection.pro.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {connection.pro.city}, {connection.pro.state}
                        </div>
                      )}
                    </div>

                    {/* Rate */}
                    {connection.pro.hourlyRate && (
                      <p className="text-sm font-medium text-gray-900">
                        ${Number(connection.pro.hourlyRate).toFixed(0)}/hr
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <Link
                      href={`/landlord/pros/${connection.pro.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      View Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => handleRemove(connection.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Invite a Pro</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Send an invitation to a service professional. They'll receive an email or SMS with a link to join your network.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pro's Name
                </label>
                <input
                  type="text"
                  placeholder="John's Plumbing"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="pro@example.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (for SMS)
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
