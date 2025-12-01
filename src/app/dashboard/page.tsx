'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building2,
  Wallet,
  PiggyBank,
  ChevronRight,
  Loader2,
  Wrench,
  CreditCard,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react';

interface DashboardSummary {
  totalPropertyValue: number;
  totalMortgageBalance: number;
  totalNetWorth: number;
  totalEquity: number;
  liquidNetWorth: number;
  totalMonthlyRent: number;
  totalMonthlyMortgage: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  propertyCount: number;
  vacantProperties: number;
  rentedProperties: number;
  pendingActionsCount: number;
  highPriorityCount: number;
}

interface PropertySummary {
  id: string;
  address: string;
  city: string;
  state: string;
  status: string;
  currentValue: number;
  mortgageBalance: number;
  equity: number;
  availableEquity: number;
  monthlyRent: number;
  monthlyMortgage: number;
  cashFlow: number;
  hasTenant: boolean;
  pendingPayments: number;
  openMaintenanceRequests: number;
}

interface PendingAction {
  type: string;
  priority: string;
  title: string;
  description: string;
  propertyAddress?: string;
  amount?: number;
  dueDate?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchDashboard();
    }
  }, [status, router]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setProperties(data.properties);
        setPendingActions(data.pendingActions);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Your real estate portfolio at a glance</p>
        </div>

        {/* Net Worth Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">Total</span>
            </div>
            <p className="text-indigo-100 text-sm mb-1">Total Net Worth</p>
            <p className="text-3xl font-bold">{formatCurrency(summary?.totalNetWorth || 0)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">Available</span>
            </div>
            <p className="text-green-100 text-sm mb-1">Available Equity</p>
            <p className="text-3xl font-bold">{formatCurrency(summary?.liquidNetWorth || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500">{summary?.propertyCount || 0} properties</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Total Property Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalPropertyValue || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">Total Mortgage Balance</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalMortgageBalance || 0)}</p>
          </div>
        </div>

        {/* Cash Flow & Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cash Flow</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rental Income</span>
                <span className="font-semibold text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4" />
                  {formatCurrency(summary?.totalMonthlyRent || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Mortgage Payments</span>
                <span className="font-semibold text-red-600 flex items-center gap-1">
                  <ArrowDownRight className="h-4 w-4" />
                  {formatCurrency(summary?.totalMonthlyMortgage || 0)}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Net Cash Flow</span>
                  <span className={`text-xl font-bold ${(summary?.monthlyCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary?.monthlyCashFlow || 0)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Annual: {formatCurrency(summary?.annualCashFlow || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Rented</span>
                </div>
                <span className="font-semibold text-gray-900">{summary?.rentedProperties || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-600">Vacant</span>
                </div>
                <span className="font-semibold text-gray-900">{summary?.vacantProperties || 0}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Total Properties</span>
                  <span className="text-xl font-bold text-gray-900">{summary?.propertyCount || 0}</span>
                </div>
              </div>
            </div>
            <Link href="/properties/my-properties" className="mt-4 block text-center text-sm text-indigo-600 hover:text-indigo-800">
              View All Properties →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pending Actions</h3>
              {(summary?.highPriorityCount || 0) > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {summary?.highPriorityCount} urgent
                </span>
              )}
            </div>
            {pendingActions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.slice(0, 4).map((action, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    action.priority === 'HIGH' ? 'bg-red-50 border border-red-200' :
                    action.priority === 'MEDIUM' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {action.type.includes('RENT') ? (
                        <DollarSign className="h-4 w-4 mt-0.5 text-gray-600" />
                      ) : action.type === 'MAINTENANCE' ? (
                        <Wrench className="h-4 w-4 mt-0.5 text-gray-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-gray-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
                        <p className="text-xs text-gray-500 truncate">{action.propertyAddress}</p>
                      </div>
                      {action.amount && (
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(action.amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Properties & Values</h3>
            <Link href="/properties/my-properties" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mortgage</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Equity</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cash Flow</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {properties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No properties yet</p>
                      <Link href="/properties/search" className="text-indigo-600 hover:text-indigo-800 text-sm">
                        Add your first property →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  properties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/properties/${property.id}`} className="hover:text-indigo-600">
                          <p className="font-medium text-gray-900">{property.address}</p>
                          <p className="text-sm text-gray-500">{property.city}, {property.state}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          property.status === 'RENTED' ? 'bg-green-100 text-green-800' :
                          property.status === 'VACANT' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(property.currentValue)}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(property.mortgageBalance)}</td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">{formatCurrency(property.equity)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${property.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(property.cashFlow)}/mo
                      </td>
                      <td className="px-6 py-4 text-right text-indigo-600 font-medium">{formatCurrency(property.availableEquity)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {properties.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td className="px-6 py-4 text-gray-900">Totals</td>
                    <td></td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(summary?.totalPropertyValue || 0)}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(summary?.totalMortgageBalance || 0)}</td>
                    <td className="px-6 py-4 text-right text-green-600">{formatCurrency(summary?.totalEquity || 0)}</td>
                    <td className={`px-6 py-4 text-right ${(summary?.monthlyCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary?.monthlyCashFlow || 0)}/mo
                    </td>
                    <td className="px-6 py-4 text-right text-indigo-600">{formatCurrency(summary?.liquidNetWorth || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/properties/search" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg"><Home className="h-5 w-5 text-blue-600" /></div>
            <span className="font-medium text-gray-900">Add Property</span>
          </Link>
          <Link href="/lenders" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg"><PiggyBank className="h-5 w-5 text-green-600" /></div>
            <span className="font-medium text-gray-900">Lenders</span>
          </Link>
          <Link href="/documents" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
            <span className="font-medium text-gray-900">Documents</span>
          </Link>
          <Link href="/landlord/pros" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg"><Wrench className="h-5 w-5 text-orange-600" /></div>
            <span className="font-medium text-gray-900">Preferred Pros</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
