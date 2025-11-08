# Phase 1: Authentication, Database & Cloud Infrastructure

## 🎯 Your Requirements Summary

### Core Infrastructure
- ✅ PostgreSQL database
- ✅ NextAuth authentication with roles (Admin, Landlord, Tenant)
- ✅ Subscription tiers (Free, Pro, Enterprise)
- ✅ Dashboard with weather widget for property areas
- ✅ Maintenance request tracking on dashboard

### Cloud Services (AWS Primary, Cloud-Agnostic Design)
- ✅ **AWS S3** - Photo storage (tenant photos auto-delete on lease end)
- ✅ **AWS SES** - Email delivery for tenant invites, notifications
- ✅ **Stripe** - Primary payment gateway
- ✅ **Multiple payment methods** - Stripe, ACH, Venmo, Zelle, etc.
- ✅ **QuickBooks Integration** - 2-way sync for accounting
- ✅ **Cloud-agnostic architecture** - Portable to GCP, Azure

## 📦 Package Installation

```bash
# Authentication
npm install next-auth @auth/prisma-adapter bcryptjs
npm install --save-dev @types/bcryptjs

# Database
npm install prisma @prisma/client
npm install --save-dev prisma

# AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install @aws-sdk/client-ses

# Payment Processing
npm install stripe @stripe/stripe-js

# QuickBooks Integration
npm install intuit-oauth node-quickbooks

# Cloud-Agnostic Storage Adapter
npm install @google-cloud/storage azure-storage

# Weather API
npm install axios

# Email Templates
npm install @react-email/components react-email

# Utilities
npm install dayjs uuid
npm install --save-dev @types/uuid
```

## 🗄️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  password      String    // bcrypt hashed
  name          String?
  image         String?
  role          UserRole  @default(TENANT)

  // Subscription
  subscriptionTier   SubscriptionTier @default(FREE)
  stripeCustomerId   String?          @unique
  stripeSubscriptionId String?        @unique
  subscriptionStatus SubscriptionStatus @default(INACTIVE)
  subscriptionEndsAt DateTime?

  // Relations
  accounts      Account[]
  sessions      Session[]
  landlordProfile LandlordProfile?
  tenantProfile   TenantProfile?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================================================
// LANDLORD & TENANT PROFILES
// ============================================================================

model LandlordProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Business Info
  phone           String?
  company         String?
  businessAddress String?

  // QuickBooks Integration
  quickbooksEnabled    Boolean @default(false)
  quickbooksCompanyId  String?
  quickbooksRealmId    String?
  quickbooksAccessToken String?
  quickbooksRefreshToken String?
  quickbooksTokenExpiry DateTime?

  // Relations
  properties      Property[]
  tenants         Tenant[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model TenantProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Contact Info
  phone           String?
  emergencyContact String?
  emergencyPhone   String?

  // Current Rental
  currentTenancy  Tenant?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============================================================================
// PROPERTIES
// ============================================================================

model Property {
  id              String   @id @default(cuid())
  landlordId      String
  landlord        LandlordProfile @relation(fields: [landlordId], references: [id], onDelete: Cascade)

  // Property Details (auto-fetched from Zillow)
  address         String
  city            String
  state           String
  zipCode         String
  latitude        Float?
  longitude       Float?

  bedrooms        Int
  bathrooms       Float
  squareFeet      Int?
  yearBuilt       Int?
  propertyType    String
  estimatedValue  Decimal?

  // Landlord Purchase Info
  purchasePrice   Decimal?
  purchaseDate    DateTime?
  monthlyMortgage Decimal?

  // Rental Info
  monthlyRent     Decimal?
  securityDeposit Decimal?

  // Status
  status          PropertyStatus @default(VACANT)

  // Relations
  currentTenancy  Tenant?
  photos          PropertyPhoto[]
  maintenanceRequests MaintenanceRequest[]
  rentPayments    RentPayment[]
  weatherData     WeatherData[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([landlordId])
  @@index([zipCode])
}

model PropertyPhoto {
  id              String   @id @default(cuid())
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  // Storage (cloud-agnostic)
  storageProvider StorageProvider
  s3Bucket        String?
  s3Key           String?
  gcsBucket       String?
  gcsPath         String?
  azureContainer  String?
  azurePath       String?

  imageUrl        String   // CDN URL
  thumbnailUrl    String?

  photoType       PhotoType
  uploadedBy      String   // userId
  uploadedAt      DateTime @default(now())

  // AI Analysis
  aiAnalyzed      Boolean @default(false)
  aiDamageDetected Boolean @default(false)
  damageDescription String?
  estimatedRepairCost Decimal?
  damageCategory  String?
  aiConfidence    Float?   // 0-1 confidence score

  // Auto-deletion for tenant photos
  deleteAt        DateTime? // Set when tenant moves out

  @@index([propertyId, photoType])
}

// ============================================================================
// TENANTS & LEASES
// ============================================================================

model Tenant {
  id              String   @id @default(cuid())

  // User Account
  tenantProfileId String   @unique
  tenantProfile   TenantProfile @relation(fields: [tenantProfileId], references: [id], onDelete: Cascade)

  // Landlord Relationship
  landlordId      String
  landlord        LandlordProfile @relation(fields: [landlordId], references: [id])

  // Property Assignment
  propertyId      String   @unique
  property        Property @relation(fields: [propertyId], references: [id])

  // Lease Terms
  leaseStartDate  DateTime
  leaseEndDate    DateTime
  monthlyRent     Decimal
  securityDeposit Decimal
  leaseSigned     Boolean @default(false)
  leaseSignedDate DateTime?

  // Auto-Pay
  autoPayEnabled  Boolean @default(false)
  autoPayMethod   String? // STRIPE, ACH

  // Relations
  rentPayments    RentPayment[]
  maintenanceRequests MaintenanceRequest[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([landlordId])
  @@index([propertyId])
}

// ============================================================================
// RENT PAYMENTS
// ============================================================================

model RentPayment {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id])

  // Payment Details
  amount          Decimal
  dueDate         DateTime
  paidDate        DateTime?
  status          PaymentStatus @default(PENDING)

  // Payment Method
  paymentMethod   PaymentMethod?

  // Stripe
  stripePaymentIntentId String?
  stripeChargeId        String?

  // ACH
  plaidAccountId        String?

  // Venmo/Zelle
  externalTransactionId String?

  // Late Fees
  lateFee         Decimal?
  lateFeeApplied  DateTime?

  // QuickBooks Sync
  quickbooksSynced Boolean @default(false)
  quickbooksInvoiceId String?
  quickbooksPaymentId String?
  quickbooksSyncedAt  DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([tenantId, dueDate])
  @@index([status])
}

// ============================================================================
// MAINTENANCE REQUESTS
// ============================================================================

model MaintenanceRequest {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id])

  title           String
  description     String
  priority        Priority @default(MEDIUM)
  status          RequestStatus @default(OPEN)
  category        String?  // PLUMBING, ELECTRICAL, HVAC, etc.

  // Photos
  photos          MaintenancePhoto[]

  // AI Analysis
  aiAnalyzed      Boolean @default(false)
  aiEstimatedCost Decimal?
  aiDescription   String?
  aiUrgency       Priority?
  aiContractorSuggestion String?

  // Contractor Assignment
  assignedTo      String?
  scheduledDate   DateTime?

  createdAt       DateTime @default(now())
  resolvedAt      DateTime?
  updatedAt       DateTime @updatedAt

  @@index([tenantId])
  @@index([propertyId, status])
}

model MaintenancePhoto {
  id              String   @id @default(cuid())
  requestId       String
  request         MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)

  // Storage (cloud-agnostic)
  storageProvider StorageProvider
  s3Key           String?
  gcsPath         String?
  azurePath       String?

  imageUrl        String
  thumbnailUrl    String?

  uploadedAt      DateTime @default(now())

  // Auto-deletion when request resolved + 90 days
  deleteAt        DateTime?

  @@index([requestId])
}

// ============================================================================
// WEATHER DATA (Cached)
// ============================================================================

model WeatherData {
  id              String   @id @default(cuid())
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  // Location
  zipCode         String
  city            String
  state           String

  // Current Weather
  temperature     Float
  feelsLike       Float
  humidity        Int
  condition       String   // SUNNY, CLOUDY, RAINY, etc.
  windSpeed       Float

  // Forecast
  forecastData    Json?    // 7-day forecast

  // Cache
  fetchedAt       DateTime @default(now())
  expiresAt       DateTime // Refresh every 30 minutes

  @@index([propertyId])
  @@index([expiresAt])
}

// ============================================================================
// ENUMS
// ============================================================================

enum UserRole {
  ADMIN
  LANDLORD
  TENANT
}

enum SubscriptionTier {
  FREE
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  PAST_DUE
  CANCELLED
  TRIALING
}

enum PropertyStatus {
  VACANT
  RENTED
  MAINTENANCE
  PENDING_LEASE
}

enum PhotoType {
  MOVE_IN
  MOVE_OUT
  MAINTENANCE
  GENERAL
}

enum StorageProvider {
  AWS_S3
  GCP_STORAGE
  AZURE_BLOB
}

enum PaymentMethod {
  STRIPE_CARD
  STRIPE_ACH
  PLAID_ACH
  VENMO
  ZELLE
  CASH
  CHECK
}

enum PaymentStatus {
  PENDING
  PROCESSING
  PAID
  LATE
  FAILED
  REFUNDED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  EMERGENCY
}

enum RequestStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

## 🌩️ Cloud-Agnostic Architecture

### Storage Adapter Pattern

```typescript
// lib/storage/adapter.ts

interface StorageAdapter {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}

class S3Adapter implements StorageAdapter {
  // AWS S3 implementation
}

class GCSAdapter implements StorageAdapter {
  // Google Cloud Storage implementation
}

class AzureBlobAdapter implements StorageAdapter {
  // Azure Blob Storage implementation
}

// Factory pattern
export function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || 'AWS_S3';

  switch (provider) {
    case 'AWS_S3':
      return new S3Adapter();
    case 'GCP_STORAGE':
      return new GCSAdapter();
    case 'AZURE_BLOB':
      return new AzureBlobAdapter();
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
```

### Email Adapter Pattern

```typescript
// lib/email/adapter.ts

interface EmailAdapter {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  sendTemplateEmail(to: string, templateId: string, data: any): Promise<void>;
}

class SESAdapter implements EmailAdapter {
  // AWS SES implementation
}

class SendGridAdapter implements EmailAdapter {
  // SendGrid implementation
}

class AzureEmailAdapter implements EmailAdapter {
  // Azure Communication Services implementation
}
```

## 🎨 Dashboard with Weather

```typescript
// app/dashboard/page.tsx

import WeatherWidget from '@/components/WeatherWidget';
import MaintenanceRequests from '@/components/MaintenanceRequests';
import RentPaymentStatus from '@/components/RentPaymentStatus';

export default async function DashboardPage() {
  const user = await getServerSession();

  if (user.role === 'LANDLORD') {
    return <LandlordDashboard />;
  } else if (user.role === 'TENANT') {
    return <TenantDashboard />;
  }
}

// Landlord sees: all properties, all requests, all payments
// Tenant sees: their property, their requests, their payments
```

## 💳 Multi-Payment Provider Setup

```typescript
// lib/payments/adapter.ts

interface PaymentAdapter {
  createPaymentIntent(amount: number, customerId: string): Promise<any>;
  processPayment(paymentId: string): Promise<any>;
  refund(paymentId: string, amount: number): Promise<any>;
}

class StripeAdapter implements PaymentAdapter {
  // Stripe implementation
}

class PlaidACHAdapter implements PaymentAdapter {
  // Plaid ACH implementation
}

// Support multiple payment methods simultaneously
```

## 📊 QuickBooks Integration

```typescript
// lib/accounting/quickbooks.ts

export class QuickBooksService {
  async syncRentPayment(payment: RentPayment) {
    // Create invoice in QuickBooks
    // Record payment in QuickBooks
    // Update sync status in database
  }

  async syncExpense(maintenanceRequest: MaintenanceRequest) {
    // Create expense/bill in QuickBooks
  }

  async get2WaySync() {
    // Pull QB data and update local database
    // Push local changes to QB
  }
}
```

## 🚀 Next Steps

1. Install all packages
2. Set up PostgreSQL locally
3. Create Prisma schema
4. Run migrations
5. Implement NextAuth
6. Create login/signup pages
7. Build landlord dashboard with weather
8. Set up AWS S3 SDK
9. Set up AWS SES SDK
10. Create cloud-agnostic adapters

Ready to start? I'll begin with package installation and Prisma setup.
