'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Calendar,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Settings,
  TrendingUp,
  MapPin,
  Phone,
  Building2,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// Mock data for demo - will be replaced with real API calls
const MOCK_JOBS = [
  {
    id: '1',
    title: 'Fix Leaking Faucet',
    property: '123 Main St, Austin, TX',
    landlord: 'John Smith',
    status: 'SCHEDULED',
    scheduledDate: '2024-01-20',
    scheduledTime: '09:00 AM',
    category: 'PLUMBING',
    priority: 'MEDIUM',
  },
  {
    id: '2',
    title: 'HVAC Not Cooling',
    property: '456 Oak Ave, Austin, TX',
    landlord: 'Jane Doe',
    status: 'DISPATCHED',
    category: 'HVAC',
    priority: 'HIGH',
  },
  {
    id: '3',
    title: 'Replace Outlet',
    property: '789 Pine Rd, Austin, TX',
    landlord: 'Bob Wilson',
    status: 'COMPLETED',
    completedDate: '2024-01-15',
    category: 'ELECTRICAL',
    finalCost: 150,
  },
];

const MOCK_STATS = {
  pendingJobs: 2,
  completedThisMonth: 8,
  totalEarningsMonth: 2450,
  averageRating: 4.8,
  totalReviews: 24,
};

export default function ProDashboardPage() {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'calendar' | 'earnings'>('jobs');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Banner */}
      {isWelcome && (
        <div className="bg-green-500 text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6" />
              <span className="font-medium">Welcome! Your Pro account has been created successfully.</span>
            </div>
            <Link href="/pro/profile" className="text-sm underline hover:no-underline">
              Complete Your Profile →
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pro Dashboard</h1>
              <p className="text-sm text-gray-500">Service Professional Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 relative">
              <MessageSquare className="h-6 w-6" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            <Link href="/pro/settings" className="p-2 text-gray-500 hover:text-gray-700">
              <Settings className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{MOCK_STATS.pendingJobs}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed This Month</p>
                <p className="text-2xl font-bold text-gray-900">{MOCK_STATS.completedThisMonth}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Earnings This Month</p>
                <p className="text-2xl font-bold text-gray-900">${MOCK_STATS.totalEarningsMonth.toLocaleString()}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                  {MOCK_STATS.averageRating}
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </p>
                <p className="text-xs text-gray-500">{MOCK_STATS.totalReviews} reviews</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'jobs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Jobs
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'earnings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Earnings
          </button>
        </div>

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Jobs</h2>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="all">All Jobs</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {MOCK_JOBS.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        job.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'DISPATCHED' ? 'bg-amber-100 text-amber-700' :
                        job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        job.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                        job.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {job.priority}
                      </span>
                      <span className="text-xs text-gray-500">{job.category}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {job.property}
                      </p>
                      <p className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {job.landlord}
                      </p>
                      {job.scheduledDate && (
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {job.scheduledDate} at {job.scheduledTime}
                        </p>
                      )}
                      {job.finalCost && (
                        <p className="flex items-center gap-2 text-green-600 font-medium">
                          <DollarSign className="h-4 w-4" />
                          ${job.finalCost}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/pro/jobs/${job.id}`}
                    className="text-indigo-600 hover:text-indigo-800 p-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}

            {MOCK_JOBS.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No jobs yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Jobs will appear here when landlords dispatch work to you
                </p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Calendar Coming Soon</h3>
              <p className="text-gray-500 mt-2">
                View and manage your scheduled appointments
              </p>
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">$650</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">$2,450</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">All Time</p>
                  <p className="text-2xl font-bold text-gray-900">$12,800</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Setup</h3>
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Setup Required
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                Connect your Stripe account to receive payments directly from landlords.
              </p>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Connect Stripe Account
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/pro/profile"
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition text-center"
          >
            <Settings className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Edit Profile</p>
          </Link>
          <Link
            href="/pro/availability"
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition text-center"
          >
            <Clock className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Set Availability</p>
          </Link>
          <Link
            href="/pro/reviews"
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition text-center"
          >
            <Star className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">View Reviews</p>
          </Link>
          <Link
            href="/pro/messages"
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition text-center"
          >
            <MessageSquare className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Messages</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
