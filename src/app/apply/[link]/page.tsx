'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Loader2, CheckCircle, Home, Briefcase, Users, PawPrint, CreditCard } from 'lucide-react';

interface ApplicationData {
  property: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    monthlyRent: number;
    bedrooms: number;
    bathrooms: number;
  };
  landlord: {
    name: string;
    email: string;
    phone: string;
  };
  applicationFee: number;
}

export default function TenantApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const link = params.link as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Personal Info
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',

    // Employment
    employerName: '',
    employerPhone: '',
    jobTitle: '',
    monthlyIncome: '',
    employmentStartDate: '',

    // Previous Employment
    needsPreviousEmployment: false,
    previousEmployerName: '',
    previousEmployerPhone: '',
    previousJobTitle: '',
    previousEmploymentStartDate: '',
    previousEmploymentEndDate: '',

    // References
    reference1Name: '',
    reference1Phone: '',
    reference1Relationship: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Relationship: '',

    // Current Address
    currentAddress: '',
    currentCity: '',
    currentState: '',
    currentZip: '',
    currentLandlord: '',
    currentLandlordPhone: '',
    currentMonthlyRent: '',
    currentMoveInDate: '',

    // Previous Address
    needsPreviousAddress: false,
    previousAddress: '',
    previousCity: '',
    previousState: '',
    previousZip: '',
    previousLandlord: '',
    previousLandlordPhone: '',

    // Pets
    hasPets: false,
    petDetails: '',

    // Additional Occupants
    additionalOccupants: '',

    // Second Applicant
    hasSecondApplicant: false,
    secondApplicantInfo: '',

    // Documents
    payStubsUrls: [] as string[],
    idDocumentUrl: '',

    // Payment
    applicationFeePaid: false,
    stripePaymentIntentId: '',
  });

  // Fetch application details
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const response = await fetch(`/api/applications/${link}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Application not found');
          setLoading(false);
          return;
        }

        setApplicationData(data.application);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch application:', error);
        setError('Failed to load application');
        setLoading(false);
      }
    };

    fetchApplication();
  }, [link]);

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/applications/${link}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Application submitted successfully!');
        router.push('/');
      } else {
        alert('Failed to submit application: ' + data.error);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 12));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalSteps = 12;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Home className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rental Application</h1>
              <p className="text-gray-600">
                {applicationData?.property.address}, {applicationData?.property.city}, {applicationData?.property.state}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Steps */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-indigo-600" />
                Personal Information
              </h2>
              <input
                type="text"
                required
                placeholder="Full Legal Name *"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="email"
                required
                placeholder="Email Address *"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="tel"
                required
                placeholder="Phone Number *"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Social Security Number *</label>
                <input
                  type="password"
                  required
                  placeholder="XXX-XX-XXXX"
                  value={formData.ssn}
                  onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Encrypted and secure. Required for credit check.</p>
              </div>
            </div>
          )}

          {/* Step 2: Current Employment */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-indigo-600" />
                Current Employment
              </h2>
              <input
                type="text"
                required
                placeholder="Employer Name *"
                value={formData.employerName}
                onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="tel"
                required
                placeholder="Employer Phone *"
                value={formData.employerPhone}
                onChange={(e) => setFormData({ ...formData, employerPhone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                required
                placeholder="Job Title *"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                required
                placeholder="Monthly Income (before taxes) *"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.employmentStartDate}
                  onChange={(e) => {
                    setFormData({ ...formData, employmentStartDate: e.target.value });
                    // Check if less than 2 years
                    const startDate = new Date(e.target.value);
                    const twoYearsAgo = new Date();
                    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                    if (startDate > twoYearsAgo) {
                      setFormData(prev => ({ ...prev, needsPreviousEmployment: true }));
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Previous Employment (conditional) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Previous Employment</h2>
              {formData.needsPreviousEmployment ? (
                <>
                  <p className="text-sm text-gray-600">Since you've been at your current job less than 2 years, please provide previous employment.</p>
                  <input
                    type="text"
                    placeholder="Previous Employer Name"
                    value={formData.previousEmployerName}
                    onChange={(e) => setFormData({ ...formData, previousEmployerName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="tel"
                    placeholder="Previous Employer Phone"
                    value={formData.previousEmployerPhone}
                    onChange={(e) => setFormData({ ...formData, previousEmployerPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Previous Job Title"
                    value={formData.previousJobTitle}
                    onChange={(e) => setFormData({ ...formData, previousJobTitle: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={formData.previousEmploymentStartDate}
                        onChange={(e) => setFormData({ ...formData, previousEmploymentStartDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={formData.previousEmploymentEndDate}
                        onChange={(e) => setFormData({ ...formData, previousEmploymentEndDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 py-8 text-center">No previous employment needed (2+ years at current job)</p>
              )}
            </div>
          )}

          {/* Step 4: References */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal References</h2>
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Reference 1 *</h3>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.reference1Name}
                  onChange={(e) => setFormData({ ...formData, reference1Name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone Number"
                  value={formData.reference1Phone}
                  onChange={(e) => setFormData({ ...formData, reference1Phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Relationship (e.g., Friend, Colleague)"
                  value={formData.reference1Relationship}
                  onChange={(e) => setFormData({ ...formData, reference1Relationship: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Reference 2 *</h3>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.reference2Name}
                  onChange={(e) => setFormData({ ...formData, reference2Name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone Number"
                  value={formData.reference2Phone}
                  onChange={(e) => setFormData({ ...formData, reference2Phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Relationship (e.g., Friend, Colleague)"
                  value={formData.reference2Relationship}
                  onChange={(e) => setFormData({ ...formData, reference2Relationship: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Step 5: Current Address */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Home className="h-6 w-6 text-indigo-600" />
                Current Residence
              </h2>
              <input
                type="text"
                required
                placeholder="Street Address *"
                value={formData.currentAddress}
                onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={formData.currentCity}
                  onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  required
                  maxLength={2}
                  placeholder="State"
                  value={formData.currentState}
                  onChange={(e) => setFormData({ ...formData, currentState: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="ZIP Code"
                  value={formData.currentZip}
                  onChange={(e) => setFormData({ ...formData, currentZip: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Current Landlord Name *"
                value={formData.currentLandlord}
                onChange={(e) => setFormData({ ...formData, currentLandlord: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="tel"
                required
                placeholder="Landlord Phone Number *"
                value={formData.currentLandlordPhone}
                onChange={(e) => setFormData({ ...formData, currentLandlordPhone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                required
                placeholder="Monthly Rent *"
                value={formData.currentMonthlyRent}
                onChange={(e) => setFormData({ ...formData, currentMonthlyRent: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Move-In Date *</label>
                <input
                  type="date"
                  required
                  value={formData.currentMoveInDate}
                  onChange={(e) => {
                    setFormData({ ...formData, currentMoveInDate: e.target.value });
                    // Check if less than 2 years
                    const moveInDate = new Date(e.target.value);
                    const twoYearsAgo = new Date();
                    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                    if (moveInDate > twoYearsAgo) {
                      setFormData(prev => ({ ...prev, needsPreviousAddress: true }));
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Step 6: Previous Address (conditional) */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Previous Residence</h2>
              {formData.needsPreviousAddress ? (
                <>
                  <p className="text-sm text-gray-600">Since you've been at your current address less than 2 years, please provide previous address.</p>
                  <input
                    type="text"
                    placeholder="Previous Street Address"
                    value={formData.previousAddress}
                    onChange={(e) => setFormData({ ...formData, previousAddress: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.previousCity}
                      onChange={(e) => setFormData({ ...formData, previousCity: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="State"
                      value={formData.previousState}
                      onChange={(e) => setFormData({ ...formData, previousState: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="ZIP"
                      value={formData.previousZip}
                      onChange={(e) => setFormData({ ...formData, previousZip: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Previous Landlord Name"
                    value={formData.previousLandlord}
                    onChange={(e) => setFormData({ ...formData, previousLandlord: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="tel"
                    placeholder="Previous Landlord Phone"
                    value={formData.previousLandlordPhone}
                    onChange={(e) => setFormData({ ...formData, previousLandlordPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </>
              ) : (
                <p className="text-gray-600 py-8 text-center">No previous address needed (2+ years at current residence)</p>
              )}
            </div>
          )}

          {/* Step 7: Additional Occupants */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-indigo-600" />
                Additional Occupants
              </h2>
              <p className="text-sm text-gray-600">List any additional people who will be living in the property (children, roommates, etc.)</p>
              <textarea
                placeholder="Example: John Doe (Roommate, Age 25), Jane Doe (Daughter, Age 5)"
                value={formData.additionalOccupants}
                onChange={(e) => setFormData({ ...formData, additionalOccupants: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Step 8: Second Applicant */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Second Applicant</h2>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hasSecondApplicant}
                  onChange={(e) => setFormData({ ...formData, hasSecondApplicant: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-gray-700">Is there a second applicant (spouse, partner)?</span>
              </label>
              {formData.hasSecondApplicant && (
                <textarea
                  placeholder="Second Applicant Info (Name, DOB, SSN, Employment Details)"
                  value={formData.secondApplicantInfo}
                  onChange={(e) => setFormData({ ...formData, secondApplicantInfo: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          )}

          {/* Step 9: Pets */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <PawPrint className="h-6 w-6 text-indigo-600" />
                Pets
              </h2>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hasPets}
                  onChange={(e) => setFormData({ ...formData, hasPets: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-gray-700">Do you have any pets?</span>
              </label>
              {formData.hasPets && (
                <textarea
                  placeholder="Pet Details (Type, Breed, Weight, Age, Name)"
                  value={formData.petDetails}
                  onChange={(e) => setFormData({ ...formData, petDetails: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          )}

          {/* Step 10: Document Upload */}
          {currentStep === 10 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-indigo-600" />
                Document Upload
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-4">Upload required documents:</p>
                <ul className="text-sm text-gray-500 mb-6 text-left max-w-md mx-auto">
                  <li>• Last 2 pay stubs (or proof of income)</li>
                  <li>• Government-issued photo ID (Driver's License, Passport)</li>
                </ul>
                <p className="text-sm text-amber-600">⚠️ Document upload feature coming soon. You may submit your application without documents for now.</p>
              </div>
            </div>
          )}

          {/* Step 11: Payment */}
          {currentStep === 11 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-indigo-600" />
                Application Fee
              </h2>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <p className="text-2xl font-bold text-indigo-900 mb-2">
                  ${applicationData?.applicationFee.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Non-refundable application fee</p>
                <p className="text-xs text-gray-500 mt-2">Covers credit check and background screening</p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-amber-600 mb-4">⚠️ Stripe payment integration coming soon</p>
                <p className="text-sm text-gray-500">For now, you can submit without payment to test the application</p>
              </div>
            </div>
          )}

          {/* Step 12: Review & Submit */}
          {currentStep === 12 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-indigo-600" />
                Review & Submit
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Personal Info</h3>
                  <p className="text-sm text-gray-600">{formData.fullName}</p>
                  <p className="text-sm text-gray-600">{formData.email} • {formData.phone}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Employment</h3>
                  <p className="text-sm text-gray-600">{formData.jobTitle} at {formData.employerName}</p>
                  <p className="text-sm text-gray-600">Monthly Income: ${formData.monthlyIncome}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Current Address</h3>
                  <p className="text-sm text-gray-600">{formData.currentAddress}, {formData.currentCity}, {formData.currentState} {formData.currentZip}</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  ⚠️ By submitting this application, you authorize the landlord to conduct credit and background checks.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                className="ml-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="ml-auto px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
