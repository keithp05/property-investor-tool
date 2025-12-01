'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building,
  DollarSign,
  Users,
  Plus,
  Star,
  Phone,
  Mail,
  Globe,
  MapPin,
  Trash2,
  Edit,
  Search,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';

interface Lender {
  id: string;
  name: string;
  type: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  interestRateMin: number | null;
  interestRateMax: number | null;
  ltvMax: number | null;
  timeToClose: string | null;
  loanTypes: string[];
  notes: string | null;
  rating: number | null;
  isFavorite: boolean;
}

const LENDER_TYPES = [
  { value: 'BANK', label: 'Bank', icon: Building, color: 'blue' },
  { value: 'CREDIT_UNION', label: 'Credit Union', icon: Building, color: 'green' },
  { value: 'MORTGAGE_COMPANY', label: 'Mortgage Company', icon: Building, color: 'purple' },
  { value: 'HARD_MONEY', label: 'Hard Money', icon: DollarSign, color: 'orange' },
  { value: 'PRIVATE_INVESTOR', label: 'Private Investor', icon: Users, color: 'pink' },
  { value: 'CROWDFUNDING', label: 'Crowdfunding', icon: Users, color: 'cyan' },
];

const LOAN_TYPES = [
  'PURCHASE',
  'REFINANCE',
  'CASH_OUT',
  'CONSTRUCTION',
  'BRIDGE',
  'FIX_AND_FLIP',
  'RENTAL',
];

export default function LendersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    state: '',
    minLoanAmount: '',
    maxLoanAmount: '',
    interestRateMin: '',
    interestRateMax: '',
    ltvMax: '',
    timeToClose: '',
    loanTypes: [] as string[],
    notes: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchLenders();
    }
  }, [status, router]);

  const fetchLenders = async () => {
    try {
      const res = await fetch('/api/lenders');
      const data = await res.json();
      if (data.success) {
        setLenders(data.lenders);
      }
    } catch (error) {
      console.error('Failed to fetch lenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      alert('Name and type are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/lenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({
          name: '', type: 'BANK', contactName: '', email: '', phone: '', website: '',
          city: '', state: '', minLoanAmount: '', maxLoanAmount: '', interestRateMin: '',
          interestRateMax: '', ltvMax: '', timeToClose: '', loanTypes: [], notes: '',
        });
        fetchLenders();
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save lender');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lender?')) return;
    
    try {
      const res = await fetch(`/api/lenders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLenders();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const toggleLoanType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      loanTypes: prev.loanTypes.includes(type)
        ? prev.loanTypes.filter((t) => t !== type)
        : [...prev.loanTypes, type],
    }));
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter lenders
  const filteredLenders = lenders.filter((lender) => {
    const matchesTab = activeTab === 'ALL' || lender.type === activeTab;
    const matchesSearch = !searchTerm ||
      lender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lender.contactName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Group by type for display
  const tabs = [
    { key: 'ALL', label: 'All Lenders', count: lenders.length },
    { key: 'BANK', label: 'Banks', count: lenders.filter((l) => l.type === 'BANK' || l.type === 'CREDIT_UNION').length },
    { key: 'HARD_MONEY', label: 'Hard Money', count: lenders.filter((l) => l.type === 'HARD_MONEY').length },
    { key: 'PRIVATE_INVESTOR', label: 'Investors', count: lenders.filter((l) => l.type === 'PRIVATE_INVESTOR' || l.type === 'CROWDFUNDING').length },
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lenders</h1>
            <p className="text-gray-600 mt-1">Manage your lending contacts and financing options</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Lender
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 border-b-2 font-medium text-sm transition flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search lenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Lenders Grid */}
        {filteredLenders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Lenders Yet</h3>
            <p className="text-gray-500 mb-4">Add your first lender contact to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Lender
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLenders.map((lender) => {
              const typeInfo = LENDER_TYPES.find((t) => t.value === lender.type);
              const Icon = typeInfo?.icon || Building;
              
              return (
                <div key={lender.id} className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden">
                  <div className={`px-4 py-3 bg-${typeInfo?.color || 'gray'}-50 border-b border-gray-200`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 text-${typeInfo?.color || 'gray'}-600`} />
                        <span className="text-sm font-medium text-gray-700">{typeInfo?.label || lender.type}</span>
                      </div>
                      {lender.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">{lender.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg">{lender.name}</h3>
                    {lender.contactName && (
                      <p className="text-sm text-gray-600">{lender.contactName}</p>
                    )}

                    <div className="mt-3 space-y-2 text-sm">
                      {lender.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${lender.phone}`} className="hover:text-indigo-600">{lender.phone}</a>
                        </div>
                      )}
                      {lender.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${lender.email}`} className="hover:text-indigo-600">{lender.email}</a>
                        </div>
                      )}
                      {lender.website && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Globe className="h-4 w-4" />
                          <a href={lender.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 truncate">
                            {lender.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {(lender.city || lender.state) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{[lender.city, lender.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Loan Info */}
                    {(lender.interestRateMin || lender.ltvMax || lender.timeToClose) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
                        {lender.interestRateMin && (
                          <div>
                            <p className="text-gray-500">Rate</p>
                            <p className="font-semibold text-gray-900">
                              {lender.interestRateMin}{lender.interestRateMax ? `-${lender.interestRateMax}` : ''}%
                            </p>
                          </div>
                        )}
                        {lender.ltvMax && (
                          <div>
                            <p className="text-gray-500">Max LTV</p>
                            <p className="font-semibold text-gray-900">{lender.ltvMax}%</p>
                          </div>
                        )}
                        {lender.timeToClose && (
                          <div>
                            <p className="text-gray-500">Close</p>
                            <p className="font-semibold text-gray-900">{lender.timeToClose}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Loan Types */}
                    {lender.loanTypes && lender.loanTypes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {lender.loanTypes.slice(0, 3).map((type) => (
                          <span key={type} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {type.replace('_', ' ')}
                          </span>
                        ))}
                        {lender.loanTypes.length > 3 && (
                          <span className="text-xs text-gray-500">+{lender.loanTypes.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                    <button
                      onClick={() => handleDelete(lender.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Lender</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lender Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Chase Bank"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {LENDER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contact@lender.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <h3 className="font-medium text-gray-900 pt-4 border-t">Loan Terms</h3>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Min %</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="6.5"
                    value={formData.interestRateMin}
                    onChange={(e) => setFormData({ ...formData, interestRateMin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Max %</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="12"
                    value={formData.interestRateMax}
                    onChange={(e) => setFormData({ ...formData, interestRateMax: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max LTV %</label>
                  <input
                    type="number"
                    placeholder="80"
                    value={formData.ltvMax}
                    onChange={(e) => setFormData({ ...formData, ltvMax: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time to Close</label>
                  <input
                    type="text"
                    placeholder="7-14 days"
                    value={formData.timeToClose}
                    onChange={(e) => setFormData({ ...formData, timeToClose: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Types</label>
                <div className="flex flex-wrap gap-2">
                  {LOAN_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleLoanType(type)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.loanTypes.includes(type)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Lender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
