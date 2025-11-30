import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

type PageProps = {
  params: { id: string };
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = params;

  const application = await prisma.tenantApplication.findUnique({
    where: { id },
    include: {
      property: true,
      landlord: true,
    },
  });

  if (!application) {
    notFound();
  }

  const formatDate = (value: Date | null | undefined) =>
    value ? format(value, "MMM d, yyyy") : "N/A";

  const formatMoney = (value: number | null | undefined) =>
    typeof value === "number" ? `$${value.toLocaleString()}` : "N/A";

  const formatDecimalMoney = (value: any) =>
    value != null ? `$${Number(value).toLocaleString()}` : "N/A";

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <Link href="/tenants" className="text-indigo-600 hover:underline text-sm">
        ← Back to Applications
      </Link>

      <header className="flex flex-col gap-2 border-b pb-4">
        <h1 className="text-2xl font-semibold">Tenant Application Details</h1>
        <p className="text-sm text-gray-600">
          Application ID: <span className="font-mono">{application.id}</span>
        </p>
        <p className="text-sm text-gray-600">
          Status: <span className="font-semibold">{application.status}</span>
        </p>
        <p className="text-sm text-gray-600">
          Created: {formatDate(application.createdAt)}{" "}
          {application.submittedAt && <>| Submitted: {formatDate(application.submittedAt)}</>}
        </p>
      </header>

      {/* Property Info */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Property</h2>
        {application.property ? (
          <>
            <p>
              <span className="font-medium">Address:</span>{" "}
              {application.property.address}, {application.property.city}, {application.property.state} {application.property.zipCode}
            </p>
            <p>
              <span className="font-medium">Monthly Rent:</span>{" "}
              {formatDecimalMoney(application.property.monthlyRent)}
            </p>
            <p>
              <span className="font-medium">Security Deposit:</span>{" "}
              {formatDecimalMoney(application.property.securityDeposit)}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">No property information found.</p>
        )}
      </section>

      {/* Primary Applicant */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Primary Applicant</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="font-medium">Name:</span> {application.fullName ?? "N/A"}</p>
          <p><span className="font-medium">Email:</span> {application.email ?? "N/A"}</p>
          <p><span className="font-medium">Phone:</span> {application.phone ?? "N/A"}</p>
          <p><span className="font-medium">Date of Birth:</span> {formatDate(application.dateOfBirth)}</p>
          <p><span className="font-medium">SSN (masked):</span> {application.ssn ? "•••-••-" + application.ssn.slice(-4) : "N/A"}</p>
        </div>
      </section>

      {/* Employment */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Current Employment</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="font-medium">Employer:</span> {application.employerName ?? "N/A"}</p>
          <p><span className="font-medium">Job Title:</span> {application.jobTitle ?? "N/A"}</p>
          <p><span className="font-medium">Monthly Income:</span> {formatMoney(application.monthlyIncome)}</p>
          <p><span className="font-medium">Start Date:</span> {formatDate(application.employmentStartDate)}</p>
          <p><span className="font-medium">Employer Phone:</span> {application.employerPhone ?? "N/A"}</p>
        </div>

        {application.previousEmployerName && (
          <>
            <h3 className="mt-4 font-semibold text-sm">Previous Employment</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-medium">Employer:</span> {application.previousEmployerName ?? "N/A"}</p>
              <p><span className="font-medium">Job Title:</span> {application.previousJobTitle ?? "N/A"}</p>
              <p><span className="font-medium">Start Date:</span> {formatDate(application.previousEmploymentStartDate)}</p>
              <p><span className="font-medium">End Date:</span> {formatDate(application.previousEmploymentEndDate)}</p>
            </div>
          </>
        )}
      </section>

      {/* Residence History */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Residence History</h2>

        <h3 className="font-semibold text-sm">Current Residence</h3>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="font-medium">Address:</span> {application.currentAddress ?? "N/A"}</p>
          <p><span className="font-medium">City/State/Zip:</span> {application.currentCity} {application.currentState} {application.currentZip}</p>
          <p><span className="font-medium">Landlord:</span> {application.currentLandlord ?? "N/A"}</p>
          <p><span className="font-medium">Landlord Phone:</span> {application.currentLandlordPhone ?? "N/A"}</p>
          <p><span className="font-medium">Monthly Rent:</span> {formatMoney(application.currentMonthlyRent)}</p>
          <p><span className="font-medium">Move In Date:</span> {formatDate(application.currentMoveInDate)}</p>
        </div>

        {application.previousAddress && (
          <>
            <h3 className="mt-4 font-semibold text-sm">Previous Residence</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-medium">Address:</span> {application.previousAddress ?? "N/A"}</p>
              <p><span className="font-medium">City/State/Zip:</span> {application.previousCity} {application.previousState} {application.previousZip}</p>
              <p><span className="font-medium">Landlord:</span> {application.previousLandlord ?? "N/A"}</p>
              <p><span className="font-medium">Landlord Phone:</span> {application.previousLandlordPhone ?? "N/A"}</p>
            </div>
          </>
        )}
      </section>

      {/* References */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">References</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold">Reference 1</h3>
            <p><span className="font-medium">Name:</span> {application.reference1Name ?? "N/A"}</p>
            <p><span className="font-medium">Phone:</span> {application.reference1Phone ?? "N/A"}</p>
            <p><span className="font-medium">Relationship:</span> {application.reference1Relationship ?? "N/A"}</p>
          </div>
          <div>
            <h3 className="font-semibold">Reference 2</h3>
            <p><span className="font-medium">Name:</span> {application.reference2Name ?? "N/A"}</p>
            <p><span className="font-medium">Phone:</span> {application.reference2Phone ?? "N/A"}</p>
            <p><span className="font-medium">Relationship:</span> {application.reference2Relationship ?? "N/A"}</p>
          </div>
        </div>
      </section>

      {/* Additional Occupants */}
      <section className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Additional Occupants</h2>
          {application.additionalOccupants && Array.isArray(application.additionalOccupants) && (
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {(application.additionalOccupants as any[]).length} occupant(s)
            </span>
          )}
        </div>
        
        {application.additionalOccupants && Array.isArray(application.additionalOccupants) && (application.additionalOccupants as any[]).length > 0 ? (
          <div className="space-y-3">
            {(application.additionalOccupants as any[]).map((occupant: any, index: number) => {
              // Calculate age
              let age = '';
              let isOver18 = false;
              if (occupant.dateOfBirth) {
                const birthDate = new Date(occupant.dateOfBirth);
                const today = new Date();
                const ageYears = today.getFullYear() - birthDate.getFullYear();
                age = `${ageYears} years old`;
                isOver18 = ageYears >= 18;
              }
              
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {occupant.firstName} {occupant.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {occupant.relationship === 'Other' ? occupant.otherRelationship : occupant.relationship}
                        {age && ` • ${age}`}
                      </p>
                      {occupant.dateOfBirth && (
                        <p className="text-xs text-gray-500">DOB: {formatDate(new Date(occupant.dateOfBirth))}</p>
                      )}
                    </div>
                    {isOver18 && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                        ⚠️ 18+ (Background check required)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800">
                <strong>Lease Note:</strong> All occupants listed above will be named on the lease. 
                Occupants 18 years or older must submit a separate application and pass a background check.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No additional occupants listed</p>
        )}
      </section>

      {/* Pets */}
      <section className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pets</h2>
          {application.petDetails && Array.isArray(application.petDetails) && (
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {(application.petDetails as any[]).length} pet(s)
            </span>
          )}
        </div>

        {application.hasPets ? (
          application.petDetails && Array.isArray(application.petDetails) && (application.petDetails as any[]).length > 0 ? (
            <div className="space-y-3">
              {(application.petDetails as any[]).map((pet: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {pet.name}
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          ({pet.type === 'Other' ? pet.otherType : pet.type})
                        </span>
                      </p>
                      <div className="text-sm text-gray-600 mt-1">
                        {pet.breed && <span>Breed: {pet.breed} • </span>}
                        <span>Weight: {pet.weight} lbs</span>
                        {pet.color && <span> • Color: {pet.color}</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      pet.type === 'Dog' ? 'bg-blue-100 text-blue-800' :
                      pet.type === 'Cat' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pet.type === 'Dog' ? '🐕 Dog' : pet.type === 'Cat' ? '🐈 Cat' : '🐾 Other'}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-blue-800">
                  <strong>Lease Note:</strong> Pet rent and pet deposit may apply per property policy. 
                  All pets listed above will be documented in the lease agreement.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Pet details not provided</p>
          )
        ) : (
          <p className="text-sm text-gray-500">No pets</p>
        )}
      </section>

      {/* Second Applicant */}
      {application.hasSecondApplicant && application.secondApplicantInfo && (
        <section className="border rounded-lg p-4 space-y-2">
          <h2 className="text-lg font-semibold">Second Applicant</h2>
          <p className="text-sm">
            {JSON.stringify(application.secondApplicantInfo)}
          </p>
        </section>
      )}

      {/* Screening Results */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Screening Results</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p><span className="font-medium">Credit Score:</span> {application.creditScore ?? "Not available"}</p>
          <p><span className="font-medium">Background Check:</span> {application.backgroundCheckStatus ?? "Not available"}</p>
        </div>
      </section>

      {/* Documents */}
      <section className="border rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">Documents</h2>
        
        {/* Pay Stubs */}
        <div>
          <span className="font-medium text-sm">Pay Stubs:</span>
          {application.payStubsUrls && application.payStubsUrls.length > 0 ? (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {application.payStubsUrls.map((url, i) => (
                <div key={i} className="border rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-2">Pay Stub {i + 1}</p>
                  {url.startsWith('data:image') ? (
                    <img 
                      src={url} 
                      alt={`Pay Stub ${i + 1}`} 
                      className="max-w-full h-auto max-h-64 object-contain"
                    />
                  ) : url.startsWith('data:application/pdf') ? (
                    <div className="bg-gray-100 p-4 rounded text-center">
                      <p className="text-sm text-gray-600">PDF Document</p>
                      <a 
                        href={url} 
                        download={`paystub-${i + 1}.pdf`}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        Download PDF
                      </a>
                    </div>
                  ) : (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                      View Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">None uploaded</p>
          )}
        </div>

        {/* ID Document */}
        <div>
          <span className="font-medium text-sm">ID Document:</span>
          {application.idDocumentUrl ? (
            <div className="mt-2 border rounded-lg p-2 max-w-md">
              {application.idDocumentUrl.startsWith('data:image') ? (
                <img 
                  src={application.idDocumentUrl} 
                  alt="ID Document" 
                  className="max-w-full h-auto max-h-64 object-contain"
                />
              ) : application.idDocumentUrl.startsWith('data:application/pdf') ? (
                <div className="bg-gray-100 p-4 rounded text-center">
                  <p className="text-sm text-gray-600">PDF Document</p>
                  <a 
                    href={application.idDocumentUrl} 
                    download="id-document.pdf"
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    Download PDF
                  </a>
                </div>
              ) : (
                <a href={application.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                  View Document
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Not uploaded</p>
          )}
        </div>
      </section>

      {/* Application Fee */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Application Fee</h2>
        <p className="text-sm">
          <span className="font-medium">Fee Amount:</span>{" "}
          {formatMoney(application.applicationFee)}
        </p>
        <p className="text-sm">
          <span className="font-medium">Fee Paid:</span>{" "}
          {application.applicationFeePaid ? "Yes ✓" : "No"}
        </p>
      </section>
    </div>
  );
}
