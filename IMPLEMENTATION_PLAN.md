# Real Estate Investor Platform - Complete Implementation Plan

## ✅ What We've Built So Far

### Core Features (Completed)
1. ✅ Property search from Zillow (multi-page, real data)
2. ✅ 3-Expert AI Analysis System (Aggressive, Conservative, Government Housing)
3. ✅ Government Housing Analysis (Section 8, HUD-VASH rent estimates)
4. ✅ Courthouse auction scraper (framework in place)
5. ✅ Lease generator page
6. ✅ My Properties page (landlord portfolio)
7. ✅ Navigation system

## 🎯 CRITICAL MISSING FOUNDATION

### 1. Authentication & Authorization System
**Status**: ❌ NOT IMPLEMENTED

**What We Need**:
- [ ] NextAuth.js setup with email/password login
- [ ] User registration flow
- [ ] Password reset functionality
- [ ] Protected routes (middleware)
- [ ] Session management

**User Roles**:
- [ ] **Admin** - Full system access
- [ ] **Landlord** - Property owner, can add properties and tenants
- [ ] **Tenant** - Can pay rent, submit maintenance requests

### 2. Licensing & Subscription Tiers
**Status**: ❌ NOT IMPLEMENTED

**Subscription Plans**:

#### Free Tier
- 1 property
- 1 tenant
- Basic property search
- Email support

#### Pro Tier ($29/month)
- Up to 10 properties
- Unlimited tenants
- AI analysis (3 experts)
- Government housing analysis
- Photo damage detection
- Priority support

#### Enterprise Tier ($99/month)
- Unlimited properties
- Unlimited tenants
- All AI features
- API access
- White-label option
- Dedicated support

**Implementation Needs**:
- [ ] Stripe integration for payments
- [ ] Subscription management
- [ ] Feature gating based on plan
- [ ] Usage tracking

### 3. Database Schema (Prisma + PostgreSQL)
**Status**: ❌ NOT IMPLEMENTED (Currently using SQLite demo)

**Required Models**:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // hashed
  name          String?
  role          UserRole
  subscriptionTier SubscriptionTier @default(FREE)
  createdAt     DateTime  @default(now())

  // Relations
  landlordProfile LandlordProfile?
  tenantProfile   TenantProfile?
}

model LandlordProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  phone           String?
  company         String?

  // Relations
  properties      Property[]
  tenants         Tenant[]
}

model Property {
  id              String   @id @default(cuid())
  landlordId      String
  landlord        LandlordProfile @relation(fields: [landlordId], references: [id])

  // Property Details (auto-fetched from Zillow)
  address         String
  city            String
  state           String
  zipCode         String
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
  monthlyRent     Decimal?

  // Status
  status          PropertyStatus @default(VACANT)

  // Relations
  currentTenant   Tenant?
  photos          PropertyPhoto[]
  maintenanceRequests MaintenanceRequest[]
  rentPayments    RentPayment[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model PropertyPhoto {
  id              String   @id @default(cuid())
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id])

  imageUrl        String
  photoType       PhotoType // MOVE_IN, MOVE_OUT, MAINTENANCE
  uploadedBy      String   // userId
  uploadedAt      DateTime @default(now())

  // AI Analysis
  aiDamageDetected Boolean @default(false)
  damageDescription String?
  estimatedRepairCost Decimal?
  damageCategory  String?  // WALLS, FLOORING, APPLIANCES, etc.
}

model Tenant {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  landlordId      String
  landlord        LandlordProfile @relation(fields: [landlordId], references: [id])
  propertyId      String   @unique
  property        Property @relation(fields: [propertyId], references: [id])

  // Lease Info
  leaseStartDate  DateTime
  leaseEndDate    DateTime
  monthlyRent     Decimal
  securityDeposit Decimal

  // Contact
  phone           String?
  emergencyContact String?

  // Relations
  rentPayments    RentPayment[]
  maintenanceRequests MaintenanceRequest[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model RentPayment {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  propertyId      String
  property        Property @relation(fields: [propertyId], references: [id])

  amount          Decimal
  dueDate         DateTime
  paidDate        DateTime?
  status          PaymentStatus @default(PENDING)
  paymentMethod   String?  // STRIPE, CHECK, CASH
  stripePaymentId String?

  lateFee         Decimal?

  createdAt       DateTime @default(now())
}

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

  // Photos
  photos          MaintenancePhoto[]

  // AI Estimation
  aiEstimatedCost Decimal?
  aiDescription   String?

  createdAt       DateTime @default(now())
  resolvedAt      DateTime?
}

model MaintenancePhoto {
  id              String   @id @default(cuid())
  requestId       String
  request         MaintenanceRequest @relation(fields: [requestId], references: [id])

  imageUrl        String
  uploadedAt      DateTime @default(now())
}

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

enum PropertyStatus {
  VACANT
  RENTED
  MAINTENANCE
}

enum PhotoType {
  MOVE_IN
  MOVE_OUT
  MAINTENANCE
  GENERAL
}

enum PaymentStatus {
  PENDING
  PAID
  LATE
  FAILED
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

## 🔄 CORRECT WORKFLOW

### Landlord Workflow:
1. **Sign Up** → Create landlord account
2. **Subscribe** → Choose Free/Pro/Enterprise tier
3. **Add Properties** → Search address, auto-populate from Zillow
4. **Upload Move-In Photos** → Before tenant moves in
5. **Create Tenant Account** → Landlord invites tenant via email
6. **Tenant Signs Lease** → Digital signature
7. **Monitor Rent Payments** → Track paid/unpaid
8. **Handle Maintenance** → Review requests, approve/deny
9. **Upload Move-Out Photos** → AI compares to move-in photos
10. **AI Damage Report** → Automatic damage detection + repair cost estimate

### Tenant Workflow:
1. **Receive Invite** → Email from landlord
2. **Create Account** → Set password, accept lease
3. **View Property** → See their rental unit details
4. **Pay Rent** → Stripe integration, auto-pay option
5. **Submit Maintenance Request** → Upload photos, describe issue
6. **Track Request Status** → Open, In Progress, Completed
7. **Receive Notifications** → Rent reminders, maintenance updates

## 🎨 AI Features (Enhanced)

### 1. AI Damage Detection & Repair Cost Estimation
**When**: Move-out photos uploaded

**Process**:
1. Compare move-in vs move-out photos
2. Detect changes/damage using GPT-4 Vision
3. Categorize damage (walls, floors, appliances, etc.)
4. Estimate repair cost using:
   - Local contractor rates (scraped from HomeAdvisor, Angie's List)
   - Material costs from Home Depot API
   - Labor rates by ZIP code
5. Generate detailed report for landlord

**Example Output**:
```
Damage Report - 123 Main St
Move-Out Date: Dec 1, 2024

Detected Issues:
1. Living Room Wall - Holes from picture hanging
   - Category: Drywall Repair
   - Estimated Cost: $150-$200
   - Labor: 2 hours @ $65/hr
   - Materials: Spackle, paint, primer

2. Kitchen Floor - Scratches in laminate
   - Category: Flooring
   - Estimated Cost: $300-$450
   - Repair vs Replace: Recommend spot repair

Total Estimated Repair: $450-$650
Recommended Deduction from Deposit: $500
```

### 2. Maintenance Request AI Analysis
**When**: Tenant submits maintenance request with photos

**Process**:
1. Analyze uploaded photos
2. Identify the issue (leak, broken appliance, etc.)
3. Determine urgency (Emergency, High, Medium, Low)
4. Estimate repair cost
5. Suggest qualified contractors in area

## 📋 PRIORITY ORDER FOR IMPLEMENTATION

### Phase 1: Foundation (CRITICAL)
1. ✅ Set up PostgreSQL database
2. ✅ Create Prisma schema
3. ✅ Implement NextAuth authentication
4. ✅ Add user registration/login
5. ✅ Implement role-based access control

### Phase 2: Core Landlord Features
6. ✅ Landlord property management (CRUD)
7. ✅ Property photo upload (before/after)
8. ✅ Landlord creates tenant accounts
9. ✅ Lease management

### Phase 3: Tenant Features
10. ✅ Tenant portal (view lease, property info)
11. ✅ Rent payment (Stripe integration)
12. ✅ Maintenance request submission
13. ✅ Photo upload for maintenance

### Phase 4: AI Features
14. ✅ AI damage detection (GPT-4 Vision)
15. ✅ Repair cost estimation
16. ✅ Maintenance request AI analysis
17. ✅ Local contractor rate integration

### Phase 5: Monetization
18. ✅ Stripe subscription integration
19. ✅ Feature gating by tier
20. ✅ Admin dashboard for subscription management

## 🚀 NEXT IMMEDIATE STEPS

1. Install required packages for authentication
2. Set up PostgreSQL database
3. Create Prisma schema
4. Implement NextAuth
5. Add login/signup pages
6. Protect existing routes
7. Refactor My Properties to use database
8. Add photo upload to properties
9. Create tenant account creation flow
10. Build tenant portal with rent payment

## 📝 Questions to Clarify

1. **Payment Processing**: Stripe only or also support ACH, Venmo, etc?
2. **Photo Storage**: Cloudinary, AWS S3, or Vercel Blob?
3. **Notifications**: Email only or also SMS (Twilio)?
4. **Lease Signatures**: DocuSign integration or simple checkbox acceptance?
5. **Background Checks**: Integrate with TransUnion/Experian for tenant screening?

Let me know which phase you want to start with and I'll begin implementation!
