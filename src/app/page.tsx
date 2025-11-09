'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Home, TrendingUp, AlertTriangle, Wrench, DollarSign, Users, Calendar, Bell, Loader2, RefreshCw, BarChart3, FileText, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Alert {
  type: 'maintenance' | 'rent' | 'vacancy' | 'mortgage';
  severity: 'urgent' | 'warning' | 'info';
  message: string;
  count?: number;
  amount?: number;
}

interface PropertyCard {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  monthlyRent: number | null;
  marketRent: number | null;
  section8FMR: number | null;
  section8ContactPhone: string | null;
  estimatedValue: number | null;
  monthlyMortgage: number | null;
  mortgageBalance: number | null;
  tenant: {
    name: string;
    email: string;
    leaseEndDate: Date;
  } | null;
  alerts: Alert[];
  maintenanceCount: number;
}

interface DashboardData {
  stats: {
    totalProperties: number;
    occupiedProperties: number;
    vacantProperties: number;
    monthlyRevenue: number;
    openMaintenanceRequests: number;
    rentStatus: {
      paid: number;
      pending: number;
      overdue: number;
    };
  };
  properties: PropertyCard[];
  recentMaintenance: any[];
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      loadDashboard();
    } else if (status === 'unauthenticated') {
      router.push('/signup');
    }
  }, [status]);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Failed to load dashboard</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const { stats, properties, recentMaintenance } = data;

  // Count total alerts
  const totalAlerts = properties.reduce((sum, p) => sum + p.alerts.length, 0);
  const urgentAlerts = properties.reduce(
    (sum, p) => sum + p.alerts.filter(a => a.severity === 'urgent').length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Dashboard</h1>
          <p className="text-gray-600">Overview of your rental properties and alerts</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Properties"
            value={stats.totalProperties}
            subtitle={`${stats.occupiedProperties} occupied, ${stats.vacantProperties} vacant`}
            icon={<Home className="h-6 w-6 text-blue-600" />}
            color="blue"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            subtitle={`From ${stats.occupiedProperties} rented properties`}
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Maintenance Requests"
            value={stats.openMaintenanceRequests}
            subtitle="Open requests"
            icon={<Wrench className="h-6 w-6 text-orange-600" />}
            color="orange"
            alert={stats.openMaintenanceRequests > 0}
          />
          <StatCard
            title="Rent Status"
            value={`${stats.rentStatus.paid}/${stats.occupiedProperties}`}
            subtitle={stats.rentStatus.overdue > 0 ? `${stats.rentStatus.overdue} overdue` : 'All current'}
            icon={<Calendar className="h-6 w-6 text-purple-600" />}
            color="purple"
            alert={stats.rentStatus.overdue > 0}
          />
        </div>

        {/* Alerts Summary */}
        {totalAlerts > 0 && (
          <div className={`rounded-lg p-4 mb-8 ${
            urgentAlerts > 0
              ? 'bg-red-50 border-2 border-red-200'
              : 'bg-yellow-50 border-2 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <Bell className={`h-6 w-6 ${urgentAlerts > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
              <div>
                <h3 className={`font-semibold ${urgentAlerts > 0 ? 'text-red-900' : 'text-yellow-900'}`}>
                  {urgentAlerts > 0 ? `${urgentAlerts} Urgent Alert${urgentAlerts !== 1 ? 's' : ''}` : 'Attention Needed'}
                </h3>
                <p className={`text-sm ${urgentAlerts > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                  {totalAlerts} total alert{totalAlerts !== 1 ? 's' : ''} across your properties - review below
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Property Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Properties</h2>
          {properties.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Yet</h3>
              <p className="text-gray-600 mb-6">Add your first property to get started</p>
              <Link
                href="/properties/my-properties"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Property
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {properties.map(property => (
                <PropertyCardComponent key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Maintenance */}
        {recentMaintenance.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Maintenance Requests</h2>
            <div className="space-y-4">
              {recentMaintenance.map(request => (
                <div key={request.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          request.priority === 'URGENT'
                            ? 'bg-red-100 text-red-800'
                            : request.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.priority}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{request.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        <span className="font-medium">{request.property}</span> • {request.tenant}
                      </p>
                    </div>
                    <Link
                      href={`/maintenance/${request.id}`}
                      className="ml-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  alert,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${alert ? 'ring-2 ring-red-500' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${color}-50`}>{icon}</div>
        {alert && <Bell className="h-5 w-5 text-red-500" />}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Landing Page Component
function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900">RentalIQ</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-medium"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Intelligent Property Management
            <span className="block text-indigo-600 mt-2">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Streamline your rental portfolio with AI-powered insights, automated workflows, and real-time property analytics
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 font-semibold text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-indigo-600" />}
            title="AI-Powered Analytics"
            description="Get instant property valuations, market rent analysis, and investment insights powered by AI"
          />
          <FeatureCard
            icon={<DollarSign className="h-8 w-8 text-green-600" />}
            title="Financial Intelligence"
            description="Track equity, cash flow, and ROI across your entire portfolio in real-time"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-purple-600" />}
            title="Tenant Management"
            description="Automate leases, collect rent, and manage maintenance requests seamlessly"
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8 text-blue-600" />}
            title="Section 8 Ready"
            description="Integrated HUD Fair Market Rent data and Section 8 contact information"
          />
          <FeatureCard
            icon={<Wrench className="h-8 w-8 text-orange-600" />}
            title="Maintenance Tracking"
            description="Never miss a maintenance request with smart alerts and automated workflows"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-teal-600" />}
            title="Market Insights"
            description="Stay ahead with Zillow integration and real-time market data analysis"
          />
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Property Management?</h2>
          <p className="text-xl mb-8 text-indigo-100">
            Join landlords who are saving time and maximizing profits with RentalIQ
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-semibold text-lg shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-6 w-6 text-indigo-400" />
            <span className="text-xl font-bold text-white">RentalIQ</span>
          </div>
          <p className="text-sm">
            © 2024 RentalIQ. All rights reserved. | Professional Property Management Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PropertyCardComponent({ property }: { property: PropertyCard }) {
  const [refreshing, setRefreshing] = useState(false);
  const [updatedValue, setUpdatedValue] = useState(property.estimatedValue);
  const [marketRent, setMarketRent] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const refreshValue = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/properties/${property.id}/update-value`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success && result.analysis) {
        // Update with the new values from the analysis
        const newValue = result.analysis.estimatedValue || result.analysis.marketValue;
        setUpdatedValue(newValue);

        // Store market rent from AI analysis
        if (result.analysis.estimatedRent) {
          setMarketRent(result.analysis.estimatedRent);
        }
        setAnalysis(result.analysis);

        // Reload the entire page to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Failed to refresh property value. Please try again.');
      }
    } catch (error) {
      console.error('Failed to refresh value:', error);
      alert('Error refreshing property value.');
    } finally {
      setRefreshing(false);
    }
  };

  const urgentAlerts = property.alerts.filter(a => a.severity === 'urgent');
  const hasUrgent = urgentAlerts.length > 0;

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${
      hasUrgent ? 'ring-2 ring-red-500' : ''
    }`}>
      <div className="p-6">
        {/* Property Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {property.address}
            </h3>
            <p className="text-sm text-gray-600">{property.city}, {property.state} {property.zipCode}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            property.status === 'OCCUPIED'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {property.status}
          </span>
        </div>

        {/* Property Details */}
        <div className="space-y-4 mb-4 pb-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Estimated Value</p>
                <button
                  onClick={refreshValue}
                  disabled={refreshing}
                  className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                  title="Refresh value from Zillow with AI analysis"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {updatedValue ? `$${Number(updatedValue).toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Actual Rent</p>
              <p className="text-lg font-semibold text-gray-900">
                {property.monthlyRent ? `$${property.monthlyRent.toLocaleString()}` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Market Rent & Equity */}
          {(property.marketRent || marketRent || property.monthlyMortgage || property.mortgageBalance) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
              {/* Market Rent */}
              {(property.marketRent || marketRent) && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-900">Market Analysis</p>
                    <span className="text-xs text-blue-700">AI Analyzed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-700">Market Rent</p>
                      <p className="text-lg font-bold text-blue-900">
                        ${(property.marketRent || marketRent)?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">
                        {property.monthlyRent && (property.marketRent || marketRent) && (property.marketRent || marketRent) > property.monthlyRent ? 'Under Market' : 'At/Above Market'}
                      </p>
                      <p className={`text-lg font-bold ${
                        property.monthlyRent && (property.marketRent || marketRent) && (property.marketRent || marketRent) > property.monthlyRent
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {property.monthlyRent && (property.marketRent || marketRent)
                          ? `${(property.marketRent || marketRent)! > property.monthlyRent ? '+' : ''}$${((property.marketRent || marketRent)! - property.monthlyRent).toLocaleString()}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Section 8 FMR */}
              {property.section8FMR && (
                <div className="pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-blue-900">Section 8 Housing</p>
                    {property.section8ContactPhone && (
                      <a
                        href={`tel:${property.section8ContactPhone}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {property.section8ContactPhone}
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-700">HUD Fair Market Rent</p>
                      <p className="text-lg font-bold text-blue-900">
                        ${Number(property.section8FMR).toLocaleString()}/mo
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">vs Market Rent</p>
                      <p className={`text-lg font-bold ${
                        property.marketRent && property.marketRent > property.section8FMR
                          ? 'text-green-600'
                          : 'text-blue-700'
                      }`}>
                        {property.marketRent
                          ? `${property.marketRent > property.section8FMR ? '+' : ''}$${(property.marketRent - Number(property.section8FMR)).toLocaleString()}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Equity */}
              {property.estimatedValue && property.mortgageBalance && (
                <div className="pt-3 border-t border-blue-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-700">Available Equity</p>
                      <p className="text-lg font-bold text-green-600">
                        ${(Number(property.estimatedValue) - Number(property.mortgageBalance)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Loan Balance</p>
                      <p className="text-lg font-bold text-blue-900">
                        ${Number(property.mortgageBalance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tenant Info */}
        {property.tenant && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Current Tenant</span>
            </div>
            <p className="text-sm text-gray-900">{property.tenant.name}</p>
            <p className="text-xs text-gray-500">{property.tenant.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              Lease ends: {new Date(property.tenant.leaseEndDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Alerts */}
        {property.alerts.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Alerts ({property.alerts.length})</span>
            </div>
            {property.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`px-3 py-2 rounded-lg border text-sm ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  {alert.amount && (
                    <span className="font-semibold">${alert.amount.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <Link
          href={`/properties/${property.id}`}
          className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
