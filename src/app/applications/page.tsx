'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, Clock, XCircle, Eye, Home, DollarSign, Briefcase, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

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
    creditScore: number | null;
    backgroundCheckStatus: string | null;
  } | null;
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    monthlyRent: number;
    fullAddress: string;
  };
  applicationFeePaid: boolean;
  applicationFee: number;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
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

  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'SUBMITTED':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'REVIEWING':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'DENIED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'REVIEWING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'DENIED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            Tenant Applications
          </h1>
          <p className="text-gray-600">Manage and review rental applications from prospective tenants</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Applications</p>
            <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-500">
              {applications.filter(a => a.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Submitted</p>
            <p className="text-2xl font-bold text-blue-600">
              {applications.filter(a => a.status === 'SUBMITTED').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-green-600">
              {applications.filter(a => a.status === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Denied</p>
            <p className="text-2xl font-bold text-red-600">
              {applications.filter(a => a.status === 'DENIED').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'PENDING'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('SUBMITTED')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'SUBMITTED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Submitted
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'APPROVED'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('DENIED')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'DENIED'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Denied
            </button>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No applications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(app.status)}
                      </div>
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
                          <Link
                            href={`/properties/${app.property.id}`}
                            className="hover:text-indigo-600 underline"
                          >
                            {app.property.fullAddress}
                          </Link>
                        </div>

                        {app.applicant && (
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{app.applicant.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{app.applicant.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Briefcase className="h-4 w-4" />
                              <span>{app.applicant.employerName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>${app.applicant.monthlyIncome?.toLocaleString()}/mo income</span>
                            </div>
                            {app.applicant.creditScore && (
                              <div className="text-sm">
                                <span className="text-gray-600">Credit Score: </span>
                                <span className="font-semibold text-gray-900">{app.applicant.creditScore}</span>
                              </div>
                            )}
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

                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Created {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                      {app.submittedAt && (
                        <p className="text-xs text-gray-500">
                          Submitted {new Date(app.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {app.status === 'SUBMITTED' && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                      <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Deny
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
