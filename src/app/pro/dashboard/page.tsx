'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Wrench, Calendar, DollarSign, Star, Bell, Settings,
  ClipboardList, Clock, CheckCircle, AlertCircle, MapPin,
  ChevronRight, Plus, MessageSquare
} from 'lucide-react';

// Mock data for now - will be replaced with API calls
const mockJobs = [
  {
    id: '1',
    title: 'Leaky Faucet Repair',
    property: '123 Oak Street, Austin, TX',
    status: 'SCHEDULED',
    scheduledDate: '2025-11-30',
    scheduledTime: '10:00 AM',
    priority: 'MEDIUM',
    category: 'PLUMBING',
    estimatedPay: 150,
  },
  {
    id: '2',
    title: 'HVAC Not Cooling',
    property: '456 Maple Ave, Austin, TX',
    status: 'DISPATCHED',
    priority: 'HIGH',
    category: 'HVAC',
    estimatedPay: 250,
  },
  {
    id: '3',
    title: 'Electrical Outlet Repair',
    property: '789 Pine Rd, Austin, TX',
    status: 'IN_PROGRESS',
    scheduledDate: '2025-11-29',
    scheduledTime: '2:00 PM',
    priority: 'LOW',
    category: 'ELECTRICAL',
    estimatedPay: 100,
  },
];

const mockStats = {
  pendingJobs: 3,
  completedThisMonth: 12,
  earningsThisMonth: 3450,
  averageRating: 4.8,
  totalReviews: 47,
};

export default function ProDashboardPage() {
  const searchParams = useSearchParams();
  const isNewRegistration = searchParams.get('registered') === 'true';
  const [showWelcome, setShowWelcome] = useState(isNewRegistration);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPATCHED': return 'bg-yellow-100 text-yellow-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pro Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <MessageSquare className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">2</span>
            </button>
            <Link 
              href="/pro/profile"
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Banner for New Users */}
        {showWelcome && (
          <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white relative">
            <button 
              onClick={() => setShowWelcome(false)}
              className="absolute top-3 right-3 text-white/80 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-2">🎉 Welcome to RentalIQ Pro!</h2>
            <p className="text-white/90 mb-4">
              Your account has been created. Complete your profile to start receiving job requests from landlords.
            </p>
            <div className="flex gap-3">
              <Link 
                href="/pro/profile"
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-gray-100"
              >
                Complete Profile
              </Link>
              <Link 
                href="/pro/calendar"
                className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30"
              >
                Set Availability
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{mockStats.pendingJobs}</p>
                <p className="text-sm text-gray-500">Pending Jobs</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{mockStats.completedThisMonth}</p>
                <p className="text-sm text-gray-500">Completed (Month)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${mockStats.earningsThisMonth.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Earnings (Month)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{mockStats.averageRating}</p>
                <p className="text-sm text-gray-500">{mockStats.totalReviews} Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
                <Link 
                  href="/pro/jobs"
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="divide-y">
                {mockJobs.map((job) => (
                  <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{job.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.property}
                          </span>
                        </div>

                        {job.scheduledDate && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {job.scheduledDate} at {job.scheduledTime}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-xs font-medium ${getPriorityColor(job.priority)}`}>
                            {job.priority} Priority
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {job.category}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          ${job.estimatedPay}
                        </p>
                        <p className="text-xs text-gray-500">Est. Pay</p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {job.status === 'DISPATCHED' && (
                        <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                          Accept Job
                        </button>
                      )}
                      {job.status === 'SCHEDULED' && (
                        <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                          Start Work
                        </button>
                      )}
                      {job.status === 'IN_PROGRESS' && (
                        <button className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                          Complete Job
                        </button>
                      )}
                      <Link 
                        href={`/pro/jobs/${job.id}`}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}

                {mockJobs.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No active jobs</p>
                    <p className="text-sm">New job requests will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
                <Link 
                  href="/pro/calendar"
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Calendar
                </Link>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">10:00 AM</p>
                    <p className="text-sm text-gray-600">Leaky Faucet - 123 Oak St</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 mt-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">2:00 PM</p>
                    <p className="text-sm text-gray-600">Electrical - 789 Pine Rd</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <Link 
                  href="/pro/profile"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">Edit Profile</span>
                </Link>
                <Link 
                  href="/pro/calendar"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">Set Availability</span>
                </Link>
                <Link 
                  href="/pro/earnings"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">View Earnings</span>
                </Link>
                <Link 
                  href="/pro/messages"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">Messages</span>
                </Link>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  "Great work! Fixed the issue quickly and professionally. Highly recommend!"
                </p>
                <p className="text-xs text-gray-400 mt-1">- John D., 2 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
