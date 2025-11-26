'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  DollarSign,
  Home,
  Users,
  FileText,
  Shield,
  CheckCircle,
  XCircle,
  MapPin,
  CreditCard,
  PawPrint,
  UserCheck,
  Building,
  ExternalLink,
} from 'lucide-react';

interface ApplicationDetail {
  id: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  applicationLink: string;
  property: {
    id: string;
    fullAddress: string;
    bedrooms: number;
    bathrooms: number;
    monthlyRent: number | null;
  };
  applicant: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    ssnLast4: string | null;
  };
  employment: {
    current: {
      employerName: string | null;
      employerPhone: string | null;
      jobTitle: string | null;
      monthlyIncome: number | null;
      startDate: string | null;
    };
    previous: {
      employerName: string | null;
      employerPhone: string | null;
      jobTitle: string | null;
      startDate: string | null;
      endDate: string | null;
    } | null;
  };
  references: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  rentalHistory: {
    current: {
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      landlordName: string | null;
      landlordPhone: string | null;
      monthlyRent: number | null;
      moveInDate: string | null;
    };
    previous: {
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      landlordName: string | null;
      landlordPhone: string | null;
    } | null;
  };
  hasPets: boolean;
  petDetails: any;
  additionalOccupants: any;
  hasSecondApplicant: boolean;
  secondApplicant: any;
  documents: {
    payStubs: string[];
    idDocument: string | null;
  };
  screening: {
    creditScore: number | null;
    creditReportUrl: string | null;
    backgroundCheckStatus: string | null;
    backgroundCheckReportUrl: string | null;
  };
  payment: {
    applicationFee: number;
    feePaid: boolean;
    stripePaymentIntentId: string | null;
  };
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [params.id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setApplication(data.application);
      } else {
        setError(data.error || 'Failed to load application');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this application?')) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/applications/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: params.id, status: 'APPROVED' }),
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Application approved! Applicant has been notified.');
        fetchApplication();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to approve application');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeny = async () => {
    const reason = prompt('Optional: Enter reason for denial');
    if (reason === null) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/applications/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: params.id, status: 'DENIED', denialReason: reason || undefined }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Application denied. Applicant has been notified.');
        fetchApplication();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to deny application');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      REVIEWING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      DENIED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Application not found'}</p>
            <button
              onClick={() => router.back()}
              className="text-indigo-600 hover:text-indigo-800"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Applications
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {application.applicant.fullName || 'Application Pending'}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(application.status)}`}>
                    {application.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Home className="h-4 w-4" />
                  <span>{application.property.fullAddress}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Created: {formatDate(application.createdAt)}</span>
                  {application.submittedAt && (
                    <span>Submitted: {formatDate(application.submittedAt)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded text-sm ${application.payment.feePaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Fee: {application.payment.feePaid ? '✓ Paid' : '✗ Unpaid'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {application.status === 'SUBMITTED' && (
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={handleApprove}
                  disabled={updating}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-semibold"
                >
                  <CheckCircle className="h-5 w-5" />
                  Approve Application
                </button>
                <button
                  onClick={handleDeny}
                  disabled={updating}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-semibold"
                >
                  <XCircle className="h-5 w-5" />
                  Deny Application
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Application Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Personal Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{application.applicant.fullName || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{application.applicant.email || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{application.applicant.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">DOB:</span>
                <span className="font-medium">{formatDate(application.applicant.dateOfBirth)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">SSN:</span>
                <span className="font-medium">{application.applicant.ssnLast4 || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Current Employment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-600" />
              Current Employment
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Employer:</span>
                <span className="font-medium">{application.employment.current.employerName || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{application.employment.current.employerPhone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Title:</span>
                <span className="font-medium">{application.employment.current.jobTitle || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Monthly Income:</span>
                <span className="font-medium text-green-600">{formatCurrency(application.employment.current.monthlyIncome)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Start Date:</span>
                <span className="font-medium">{formatDate(application.employment.current.startDate)}</span>
              </div>
            </div>

            {application.employment.previous && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Previous Employment</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Employer:</span> {application.employment.previous.employerName}</p>
                  <p><span className="text-gray-500">Title:</span> {application.employment.previous.jobTitle}</p>
                  <p><span className="text-gray-500">Period:</span> {formatDate(application.employment.previous.startDate)} - {formatDate(application.employment.previous.endDate)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Rental History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Home className="h-5 w-5 text-indigo-600" />
              Current Residence
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <span className="text-gray-600">Address:</span>
                  <p className="font-medium">
                    {application.rentalHistory.current.address || 'Not provided'}
                    {application.rentalHistory.current.city && (
                      <>, {application.rentalHistory.current.city}, {application.rentalHistory.current.state} {application.rentalHistory.current.zip}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Landlord:</span>
                <span className="font-medium">{application.rentalHistory.current.landlordName || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Landlord Phone:</span>
                <span className="font-medium">{application.rentalHistory.current.landlordPhone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Monthly Rent:</span>
                <span className="font-medium">{formatCurrency(application.rentalHistory.current.monthlyRent)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Move-in Date:</span>
                <span className="font-medium">{formatDate(application.rentalHistory.current.moveInDate)}</span>
              </div>
            </div>

            {application.rentalHistory.previous && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Previous Residence</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Address:</span> {application.rentalHistory.previous.address}, {application.rentalHistory.previous.city}, {application.rentalHistory.previous.state}</p>
                  <p><span className="text-gray-500">Landlord:</span> {application.rentalHistory.previous.landlordName}</p>
                  <p><span className="text-gray-500">Phone:</span> {application.rentalHistory.previous.landlordPhone}</p>
                </div>
              </div>
            )}
          </div>

          {/* References */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              References
            </h2>
            {application.references.length > 0 ? (
              <div className="space-y-4">
                {application.references.map((ref, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{ref.name}</p>
                    <p className="text-sm text-gray-600">{ref.relationship}</p>
                    <p className="text-sm text-gray-600">{ref.phone}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No references provided</p>
            )}
          </div>

          {/* Pets & Occupants */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-indigo-600" />
              Pets & Additional Occupants
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-2">Pets:</p>
                {application.hasPets ? (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="font-medium text-yellow-800">Yes - Has Pets</p>
                    {application.petDetails && (
                      <pre className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{JSON.stringify(application.petDetails, null, 2)}</pre>
                    )}
                  </div>
                ) : (
                  <p className="text-green-600">No pets</p>
                )}
              </div>

              <div>
                <p className="text-gray-600 mb-2">Additional Occupants:</p>
                {application.additionalOccupants ? (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap">{JSON.stringify(application.additionalOccupants, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-gray-500">None listed</p>
                )}
              </div>
            </div>
          </div>

          {/* Screening Results */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Screening Results
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Credit Score</p>
                  <p className="text-sm text-gray-500">TransUnion / Equifax</p>
                </div>
                {application.screening.creditScore ? (
                  <span className={`text-2xl font-bold ${
                    application.screening.creditScore >= 700 ? 'text-green-600' :
                    application.screening.creditScore >= 600 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {application.screening.creditScore}
                  </span>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Background Check</p>
                  <p className="text-sm text-gray-500">Criminal & Eviction</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  application.screening.backgroundCheckStatus === 'CLEAR' ? 'bg-green-100 text-green-800' :
                  application.screening.backgroundCheckStatus === 'FLAG' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {application.screening.backgroundCheckStatus || 'Pending'}
                </span>
              </div>

              {application.screening.creditReportUrl && (
                <a
                  href={application.screening.creditReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                >
                  <FileText className="h-4 w-4" />
                  View Full Credit Report
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Uploaded Documents
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-2">Pay Stubs:</p>
                {application.documents.payStubs.length > 0 ? (
                  <ul className="space-y-2">
                    {application.documents.payStubs.map((url, index) => (
                      <li key={index}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                        >
                          <FileText className="h-4 w-4" />
                          Pay Stub {index + 1}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400">No pay stubs uploaded</p>
                )}
              </div>

              <div>
                <p className="text-gray-600 mb-2">ID Document:</p>
                {application.documents.idDocument ? (
                  <a
                    href={application.documents.idDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                  >
                    <FileText className="h-4 w-4" />
                    View ID Document
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-gray-400">No ID uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Second Applicant */}
        {application.hasSecondApplicant && application.secondApplicant && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Second Applicant
            </h2>
            <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
              {JSON.stringify(application.secondApplicant, null, 2)}
            </pre>
          </div>
        )}

        {/* Payment Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            Payment Information
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Application Fee</p>
              <p className="text-xl font-bold">${application.payment.applicationFee}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Payment Status</p>
              <p className={`text-xl font-bold ${application.payment.feePaid ? 'text-green-600' : 'text-red-600'}`}>
                {application.payment.feePaid ? '✓ Paid' : '✗ Unpaid'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Stripe Payment ID</p>
              <p className="text-sm font-mono text-gray-600 truncate">
                {application.payment.stripePaymentIntentId || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
