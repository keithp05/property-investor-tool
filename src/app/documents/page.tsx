'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Folder,
  Trash2,
  Download,
  Search,
  Filter,
  Plus,
  Loader2,
  Calendar,
  Building2,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface LandlordDocument {
  id: string;
  name: string;
  type: string;
  description: string | null;
  year: number | null;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  expirationDate: string | null;
  isExpired: boolean;
  propertyId: string | null;
  property: { address: string } | null;
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

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LandlordDocument[]>([]);
  const [properties, setProperties] = useState<{ id: string; address: string }[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProperty, setFilterProperty] = useState('');

  const [uploadData, setUploadData] = useState({
    name: '',
    type: '',
    description: '',
    year: '',
    propertyId: '',
    expirationDate: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchDocuments();
      fetchProperties();
    }
  }, [status, router]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents/landlord');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (data.properties) {
        setProperties(data.properties.map((p: any) => ({ id: p.id, address: p.address })));
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file || !uploadData.name || !uploadData.type) {
      alert('Please fill in required fields and select a file');
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const res = await fetch('/api/documents/landlord', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...uploadData,
            fileData: base64,
            fileName: uploadData.file?.name,
            mimeType: uploadData.file?.type,
            fileSize: uploadData.file?.size,
          }),
        });
        
        const data = await res.json();
        if (data.success) {
          setShowUploadModal(false);
          setUploadData({ name: '', type: '', description: '', year: '', propertyId: '', expirationDate: '', file: null });
          fetchDocuments();
        } else {
          alert(data.error || 'Upload failed');
        }
        setUploading(false);
      };
      reader.readAsDataURL(uploadData.file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const res = await fetch(`/api/documents/landlord/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = !searchTerm || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || doc.type === filterType;
    const matchesProperty = !filterProperty || doc.propertyId === filterProperty;
    return matchesSearch && matchesType && matchesProperty;
  });

  // Group by type
  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    const type = doc.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, LandlordDocument[]>);

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">Manage your property documents, leases, and tax records</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Upload className="h-5 w-5" />
            Upload Document
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-500 mb-4">Upload your first document to get started</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocs).map(([type, docs]) => (
              <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Folder className="h-5 w-5 text-indigo-600" />
                    {DOCUMENT_TYPES.find((t) => t.value === type)?.label || type}
                    <span className="text-sm font-normal text-gray-500">({docs.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {docs.map((doc) => (
                    <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{doc.fileName}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            {doc.property && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {doc.property.address}
                                </span>
                              </>
                            )}
                            {doc.year && (
                              <>
                                <span>•</span>
                                <span>{doc.year}</span>
                              </>
                            )}
                          </div>
                          {doc.expirationDate && (
                            <div className={`text-xs mt-1 flex items-center gap-1 ${doc.isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                              {doc.isExpired ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                              {doc.isExpired ? 'Expired' : 'Expires'}: {new Date(doc.expirationDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                <input
                  type="text"
                  placeholder="e.g., 2024 Tax Return"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                <select
                  value={uploadData.type}
                  onChange={(e) => setUploadData({ ...uploadData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select type...</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property (Optional)</label>
                <select
                  value={uploadData.propertyId}
                  onChange={(e) => setUploadData({ ...uploadData, propertyId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General (not property-specific)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.address}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year (for tax docs)</label>
                  <input
                    type="number"
                    placeholder="2024"
                    value={uploadData.year}
                    onChange={(e) => setUploadData({ ...uploadData, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={uploadData.expirationDate}
                    onChange={(e) => setUploadData({ ...uploadData, expirationDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Optional notes about this document..."
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {uploadData.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-700">{uploadData.file.name}</span>
                      <button
                        onClick={() => setUploadData({ ...uploadData, file: null })}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to select a file</p>
                      <p className="text-xs text-gray-400">PDF, JPG, PNG up to 10MB</p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
