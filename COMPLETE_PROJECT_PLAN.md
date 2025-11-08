# COMPLETE PROJECT PLAN - Real Estate Investment Platform
## **From Property Discovery to Portfolio Management**

**Owner:** Keith Perez
**Date:** November 6, 2025
**Deployment:** AWS Production
**Budget:** $100/month API costs approved

---

# EXECUTIVE SUMMARY

## What We're Building

A **complete real estate investment platform** for small landlords (1-20 properties) that handles:

1. **Property Discovery & Analysis** (CMA + 3-Expert AI Analysis)
2. **Property & Equity Tracking** (Portfolio dashboard, equity growth)
3. **Tenant Management** (Screening, leases, rent collection, portal)
4. **Maintenance Management** (Requests, invoices, expenses)
5. **Financial Intelligence** (P&L, tax reports, QuickBooks sync)

## Core Value Proposition

**Current Pain:** Small landlords use 5-8 disconnected tools costing $150-300/month
**Our Solution:** ONE platform with AI-powered analysis for $49-99/month

---

# PART 1: PROPERTY DISCOVERY & ANALYSIS

## 1.1 Property Search (Google Maps Integration)

**What It Does:**
Landlord searches for properties using Google Maps autocomplete

**User Flow:**
1. Landlord types address: "260 Nesting Tree, San Antonio, TX"
2. Google Maps autocomplete suggests matching addresses
3. Landlord selects property
4. System fetches property data automatically

**Data Sources:**
- **Google Maps API:** Geocoding, address validation
- **Zillow/Realtor.com:** Property details (via Bright Data scraper)
- **County Records:** Purchase history, tax assessments
- **HUD API:** Section 8 Fair Market Rent

**Tech Stack:**
- Google Maps Places Autocomplete API
- Google Geocoding API
- Bright Data Web Scraping API
- HUD Fair Market Rent API

---

## 1.2 Comparative Market Analysis (CMA)

**What It Does:**
Generates a professional CMA report showing property value and rental comparables

### Property Valuation (Comparable Sales)

**System pulls:**
```
COMPARABLE SALES ANALYSIS
260 Nesting Tree, San Antonio, TX 78253

SUBJECT PROPERTY:
- Address: 260 Nesting Tree
- Bedrooms: 6 | Bathrooms: 3.5 | Sqft: 3,500
- Year Built: 2018
- Lot Size: 0.25 acres
- Zillow Zestimate: $392,500

COMPARABLE SALES (Last 6 Months, 1-mile radius):

Comp #1: 245 Oak Meadow Dr (0.4 miles)
- Sale Date: Aug 2024
- Sale Price: $405,000
- Beds: 6 | Baths: 3 | Sqft: 3,650
- Price/Sqft: $111
- Days on Market: 18
- Adjustments: -$12,000 (subject has extra half bath)
- Adjusted Value: $393,000

Comp #2: 1823 Willow Ridge (0.7 miles)
- Sale Date: Sep 2024
- Sale Price: $385,000
- Beds: 5 | Baths: 3.5 | Sqft: 3,400
- Price/Sqft: $113
- Days on Market: 24
- Adjustments: +$8,000 (subject has extra bedroom)
- Adjusted Value: $393,000

Comp #3: 8821 Cedar Park (0.9 miles)
- Sale Date: Oct 2024
- Sale Price: $410,000
- Beds: 6 | Baths: 4 | Sqft: 3,600
- Price/Sqft: $114
- Days on Market: 12
- Adjustments: -$15,000 (subject has fewer bath)
- Adjusted Value: $395,000

VALUATION SUMMARY:
Average Adjusted Value: $393,667
Zillow Zestimate: $392,500
County Assessed Value: $385,000

ESTIMATED MARKET VALUE: $392,500
Confidence: HIGH (tight comp range, recent sales)
```

### Rental Comparables

**System pulls:**
```
RENTAL MARKET ANALYSIS
260 Nesting Tree, San Antonio, TX 78253

RENTAL COMPARABLES (Active & Recent, 1-mile radius):

Rental Comp #1: 245 Oak Meadow Dr (0.4 miles)
- Listed Rent: $3,400/month
- Beds: 6 | Baths: 3 | Sqft: 3,650
- Rent/Sqft: $0.93
- Days on Market: 8 (rented quickly)
- Adjustments: -$150 (subject has extra half bath)
- Adjusted Rent: $3,250

Rental Comp #2: 1823 Willow Ridge (0.7 miles)
- Listed Rent: $3,150/month
- Beds: 5 | Baths: 3.5 | Sqft: 3,400
- Rent/Sqft: $0.93
- Days on Market: 15
- Adjustments: +$200 (subject has extra bedroom)
- Adjusted Rent: $3,350

Rental Comp #3: 8821 Cedar Park (0.9 miles)
- Listed Rent: $3,500/month
- Beds: 6 | Baths: 4 | Sqft: 3,600
- Rent/Sqft: $0.97
- Days on Market: 5 (premium property)
- Adjustments: -$250 (subject has fewer bath)
- Adjusted Rent: $3,250

ADDITIONAL DATA SOURCES:
- Zillow Rent Zestimate: $3,180/month
- Section 8 FMR (6BR): $2,985/month
- Rentometer Average: $3,220/month

RENTAL VALUATION SUMMARY:
Average Comp Rent: $3,283/month
Zillow Rent Zestimate: $3,180/month
Section 8 FMR: $2,985/month

ESTIMATED MARKET RENT: $3,200/month
Rent-to-Value Ratio: 0.98% (excellent)
Gross Rent Multiplier: 10.2 (good)
```

### Market Trends & Neighborhood Analysis

```
MARKET TRENDS
Northwest San Antonio (ZIP 78253)

📈 APPRECIATION:
- 1-Year: +6.2% ($368k → $392k)
- 3-Year: +18.5% ($331k → $392k)
- 5-Year: +32.1% ($297k → $392k)

💰 RENT TRENDS:
- 1-Year: +8.1% ($2,960 → $3,200)
- 3-Year: +15.4% ($2,775 → $3,200)
- Forecast (12 months): +4.5% ($3,200 → $3,345)

🏘️ INVENTORY:
- Active Listings (6BR homes): 8 properties
- Avg Days on Market: 22 days
- Months of Supply: 2.1 (seller's market)

📊 DEMAND INDICATORS:
- Population Growth: +2.8%/year
- Job Growth: +3.1%/year (healthcare, tech)
- New Construction: 145 units (apartments, competition risk)
- School Rating: 7/10 (good for families)
- Crime Rate: 15% below national avg (safe area)
```

**Data Sources for CMA:**
- **Zillow API/Scraping:** Zestimate, rent estimate, comparable sales
- **Realtor.com:** Active listings, sold properties
- **Redfin API:** Rental comps (they have good rental data)
- **Census Bureau API:** Population growth, demographics
- **GreatSchools API:** School ratings
- **FBI Crime Database:** Neighborhood safety
- **Walk Score API:** Walkability, transit scores

---

## 1.3 The 3-Expert AI Analysis System

**What It Does:**
AI analyzes the property from 3 different investment strategies and gives BUY/PASS/NEGOTIATE recommendation

### Expert #1: Marcus "The Wolf" Rodriguez (Aggressive Growth Investor)

**Investment Strategy:**
- Target ROI: 30-40%
- Hold Period: 2-5 years
- Focus: Appreciation + forced equity through renovation
- Risk Tolerance: High

**Analysis Framework:**
```
MARCUS "THE WOLF" RODRIGUEZ
Aggressive Growth Strategy

SUBJECT PROPERTY: 260 Nesting Tree
Purchase Price: $392,500
Estimated Rehab: $25,000 (cosmetic updates)
All-In Cost: $417,500

VALUE ANALYSIS:
Current Value: $392,500
After Repair Value (ARV): $425,000 (new flooring, paint, landscaping)
Forced Equity: $32,500 (ARV - All-In Cost)

MARKET TIMING:
- Neighborhood Trend: HOT (6.2% appreciation/year)
- Job Growth: +3.1%/year (tech hub expanding)
- New Development: 145 units coming (⚠️ competition risk)
- Forecast: +4-5%/year next 3 years

RENTAL STRATEGY:
- Market Rent: $3,200/month
- Premium Positioning: $3,450/month (after upgrades)
- Section 8: $2,985/month (AVOID - below market)

CASH FLOW (Premium Rent):
Income: $3,450/month
Expenses:
- Mortgage (20% down, 7% rate): -$2,490/month
- Property Tax: -$350/month
- Insurance: -$150/month
- Maintenance Reserve: -$200/month
- Vacancy (5%): -$173/month
TOTAL EXPENSES: -$3,363/month

NET CASH FLOW: +$87/month (tight, not ideal)

EXIT STRATEGY (3-Year Hold):
Purchase Price: $392,500
Down Payment: $78,500 (20%)
Rehab: $25,000
Total Investment: $103,500

Property Value Year 3: $441,000 (5%/year appreciation)
Mortgage Paydown: $12,800
Forced Equity (rehab): $32,500
Total Gain: $441,000 - $392,500 + $12,800 = $61,300

ROI: $61,300 / $103,500 = 59.2% over 3 years = 19.7%/year

⚠️ VERDICT: NEGOTIATE

WHY?
✅ Strong appreciation market (6%/year)
✅ Forced equity opportunity ($32k via rehab)
✅ Premium rent achievable ($3,450)
❌ Cash flow weak ($87/month)
❌ New competition (145 units)

RECOMMENDED OFFER: $375,000 (4.5% below ask)
- Better cash flow: +$180/month
- Better ROI: 24%/year
- Risk-adjusted for new supply

THE WOLF'S TAKE:
"This is a solid growth play IF you can negotiate down. At asking price, you're banking on appreciation with no cushion. Get it for $375k, put $25k into it, rent at premium, and you're sitting on a $65k gain in 3 years. That's a 21% annual return. But at $392k? You're working too hard for 19%. NEGOTIATE HARD or WALK."
```

### Expert #2: Elizabeth Chen, CPA (Conservative Cash Flow Investor)

**Investment Strategy:**
- Target ROI: 12-15%
- Hold Period: 10+ years (buy and hold forever)
- Focus: Stable cash flow + tax benefits
- Risk Tolerance: Low

**Analysis Framework:**
```
ELIZABETH CHEN, CPA
Conservative Cash Flow Strategy

SUBJECT PROPERTY: 260 Nesting Tree
Purchase Price: $392,500
Down Payment: 25% ($98,125) - Conservative leverage
Loan Amount: $294,375

CASH FLOW ANALYSIS (Conservative Rent):
Income: $3,100/month (below market for stability)

Expenses:
- Mortgage P&I (6.5% rate, 30yr): -$1,860/month
- Property Tax: -$350/month
- Insurance: -$150/month
- HOA: $0
- Maintenance (1% rule): -$327/month
- CapEx Reserve (roof, HVAC): -$200/month
- Property Management: $0 (self-manage)
- Vacancy (8% conservative): -$248/month
TOTAL EXPENSES: -$3,135/month

NET CASH FLOW: -$35/month ❌ (NEGATIVE!)

YEAR 1 RETURN ANALYSIS:
Cash Flow: -$35 × 12 = -$420/year
Principal Paydown: $4,100/year
Appreciation (conservative 3%): $11,775/year
Tax Benefits: $8,200/year (see below)

TOTAL RETURN: $23,655/year
Cash-on-Cash ROI: -0.4% (negative cash flow)
Total ROI: 24.1% (including all benefits)

TAX BENEFIT ANALYSIS:
Rental Income: $37,200
Less Expenses:
- Mortgage Interest: -$19,000
- Property Tax: -$4,200
- Insurance: -$1,800
- Maintenance: -$3,924
- Depreciation (27.5 years): -$14,273
TAXABLE INCOME: -$5,997 (LOSS!)

Tax Savings (24% bracket): $1,439/year
PLUS: Deferred taxes on appreciation via depreciation

LONG-TERM PROJECTION (10 Years):
Purchase Price: $392,500
Down Payment: $98,125

Year 10 Value: $527,000 (3%/year appreciation)
Mortgage Balance: $247,000
Equity: $280,000

Cumulative Cash Flow: -$420 × 10 = -$4,200 (negative)
Cumulative Principal: $47,375
Cumulative Appreciation: $134,500
Cumulative Tax Savings: $14,390

TOTAL GAIN: $191,465
ROI: 195% over 10 years = 11.4%/year

⚠️ VERDICT: PASS (at asking price)

WHY?
❌ Negative monthly cash flow (-$35/month)
❌ Below my 12% annual ROI target (only 11.4%)
❌ Too much risk for a "cash flow" property
✅ Tax benefits are excellent
✅ Appreciation potential solid

WHAT WOULD MAKE THIS A BUY?
1. Purchase price $375,000 or below → Positive cash flow
2. Increase rent to $3,200 → Barely positive cash flow
3. Tenant pays utilities → +$100/month cash flow

ALTERNATIVE STRATEGY:
Instead of $392k property returning 11.4%, I'd rather:
- Buy 2 properties at $200k each (same down payment)
- Diversification reduces risk
- Likely better total cash flow
- More tax deductions (2 properties = 2× depreciation)

ELIZABETH'S TAKE:
"As a CPA, I see the tax benefits here - you're sheltering $6k/year in passive losses and deferring gains via depreciation. But negative cash flow is a red flag. One bad tenant, one major repair, and you're writing checks every month. At $375k, this becomes a solid buy-and-hold. At $392k, it's a 'maybe' that keeps me up at night. PASS unless you negotiate down or have other income to offset the losses."
```

### Expert #3: David Thompson, HUD Housing Specialist (Government Housing Expert)

**Investment Strategy:**
- Target ROI: 15-20%
- Hold Period: 5-10 years
- Focus: Section 8 vouchers, government-guaranteed rent
- Risk Tolerance: Medium

**Analysis Framework:**
```
DAVID THOMPSON
HUD Housing Specialist - Section 8 Strategy

SUBJECT PROPERTY: 260 Nesting Tree
Purchase Price: $392,500
Target Tenant: Section 8 Housing Choice Voucher

SECTION 8 ANALYSIS:
Property: 6 BR, 3.5 BA, San Antonio TX 78253
HUD Fair Market Rent (6BR): $2,985/month
Market Rent: $3,200/month
Rent Gap: -$215/month (Section 8 is LOWER)

⚠️ INITIAL ASSESSMENT: Section 8 pays BELOW market

HOWEVER - Consider Section 8 Advantages:
✅ Guaranteed rent (HUD pays 70%, tenant pays 30%)
✅ ZERO vacancy risk (tenant can't leave easily)
✅ Long-term tenancy (avg 5+ years vs 2 years market)
✅ Lower turnover costs (save $2,400/turnover every 5yr vs 2yr)
✅ Utility assistance (tenant less likely to default)

CASH FLOW ANALYSIS (Section 8 Rent):
Income: $2,985/month (Section 8 FMR)
- HUD Pays: $2,090/month (70%)
- Tenant Pays: $895/month (30%)

Expenses:
- Mortgage (20% down, 7%): -$2,490/month
- Property Tax: -$350/month
- Insurance: -$150/month
- Maintenance (higher wear): -$350/month
- Vacancy: $0 (Section 8 = zero vacancy)
- Inspections (annual HQS): -$50/month
TOTAL EXPENSES: -$3,390/month

NET CASH FLOW: -$405/month ❌ (VERY NEGATIVE)

WAIT - This Doesn't Work! Let me recalculate...

ADJUSTED STRATEGY: Veterans Housing (VASH Program)

VASH (Veterans Affairs Supportive Housing):
- Pays 120% of Section 8 FMR for veteran tenants
- VASH Rate: $2,985 × 1.20 = $3,582/month 🎯
- Target: Disabled veteran, family of 5-6

CASH FLOW (VASH Program):
Income: $3,582/month
- VA Pays: $3,582/month (100% guaranteed)
- Tenant Pays: $0 (disabled veteran, no copay)

Expenses:
- Mortgage: -$2,490/month
- Property Tax: -$350/month
- Insurance: -$150/month
- Maintenance: -$350/month
- Vacancy: $0 (VASH = zero vacancy, multi-year commitment)
TOTAL EXPENSES: -$3,340/month

NET CASH FLOW: +$242/month ✅ (POSITIVE!)

ANNUAL RETURN:
Cash Flow: $242 × 12 = $2,904/year
Principal Paydown: $4,200/year
Appreciation (3%): $11,775/year
TOTAL RETURN: $18,879/year

Down Payment: $78,500 (20%)
ROI: 24.1%/year 🎯

STABILITY ANALYSIS:
Government Payment Reliability: 99.8% (virtually guaranteed)
Tenant Tenure: 5-8 years average (low turnover)
Eviction Risk: <1% (if tenant violates, VA moves them, not your problem)
Maintenance Risk: Medium-High (large family, more wear)

INSPECTION REQUIREMENTS (Housing Quality Standards):
✅ Working smoke detectors (all rooms)
✅ No peeling paint (lead-based paint test if pre-1978)
✅ Working HVAC (must maintain 68°F winter, 78°F summer)
✅ No tripping hazards, handrails on stairs
✅ Annual inspections (HUD sends inspector)

Cost to Pass Inspection: ~$500/year (minor repairs, upkeep)

HIDDEN BENEFIT - Rent Escalation:
Section 8/VASH FMR adjusts annually with inflation
2023: $2,885/month
2024: $2,985/month (+3.5%)
2025 Projected: $3,090/month (+3.5%)

Your mortgage stays the same, rent goes UP = increasing cash flow

LONG-TERM PROJECTION (8 Years):
Year 1 Cash Flow: +$242/month
Year 8 Cash Flow: +$485/month (rent escalates, mortgage fixed)
Total Cash Flow: $28,800
Principal Paydown: $38,400
Appreciation: $106,200
TOTAL GAIN: $173,400

ROI: 221% over 8 years = 27.6%/year 🚀

✅ VERDICT: STRONG BUY (if VASH tenant available)

WHY?
✅ Guaranteed government rent ($3,582/month)
✅ Zero vacancy risk (multi-year commitment)
✅ Positive cash flow (+$242/month)
✅ Rent escalates with inflation
✅ Low eviction risk (VA manages tenant)
✅ Tax benefits (same as regular rental)
✅ Social good (housing a veteran)

RISKS:
⚠️ Higher maintenance (large family, 6 people)
⚠️ Must pass annual HQS inspection ($500/year)
⚠️ If veteran leaves, might be hard to find another VASH tenant
⚠️ Property must stay in good condition (HUD enforces standards)

HOW TO FIND VASH TENANT:
1. Contact San Antonio Housing Authority: (210) 477-6000
2. Ask for VASH coordinator
3. Get on VASH landlord list
4. Veteran matches are prioritized (large families need 6BR homes!)
5. VA case manager handles tenant support (less work for you)

DAVID'S TAKE:
"This property is a GOLDMINE for the right strategy. Standard Section 8? Pass - you're losing $215/month vs market. But VASH for a disabled veteran family? You're making $382/month MORE than market rent ($3,582 vs $3,200), with ZERO vacancy risk, and you're helping a veteran. The VA pays like clockwork, the tenant stays long-term, and your cash flow increases every year. This is a 28%/year ROI with government-backed stability. STRONG BUY if you can secure a VASH tenant. Call the housing authority TODAY."
```

---

## 1.4 AI Analysis Summary & Recommendation

**Final Output:**
```
INVESTMENT ANALYSIS SUMMARY
260 Nesting Tree, San Antonio, TX 78253

Purchase Price: $392,500
Market Rent: $3,200/month
Section 8 FMR: $2,985/month
VASH Rate: $3,582/month

🔴 MARCUS (Aggressive): NEGOTIATE to $375k
- Strategy: Buy, rehab $25k, rent premium, sell in 3 years
- ROI: 19.7%/year (at ask), 24%/year (at $375k)
- Risk: Medium-High (new competition, tight cash flow)

🟡 ELIZABETH (Conservative): PASS at $392k, BUY at $375k
- Strategy: Buy and hold 10+ years, stable tenant, tax benefits
- ROI: 11.4%/year (at ask) - BELOW her 12% target
- Risk: Low (but negative cash flow is unacceptable)

🟢 DAVID (Section 8): STRONG BUY (if VASH tenant)
- Strategy: VASH veteran tenant, government rent, long-term hold
- ROI: 27.6%/year (8-year hold)
- Risk: Low (guaranteed government payments)

PLATFORM RECOMMENDATION:
Based on 3-expert analysis, this property is:

✅ EXCELLENT BUY if:
1. You can secure a VASH tenant (27.6% ROI, guaranteed rent)
2. You negotiate to $375k or below (all 3 experts say BUY)

⚠️ CONDITIONAL BUY if:
1. You accept negative cash flow for tax benefits (Elizabeth strategy)
2. You're willing to rehab and hold 3+ years (Marcus strategy)

❌ PASS if:
1. You can't find VASH tenant AND can't negotiate price
2. You need positive cash flow from day 1
3. You can find better deals elsewhere

NEXT STEPS:
1. Make offer: $375,000 (4.5% below ask)
2. Contact SA Housing Authority about VASH tenant availability
3. Get property inspection (budget $500 for pre-purchase)
4. If VASH available: CLOSE DEAL
5. If no VASH: Consider Marcus strategy (premium rent after rehab)
```

---

## 1.5 Technology Requirements for Property Analysis

### APIs & Data Sources:

**Property Data:**
- Bright Data (Zillow scraping): $99/month + $2/scrape
- Redfin API (if available): Free or partnership
- Realtor.com API: Partner program or scraping
- Google Maps API: $200/month credit (free tier covers most usage)

**Market Data:**
- Census Bureau API: Free (population, demographics)
- FBI Crime Data: Free (neighborhood safety)
- GreatSchools API: Free tier available
- Walk Score API: $50/month

**Government Data:**
- HUD Fair Market Rent API: Free (Section 8 data)
- County Tax Assessor (web scraping): Free but complex

**AI Analysis:**
- OpenAI GPT-4: $0.03/1k tokens (~$0.50 per 3-expert analysis)
- Claude AI (alternative): Similar pricing

### Database Schema for Property Analysis:

```prisma
model PropertyAnalysis {
  id              String   @id @default(cuid())
  propertyId      String?  // NULL if analyzing before purchase

  // Input Data
  address         String
  city            String
  state           String
  zipCode         String
  bedrooms        Int
  bathrooms       Float
  squareFeet      Int?
  yearBuilt       Int?
  purchasePrice   Decimal?

  // CMA Data
  estimatedValue      Decimal
  zillowZestimate     Decimal?
  marketRent          Decimal
  rentZestimate       Decimal?
  section8FMR         Decimal?

  // Comparable Sales (JSON)
  comparableSales     Json  // [{address, salePrice, adjustedValue, ...}]

  // Rental Comps (JSON)
  rentalComps         Json  // [{address, rent, adjustedRent, ...}]

  // Market Trends (JSON)
  marketTrends        Json  // {appreciation1yr, appreciation3yr, rentTrend, ...}

  // 3-Expert Analysis (JSON)
  marcusAnalysis      Json  // {verdict, roi, strategy, ...}
  elizabethAnalysis   Json  // {verdict, roi, strategy, ...}
  davidAnalysis       Json  // {verdict, roi, strategy, ...}

  // Final Recommendation
  overallRecommendation String  // BUY, PASS, NEGOTIATE
  recommendedOffer      Decimal?

  // Metadata
  analyzedAt      DateTime @default(now())
  analyzedBy      String   // userId

  @@index([address, zipCode])
}
```

---

# PART 2: PROPERTY & PORTFOLIO TRACKING

## 2.1 Property Dashboard (Portfolio Overview)

**What It Shows:**
Landlord sees all properties at a glance with key metrics

**Dashboard Layout:**
```
PORTFOLIO OVERVIEW

Total Properties: 12
Total Value: $2,400,000
Total Equity: $847,000 (35%)
Total Debt: $1,553,000

Monthly Income: $18,400 (rent)
Monthly Expenses: $15,950 (mortgages + costs)
NET CASH FLOW: +$2,450/month

Year-to-Date:
- Rental Income: $156,000
- Expenses: $124,000
- Net Profit: $32,000
- Tax Savings: $18,700

PROPERTIES:

🟢 260 Nesting Tree, San Antonio, TX
Value: $392,500 | Equity: $72,500 (18%) | Rent: $3,200/mo
Status: Occupied | Tenant: John Smith | Lease: 45 days left
Cash Flow: +$292/mo | ROI: 4.5%
[VIEW DETAILS] [ANALYZE]

🟢 8302 Chivalry, San Antonio, TX
Value: $285,000 | Equity: $55,000 (19%) | Rent: $2,400/mo
Status: Occupied | Tenant: Sarah Lee | Rent CURRENT
Cash Flow: +$180/mo | ROI: 6.2%
[VIEW DETAILS] [ANALYZE]

🟡 1423 Oak Street, Austin, TX
Value: $410,000 | Equity: $130,000 (32%) | Rent: VACANT
Status: Vacant - 14 days | Losing: $2,100/mo
Available Equity: $48,000 (for cash-out refi)
[LIST PROPERTY] [FIND TENANT]

🔴 889 Pine Ave, Houston, TX
Value: $325,000 | Equity: $115,000 (35%) | Rent: $1,800/mo
Status: Occupied | Tenant: Mike Wilson | RENT LATE 8 days
Cash Flow: +$410/mo | ROI: 15%
[CONTACT TENANT] [VIEW PAYMENTS]
```

---

## 2.2 Equity Tracking & Growth Analysis

**What It Shows:**
Real-time equity calculation and growth over time

### Property-Level Equity:
```
260 Nesting Tree - EQUITY DETAILS

CURRENT EQUITY:
Purchase Price (Jan 2024): $350,000
Current Value (Nov 2024): $392,500
Appreciation: +$42,500 (+12.1% in 10 months)

Mortgage Balance: $320,000
Total Equity: $72,500
Equity %: 18.5%

EQUITY BREAKDOWN:
- Down Payment (20%): $70,000
- Principal Paydown: $30,000
- Appreciation: $42,500
- Forced Equity (rehab): $0
TOTAL: $72,500

USABLE EQUITY (for borrowing):
Current Value: $392,500
80% LTV: $314,000
Current Mortgage: $320,000
Available to Borrow: $0 (over 80% LTV)

⚠️ Need to pay down $6,000 or property appreciate to $400k to access equity

EQUITY GROWTH PROJECTION (Next 5 Years):
Year 1 (2024): $72,500
Year 2 (2025): $102,300 (+$29,800: $14k appreciation + $5.8k principal)
Year 3 (2026): $134,100 (+$31,800)
Year 4 (2027): $168,200 (+$34,100)
Year 5 (2028): $204,800 (+$36,600)

Total 5-Year Equity Growth: $132,300
- Appreciation (5%/year): $88,800
- Principal Paydown: $43,500
```

### Portfolio-Level Equity:
```
PORTFOLIO EQUITY ANALYSIS

TOTAL EQUITY: $847,000

By Property:
1. 1423 Oak St: $130,000 (32% equity) ← Best equity position
2. 889 Pine Ave: $115,000 (35% equity)
3. 260 Nesting Tree: $72,500 (18% equity)
4. 8302 Chivalry: $55,000 (19% equity)
... [8 more properties]

USABLE EQUITY (Available to Borrow):
Total Value: $2,400,000
80% LTV: $1,920,000
Total Mortgages: $1,553,000
AVAILABLE: $367,000 🎯

What You Can Do With $367k Equity:
- Buy 5 properties at $250k each (20% down = $50k × 5)
- Buy 2 properties at $500k each (20% down = $100k × 2)
- Pay off 889 Pine mortgage ($210k) + keep $157k cash
- Renovate all properties ($30k each × 12 = $360k)

EQUITY GROWTH (12-Month Chart):
Jan 2024: $680,000
Mar 2024: $710,000 (+$30k)
Jun 2024: $755,000 (+$45k)
Sep 2024: $805,000 (+$50k)
Nov 2024: $847,000 (+$42k)

12-Month Gain: $167,000
- Appreciation: $125,000 (market up 5.2%)
- Principal Paydown: $42,000 (tenants paying down mortgages!)

ANNUAL EQUITY VELOCITY: $167k/year
- That's $13,917/month in wealth building
- Equivalent to $167k salary (tax-free until you sell!)
```

---

## 2.3 Mortgage & Debt Tracking

**What It Shows:**
Complete view of all mortgages, payment schedules, refinance opportunities

### Mortgage Dashboard:
```
MORTGAGE OVERVIEW

Total Debt: $1,553,000
Weighted Avg Rate: 6.8%
Total Monthly Payment: $12,200

MORTGAGES:

260 Nesting Tree:
Lender: Rocket Mortgage
Original Amount: $280,000 (Jan 2024)
Current Balance: $276,800
Interest Rate: 7.0% (fixed 30-year)
Monthly Payment: $1,862 (P&I)
- Principal: $517/month
- Interest: $1,345/month
Years Remaining: 29.2 years

Amortization:
- Year 1 Principal: $6,200
- Year 5 Principal: $7,400
- Year 10 Principal: $9,800
- Total Interest (life of loan): $390,000 😱

💡 REFINANCE OPPORTUNITY:
Current Rate: 7.0%
Market Rate: 6.5%
Savings: $180/month = $2,160/year
Break-even: 18 months (closing costs $3,200)
Lifetime Savings: $64,800

[GET REFI QUOTES]

---

8302 Chivalry:
Lender: Better.com
Original Amount: $200,000 (Mar 2022)
Current Balance: $189,400
Interest Rate: 6.2% (fixed 30-year)
Monthly Payment: $1,230 (P&I)
Years Remaining: 27.5 years

💚 GOOD RATE - No refi needed

---

889 Pine Ave:
Lender: Local Credit Union
Original Amount: $210,000 (Dec 2020)
Current Balance: $195,800
Interest Rate: 8.5% 😱 (fixed 30-year)
Monthly Payment: $1,615 (P&I)

🚨 URGENT REFINANCE NEEDED:
Current Rate: 8.5%
Market Rate: 6.5%
Savings: $285/month = $3,420/year
Lifetime Savings: $102,600

[REFINANCE NOW]
```

### Cash-Out Refinance Calculator:
```
CASH-OUT REFI OPPORTUNITY
1423 Oak Street, Austin, TX

Current Situation:
Property Value: $410,000
Current Mortgage: $280,000
Equity: $130,000 (32%)

Cash-Out Refi Scenario:
New Loan (80% LTV): $328,000
Pay Off Current Loan: -$280,000
CASH TO YOU: $48,000 💰

New Mortgage:
Amount: $328,000
Rate: 6.8%
Payment: $2,155/month (vs current $1,820)
Increase: +$335/month

What to Do With $48k:
OPTION 1: Buy Another Property
- Down payment on $240k property (20%)
- New rental income: +$1,800/month
- Net after mortgage: +$400/month
- Cost of refi: -$335/month
- NET GAIN: +$65/month + another property!

OPTION 2: Pay Off High-Interest Debt
- 889 Pine has 8.5% mortgage
- Pay down $48k → Saves $340/month
- Cost of refi: -$335/month
- NET GAIN: +$5/month (minor, but cleaner)

OPTION 3: Renovate Other Properties
- $48k can renovate 3-4 properties
- Increase rents $200-300 each
- Total income increase: +$900/month
- Cost of refi: -$335/month
- NET GAIN: +$565/month!

RECOMMENDATION: Option 3 (Renovate & raise rents)
[PROCEED WITH CASH-OUT REFI]
```

---

## 2.4 Financial Tracking Per Property

**What It Shows:**
Complete P&L for each property, tax reporting, expense tracking

### Property P&L:
```
260 Nesting Tree - PROFIT & LOSS (2024 YTD)

INCOME:
Rental Income: $28,800 (9 months @ $3,200)
Late Fees: $150
Application Fees: $100 (2 applicants before current tenant)
Other Income: $0
TOTAL INCOME: $29,050

OPERATING EXPENSES:
Property Tax: $4,200
Insurance: $1,800
HOA Fees: $0
Utilities (during vacancy): $180
Property Management: $0 (self-managed)
Landscaping: $840 (12 months @ $70)
Pest Control: $240 (quarterly @ $60)
Legal/Professional: $0
Marketing (vacancy): $0
TOTAL OPERATING EXPENSES: $7,260

MAINTENANCE & REPAIRS:
HVAC Repair (compressor): $385
Plumbing (leaky faucet): $180
Plumbing (toilet repair): $440
Appliance (dishwasher): $680
Paint/Touchup: $270
Locksmith (rekey): $120
General Repairs: $200
TOTAL MAINTENANCE: $2,275

TURNOVER COSTS (Jan 2024):
Carpet Cleaning: $250
Paint (2 rooms): $450
Deep Cleaning: $300
TOTAL TURNOVER: $1,000

TOTAL EXPENSES: $10,535

FINANCING COSTS:
Mortgage Interest: $12,105 (deductible)
Mortgage Principal: $5,895 (NOT deductible, but builds equity!)
TOTAL MORTGAGE: $18,000

NET OPERATING INCOME (NOI): $29,050 - $10,535 = $18,515
CASH FLOW (after mortgage): $18,515 - $18,000 = $515

Monthly Cash Flow: $515 / 9 months = $57/month

⚠️ Low cash flow! But wait...

TAX ANALYSIS:
Rental Income: $29,050
Less Operating Expenses: -$10,535
Less Mortgage Interest: -$12,105
Less Depreciation: -$12,727 (house $350k / 27.5 years)
TAXABLE INCOME: -$6,317 (LOSS!)

Tax Savings (24% bracket): $1,516
REAL Cash Flow: $515 + $1,516 = $2,031
Monthly: $226/month

ROI ANALYSIS:
Down Payment: $70,000
Cash Flow: $515
Principal Paydown: $5,895
Appreciation: $42,500 (12% in 10 months)
Tax Savings: $1,516
TOTAL RETURN: $50,426

ROI: 72% in 10 months = 86.4%/year 🚀

Cash-on-Cash: $515 / $70,000 = 0.7%/year (weak)
Total Return: $50,426 / $70,000 = 72%/year (excellent!)
```

### Expense Tracking by Category:
```
260 Nesting Tree - EXPENSE BREAKDOWN

2024 EXPENSES BY CATEGORY:

💰 FIXED COSTS (70% of expenses):
Property Tax: $4,200 (40%)
Insurance: $1,800 (17%)
Landscaping: $840 (8%)
Pest Control: $240 (2%)
Utilities (vacancy): $180 (2%)
Total Fixed: $7,260

🔧 VARIABLE COSTS (22% of expenses):
HVAC: $385
Plumbing: $620
Appliances: $680
Paint: $270
General: $320
Total Variable: $2,275

🏠 TURNOVER COSTS (10% of expenses):
Carpet: $250
Paint: $450
Cleaning: $300
Total Turnover: $1,000

TOTAL: $10,535

BENCHMARKING:
Your Property: $10,535 expenses on $28,800 income = 36.5%
Industry Average: 40-50% expense ratio
✅ You're running efficiently!

⚠️ ALERTS:
- HVAC is 6 years old (avg lifespan 10-15 years)
- Budget $6,000 for replacement in 4-6 years
- Dishwasher replaced in 2024 ($680)
- Next big expense likely: Water heater (8 years old, budget $1,200)
```

---

# PART 3: TENANT MANAGEMENT

## 3.1 Tenant Screening & Application

**Already covered in detail in UPDATED_PLATFORM_VISION.md**

Key features:
- Online application
- Credit check (TransUnion $15)
- Background check (Checkr $20)
- Eviction history
- Income verification (Plaid bank connection)
- AI tenant scoring (0-100)
- Automated landlord reference calls

---

## 3.2 Lease Creation & E-Signature

**Already covered in UPDATED_PLATFORM_VISION.md**

Key features:
- AI-generated lease (state-specific templates)
- All occupants included (adults + children + pets)
- Custom clauses (parking, utilities, pets)
- DocuSign e-signature
- Auto-stored in property file

---

## 3.3 Rent Collection & Tenant Portal

**Already covered in UPDATED_PLATFORM_VISION.md**

Key features:
- Tenant portal (pay rent, view lease, submit maintenance)
- ACH, debit, credit card payments
- Auto-pay with $50/month discount
- Late rent automation (reminders → late fees → pay-or-quit notice)
- QuickBooks auto-sync

---

## 3.4 Before/After Photo Management

**Already covered in PHOTO_DELETION_POLICY.md**

Key features:
- Move-in: 35 guided photos
- Move-out: Same photos, AI comparison
- Damage detection & security deposit calculation
- Photos deleted 1 year after TENANCY ENDS (not lease end)
- Legal compliance (GDPR/CCPA)

---

## 3.5 Automated Lease Renewals

**Already covered in UPDATED_PLATFORM_VISION.md**

Key features:
- 90 days before lease ends, AI analyzes tenant
- AI recommends renewal strategy (aggressive/balanced/conservative)
- Auto-sends renewal offer via text/email
- Tenant accepts with one click
- New lease signed via DocuSign

---

# PART 4: MAINTENANCE MANAGEMENT

## 4.1 Maintenance Request System

**Already covered in UPDATED_PLATFORM_VISION.md**

Key features:
- Tenant submits request with photos
- AI analyzes photos for damage/urgency
- Estimates repair cost
- Suggests 3 contractors
- Landlord clicks to dispatch
- Contractor uploads invoice
- Auto-pays via platform
- Syncs to QuickBooks

---

## 4.2 Invoice Management & Expense Tracking

**Already covered in UPDATED_PLATFORM_VISION.md**

Key features:
- Upload invoice (PDF/photo/email forwarding)
- AI extracts: vendor, amount, property, category
- Auto-categorizes (HVAC, plumbing, CapEx, etc.)
- Links to property
- Tax-ready reports
- Per-property expense dashboard

---

# PART 5: SUBSCRIPTION TIERS & LICENSING

## Pricing Strategy

### FREE Tier - "Try Before You Buy"
**Target:** Landlords with 1 property or aspiring investors

**Included:**
- Property search + AI analysis: 3 properties/month
- Basic property dashboard (1 property max)
- Manual rent tracking (no auto-collection)
- Document storage: 1GB
- CMA reports: 3/month
- 3-Expert AI analysis: 3/month

**Limitations:**
- No tenant screening
- No lease generation
- No QuickBooks sync
- No API access
- Email support only (48hr response)

**Goal:** Get them hooked, upsell when they buy property #2 or #3

---

### PRO Tier - $49/month
**Target:** Landlords with 2-10 properties

**Everything in FREE, plus:**
- Unlimited properties
- Unlimited property analysis
- Tenant screening (unlimited, $25/applicant charged separately)
- Lease generation (unlimited, DocuSign included)
- ACH rent collection ($1/transaction)
- Tenant portal
- Maintenance management
- Before/after photo management
- Invoice tracking & expense management
- QuickBooks sync (1-way: platform → QB)
- Document storage: 25GB
- CMA reports: Unlimited
- Email support (24hr response)

**Transaction Fees:**
- Tenant screening: $25/applicant (we pay $20, keep $5)
- Rent collection: $1/ACH transaction
- Lease e-signature: Included (DocuSign costs us $0.50)

---

### PREMIUM Tier - $99/month
**Target:** Landlords with 11-50 properties or power users

**Everything in PRO, plus:**
- **QuickBooks sync (2-way)** ← Platform ↔ QuickBooks
- **Open API access** (1,000 requests/hour, webhooks)
- Bulk actions (rent increases, inspections, messaging)
- Advanced reporting (custom reports, export to Excel)
- Multi-user accounts (add VA, assistant, partner)
- Portfolio analytics (equity tracking, ROI comparison)
- Automated lease renewals
- Property value auto-updates (monthly Zillow refresh)
- Document storage: 100GB
- Phone support (12hr response)
- Priority feature requests

---

### ENTERPRISE Tier - $299/month
**Target:** Property management companies, 50+ properties

**Everything in PREMIUM, plus:**
- **Unlimited API requests**
- **White-label option** (your branding, your domain)
- Custom integrations (MLS, property websites, CRM)
- Dedicated account manager
- Custom reports & dashboards
- Bulk import (1,000+ properties)
- Document storage: 1TB
- **24/7 phone support**
- Quarterly business reviews
- Early access to new features

---

## Feature Access Matrix

| Feature | FREE | PRO | PREMIUM | ENTERPRISE |
|---------|------|-----|---------|------------|
| **Properties** | 1 | Unlimited | Unlimited | Unlimited |
| **Property Analysis** | 3/month | Unlimited | Unlimited | Unlimited |
| **CMA Reports** | 3/month | Unlimited | Unlimited | Unlimited |
| **3-Expert AI Analysis** | 3/month | Unlimited | Unlimited | Unlimited |
| **Tenant Screening** | ❌ | ✅ $25 each | ✅ $25 each | ✅ $25 each |
| **Lease Generation** | ❌ | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Rent Collection** | ❌ | ✅ $1/ACH | ✅ $1/ACH | ✅ $1/ACH |
| **Tenant Portal** | ❌ | ✅ | ✅ | ✅ |
| **Photo Management** | ❌ | ✅ | ✅ | ✅ |
| **Maintenance** | ❌ | ✅ | ✅ | ✅ |
| **QuickBooks Sync** | ❌ | 1-way | 2-way | 2-way |
| **API Access** | ❌ | ❌ | 1k/hr | Unlimited |
| **Webhooks** | ❌ | ❌ | ✅ | ✅ |
| **Automated Renewals** | ❌ | ❌ | ✅ | ✅ |
| **Bulk Actions** | ❌ | ❌ | ✅ | ✅ |
| **Multi-User** | ❌ | ❌ | 3 users | Unlimited |
| **White-Label** | ❌ | ❌ | ❌ | ✅ |
| **Support** | Email 48hr | Email 24hr | Phone 12hr | Phone 24/7 |
| **Storage** | 1GB | 25GB | 100GB | 1TB |

---

# PART 6: TECHNOLOGY STACK & AWS ARCHITECTURE

## Frontend
- **Next.js 15** (React framework, App Router)
- **TypeScript** (type safety)
- **Tailwind CSS** (styling)
- **Shadcn UI** (component library)
- **React Query** (data fetching, caching)
- **Zustand** (state management)

## Backend
- **Next.js API Routes** (serverless functions)
- **Prisma ORM** (database queries)
- **tRPC** (end-to-end type safety, alternative to REST)

## Database
- **PostgreSQL** (AWS RDS)
- **Redis** (AWS ElastiCache - caching, sessions)

## File Storage
- **AWS S3** (documents, photos, invoices)
- **CloudFront CDN** (fast image delivery)

## AI / ML
- **OpenAI GPT-4** (3-expert analysis, document extraction)
- **Claude AI** (alternative for complex analysis)
- **AWS Rekognition** (photo damage detection)

## Payments
- **Stripe** (ACH, cards, subscriptions)
- **Plaid** (bank connections, income verification)

## Communication
- **Twilio** (SMS notifications)
- **SendGrid** (email)
- **Twilio Voice** (automated landlord reference calls)

## Data Sources
- **Google Maps API** (autocomplete, geocoding)
- **Bright Data** (Zillow/Realtor scraping)
- **HUD API** (Section 8 FMR)
- **TransUnion API** (credit checks)
- **Checkr API** (background checks)
- **DocuSign API** (e-signatures)
- **QuickBooks API** (accounting sync)

## AWS Services
- **AWS Amplify** (frontend hosting, CI/CD)
- **AWS RDS** (PostgreSQL database)
- **AWS S3** (file storage)
- **AWS CloudFront** (CDN)
- **AWS Lambda** (background jobs: photo deletion, value updates, rent reminders)
- **AWS SES** (transactional emails - cheaper than SendGrid for high volume)
- **AWS ElastiCache** (Redis for sessions, caching)
- **AWS Secrets Manager** (API keys, database credentials)
- **AWS CloudWatch** (logging, monitoring, alerts)
- **AWS EventBridge** (scheduled tasks: daily rent reminders, monthly value updates)

---

# PART 7: DEVELOPMENT ROADMAP

## Phase 1: Foundation (Weeks 1-4) - PRIORITY #1

**Goal:** Get core infrastructure running on AWS

### Week 1: Database & Authentication
- [ ] Set up AWS RDS PostgreSQL database
- [ ] Create Prisma schema (users, properties, tenants, leases)
- [ ] Implement NextAuth authentication
- [ ] Deploy to AWS Amplify
- [ ] Custom domain + SSL

### Week 2: Property Management Core
- [ ] Property CRUD (create, read, update, delete)
- [ ] Property dashboard UI
- [ ] Equity tracking calculations
- [ ] Mortgage tracking
- [ ] Property value updates (manual for now)

### Week 3: Tenant Management Core
- [ ] Tenant CRUD
- [ ] Lease creation (manual PDF for now, no e-signature yet)
- [ ] Rent tracking (manual entry)
- [ ] Tenant portal (view only, no payments yet)

### Week 4: Financial Tracking
- [ ] Income/expense tracking per property
- [ ] P&L reports per property
- [ ] Portfolio-level financials
- [ ] Basic QuickBooks export (CSV)

**Deliverable:** Keith can add his 2 properties, track tenants (if any), see equity/cash flow

---

## Phase 2: Tenant Automation (Weeks 5-8) - PRIORITY #2

**Goal:** Automate tenant screening, leases, rent collection

### Week 5: Tenant Screening
- [ ] TransUnion API integration (credit checks)
- [ ] Checkr API integration (background checks)
- [ ] Plaid integration (income verification)
- [ ] AI tenant scoring (0-100)
- [ ] Automated approval/rejection

### Week 6: Lease Automation
- [ ] DocuSign API integration
- [ ] AI lease generation (state templates)
- [ ] E-signature workflow
- [ ] Lease storage in S3

### Week 7: Rent Collection
- [ ] Stripe ACH integration
- [ ] Tenant payment portal
- [ ] Auto-pay enrollment
- [ ] Late rent automation (reminders, late fees)

### Week 8: Photo Management
- [ ] Before/after photo upload (S3)
- [ ] AI photo comparison (damage detection)
- [ ] Security deposit calculator
- [ ] Auto-deletion workflow (1 year after tenancy ends)

**Deliverable:** Keith can screen tenants, auto-generate leases, collect rent online

---

## Phase 3: Property Analysis (Weeks 9-12) - PRIORITY #3

**Goal:** Build the property search & AI analysis tool

### Week 9: Google Maps Search
- [ ] Google Maps autocomplete UI
- [ ] Address validation & geocoding
- [ ] Property search form

### Week 10: Data Scraping & CMA
- [ ] Bright Data integration (Zillow scraper)
- [ ] HUD API integration (Section 8)
- [ ] Comparable sales finder
- [ ] Rental comps finder
- [ ] Market trends (appreciation, rent growth)

### Week 11: 3-Expert AI Analysis
- [ ] OpenAI GPT-4 integration
- [ ] Marcus (aggressive) analysis prompt
- [ ] Elizabeth (conservative) analysis prompt
- [ ] David (Section 8) analysis prompt
- [ ] CMA report generator

### Week 12: Analysis UI
- [ ] CMA report UI (comparable sales table)
- [ ] Rental comps UI
- [ ] 3-expert analysis display
- [ ] BUY/PASS/NEGOTIATE recommendation
- [ ] Save analysis to database

**Deliverable:** Keith can search any address, get instant AI analysis

---

## Phase 4: Advanced Features (Weeks 13-16)

**Goal:** QuickBooks sync, maintenance, automated renewals

### Week 13: QuickBooks Integration
- [ ] QuickBooks OAuth
- [ ] 1-way sync (platform → QB)
- [ ] Income/expense auto-sync
- [ ] 2-way sync (QB → platform) - PREMIUM tier only

### Week 14: Maintenance Management
- [ ] Maintenance request form (tenant portal)
- [ ] Photo upload (S3)
- [ ] AI damage detection
- [ ] Contractor dispatch UI
- [ ] Invoice upload & AI extraction

### Week 15: Automated Lease Renewals
- [ ] 90-day lease expiration alerts
- [ ] AI tenant performance scoring
- [ ] Renewal strategy generator
- [ ] Auto-send renewal offers (SMS/email)
- [ ] One-click acceptance & new lease

### Week 16: Refinance Alerts
- [ ] Daily mortgage rate scraper
- [ ] Refinance opportunity calculator
- [ ] Cash-out refi scenarios
- [ ] Lender quote integration (Rocket, Better.com APIs)

**Deliverable:** Full platform ready for beta launch

---

## Phase 5: Polish & Launch (Weeks 17-20)

**Goal:** Public launch, marketing, user acquisition

### Week 17: API & Webhooks (PREMIUM)
- [ ] REST API endpoints (properties, tenants, expenses)
- [ ] Webhook events (rent paid, maintenance created, etc.)
- [ ] API documentation (Swagger)
- [ ] API keys & rate limiting

### Week 18: Multi-User & Permissions (PREMIUM/ENTERPRISE)
- [ ] Multi-user accounts
- [ ] Role-based permissions (owner, assistant, VA, partner)
- [ ] Activity logs (who did what)

### Week 19: White-Label (ENTERPRISE)
- [ ] Custom domain support
- [ ] Custom branding (logo, colors)
- [ ] Remove "Powered by LandlordAI" footer

### Week 20: Launch Prep
- [ ] Help docs & video tutorials
- [ ] Onboarding wizard
- [ ] Payment processing (Stripe subscriptions)
- [ ] Beta user testing
- [ ] Marketing site (landing page)

**Deliverable:** Public launch ready

---

# PART 8: AWS DEPLOYMENT ARCHITECTURE

## Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ HTTPS
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AWS CLOUDFRONT (CDN)                          │
│  - Caches static assets (images, CSS, JS)                      │
│  - SSL Certificate (ACM)                                        │
│  - DDoS protection                                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AWS AMPLIFY (Frontend)                        │
│  - Next.js 15 app (SSR + SSG)                                   │
│  - CI/CD (auto-deploy on git push)                             │
│  - Environment variables                                        │
│  - Custom domain: app.landlordai.com                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
┌──────────────┐ ┌──────────┐ ┌─────────────┐
│ AWS RDS      │ │ AWS S3   │ │ AWS Lambda  │
│ PostgreSQL   │ │ Storage  │ │ Functions   │
│              │ │          │ │             │
│ - Properties │ │ - Photos │ │ - Photo     │
│ - Tenants    │ │ - Docs   │ │   deletion  │
│ - Leases     │ │ - PDFs   │ │ - Value     │
│ - Expenses   │ │          │ │   updates   │
│              │ │          │ │ - Rent      │
│              │ │          │ │   reminders │
└──────────────┘ └──────────┘ └─────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL APIS                                 │
├─────────────────────────────────────────────────────────────────┤
│ Stripe          │ Payments, subscriptions                       │
│ Plaid           │ Bank connections, income verification         │
│ TransUnion      │ Credit checks                                 │
│ Checkr          │ Background checks                             │
│ DocuSign        │ E-signatures                                  │
│ QuickBooks      │ Accounting sync                               │
│ OpenAI          │ AI analysis                                   │
│ Google Maps     │ Autocomplete, geocoding                       │
│ Bright Data     │ Zillow scraping                               │
│ HUD API         │ Section 8 FMR                                 │
│ Twilio          │ SMS notifications                             │
│ SendGrid        │ Email                                         │
└─────────────────────────────────────────────────────────────────┘
```

## AWS Cost Estimate (Monthly)

### Compute & Hosting:
- **AWS Amplify** (Next.js hosting): $15/month (5GB storage, 100GB bandwidth)
- **AWS RDS** (PostgreSQL db.t3.micro): $15/month (20GB storage)
- **AWS Lambda** (background jobs): $5/month (1M requests free tier)
- **AWS ElastiCache** (Redis cache.t3.micro): $15/month

### Storage & CDN:
- **AWS S3** (file storage): $10/month (100GB storage, 1TB transfer)
- **AWS CloudFront** (CDN): $5/month (1TB bandwidth)

### Other AWS Services:
- **AWS Secrets Manager**: $1/month (3 secrets)
- **AWS SES** (email): $1/month (10k emails)
- **CloudWatch** (logs, monitoring): $5/month

**Total AWS Infrastructure: ~$72/month**

### External APIs (from earlier budget):
- Bright Data (Zillow scraping): $99/month + $2/scrape
- TransUnion (credit checks): $15/check × usage
- Checkr (background): $20/check × usage
- AirDNA (STR data): $199/month (optional)
- Google Maps API: Free tier ($200/month credit)
- Twilio SMS: $20/month (~100 texts)
- OpenAI GPT-4: $50/month (100 analyses)

**Total API Costs: ~$100/month** (Keith approved)

**Grand Total: $172/month** (infrastructure + APIs)

---

# SUMMARY & NEXT STEPS

## What We're Building (Complete List):

### 1. Property Discovery
- ✅ Google Maps search
- ✅ CMA reports (comparable sales, rental comps, market trends)
- ✅ 3-Expert AI analysis (Marcus, Elizabeth, David)
- ✅ Section 8 FMR integration
- ✅ BUY/PASS/NEGOTIATE recommendations

### 2. Property Tracking
- ✅ Property dashboard (portfolio overview)
- ✅ Equity tracking (per property & portfolio-level)
- ✅ Mortgage tracking (balances, rates, amortization)
- ✅ Refinance alerts (when rates drop)
- ✅ Cash-out refi calculator
- ✅ Property value auto-updates (monthly Zillow refresh)

### 3. Financial Management
- ✅ Income/expense tracking per property
- ✅ P&L reports per property
- ✅ Tax reports (Schedule E format)
- ✅ QuickBooks sync (1-way PRO, 2-way PREMIUM)
- ✅ Portfolio-level financials
- ✅ ROI tracking per property
- ✅ Invoice upload & AI categorization

### 4. Tenant Management
- ✅ Tenant screening (credit, background, income, eviction)
- ✅ AI tenant scoring (0-100)
- ✅ Lease generation (AI, state-specific)
- ✅ E-signature (DocuSign)
- ✅ Tenant portal (pay rent, view lease, submit maintenance)
- ✅ Rent collection (ACH, cards, auto-pay)
- ✅ Late rent automation (reminders → late fees → pay-or-quit)
- ✅ Before/after photo management
- ✅ Security deposit calculator
- ✅ Automated lease renewals

### 5. Maintenance Management
- ✅ Maintenance requests with photos
- ✅ AI damage detection
- ✅ Cost estimation
- ✅ Contractor dispatch
- ✅ Invoice upload & tracking
- ✅ Expense categorization

### 6. Advanced Features
- ✅ Open API (REST + webhooks) - PREMIUM
- ✅ Multi-user accounts - PREMIUM
- ✅ White-label branding - ENTERPRISE
- ✅ Bulk actions - PREMIUM

---

## APPROVED BY KEITH:

1. ✅ Focus on Core Product (Property + Tenant Management) FIRST
2. ✅ Deploy to AWS (not local)
3. ✅ $100/month API budget approved
4. ✅ Keith will add properties himself once system is built
5. ✅ Keith will add tenants himself once system is built

---

## QUESTIONS FOR KEITH BEFORE WE START CODING:

### 1. Platform Name
"Property Investor" is generic. Do you have a preferred name?
- LandlordAI
- RentIQ
- EquityStack
- DealFlow
- PropGenius
- Other: ___________

### 2. Domain Name
Do you already own a domain? If yes, what is it?
If no, should I register one? (Cost: $12/year)

### 3. AWS Account
Do you have an AWS account set up?
- If yes: I'll need IAM access to deploy
- If no: I'll create one and set it up

### 4. Start Date
When do you want to start building?
- Immediately
- Need 1-2 weeks to review plan
- Other: ___________

### 5. Missing Features
Is there ANYTHING else you want that I didn't include in this plan?

---

**READY TO BUILD?**

Once you answer the 5 questions above, we'll start Phase 1: Foundation (Weeks 1-4) and get the core product live on AWS.

No more demo data.
No more local development.
REAL platform. REAL deployment. REAL business.

Let's do this. 🚀
