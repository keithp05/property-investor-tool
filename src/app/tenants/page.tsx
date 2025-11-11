'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Users, Loader2, CheckCircle, Clock, XCircle, Eye, Home, Mail, Phone, Briefcase, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: {
    id: string;
    fullAddress: string;
  };
  lease: {
    monthlyRent: number;
    leaseEndDate: string;
  };
}

interface Application {
  id: string;
  status: 'PENDING' | 'SUBMITTED' | 'REVIEWING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  submittedAt: string | null;
  applicationLink: string;
  fullLink: string;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
    monthlyIncome: number;
    employerName: string;
  } | null;
  property: {
    id: string;
    fullAddress: string;
    monthlyRent: number;
  };
  applicationFeePaid: boolean;
}

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tenants' | 'applications'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewApplicationModal, setShowNewApplicationModal] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    if (activeTab === 'tenants') {
      fetchTenants();
    } else {
      fetchApplications();
    }
  }, [activeTab]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenants');
      const data = await response.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications/list');
      const data = await response.json();
      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-5 w-5 text-gray-500" />;
      case 'SUBMITTED': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'REVIEWING': return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'APPROVED': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'DENIED': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'REVIEWING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'DENIED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties/my-properties');
      const data = await response.json();
      if (data.success) {
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedPropertyId) {
      alert('Please select a property');
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/applications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedPropertyId }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedLink(data.fullLink);
        fetchApplications(); // Refresh applications list
      } else {
        alert('Failed to generate link: ' + data.error);
      }
    } catch (error) {
      console.error('Generate link error:', error);
      alert('Failed to generate application link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCloseModal = () => {
    setShowNewApplicationModal(false);
    setGeneratedLink('');
    setSelectedPropertyId('');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
              <p className="text-gray-600 mt-1">Manage tenants and review applications</p>
            </div>
            {activeTab === 'applications' && (
              <button
                onClick={() => setShowNewApplicationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="h-5 w-5" />
                New Application
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-4">
              <button
                onClick={() => setActiveTab('tenants')}
                className={`px-4 py-2 border-b-2 font-medium text-sm ${
                  activeTab === 'tenants'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tenants
                </div>
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-4 py-2 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Applications
                  {applications.filter(a => a.status === 'SUBMITTED').length > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {applications.filter(a => a.status === 'SUBMITTED').length}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          </div>
        ) : activeTab === 'tenants' ? (
          /* Tenants List */
          <div className="bg-white rounded-lg shadow">
            {tenants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tenants yet</p>
                <p className="text-sm text-gray-400 mt-1">Approve applications to add tenants</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lease End</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tenant.property.fullAddress}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">${tenant.lease.monthlyRent.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(tenant.lease.leaseEndDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/tenants/${tenant.id}`} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Applications List */
          <div>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-500">{applications.filter(a => a.status === 'PENDING').length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{applications.filter(a => a.status === 'SUBMITTED').length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{applications.filter(a => a.status === 'APPROVED').length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Denied</p>
                <p className="text-2xl font-bold text-red-600">{applications.filter(a => a.status === 'DENIED').length}</p>
              </div>
            </div>

            {/* Applications */}
            {applications.length === 0 ? (
              <div className="bg-white rounded-lg shadow text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No applications yet</p>
                <button
                  onClick={() => setShowNewApplicationModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="h-5 w-5" />
                  Create First Application
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1">{getStatusIcon(app.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {app.applicant?.fullName || 'Application Link Created'}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Home className="h-4 w-4" />
                            <span className="font-medium">Property:</span>
                            <Link href={`/properties/${app.property.id}`} className="hover:text-indigo-600 underline">
                              {app.property.fullAddress}
                            </Link>
                          </div>

                          {app.applicant && (
                            <div className="grid grid-cols-3 gap-4 mt-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="h-4 w-4" />
                                {app.applicant.email}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="h-4 w-4" />
                                {app.applicant.phone}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Briefcase className="h-4 w-4" />
                                {app.applicant.employerName}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <DollarSign className="h-4 w-4" />
                                ${app.applicant.monthlyIncome?.toLocaleString()}/mo income
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Fee Paid: </span>
                                <span className={app.applicationFeePaid ? 'text-green-600' : 'text-red-600'}>
                                  {app.applicationFeePaid ? '✓ Yes' : '✗ No'}
                                </span>
                              </div>
                            </div>
                          )}

                          {app.status === 'PENDING' && (
                            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">Application Link:</p>
                              <code className="text-xs text-gray-800 font-mono break-all">{app.fullLink}</code>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-500">
                        Created {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {app.status === 'SUBMITTED' && (
                      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                        <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Approve & Create Tenant
                        </button>
                        <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Application Modal */}
      {showNewApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Application Link</h2>

            {!generatedLink ? (
              <>
                <p className="text-sm text-gray-600 mb-4">Select a property to generate an application link for prospective tenants.</p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Property *</label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    onFocus={() => properties.length === 0 && fetchProperties()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select a property --</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.address}, {property.city}, {property.state} {property.zipCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateLink}
                    disabled={!selectedPropertyId || generating}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Link'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-900">Application Link Generated!</p>
                  </div>
                  <p className="text-sm text-green-700">Copy this link and send it to prospective tenants.</p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Application Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={copyLink}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
