# Real Estate Investment Platform - Master Plan

**Created:** November 6, 2025
**Owner:** Keith Perez
**Deployment:** AWS (Production)

---

## 1. WHAT WE'RE BUILDING

A **real estate investment analysis platform** for landlords to:
- Search for properties using Google Maps autocomplete
- Automatically pull REAL property data (Zillow, public records, tax info)
- Get AI-powered investment analysis from 3 expert perspectives
- Track Section 8 Fair Market Rent from HUD
- Manage properties and tenants
- Track maintenance, rent payments, and equity

---

## 2. YOUR REAL PROPERTIES

### Property #1: 260 Nesting Tree, San Antonio, TX 78253
- **Bedrooms:** 6
- **Bathrooms:** 3.5
- **Square Feet:** 3,500
- **Year Built:** 2018
- **Property Type:** Single Family
- **Purchase Price:** $350,000
- **Current Value:** $392,500
- **Monthly Mortgage:** $2,100
- **Mortgage Balance:** $320,000
- **Monthly Rent:** $2,900
- **Market Rent:** $3,200
- **Section 8 FMR:** $2,985
- **Status:** Vacant (or specify if rented)

### Property #2: 8302 Chivalry, San Antonio, TX 78254
- **Bedrooms:** 4
- **Bathrooms:** 2.5
- **Square Feet:** 2,500
- **Year Built:** 2015
- **Property Type:** Single Family
- **Purchase Price:** $250,000
- **Current Value:** $285,000
- **Monthly Mortgage:** $1,650
- **Mortgage Balance:** $230,000
- **Monthly Rent:** $2,200
- **Market Rent:** $2,400
- **Section 8 FMR:** $2,257
- **Status:** Vacant (or specify if rented)

---

## 3. CORE FEATURES

### A. Property Search & Analysis
**What it does:**
1. User types address in Google Maps autocomplete search
2. System automatically fetches:
   - Zillow data (bedrooms, bathrooms, sqft, estimated value, rent estimate)
   - Public records (purchase price, tax info)
   - County tax auction status (REAL auction data, not foreclosures)
   - Section 8 Fair Market Rent from HUD API by ZIP code
3. AI generates 3-Expert Analysis:
   - **Marcus "The Wolf" Rodriguez** - Aggressive investor (35% ROI target)
   - **Elizabeth Chen, CPA** - Conservative accountant (12% ROI target)
   - **David Thompson, HUD Specialist** - Government housing expert (18% ROI, Section 8 focused)

**Current Status:**
- ✅ Google Maps autocomplete working
- ⚠️ Zillow scraper gets WRONG property (scraping search results instead of property page)
- ❌ Public records scraping not implemented
- ❌ County tax auction integration not implemented
- ✅ Section 8 HUD API service created (with fallback data)
- ✅ 3-Expert AI analysis system working

### B. Property Dashboard
**What it shows:**
- List of YOUR properties (260 Nesting Tree, 8302 Chivalry)
- Property value, rent, mortgage info
- Section 8 FMR and housing authority contact
- Tenant info (if rented)
- Alerts (maintenance, late rent, vacant)
- Equity tracking

**Current Status:**
- ✅ Dashboard UI built
- ✅ Section 8 info displayed
- ⚠️ Requires login (admin@example.com / admin123)
- ❌ NO demo data should appear

### C. Tenant Management
**What it does:**
- Add tenants to YOUR properties
- Track lease dates, rent amount, security deposit
- Set up auto-pay (Stripe, ACH)
- Track rent payment status

**Current Status:**
- ✅ Tenant model exists in database
- ⚠️ Add tenant form shows DEMO properties (needs to show ONLY your 2 properties)
- ❌ Rent payment tracking not fully implemented

### D. Maintenance Requests
**What it does:**
- Tenants submit maintenance requests with photos
- AI analyzes photos for damage detection
- Estimates repair costs
- Tracks contractor assignment

**Current Status:**
- ✅ Database schema exists
- ❌ Not fully implemented

---

## 4. DATA SOURCES

### Real Data (What We MUST Use)
1. **Google Maps API** - Address autocomplete and geocoding
2. **Zillow/Realtor.com** - Property details (via Bright Data scraper)
3. **HUD API** - Section 8 Fair Market Rent by ZIP code
4. **County Tax Records** - Purchase price, tax info, auction status
5. **Public Records** - Property ownership, liens

### Current Issues
- **Zillow Scraper:** Getting wrong property (2BR instead of 6BR for 260 Nesting Tree)
  - Root Cause: Scraping search results page instead of property detail page
  - Fix Needed: Get actual property ZPID and scrape detail page

---

## 5. USER AUTHENTICATION

### What You Want
- No demo accounts or login during development
- Admin credentials for continued support only
- Direct access to YOUR properties and YOUR tenants

### Current Implementation
- NextAuth.js with email/password
- Landlord/Tenant roles
- Admin user: admin@example.com / admin123

### What Needs to Change
- [ ] Remove authentication requirement for development
- [ ] OR: Auto-login as landlord on page load
- [ ] Clean database of ALL demo users/tenants

---

## 6. DATABASE SCHEMA

### Core Tables
1. **User** - Authentication (landlords, tenants, admin)
2. **LandlordProfile** - Landlord business info
3. **TenantProfile** - Tenant contact info
4. **Property** - Your properties (260 Nesting Tree, 8302 Chivalry)
5. **Tenant** (Tenancy) - Links tenant to property + lease terms
6. **RentPayment** - Track rent payments
7. **MaintenanceRequest** - Maintenance tickets
8. **PropertyPhoto** - Property images (move-in, move-out, maintenance)

### Current State
- ✅ Schema is complete
- ✅ Migrations applied
- ⚠️ Database has been wiped/restored multiple times
- ❌ Contains demo data that keeps appearing

---

## 7. AI ANALYSIS SYSTEM

### The 3 Experts
Each expert analyzes the property with different investment strategies:

#### 1. Marcus "The Wolf" Rodriguez (Aggressive)
- Target ROI: 35%
- Focus: Aggressive appreciation, renovation upside, market timing
- Risk tolerance: High
- Rent strategy: Premium market rate

#### 2. Elizabeth Chen, CPA (Conservative)
- Target ROI: 12%
- Focus: Stable cash flow, tax benefits, long-term hold
- Risk tolerance: Low
- Rent strategy: Conservative market rate

#### 3. David Thompson (Government Housing)
- Target ROI: 18%
- Focus: Section 8 vouchers, HUD programs, stable government payments
- Risk tolerance: Medium
- Rent strategy: Section 8 FMR rate

### Analysis Output
- Investment recommendation (BUY / PASS / NEGOTIATE)
- Estimated ROI
- Monthly cash flow projection
- Risk assessment
- Rent recommendation

**Current Status:**
- ✅ AI analysis working
- ✅ Uses OpenAI GPT-4
- ✅ Generates detailed reports
- ⚠️ Uses wrong property data when Zillow scraper fails

---

## 8. DEPLOYMENT PLAN

### Current: Local Development
- Running on localhost:3000
- PostgreSQL database (local)
- .env file with API keys

### Target: AWS Production

#### Infrastructure
- [ ] **Frontend:** AWS Amplify or Vercel
- [ ] **Database:** AWS RDS (PostgreSQL)
- [ ] **File Storage:** AWS S3 (property photos, maintenance photos)
- [ ] **Domain:** Custom domain with SSL
- [ ] **CDN:** CloudFront for images

#### Environment Variables Needed
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_MAPS_API_KEY=...
OPENAI_API_KEY=...
BRIGHT_DATA_API_KEY=...
HUD_API_KEY=... (if we get one)
STRIPE_SECRET_KEY=... (for payments)
```

#### Deployment Steps (To Be Defined)
1. Set up AWS RDS PostgreSQL database
2. Run migrations on production database
3. Upload your 2 REAL properties (no demo data)
4. Deploy Next.js app to AWS Amplify or Vercel
5. Configure environment variables
6. Set up S3 bucket for photos
7. Configure custom domain
8. Test all features

---

## 9. ISSUES TO FIX

### Critical (Blocking)
1. **Zillow Scraper Returns Wrong Property**
   - 260 Nesting Tree shows 2BR instead of 6BR
   - Gets data from search results instead of property page
   - Fix: Need to get property ZPID and scrape detail page

2. **Demo Data Keeps Appearing**
   - John Smith, Sarah Johnson keep showing up
   - Need to completely remove all demo data and seed scripts
   - Only show YOUR 2 properties

3. **Authentication Blocks Development**
   - Can't access dashboard without login
   - Need to bypass auth or auto-login during development

### Medium (Important)
4. **Tenant Selection Shows Wrong Properties**
   - When adding tenant, dropdown shows demo properties
   - Should ONLY show: 260 Nesting Tree, 8302 Chivalry

5. **Section 8 Data Needs Real HUD API**
   - Currently using fallback data
   - Need to get HUD API key or verify fallback is accurate

6. **Property Refresh Overwrites Correct Data**
   - Clicking refresh button overwrites bedroom count
   - Database-first fix was applied but needs testing

### Low (Nice to Have)
7. **County Tax Auction Integration**
   - Find REAL county tax auction API/scraper
   - Not Zillow foreclosures

8. **Public Records Scraping**
   - Get purchase price, tax records, liens
   - Verify against county records

---

## 10. NEXT STEPS

**Please review this plan and provide:**

### A. Property Data Corrections
- Is the data for 260 Nesting Tree correct?
- Is the data for 8302 Chivalry correct?
- Any other properties to add?

### B. Tenant Information
- Do you have real tenants for these properties?
- If yes, provide:
  - Tenant name
  - Email
  - Phone
  - Which property
  - Lease start/end dates
  - Monthly rent amount
  - Security deposit

### C. Feature Priority
Which features are most important right now?
1. Property search and analysis
2. Property dashboard
3. Tenant management
4. Maintenance requests
5. Rent payment tracking

### D. Deployment Timeline
- When do you want to deploy to AWS?
- Do you have AWS account set up?
- Do you have a domain name?

### E. Data Source Preferences
- Which county do you want tax auction data from? (Bexar County, TX?)
- Do you want to keep using Zillow or switch to Realtor.com?
- Any other data sources to integrate?

---

## 11. WHAT TO REMOVE

**Demo Data & Code to Delete:**
- [ ] All seed scripts with demo users
- [ ] All demo property data
- [ ] All demo tenant data (John Smith, Sarah Johnson, etc.)
- [ ] All demo maintenance requests
- [ ] Any hardcoded test data

**Keep Only:**
- Your 2 real properties
- Real API integrations
- Real HUD Section 8 data
- Your real tenant data (when provided)

---

**STOP HERE. Review this plan and give me your corrections before we proceed.**
