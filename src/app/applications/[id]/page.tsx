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

      {/* Pets & Occupants */}
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Pets & Additional Occupants</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <p>
            <span className="font-medium">Has Pets:</span>{" "}
            {application.hasPets ? "Yes" : "No"}
          </p>
          {application.hasPets && application.petDetails && (
            <p className="md:col-span-2">
              <span className="font-medium">Pet Details:</span>{" "}
              {JSON.stringify(application.petDetails)}
            </p>
          )}
          <p className="md:col-span-2">
            <span className="font-medium">Additional Occupants:</span>{" "}
            {application.additionalOccupants ? JSON.stringify(application.additionalOccupants) : "None"}
          </p>
        </div>
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
      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="text-sm space-y-2">
          <div>
            <span className="font-medium">Pay Stubs:</span>{" "}
            {application.payStubsUrls && application.payStubsUrls.length > 0 ? (
              <ul className="list-disc ml-5">
                {application.payStubsUrls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      Document {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : "None uploaded"}
          </div>
          <p>
            <span className="font-medium">ID Document:</span>{" "}
            {application.idDocumentUrl ? (
              <a href={application.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                View Document
              </a>
            ) : "Not uploaded"}
          </p>
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
