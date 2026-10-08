-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE_REPAIR', 'ROOFING', 'PAINTING', 'FLOORING', 'CARPENTRY', 'LANDSCAPING', 'PEST_CONTROL', 'CLEANING', 'LOCKSMITH', 'GENERAL_HANDYMAN', 'OTHER');

-- CreateEnum
CREATE TYPE "ProConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "InvitedBy" AS ENUM ('LANDLORD', 'PRO');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'PENDING_DISPATCH', 'DISPATCHED', 'SCHEDULED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServicePaymentStatus" AS ENUM ('PENDING', 'INVOICED', 'PAID', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "JobComplexity" AS ENUM ('SIMPLE', 'MODERATE', 'COMPLEX', 'REQUIRES_SPECIALIST');

-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('TENANT', 'LANDLORD', 'PRO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReviewerType" AS ENUM ('LANDLORD', 'TENANT');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'BILLING');

-- CreateEnum
CREATE TYPE "ProDocumentType" AS ENUM ('LICENSE', 'INSURANCE_CERTIFICATE', 'BOND', 'CERTIFICATION', 'W9', 'BUSINESS_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "LandlordDocumentType" AS ENUM ('TAX_RETURN', 'TAX_STATEMENT', 'PROPERTY_TAX', 'INSURANCE_POLICY', 'INSURANCE_CERTIFICATE', 'LEASE_AGREEMENT', 'LEASE_ADDENDUM', 'PROPERTY_DEED', 'TITLE_INSURANCE', 'MORTGAGE_STATEMENT', 'BANK_STATEMENT', 'INSPECTION_REPORT', 'APPRAISAL', 'HOA_DOCUMENTS', 'UTILITY_BILLS', 'CONTRACTOR_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LenderType" AS ENUM ('BANK', 'CREDIT_UNION', 'MORTGAGE_COMPANY', 'HARD_MONEY', 'PRIVATE_INVESTOR', 'CROWDFUNDING', 'OTHER');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'MORE_INFO_NEEDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'PRO';

-- DropIndex
DROP INDEX "SystemSetting_key_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "failedPaymentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "googleCalendarAccessToken" TEXT,
ADD COLUMN     "googleCalendarConnectedAt" TIMESTAMP(3),
ADD COLUMN     "googleCalendarEmail" TEXT,
ADD COLUMN     "googleCalendarRefreshToken" TEXT,
ADD COLUMN     "lastPaymentAmount" DECIMAL(65,30),
ADD COLUMN     "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN     "microsoftCalendarAccessToken" TEXT,
ADD COLUMN     "microsoftCalendarConnectedAt" TIMESTAMP(3),
ADD COLUMN     "microsoftCalendarEmail" TEXT,
ADD COLUMN     "microsoftCalendarRefreshToken" TEXT,
ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ALTER COLUMN "mfaBackupCodes" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ProProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "serviceRadius" INTEGER NOT NULL DEFAULT 25,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "licenseNumber" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "serviceCategories" TEXT[],
    "specialties" TEXT,
    "hourlyRate" DECIMAL(65,30),
    "callOutFee" DECIMAL(65,30),
    "emergencyRate" DECIMAL(65,30),
    "availability" JSONB,
    "acceptsEmergency" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectId" TEXT,
    "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "profilePhotoUrl" TEXT,
    "portfolioPhotos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordPro" (
    "id" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "status" "ProConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "invitedBy" "InvitedBy" NOT NULL DEFAULT 'LANDLORD',
    "inviteEmail" TEXT,
    "invitePhone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "primaryForCategory" TEXT,
    "landlordNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordPro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "tenantId" TEXT,
    "reportedByTenantName" TEXT,
    "reportedByTenantPhone" TEXT,
    "reportedByTenantEmail" TEXT,
    "proId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "photos" TEXT[],
    "preferredDate" TIMESTAMP(3),
    "preferredTimeSlot" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "completedAt" TIMESTAMP(3),
    "completionNotes" TEXT,
    "completionPhotos" TEXT[],
    "estimatedCost" DECIMAL(65,30),
    "finalCost" DECIMAL(65,30),
    "paymentStatus" "ServicePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeOfWork" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "problemSummary" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "materialsNeeded" JSONB,
    "laborEstimate" TEXT,
    "estimatedLaborCost" DECIMAL(65,30),
    "estimatedMaterialCost" DECIMAL(65,30),
    "estimatedTotalCost" DECIMAL(65,30),
    "costRange" TEXT,
    "complexity" "JobComplexity" NOT NULL DEFAULT 'MODERATE',
    "urgencyReason" TEXT,
    "suggestedCategory" "ServiceCategory",
    "diyPossible" BOOLEAN NOT NULL DEFAULT false,
    "diyInstructions" TEXT,
    "requiresPermit" BOOLEAN NOT NULL DEFAULT false,
    "permitNotes" TEXT,
    "approvedByLandlord" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "landlordNotes" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScopeOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "photos" TEXT[],
    "additionalCost" DECIMAL(65,30) NOT NULL,
    "laborCost" DECIMAL(65,30),
    "materialCost" DECIMAL(65,30),
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landlordResponse" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMessage" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "proId" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "serviceRequestId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyAddress" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "duration" INTEGER,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProReview" (
    "id" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "reviewerType" "ReviewerType" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "qualityRating" INTEGER,
    "timelinessRating" INTEGER,
    "communicationRating" INTEGER,
    "valueRating" INTEGER,
    "title" TEXT,
    "comment" TEXT,
    "photos" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "proResponse" TEXT,
    "proRespondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledForFree" BOOLEAN NOT NULL DEFAULT false,
    "enabledForPro" BOOLEAN NOT NULL DEFAULT true,
    "enabledForEnterprise" BOOLEAN NOT NULL DEFAULT true,
    "enabledForLandlords" BOOLEAN NOT NULL DEFAULT true,
    "enabledForTenants" BOOLEAN NOT NULL DEFAULT false,
    "enabledForPros" BOOLEAN NOT NULL DEFAULT false,
    "freeTierLimit" INTEGER,
    "proTierLimit" INTEGER,
    "enterpriseTierLimit" INTEGER,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT[],
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProDocument" (
    "id" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProDocumentType" NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordDocument" (
    "id" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "type" "LandlordDocumentType" NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "expirationDate" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lender" (
    "id" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LenderType" NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "minLoanAmount" DECIMAL(65,30),
    "maxLoanAmount" DECIMAL(65,30),
    "interestRateMin" DOUBLE PRECISION,
    "interestRateMax" DOUBLE PRECISION,
    "ltvMax" DOUBLE PRECISION,
    "termMonthsMin" INTEGER,
    "termMonthsMax" INTEGER,
    "pointsMin" DOUBLE PRECISION,
    "pointsMax" DOUBLE PRECISION,
    "minCreditScore" INTEGER,
    "requiresAppraisal" BOOLEAN NOT NULL DEFAULT true,
    "requiresIncome" BOOLEAN NOT NULL DEFAULT true,
    "timeToClose" TEXT,
    "loanTypes" TEXT[],
    "propertyTypes" TEXT[],
    "notes" TEXT,
    "rating" INTEGER,
    "lastContactDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_userId_key" ON "ProProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProProfile_stripeConnectId_key" ON "ProProfile"("stripeConnectId");

-- CreateIndex
CREATE INDEX "ProProfile_zipCode_idx" ON "ProProfile"("zipCode");

-- CreateIndex
CREATE INDEX "ProProfile_serviceCategories_idx" ON "ProProfile"("serviceCategories");

-- CreateIndex
CREATE INDEX "LandlordPro_landlordId_idx" ON "LandlordPro"("landlordId");

-- CreateIndex
CREATE INDEX "LandlordPro_proId_idx" ON "LandlordPro"("proId");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordPro_landlordId_proId_key" ON "LandlordPro"("landlordId", "proId");

-- CreateIndex
CREATE INDEX "ServiceRequest_propertyId_idx" ON "ServiceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "ServiceRequest_landlordId_idx" ON "ServiceRequest"("landlordId");

-- CreateIndex
CREATE INDEX "ServiceRequest_proId_idx" ON "ServiceRequest"("proId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_idx" ON "ServiceRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeOfWork_serviceRequestId_key" ON "ScopeOfWork"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ChangeOrder_serviceRequestId_idx" ON "ChangeOrder"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceMessage_serviceRequestId_idx" ON "ServiceMessage"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceMessage_senderId_idx" ON "ServiceMessage"("senderId");

-- CreateIndex
CREATE INDEX "Appointment_proId_scheduledDate_idx" ON "Appointment"("proId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Appointment_serviceRequestId_idx" ON "Appointment"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ProReview_serviceRequestId_key" ON "ProReview"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ProReview_proId_idx" ON "ProReview"("proId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");

-- CreateIndex
CREATE INDEX "AdminSession_token_idx" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ProDocument_proId_idx" ON "ProDocument"("proId");

-- CreateIndex
CREATE INDEX "ProDocument_type_idx" ON "ProDocument"("type");

-- CreateIndex
CREATE INDEX "ProDocument_expirationDate_idx" ON "ProDocument"("expirationDate");

-- CreateIndex
CREATE INDEX "LandlordDocument_landlordId_idx" ON "LandlordDocument"("landlordId");

-- CreateIndex
CREATE INDEX "LandlordDocument_propertyId_idx" ON "LandlordDocument"("propertyId");

-- CreateIndex
CREATE INDEX "LandlordDocument_type_idx" ON "LandlordDocument"("type");

-- CreateIndex
CREATE INDEX "Lender_landlordId_idx" ON "Lender"("landlordId");

-- CreateIndex
CREATE INDEX "Lender_type_idx" ON "Lender"("type");

-- CreateIndex
CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting"("category");

-- CreateIndex
CREATE INDEX "User_subscriptionStatus_idx" ON "User"("subscriptionStatus");

-- AddForeignKey
ALTER TABLE "ProProfile" ADD CONSTRAINT "ProProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordPro" ADD CONSTRAINT "LandlordPro_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "LandlordProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordPro" ADD CONSTRAINT "LandlordPro_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "LandlordProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeOfWork" ADD CONSTRAINT "ScopeOfWork_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMessage" ADD CONSTRAINT "ServiceMessage_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMessage" ADD CONSTRAINT "ServiceMessage_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProReview" ADD CONSTRAINT "ProReview_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProReview" ADD CONSTRAINT "ProReview_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProDocument" ADD CONSTRAINT "ProDocument_proId_fkey" FOREIGN KEY ("proId") REFERENCES "ProProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordDocument" ADD CONSTRAINT "LandlordDocument_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "LandlordProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordDocument" ADD CONSTRAINT "LandlordDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lender" ADD CONSTRAINT "Lender_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "LandlordProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
