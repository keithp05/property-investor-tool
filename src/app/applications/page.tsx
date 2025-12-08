'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, Clock, XCircle, Eye, Home, DollarSign, Briefcase, Mail, Phone, MessageSquare, Calendar, AlertCircle, Send, X } from 'lucide-react';
import Link from 'next/link';

interface Application {
  id: string;
  status: 'PENDING' | 'SUBMITTED' | 'REVIEWING' | 'APPROVED' | 'DENIED' | 'MORE_INFO_NEEDED';
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

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  actionType: 'approve' | 'deny' | 'request_info' | 'message' | 'schedule_call' | null;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

function ActionModal({ isOpen, onClose, application, actionType, onSubmit, loading }: ActionModalProps) {
  const [message, setMessage] = useState('');
  const [callDate, setCallDate] = useState('');
  const [callTime, setCallTime] = useState('');
  const [infoNeeded, setInfoNeeded] = useState<string[]>([]);

  if (!isOpen || !application || !actionType) return null;

  const handleSubmit = async () => {
    let data: any = { applicationId: application.id, actionType };
    
    switch (actionType) {
      case 'approve':
        data.message = message || 'Congratulations! Your application has been approved.';
        break;
      case 'deny':
        data.message = message || 'We regret to inform you that your application has been denied.';
        data.reason = message;
        break;
      case 'request_info':
        data.infoNeeded = infoNeeded;
        data.message = message;
        break;
      case 'message':
        data.message = message;
        break;
      case 'schedule_call':
        data.callDate = callDate;
        data.callTime = callTime;
        data.message = message;
        break;
    }
    
    await onSubmit(data);
  };

  const getTitle = () => {
    switch (actionType) {
      case 'approve': return 'Approve Application';
      case 'deny': return 'Deny Application';
      case 'request_info': return 'Request More Information';
      case 'message': return 'Send Message';
      case 'schedule_call': return 'Schedule a Call';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'approve': return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'deny': return <XCircle className="h-6 w-6 text-red-600" />;
      case 'request_info': return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'message': return <MessageSquare className="h-6 w-6 text-blue-600" />;
      case 'schedule_call': return <Calendar className="h-6 w-6 text-purple-600" />;
      default: return null;
    }
  };

  const infoOptions = [
    'Proof of Income (additional pay stubs)',
    'Bank Statements',
    'Employment Verification Letter',
    'Previous Landlord Reference',
    'Government-issued ID',
    'Pet Documentation',
    'Rental History',
    'Other (specify in message)',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-900">{application.applicant?.fullName || 'Applicant'}</p>
            <p className="text-sm text-gray-600">{application.property.fullAddress}</p>
            <p className="text-sm text-gray-600">{application.applicant?.email}</p>
          </div>

          {actionType === 'request_info' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select information needed:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {infoOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={infoNeeded.includes(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInfoNeeded([...infoNeeded, option]);
                        } else {
                          setInfoNeeded(infoNeeded.filter(i => i !== option));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {actionType === 'schedule_call' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {actionType === 'deny' ? 'Reason for denial (sent to applicant):' :
               actionType === 'approve' ? 'Congratulations message (optional):' :
               'Message to applicant:'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder={
                actionType === 'approve' ? 'Congratulations! Your application has been approved. We will be in touch with next steps...' :
                actionType === 'deny' ? 'Thank you for your interest. Unfortunately, we are unable to approve your application at this time...' :
                actionType === 'request_info' ? 'Please provide the following additional information to continue processing your application...' :
                actionType === 'schedule_call' ? 'I would like to schedule a call to discuss your application...' :
                'Enter your message here...'
              }
            />
          </div>

          {actionType === 'deny' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. The applicant will be notified via email.
              </p>
            </div>
          )}

          {actionType === 'approve' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Next Steps:</strong> After approval, you can generate a lease agreement from the tenant profile.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (actionType === 'request_info' && infoNeeded.length === 0) || (actionType === 'schedule_call' && (!callDate || !callTime))}
            className={`flex-1 px-4 py-2 rounded-lg text-white flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
              actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
              actionType === 'deny' ? 'bg-red-600 hover:bg-red-700' :
              'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                {actionType === 'approve' ? 'Approve & Notify' :
                 actionType === 'deny' ? 'Deny & Notify' :
                 actionType === 'request_info' ? 'Send Request' :
                 actionType === 'schedule_call' ? 'Schedule & Notify' :
                 'Send Message'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    application: Application | null;
    actionType: 'approve' | 'deny' | 'request_info' | 'message' | 'schedule_call' | null;
  }>({ isOpen: false, application: null, actionType: null });
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleAction = async (data: any) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/applications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        await fetchApplications();
        setActionModal({ isOpen: false, application: null, actionType: null });
        alert(result.message || 'Action completed successfully');
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action error:', error);
      alert('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (application: Application, actionType: 'approve' | 'deny' | 'request_info' | 'message' | 'schedule_call') => {
    setActionModal({ isOpen: true, application, actionType });
  };

  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-5 w-5 text-gray-500" />;
      case 'SUBMITTED': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'REVIEWING': return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'MORE_INFO_NEEDED': return <AlertCircle className="h-5 w-5 text-orange-500" />;
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
      case 'MORE_INFO_NEEDED': return 'bg-orange-100 text-orange-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'DENIED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            Tenant Applications
          </h1>
          <p className="text-gray-600">Manage and review rental applications from prospective tenants</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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
            <p className="text-sm text-gray-600">Info Needed</p>
            <p className="text-2xl font-bold text-orange-600">{applications.filter(a => a.status === 'MORE_INFO_NEEDED').length}</p>
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

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
            <button onClick={() => setFilter('PENDING')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'PENDING' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Pending</button>
            <button onClick={() => setFilter('SUBMITTED')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'SUBMITTED' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Submitted</button>
            <button onClick={() => setFilter('MORE_INFO_NEEDED')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'MORE_INFO_NEEDED' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Info Needed</button>
            <button onClick={() => setFilter('APPROVED')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'APPROVED' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Approved</button>
            <button onClick={() => setFilter('DENIED')} className={`px-4 py-2 rounded-lg font-medium ${filter === 'DENIED' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Denied</button>
          </div>
        </div>

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
                      <div className="mt-1">{getStatusIcon(app.status)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{app.applicant?.fullName || 'Application Link Created'}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>{app.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <Home className="h-4 w-4" />
                          <Link href={`/properties/${app.property.id}`} className="hover:text-indigo-600 underline">{app.property.fullAddress}</Link>
                        </div>
                        {app.applicant && (
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="h-4 w-4" /><span>{app.applicant.email}</span></div>
                            <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="h-4 w-4" /><span>{app.applicant.phone}</span></div>
                            <div className="flex items-center gap-2 text-sm text-gray-600"><Briefcase className="h-4 w-4" /><span>{app.applicant.employerName}</span></div>
                            <div className="flex items-center gap-2 text-sm text-gray-600"><DollarSign className="h-4 w-4" /><span>${app.applicant.monthlyIncome?.toLocaleString()}/mo</span></div>
                            {app.applicant.creditScore && <div className="text-sm"><span className="text-gray-600">Credit: </span><span className="font-semibold">{app.applicant.creditScore}</span></div>}
                            <div className="text-sm"><span className="text-gray-600">Fee: </span><span className={app.applicationFeePaid ? 'text-green-600' : 'text-red-600'}>{app.applicationFeePaid ? '✓ Paid' : '✗ Unpaid'}</span></div>
                          </div>
                        )}
                        {app.status === 'PENDING' && (
                          <div className="mt-4 p-3 bg-gray-50 rounded border"><p className="text-xs text-gray-600 mb-1">Application Link:</p><code className="text-xs font-mono break-all">{app.fullLink}</code></div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>Created {new Date(app.createdAt).toLocaleDateString()}</p>
                      {app.submittedAt && <p>Submitted {new Date(app.submittedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                    {['SUBMITTED', 'REVIEWING', 'MORE_INFO_NEEDED'].includes(app.status) && (
                      <>
                        <button onClick={() => openActionModal(app, 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4" />Approve</button>
                        <button onClick={() => openActionModal(app, 'deny')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"><XCircle className="h-4 w-4" />Deny</button>
                      </>
                    )}
                    {['SUBMITTED', 'REVIEWING'].includes(app.status) && (
                      <button onClick={() => openActionModal(app, 'request_info')} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />Request Info</button>
                    )}
                    {app.applicant && (
                      <button onClick={() => openActionModal(app, 'message')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" />Message</button>
                    )}
                    {app.applicant && ['SUBMITTED', 'REVIEWING', 'MORE_INFO_NEEDED'].includes(app.status) && (
                      <button onClick={() => openActionModal(app, 'schedule_call')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" />Schedule Call</button>
                    )}
                    <Link href={`/applications/${app.id}`} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"><Eye className="h-4 w-4" />Details</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActionModal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, application: null, actionType: null })} application={actionModal.application} actionType={actionModal.actionType} onSubmit={handleAction} loading={actionLoading} />
    </div>
  );
}
