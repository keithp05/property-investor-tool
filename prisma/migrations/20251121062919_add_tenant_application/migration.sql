/*
  Warnings:

  - Made the column `hasPets` on table `TenantApplication` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hasSecondApplicant` on table `TenantApplication` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationFee` on table `TenantApplication` required. This step will fail if there are existing NULL values in that column.
  - Made the column `applicationFeePaid` on table `TenantApplication` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TenantApplication" ALTER COLUMN "hasPets" SET NOT NULL,
ALTER COLUMN "hasSecondApplicant" SET NOT NULL,
ALTER COLUMN "applicationFee" SET NOT NULL,
ALTER COLUMN "applicationFeePaid" SET NOT NULL;

-- CreateIndex
CREATE INDEX "TenantApplication_propertyId_idx" ON "TenantApplication"("propertyId");

-- CreateIndex
CREATE INDEX "TenantApplication_landlordId_idx" ON "TenantApplication"("landlordId");

-- CreateIndex
CREATE INDEX "TenantApplication_applicationLink_idx" ON "TenantApplication"("applicationLink");
