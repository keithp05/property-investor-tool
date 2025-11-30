'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Calendar,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Loader2,
  User,
  MessageSquare,
} from 'lucide-react';

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  estimatedCost: number | null;
  property: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  landlord: {
    user: {
      name: string;
      email: string;
    };
    phone: string | null;
  };
  _count: {
    messages: number;
    changeOrders: number;
  };
}

interface ProProfile {
  id: string;
  businessName: string;
  averageRating: number;
  totalReviews: number;
  totalJobsCompleted: number;
  serviceCategories: string[];
  _count: {
    serviceRequests: number;
    appointments: number;
  };
}

export default function ProDashboardPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled' | 'completed'>('active');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const profileRes = await fetch('/api/pro/profile');
      const profileData = await profileRes.json();
      if (profileData.success) {
        setProfile(profileData.profile);
      }

      // Fetch services
      const servicesRes = await fetch('/api/pro/services');
      const servicesData = await servicesRes.json();
      if (servicesData.success) {
        setServices(servicesData.services);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
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

  // Filter services by tab
  const filteredServices = services.filter((s) => {
    if (activeTab === 'active') {
      return ['DISPATCHED', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(s.status);
    }
    if (activeTab === 'scheduled') {
      return s.status === 'SCHEDULED';
    }
    if (activeTab === 'completed') {
      return s.status === 'COMPLETED';
    }
    return false;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPATCHED': return 'bg-blue-100 text-blue-800';
      case 'SCHEDULED': return 'bg-purple-100 text-purple-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {profile?.businessName || 'Pro Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">Service Professional Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pro/calendar" className="p-2 text-gray-600 hover:text-gray-900">
                <Calendar className="h-5 w-5" />
              </Link>
              <Link href="/pro/profile" className="p-2 text-gray-600 hover:text-gray-900">
                <User className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {services.filter(s => !['COMPLETED', 'CANCELLED'].includes(s.status)).length}
                </p>
                <p className="text-sm text-gray-500">Active Jobs</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.totalJobsCompleted || 0}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.averageRating.toFixed(1) || '0.0'}
                </p>
                <p className="text-sm text-gray-500">Rating ({profile?.totalReviews || 0})</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {services.filter(s => s.status === 'SCHEDULED').length}
                </p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { key: 'active', label: 'Active Jobs', icon: Clock },
                { key: 'scheduled', label: 'Scheduled', icon: Calendar },
                { key: 'completed', label: 'Completed', icon: CheckCircle },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Job List */}
          <div className="p-4">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {activeTab} jobs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredServices.map((service) => (
                  <Link
                    key={service.id}
                    href={`/pro/jobs/${service.id}`}
                    className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(service.priority)}`}>
                            {service.priority}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(service.status)}`}>
                            {service.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {service.category.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900">{service.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {service.property.address}, {service.property.city}
                          </span>
                          {service.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(service.scheduledDate).toLocaleDateString()}
                              {service.scheduledTime && ` at ${service.scheduledTime}`}
                            </span>
                          )}
                          {service._count.messages > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {service._count.messages} messages
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {service.estimatedCost && (
                          <span className="text-lg font-semibold text-gray-900">
                            ${Number(service.estimatedCost).toLocaleString()}
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/pro/calendar"
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3"
          >
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View Calendar</h3>
              <p className="text-sm text-gray-500">Manage your schedule</p>
            </div>
          </Link>

          <Link
            href="/pro/profile"
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3"
          >
            <div className="bg-blue-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Edit Profile</h3>
              <p className="text-sm text-gray-500">Update your info and rates</p>
            </div>
          </Link>

          <Link
            href="/pro/earnings"
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3"
          >
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View Earnings</h3>
              <p className="text-sm text-gray-500">Track your income</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
