-- CreateEnum for application status
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'DENIED');

-- CreateTable for TenantApplication
CREATE TABLE "TenantApplication" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "applicationLink" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',

    -- Primary Applicant Info
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "ssn" TEXT,

    -- Current Employment
    "employerName" TEXT,
    "employerPhone" TEXT,
    "jobTitle" TEXT,
    "monthlyIncome" DOUBLE PRECISION,
    "employmentStartDate" TIMESTAMP(3),

    -- Previous Employment (if less than 2 years)
    "previousEmployerName" TEXT,
    "previousEmployerPhone" TEXT,
    "previousJobTitle" TEXT,
    "previousEmploymentStartDate" TIMESTAMP(3),
    "previousEmploymentEndDate" TIMESTAMP(3),

    -- References
    "reference1Name" TEXT,
    "reference1Phone" TEXT,
    "reference1Relationship" TEXT,
    "reference2Name" TEXT,
    "reference2Phone" TEXT,
    "reference2Relationship" TEXT,

    -- Current Address
    "currentAddress" TEXT,
    "currentCity" TEXT,
    "currentState" TEXT,
    "currentZip" TEXT,
    "currentLandlord" TEXT,
    "currentLandlordPhone" TEXT,
    "currentMonthlyRent" DOUBLE PRECISION,
    "currentMoveInDate" TIMESTAMP(3),

    -- Previous Address (if less than 2 years at current)
    "previousAddress" TEXT,
    "previousCity" TEXT,
    "previousState" TEXT,
    "previousZip" TEXT,
    "previousLandlord" TEXT,
    "previousLandlordPhone" TEXT,

    -- Pets
    "hasPets" BOOLEAN DEFAULT false,
    "petDetails" JSONB,

    -- Additional Occupants
    "additionalOccupants" JSONB,

    -- Second Applicant
    "hasSecondApplicant" BOOLEAN DEFAULT false,
    "secondApplicantInfo" JSONB,

    -- Documents
    "payStubsUrls" TEXT[],
    "idDocumentUrl" TEXT,

    -- Screening Results
    "creditCheckId" TEXT,
    "creditScore" INTEGER,
    "creditReportUrl" TEXT,
    "backgroundCheckId" TEXT,
    "backgroundCheckStatus" TEXT,
    "backgroundCheckReportUrl" TEXT,

    -- Payment
    "applicationFee" DOUBLE PRECISION DEFAULT 50.00,
    "applicationFeePaid" BOOLEAN DEFAULT false,
    "stripePaymentIntentId" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "TenantApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantApplication_applicationLink_key" ON "TenantApplication"("applicationLink");

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
