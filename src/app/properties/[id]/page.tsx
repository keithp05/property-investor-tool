'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Home, MapPin, DollarSign, Calendar, Users, Wrench, ArrowLeft, TrendingUp, Loader2, Edit3, X } from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  monthlyRent: number | null;
  marketRent: number | null;
  estimatedValue: number | null;
  purchasePrice: number | null;
  purchaseDate: Date | null;
  monthlyMortgage: number | null;
  currentTenancy: {
    tenant: {
      name: string;
      email: string;
    };
    leaseStartDate: Date;
    leaseEndDate: Date;
    rentAmount: number;
    securityDeposit: number;
  } | null;
  maintenanceRequests: any[];
  rentPayments: any[];
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    monthlyRent: '',
    estimatedValue: '',
    purchasePrice: '',
    mortgage: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [params.id]);

  useEffect(() => {
    if (property && showEditModal) {
      setEditForm({
        monthlyRent: property.monthlyRent?.toString() || '',
        estimatedValue: property.estimatedValue?.toString() || '',
        purchasePrice: property.purchasePrice?.toString() || '',
        mortgage: property.monthlyMortgage?.toString() || '',
      });
    }
  }, [property, showEditModal]);

  async function loadProperty() {
    try {
      setLoading(true);
      const response = await fetch(`/api/properties/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setProperty(result.property);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePropertyEdits() {
    try {
      setSaving(true);
      const response = await fetch(`/api/properties/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyRent: editForm.monthlyRent ? parseFloat(editForm.monthlyRent) : null,
          estimatedValue: editForm.estimatedValue ? parseFloat(editForm.estimatedValue) : null,
          purchasePrice: editForm.purchasePrice ? parseFloat(editForm.purchasePrice) : null,
          mortgage: editForm.mortgage ? parseFloat(editForm.mortgage) : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setProperty(result.property);
        setShowEditModal(false);
      } else {
        alert('Failed to update property: ' + result.error);
      }
    } catch (err: any) {
      alert('Error updating property: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Home className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Property not found</p>
          <p className="text-gray-600 mb-6">{error || 'This property does not exist'}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {property.address}
              </h1>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-5 w-5" />
                <span>{property.city}, {property.state} {property.zipCode}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Edit3 className="h-5 w-5" />
                Edit Property
              </button>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                property.status === 'OCCUPIED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {property.status}
              </span>
            </div>
          </div>
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Actual Rent"
            value={property.monthlyRent ? `$${property.monthlyRent.toLocaleString()}` : 'N/A'}
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
          />
          <StatCard
            title="Market Rent"
            value={property.marketRent ? `$${property.marketRent.toLocaleString()}` : 'N/A'}
            icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
            subtitle={property.monthlyRent && property.marketRent ?
              (property.monthlyRent < property.marketRent ?
                `+$${(property.marketRent - property.monthlyRent).toLocaleString()} potential` :
                'At market') : undefined}
          />
          <StatCard
            title="Monthly Mortgage"
            value={property.monthlyMortgage ? `$${property.monthlyMortgage.toLocaleString()}` : 'N/A'}
            icon={<DollarSign className="h-6 w-6 text-orange-600" />}
          />
          <StatCard
            title="Monthly Cash Flow"
            value={property.monthlyRent && property.monthlyMortgage ?
              `$${(property.monthlyRent - property.monthlyMortgage).toLocaleString()}` : 'N/A'}
            icon={<DollarSign className={`h-6 w-6 ${property.monthlyRent && property.monthlyMortgage && property.monthlyRent > property.monthlyMortgage ? 'text-green-600' : 'text-red-600'}`} />}
            subtitle={property.monthlyRent && property.monthlyMortgage ?
              (property.monthlyRent > property.monthlyMortgage ? 'Positive' : 'Negative') : undefined}
          />
          <StatCard
            title="Estimated Value"
            value={property.estimatedValue ? `$${property.estimatedValue.toLocaleString()}` : 'N/A'}
            icon={<Home className="h-6 w-6 text-purple-600" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Tenant */}
          {property.currentTenancy && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Current Tenant</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-lg font-semibold text-gray-900">{property.currentTenancy.tenant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{property.currentTenancy.tenant.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Lease Start</p>
                    <p className="text-gray-900">
                      {new Date(property.currentTenancy.leaseStartDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lease End</p>
                    <p className="text-gray-900">
                      {new Date(property.currentTenancy.leaseEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${property.currentTenancy.rentAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Security Deposit</p>
                    <p className="text-gray-900">
                      ${property.currentTenancy.securityDeposit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">Maintenance Requests</h2>
            </div>
            {property.maintenanceRequests.length === 0 ? (
              <p className="text-gray-500">No open maintenance requests</p>
            ) : (
              <div className="space-y-3">
                {property.maintenanceRequests.map((request) => (
                  <div key={request.id} className="border-b border-gray-200 pb-3 last:border-0">
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
                          <span className="text-xs text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{request.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Rent Payments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Recent Rent Payments</h2>
            </div>
            {property.rentPayments.length === 0 ? (
              <p className="text-gray-500">No rent payment history</p>
            ) : (
              <div className="space-y-3">
                {property.rentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0">
                    <div>
                      <p className="font-semibold text-gray-900">
                        ${payment.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {new Date(payment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      payment.status === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'OVERDUE'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Property Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Property</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {/* Monthly Rent */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Rent
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={editForm.monthlyRent}
                        onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })}
                        placeholder="2500"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Estimated Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Value
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={editForm.estimatedValue}
                        onChange={(e) => setEditForm({ ...editForm, estimatedValue: e.target.value })}
                        placeholder="350000"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={editForm.purchasePrice}
                        onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                        placeholder="300000"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Monthly Mortgage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Mortgage Payment
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        value={editForm.mortgage}
                        onChange={(e) => setEditForm({ ...editForm, mortgage: e.target.value })}
                        placeholder="1800"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePropertyEdits}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
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
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
