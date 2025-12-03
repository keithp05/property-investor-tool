-- CreateTable
CREATE TABLE "UserFeatureOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "UserFeatureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFeatureOverride_userId_idx" ON "UserFeatureOverride"("userId");

-- CreateIndex
CREATE INDEX "UserFeatureOverride_featureKey_idx" ON "UserFeatureOverride"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserFeatureOverride_userId_featureKey_key" ON "UserFeatureOverride"("userId", "featureKey");

-- AddForeignKey
ALTER TABLE "UserFeatureOverride" ADD CONSTRAINT "UserFeatureOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
