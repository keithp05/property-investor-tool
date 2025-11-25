# 🏢 RentalIQ - Multi-Tenant SaaS Business Plan

## Executive Summary

**RentalIQ** is a property management SaaS platform connecting landlords and tenants with secure, data-isolated accounts. The platform enables landlords to manage properties and screen tenants, while offering premium tenant accounts with verified credentials and application fee waivers.

---

## 🎯 Platform Vision

### Current Status ✅
- **Multi-tenant architecture** - Each landlord has isolated data
- **Property management** - Add properties, track financials
- **Tenant screening** - Generate application links, receive applications
- **AI-powered analysis** - 5-expert property analysis, cash flow calculator
- **Notifications** - Email (AWS SES) + SMS (AWS SNS)

### Planned Premium Features 🚀

#### For Landlords:
- **Free Tier:** Up to 5 properties
- **Pro Tier ($29/month):** Unlimited properties, advanced analytics, priority support

#### For Tenants:
- **Free Tier:** Pay per application ($50 each)
- **Premium Tier ($9.99/month):**
  - ✅ Application fees waived
  - ✅ Pre-verified background check
  - ✅ Pre-verified credit report
  - ✅ Portable tenant profile
  - ✅ References from previous landlords on platform
  - ✅ Priority application badge
  - ✅ Application history tracking

---

## 🔒 Data Isolation & Security

### Current Implementation ✅

**Multi-Tenant Architecture:**
```
User (NextAuth)
  ├── LandlordProfile
  │   ├── Properties (filtered by landlordId)
  │   └── Applications (filtered by landlordId)
  └── TenantProfile (Future)
      ├── Background Check
      ├── Credit Report
      └── References
```

**Security Measures:**
- ✅ Session-based authentication (NextAuth + JWT)
- ✅ User ID filtering on all database queries
- ✅ Row-level security via API middleware
- ✅ Separate landlord profiles
- ✅ Property ownership validation on all operations

**Example - Data Isolation in Action:**
```typescript
// API routes validate ownership
const property = await prisma.property.findFirst({
  where: {
    id: propertyId,
    landlordId: session.user.landlordId // ← Ensures isolation
  }
});

// Landlord A cannot see Landlord B's data
```

### Planned Enhancements 🔄

- [ ] **Role-Based Access Control (RBAC)** - LANDLORD, TENANT, ADMIN roles
- [ ] **Tenant user accounts** - Login and profile management
- [ ] **Audit logging** - Track all data access
- [ ] **MFA (Multi-Factor Auth)** - Optional for landlords, required for admins
- [ ] **Data encryption** - At rest (AWS RDS encryption) and in transit (HTTPS)

---

## 💰 Revenue Model

### Landlord Subscriptions

| Tier | Price | Properties | Features |
|------|-------|------------|----------|
| **Free** | $0 | Up to 5 | Basic property management, tenant screening |
| **Pro** | $29/month | Unlimited | + Advanced analytics, API access, priority support |
| **Enterprise** | Custom | Unlimited | + White-label, dedicated support, custom integrations |

### Tenant Subscriptions

| Tier | Price | Applications | Features |
|------|-------|--------------|----------|
| **Free** | $0 | Pay per app ($50) | Basic applications |
| **Premium** | $9.99/month | Unlimited | + Waived fees, verified checks, portable profile |

### Revenue Projections (100 Active Landlords)

**Monthly Revenue:**
- 50 landlords × $29/month (Pro tier) = **$1,450**
- 200 applications × $10 platform fee (20%) = **$2,000**
- 20 premium tenants × $9.99/month = **$200**

**Total Monthly Revenue:** **$3,650**

**Annual Revenue:** **$43,800**

**Costs:** ~$110/month (AWS infrastructure)

**Net Profit:** **$3,540/month** or **$42,480/year** (96% margin before marketing)

---

## 🗄️ Database Schema Enhancements

### Add User Roles

```prisma
enum UserRole {
  LANDLORD
  TENANT
  ADMIN
}

model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String
  name     String?
  role     UserRole @default(LANDLORD)
  
  landlordProfile LandlordProfile?
  tenantProfile   TenantProfile?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Premium Tenant Profile

```prisma
model TenantProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])

  // Premium subscription
  isPremium             Boolean   @default(false)
  stripeSubscriptionId  String?   @unique
  subscriptionStatus    String?   // active, canceled, past_due
  subscriptionEndsAt    DateTime?

  // Personal info
  phone                 String?
  currentAddress        String?
  dateOfBirth           DateTime?
  ssn                   String?   @db.Text // Encrypted

  // Employment
  employmentStatus      String?
  employer              String?
  jobTitle              String?
  annualIncome          Decimal?

  // Verified documents
  backgroundCheckId     String?
  backgroundCheckStatus String?   // pending, approved, rejected
  backgroundCheckDate   DateTime?
  backgroundCheckScore  Int?

  creditReportId        String?
  creditScore           Int?
  creditCheckDate       DateTime?

  // Relationships
  references            Reference[]
  applications          TenantApplication[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### Reference System

```prisma
model Reference {
  id              String   @id @default(cuid())
  tenantProfileId String
  tenantProfile   TenantProfile @relation(fields: [tenantProfileId], references: [id])

  // Reference from
  landlordId      String?
  landlord        LandlordProfile? @relation(fields: [landlordId], references: [id])

  // Rental details
  propertyAddress String
  moveInDate      DateTime
  moveOutDate     DateTime?
  rentAmount      Decimal
  paidOnTime      Boolean  @default(true)
  
  // Rating & review
  rating          Int      // 1-5 stars
  review          String?  @db.Text
  wouldRentAgain  Boolean

  // Verification
  verified        Boolean  @default(false)
  verifiedAt      DateTime?
  verifiedBy      String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Subscription Management

```prisma
model Subscription {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id])

  // Stripe integration
  stripeSubscriptionId String   @unique
  stripeCustomerId     String
  stripePriceId        String
  
  // Status
  status               String   // active, canceled, past_due, trialing, incomplete
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean  @default(false)
  canceledAt           DateTime?

  // Plan details
  plan                 String   // landlord_pro, tenant_premium, landlord_enterprise
  amount               Decimal
  currency             String   @default("usd")
  interval             String   // month, year

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([userId])
  @@index([stripeSubscriptionId])
}
```

---

## 🛠️ Implementation Roadmap

### Phase 1: Multi-Tenant Foundation ✅ (Current)
**Status:** COMPLETE
- [x] NextAuth authentication
- [x] Landlord profile isolation
- [x] Property management
- [x] Tenant application system
- [x] Email + SMS notifications (AWS SES/SNS)
- [x] AI property analysis (5 experts + STR)
- [x] Cash flow calculator

### Phase 2: Enhanced Security & RBAC (Week 1-2)
**Focus:** Role-based access control
- [ ] Add UserRole enum (LANDLORD, TENANT, ADMIN)
- [ ] Create authorization middleware
- [ ] Add role checks to all API routes
- [ ] Implement audit logging
- [ ] Add MFA for admins

### Phase 3: Tenant Accounts (Week 3-4)
**Focus:** Tenant user system
- [ ] Tenant registration/login flow
- [ ] TenantProfile schema migration
- [ ] Tenant dashboard (view applications)
- [ ] Application history tracking
- [ ] Profile editing

### Phase 4: Premium Subscriptions (Week 5-6)
**Focus:** Monetization
- [ ] Stripe subscription integration
- [ ] Subscription management UI
- [ ] Landlord Pro tier features
- [ ] Tenant Premium tier features
- [ ] Stripe webhook handlers
- [ ] Billing portal

### Phase 5: Verification Services (Week 7-8)
**Focus:** Background & credit checks
- [ ] Integrate Checkr API (background checks)
- [ ] Integrate TransUnion API (credit reports)
- [ ] Document upload & storage (AWS S3)
- [ ] Verification status tracking
- [ ] Application fee waiver logic for premium tenants

### Phase 6: Reference System (Week 9-10)
**Focus:** Landlord-to-landlord references
- [ ] Reference request flow
- [ ] Landlord reference submission form
- [ ] Reference verification
- [ ] Portable tenant profile
- [ ] Reference display on applications

### Phase 7: Production Launch (Week 11-12)
**Focus:** Going live
- [ ] Purchase domain (rentaliq.com)
- [ ] Production AWS environment
- [ ] SSL certificate setup
- [ ] CloudFront CDN
- [ ] Monitoring & alerting
- [ ] Backup & disaster recovery
- [ ] Load testing
- [ ] Security audit

---

## 🔌 Third-Party Integrations

### Currently Integrated ✅
- **AWS SES** - Email delivery (production access pending)
- **AWS SNS** - SMS notifications
- **Stripe** - Payment processing (test mode)
- **Zillow API** - Property data
- **HUD API** - Section 8 FMR data

### Planned Integrations 🔄
- **Checkr or Certn** - Background checks ($25-35/check)
- **TransUnion or Experian** - Credit reports ($15-25/report)
- **Plaid** - Bank verification (already configured)
- **Sentry** - Error tracking
- **PostHog** - Product analytics

---

## 💵 Cost Structure

### Monthly Costs (Production)

**AWS Infrastructure:**
- Amplify Hosting: $15-30
- RDS PostgreSQL (db.t3.small): $30-50
- S3 Storage: $5-10
- SES Email: $0.10/1,000 emails
- SNS SMS: $0.00645/SMS
- CloudFront: $10-20

**Total AWS:** **~$60-110/month**

**Third-Party Services:**
- Stripe: 2.9% + $0.30 per transaction
- Domain: ~$12/year
- Background checks: $25-35/check (pass-through cost)
- Credit reports: $15-25/report (pass-through cost)

**Total Monthly Operating Cost:** **~$70-120**

---

## 📈 Growth Strategy

### Year 1 Goals
- **100 landlords** (50 paying Pro tier)
- **500 tenant applications** processed
- **20 premium tenant** subscriptions
- **$3,650/month** revenue ($43,800/year)

### Year 2 Goals
- **1,000 landlords** (500 paying)
- **10,000 applications** processed
- **200 premium tenants**
- **$30,000/month** revenue ($360,000/year)

### Marketing Channels
1. **SEO** - Property management keywords
2. **Facebook/Instagram Ads** - Target landlords
3. **Real Estate Investment Meetups** - Direct outreach
4. **BiggerPockets** - Community engagement
5. **Referral Program** - $50 credit for referrals

---

## ⚖️ Legal & Compliance

### Required Compliance
- **FCRA (Fair Credit Reporting Act)** - Credit/background checks
- **GDPR** - User data privacy (if serving EU)
- **CCPA** - California privacy law
- **Fair Housing Act** - No discrimination
- **State-specific landlord-tenant laws**

### Data Privacy
- User data deletion requests
- Data export (GDPR right to portability)
- 7-year application record retention
- Encryption at rest and in transit

### Terms of Service Needed
- Landlord terms
- Tenant terms
- Privacy policy
- Cookie policy
- Acceptable use policy

---

## 🎯 Success Metrics (KPIs)

### Landlord Metrics
- Number of registered landlords
- Pro tier conversion rate
- Properties per landlord (avg)
- Churn rate
- NPS (Net Promoter Score)

### Tenant Metrics
- Number of applications submitted
- Premium conversion rate
- Application completion rate
- Time to complete application

### Platform Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- LTV:CAC ratio (target: 3:1)
- Gross margin (target: >90%)

---

## 🚀 Next Immediate Steps

### This Week:
1. ✅ **Email system working** - AWS SES configured
2. ✅ **Property analysis complete** - 5 experts + STR + cash flow
3. [ ] **Add user roles** - UserRole enum in schema
4. [ ] **Authorization middleware** - Role checking

### Next Week:
1. [ ] **Tenant registration** - Sign up flow
2. [ ] **Tenant dashboard** - View applications
3. [ ] **Profile editing** - Tenant info management

### Week 3-4:
1. [ ] **Stripe subscriptions** - Payment integration
2. [ ] **Premium features** - Tier differentiation
3. [ ] **Billing portal** - Manage subscriptions

---

## ❓ Business Questions to Decide

1. **Tenant Premium Price:** $9.99/month or $14.99/month?
2. **Application Fee Split:** 80/20 or 90/10 (landlord/platform)?
3. **Free Tier Limits:** 3 properties or 5 properties for landlords?
4. **Background Check Provider:** Checkr ($30) vs Certn ($25)?
5. **Launch Market:** Texas only or nationwide?
6. **Referral Bonus:** $50 credit or $25 cash?
7. **Enterprise Pricing:** Starts at $199/month or $299/month?

---

## 📝 Summary

**RentalIQ** is positioned to become the go-to platform for landlords and tenants with:
- ✅ **Secure multi-tenant architecture** - Already implemented
- ✅ **AI-powered property analysis** - Unique differentiator
- 🚀 **Premium tenant accounts** - New revenue stream
- 🚀 **Reference system** - Network effects
- 📈 **High margins** - 96% gross margin potential

**Target Launch:** Q2 2025 (10-12 weeks)

**Immediate Focus:** Complete RBAC, tenant accounts, and Stripe subscriptions.

---

*Last Updated: November 25, 2025*
*Document Owner: Keith Perez*
