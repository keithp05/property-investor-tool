'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Home, MapPin, DollarSign, Calendar, Users, Wrench, ArrowLeft, TrendingUp, Loader2, Edit3, X, FileText, Copy, Check, Building2, RefreshCw, Upload, Trash2, Download, Image, AlertTriangle, Folder } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const PlaidLinkButton = dynamic(() => import('@/components/PlaidLinkButton'), {
  ssr: false,
  loading: () => <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg"><Loader2 className="h-5 w-5 animate-spin" />Loading...</button>,
});

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
  currentValue: number | null;
  purchasePrice: number | null;
  purchaseDate: Date | null;
  monthlyMortgage: number | null;
  mortgageBalance: number | null;
  mortgageRate: number | null;
  nextPaymentDue: Date | null;
  plaidLinked: boolean;
  plaidLastSync: Date | null;
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

interface PropertyDocument {
  id: string;
  name: string;
  type: string;
  description?: string;
  year?: number;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl: string;
  expirationDate?: string;
  isExpired: boolean;
  uploadedAt: string;
}

interface PropertyPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  photoType: string;
  uploadedAt: string;
}

const DOCUMENT_TYPES = [
  { value: 'TAX_RETURN', label: 'Tax Return' },
  { value: 'TAX_STATEMENT', label: 'Tax Statement' },
  { value: 'PROPERTY_TAX', label: 'Property Tax' },
  { value: 'INSURANCE_POLICY', label: 'Insurance Policy' },
  { value: 'INSURANCE_CERTIFICATE', label: 'Insurance Certificate' },
  { value: 'LEASE_AGREEMENT', label: 'Lease Agreement' },
  { value: 'LEASE_ADDENDUM', label: 'Lease Addendum' },
  { value: 'PROPERTY_DEED', label: 'Property Deed' },
  { value: 'TITLE_INSURANCE', label: 'Title Insurance' },
  { value: 'MORTGAGE_STATEMENT', label: 'Mortgage Statement' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement' },
  { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
  { value: 'APPRAISAL', label: 'Appraisal' },
  { value: 'HOA_DOCUMENTS', label: 'HOA Documents' },
  { value: 'UTILITY_BILLS', label: 'Utility Bills' },
  { value: 'CONTRACTOR_AGREEMENT', label: 'Contractor Agreement' },
  { value: 'OTHER', label: 'Other' },
];

const PHOTO_TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'MOVE_IN', label: 'Move-In Condition' },
  { value: 'MOVE_OUT', label: 'Move-Out Condition' },
  { value: 'MAINTENANCE', label: 'Maintenance Issue' },
];

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Documents & Photos state
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    monthlyRent: '',
    estimatedValue: '',
    currentValue: '',
    purchasePrice: '',
    mortgage: '',
    mortgageBalance: '',
  });
  const [documentForm, setDocumentForm] = useState({
    name: '',
    type: 'OTHER',
    description: '',
    year: '',
    expirationDate: '',
    file: null as File | null,
  });
  const [photoForm, setPhotoForm] = useState({
    photoType: 'GENERAL',
    file: null as File | null,
  });
  const [applicantInfo, setApplicantInfo] = useState({
    name: '',
    email: '',
    phone: '',
    addSecondApplicant: false,
    secondApplicantName: '',
    secondApplicantEmail: '',
    secondApplicantPhone: '',
  });
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [refreshingMortgage, setRefreshingMortgage] = useState(false);
  const [refreshingProperty, setRefreshingProperty] = useState(false);
  
  // Other states
  const [applicationLink, setApplicationLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [params.id]);

  useEffect(() => {
    if (property) {
      loadDocuments();
      loadPhotos();
    }
  }, [property?.id]);

  useEffect(() => {
    if (property && showEditModal) {
      setEditForm({
        monthlyRent: property.monthlyRent?.toString() || '',
        estimatedValue: property.estimatedValue?.toString() || '',
        currentValue: property.currentValue?.toString() || property.estimatedValue?.toString() || '',
        purchasePrice: property.purchasePrice?.toString() || '',
        mortgage: property.monthlyMortgage?.toString() || '',
        mortgageBalance: property.mortgageBalance?.toString() || '',
      });
    }
  }, [property, showEditModal]);

  async function loadProperty() {
    try {
      setLoading(true);
      const response = await fetch(`/api/properties/${params.id}`);
      const result = await response.json();

      if (result.success) {
        if (result.property.isExternal) {
          const queryParams = new URLSearchParams({
            address: result.property.address,
            city: result.property.city,
            state: result.property.state,
            zipCode: result.property.zipCode,
            price: (result.property.estimatedValue || 0).toString(),
            type: 'zillow'
          });
          router.push(`/properties/${params.id}/analyze?${queryParams.toString()}`);
          return;
        }
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

  async function loadDocuments() {
    try {
      setLoadingDocs(true);
      const response = await fetch(`/api/properties/${params.id}/documents`);
      const result = await response.json();
      if (result.success) {
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function loadPhotos() {
    try {
      setLoadingPhotos(true);
      const response = await fetch(`/api/properties/${params.id}/photos`);
      const result = await response.json();
      if (result.success) {
        setPhotos(result.photos);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  }

  async function uploadDocument() {
    if (!documentForm.file || !documentForm.name || !documentForm.type) {
      alert('Please fill in name, type, and select a file');
      return;
    }

    try {
      setUploadingDoc(true);
      
      // Convert file to base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(documentForm.file!);
      });

      const response = await fetch(`/api/properties/${params.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: documentForm.name,
          type: documentForm.type,
          description: documentForm.description || null,
          year: documentForm.year || null,
          expirationDate: documentForm.expirationDate || null,
          fileName: documentForm.file.name,
          mimeType: documentForm.file.type,
          fileSize: documentForm.file.size,
          fileData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowDocumentModal(false);
        setDocumentForm({ name: '', type: 'OTHER', description: '', year: '', expirationDate: '', file: null });
        loadDocuments();
      } else {
        alert('Failed to upload document: ' + result.error);
      }
    } catch (error) {
      console.error('Upload document error:', error);
      alert('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/properties/${params.id}/documents/${docId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        loadDocuments();
      } else {
        alert('Failed to delete document: ' + result.error);
      }
    } catch (error) {
      console.error('Delete document error:', error);
      alert('Failed to delete document');
    }
  }

  async function uploadPhoto() {
    if (!photoForm.file) {
      alert('Please select a photo');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Convert file to base64
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(photoForm.file!);
      });

      const response = await fetch(`/api/properties/${params.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoType: photoForm.photoType,
          imageData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowPhotoModal(false);
        setPhotoForm({ photoType: 'GENERAL', file: null });
        loadPhotos();
      } else {
        alert('Failed to upload photo: ' + result.error);
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/properties/${params.id}/photos/${photoId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        loadPhotos();
      } else {
        alert('Failed to delete photo: ' + result.error);
      }
    } catch (error) {
      console.error('Delete photo error:', error);
      alert('Failed to delete photo');
    }
  }

  async function generateApplicationLink() {
    try {
      if (!applicantInfo.name || !applicantInfo.email || !applicantInfo.phone) {
        alert('Please fill in all applicant information fields');
        return;
      }

      if (applicantInfo.addSecondApplicant) {
        if (!applicantInfo.secondApplicantName || !applicantInfo.secondApplicantEmail || !applicantInfo.secondApplicantPhone) {
          alert('Please fill in all second applicant information fields');
          return;
        }
      }

      setGeneratingLink(true);

      const response = await fetch('/api/applications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: params.id,
          applicantName: applicantInfo.name,
          applicantEmail: applicantInfo.email,
          applicantPhone: applicantInfo.phone,
          secondApplicant: applicantInfo.addSecondApplicant ? {
            name: applicantInfo.secondApplicantName,
            email: applicantInfo.secondApplicantEmail,
            phone: applicantInfo.secondApplicantPhone,
          } : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setApplicationLink(result.fullLink);
        setShowApplicationModal(false);
        const emailStatus = result.notifications?.primary?.emailSent ? '✅ Email sent' : '❌ Email failed';
        const smsStatus = result.notifications?.primary?.smsSent ? '✅ SMS sent' : '❌ SMS failed';
        alert(`Application link generated!\n\n${emailStatus}\n${smsStatus}\n\nLink: ${result.fullLink}`);
      } else {
        alert('Failed to generate link: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Generate link error:', error);
      alert('Failed to generate application link');
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(applicationLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
          currentValue: editForm.currentValue ? parseFloat(editForm.currentValue) : null,
          purchasePrice: editForm.purchasePrice ? parseFloat(editForm.purchasePrice) : null,
          mortgage: editForm.mortgage ? parseFloat(editForm.mortgage) : null,
          mortgageBalance: editForm.mortgageBalance ? parseFloat(editForm.mortgageBalance) : null,
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

  async function refreshMortgageData() {
    try {
      setRefreshingMortgage(true);
      const response = await fetch('/api/plaid/get-liabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: params.id }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Mortgage data updated successfully!');
        loadProperty();
      } else {
        alert('Failed to refresh mortgage data: ' + result.error);
      }
    } catch (error) {
      console.error('Refresh mortgage error:', error);
      alert('Failed to refresh mortgage data');
    } finally {
      setRefreshingMortgage(false);
    }
  }

  async function refreshPropertyData() {
    try {
      setRefreshingProperty(true);

      const response = await fetch('/api/properties/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: params.id }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Property data refreshed successfully!');
        loadProperty();
      } else {
        alert('Failed to refresh property data: ' + result.error);
      }
    } catch (error: any) {
      console.error('Refresh property error:', error);
      alert('Failed to refresh property data: ' + error.message);
    } finally {
      setRefreshingProperty(false);
    }
  }

  function formatFileSize(bytes: number | undefined): string {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getDocumentTypeLabel(type: string): string {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
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
          <Link href="/dashboard" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
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
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.address}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-5 w-5" />
                <span>{property.city}, {property.state} {property.zipCode}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={refreshPropertyData} disabled={refreshingProperty} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                {refreshingProperty ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                Refresh Data
              </button>
              <Link 
                href={`/properties/${params.id}/analyze?address=${encodeURIComponent(property.address)}&city=${encodeURIComponent(property.city)}&state=${encodeURIComponent(property.state)}&zipCode=${encodeURIComponent(property.zipCode)}&price=${property.estimatedValue || property.purchasePrice || 0}`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <TrendingUp className="h-5 w-5" />
                Analyze Property
              </Link>
              <button onClick={() => setShowApplicationModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <FileText className="h-5 w-5" />
                Application Link
              </button>
              <button onClick={() => setShowEditModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <Edit3 className="h-5 w-5" />
                Edit Property
              </button>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${property.status === 'RENTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {property.status}
              </span>
            </div>
          </div>

          {/* Plaid Mortgage Link */}
          {!property.plaidLinked && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">🏦 Track Mortgage Balance Automatically</h3>
              <p className="text-xs text-blue-700 mb-3">Connect your mortgage account via Plaid to automatically sync your balance, interest rate, and payment information.</p>
              <PlaidLinkButton propertyId={property.id} onSuccess={loadProperty} />
            </div>
          )}

          {/* Application Link Display */}
          {applicationLink && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-2">✅ Application Link Generated</h3>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={applicationLink} className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono" />
                <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  {linkCopied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard title="Actual Rent" value={property.monthlyRent ? `$${property.monthlyRent.toLocaleString()}` : 'N/A'} icon={<DollarSign className="h-6 w-6 text-green-600" />} />
          <StatCard title="Market Rent" value={property.marketRent ? `$${property.marketRent.toLocaleString()}` : 'N/A'} icon={<TrendingUp className="h-6 w-6 text-blue-600" />} />
          <StatCard title="Monthly Mortgage" value={property.monthlyMortgage ? `$${property.monthlyMortgage.toLocaleString()}` : 'N/A'} icon={<DollarSign className="h-6 w-6 text-orange-600" />} />
          <StatCard title="Monthly Cash Flow" value={property.monthlyRent && property.monthlyMortgage ? `$${(property.monthlyRent - property.monthlyMortgage).toLocaleString()}` : 'N/A'} icon={<DollarSign className={`h-6 w-6 ${property.monthlyRent && property.monthlyMortgage && property.monthlyRent > property.monthlyMortgage ? 'text-green-600' : 'text-red-600'}`} />} />
          <StatCard title="Estimated Value" value={property.estimatedValue ? `$${property.estimatedValue.toLocaleString()}` : 'N/A'} icon={<Home className="h-6 w-6 text-purple-600" />} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                    <p className="text-gray-900">{new Date(property.currentTenancy.leaseStartDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lease End</p>
                    <p className="text-gray-900">{new Date(property.currentTenancy.leaseEndDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                    <p className="text-lg font-semibold text-gray-900">${property.currentTenancy.rentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Security Deposit</p>
                    <p className="text-gray-900">${property.currentTenancy.securityDeposit.toLocaleString()}</p>
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${request.priority === 'URGENT' ? 'bg-red-100 text-red-800' : request.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {request.priority}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{request.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{request.description}</p>
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
                      <p className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${payment.status === 'PAID' ? 'bg-green-100 text-green-800' : payment.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Folder className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Property Documents</h2>
            </div>
            <button onClick={() => setShowDocumentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Upload className="h-5 w-5" />
              Upload Document
            </button>
          </div>
          
          {loadingDocs ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload tax paperwork, insurance policies, leases, and more</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">{getDocumentTypeLabel(doc.type)}</p>
                      {doc.year && <p className="text-xs text-gray-500">Year: {doc.year}</p>}
                      <p className="text-xs text-gray-400 mt-1">{doc.fileName} • {formatFileSize(doc.fileSize)}</p>
                      {doc.expirationDate && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${doc.isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                          {doc.isExpired && <AlertTriangle className="h-3 w-3" />}
                          Expires: {new Date(doc.expirationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <a href={doc.fileUrl} download={doc.fileName} className="p-2 text-gray-400 hover:text-blue-600" title="Download">
                        <Download className="h-4 w-4" />
                      </a>
                      <button onClick={() => deleteDocument(doc.id)} className="p-2 text-gray-400 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photos Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Property Photos</h2>
            </div>
            <button onClick={() => setShowPhotoModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Upload className="h-5 w-5" />
              Upload Photo
            </button>
          </div>
          
          {loadingPhotos ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Image className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No photos uploaded yet</p>
              <p className="text-sm">Upload property photos for documentation</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.imageUrl} alt="Property" className="w-full h-40 object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                    <button onClick={() => deletePhoto(photo.id)} className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">{PHOTO_TYPES.find(t => t.value === photo.photoType)?.label || photo.photoType}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Document Modal */}
        {showDocumentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
                <button onClick={() => setShowDocumentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input type="text" value={documentForm.name} onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })} placeholder="e.g., 2024 Insurance Policy" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                  <select value={documentForm.type} onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input type="number" value={documentForm.year} onChange={(e) => setDocumentForm({ ...documentForm, year: e.target.value })} placeholder="2024" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                    <input type="date" value={documentForm.expirationDate} onChange={(e) => setDocumentForm({ ...documentForm, expirationDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={documentForm.description} onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })} placeholder="Optional notes about this document" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowDocumentModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={uploadDocument} disabled={uploadingDoc} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                    {uploadingDoc ? <><Loader2 className="h-5 w-5 animate-spin" />Uploading...</> : <><Upload className="h-5 w-5" />Upload</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Photo Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Upload Photo</h2>
                <button onClick={() => setShowPhotoModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo Type</label>
                  <select value={photoForm.photoType} onChange={(e) => setPhotoForm({ ...photoForm, photoType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    {PHOTO_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
                  <input type="file" accept="image/*" onChange={(e) => setPhotoForm({ ...photoForm, file: e.target.files?.[0] || null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  {photoForm.file && (
                    <div className="mt-2">
                      <img src={URL.createObjectURL(photoForm.file)} alt="Preview" className="h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowPhotoModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={uploadPhoto} disabled={uploadingPhoto} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                    {uploadingPhoto ? <><Loader2 className="h-5 w-5 animate-spin" />Uploading...</> : <><Upload className="h-5 w-5" />Upload</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Property Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Property</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input type="number" value={editForm.monthlyRent} onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })} placeholder="2500" className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Property Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input type="number" value={editForm.currentValue} onChange={(e) => setEditForm({ ...editForm, currentValue: e.target.value })} placeholder="350000" className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used for dashboard net worth calculation</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input type="number" value={editForm.purchasePrice} onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })} placeholder="300000" className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Mortgage Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input type="number" value={editForm.mortgageBalance} onChange={(e) => setEditForm({ ...editForm, mortgageBalance: e.target.value })} placeholder="240000" className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Amount still owed on the mortgage</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Mortgage Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input type="number" value={editForm.mortgage} onChange={(e) => setEditForm({ ...editForm, mortgage: e.target.value })} placeholder="1800" className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>
                  <button onClick={savePropertyEdits} disabled={saving} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 className="h-5 w-5 animate-spin" />Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Modal */}
        {showApplicationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Generate Application Link</h2>
                <button onClick={() => setShowApplicationModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">Enter the prospective tenant's information. They will receive the application link via email and SMS.</p>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Applicant</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                        <input type="text" value={applicantInfo.name} onChange={(e) => setApplicantInfo({ ...applicantInfo, name: e.target.value })} placeholder="John Doe" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                        <input type="email" value={applicantInfo.email} onChange={(e) => setApplicantInfo({ ...applicantInfo, email: e.target.value })} placeholder="john@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                        <input type="tel" value={applicantInfo.phone} onChange={(e) => setApplicantInfo({ ...applicantInfo, phone: e.target.value })} placeholder="(555) 123-4567" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="addSecondApplicant" checked={applicantInfo.addSecondApplicant} onChange={(e) => setApplicantInfo({ ...applicantInfo, addSecondApplicant: e.target.checked })} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
                    <label htmlFor="addSecondApplicant" className="text-sm font-medium text-gray-900">Add Second Applicant</label>
                  </div>
                  {applicantInfo.addSecondApplicant && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Second Applicant</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                          <input type="text" value={applicantInfo.secondApplicantName} onChange={(e) => setApplicantInfo({ ...applicantInfo, secondApplicantName: e.target.value })} placeholder="Jane Doe" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                          <input type="email" value={applicantInfo.secondApplicantEmail} onChange={(e) => setApplicantInfo({ ...applicantInfo, secondApplicantEmail: e.target.value })} placeholder="jane@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                          <input type="tel" value={applicantInfo.secondApplicantPhone} onChange={(e) => setApplicantInfo({ ...applicantInfo, secondApplicantPhone: e.target.value })} placeholder="(555) 987-6543" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button onClick={() => setShowApplicationModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>
                  <button onClick={generateApplicationLink} disabled={generatingLink} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2">
                    {generatingLink ? <><Loader2 className="h-5 w-5 animate-spin" />Generating...</> : <><FileText className="h-5 w-5" />Generate & Send Link</>}
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

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
