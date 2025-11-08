# RentalIQ - AWS Deployment Plan
## **LAB → QA → PROD Environment Setup**

**Platform Name:** RentalIQ
**Deployment:** AWS (Multi-Environment)
**Start Date:** November 6, 2025

---

# ENVIRONMENT STRATEGY

## 3-Tier Environment Setup

### **LAB Environment** (Development & Experimentation)
- **Purpose:** Active development, testing new features, breaking changes OK
- **URL:** `lab.rentaliq.com`
- **Database:** Separate PostgreSQL (can be reset/wiped)
- **Cost:** Minimal (db.t3.micro, shared resources)
- **Access:** Developers only
- **Data:** Fake/test data, can be destroyed

### **QA Environment** (Quality Assurance & User Testing)
- **Purpose:** Feature testing, user acceptance testing, Keith's testing
- **URL:** `qa.rentaliq.com`
- **Database:** Separate PostgreSQL (stable, not wiped)
- **Cost:** Medium (db.t3.small, dedicated resources)
- **Access:** Developers + Keith + Beta testers
- **Data:** Keith's real properties (for testing features)

### **PROD Environment** (Production - Live Users)
- **Purpose:** Live platform for paying customers
- **URL:** `app.rentaliq.com` (or just `rentaliq.com`)
- **Database:** Production PostgreSQL (highly available, backed up)
- **Cost:** Full (db.t3.medium+, auto-scaling, redundancy)
- **Access:** All users
- **Data:** Real customer data, never reset

---

# DOMAIN REGISTRATION

## Register Domain: `rentaliq.com`

**Registrar Options:**
1. **Namecheap** - $8.88/year (.com)
2. **AWS Route 53** - $12/year (.com) + easier DNS management
3. **Google Domains** - $12/year (.com)

**Recommendation:** AWS Route 53 (seamless integration with AWS services)

**Subdomains to Configure:**
- `rentaliq.com` → PROD (main site)
- `app.rentaliq.com` → PROD (web app)
- `qa.rentaliq.com` → QA environment
- `lab.rentaliq.com` → LAB environment
- `api.rentaliq.com` → API endpoints (future)
- `docs.rentaliq.com` → Documentation (future)

**SSL Certificates:**
- AWS Certificate Manager (ACM) - **FREE**
- Auto-renewal
- Wildcard cert: `*.rentaliq.com`

---

# AWS ARCHITECTURE (Per Environment)

## Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ROUTE 53 (DNS)                           │
│  lab.rentaliq.com → LAB CloudFront                          │
│  qa.rentaliq.com → QA CloudFront                            │
│  app.rentaliq.com → PROD CloudFront                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ↓                     ↓                     ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ LAB          │    │ QA           │    │ PROD         │
│ CloudFront   │    │ CloudFront   │    │ CloudFront   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ LAB          │    │ QA           │    │ PROD         │
│ Amplify      │    │ Amplify      │    │ Amplify      │
│ (Next.js)    │    │ (Next.js)    │    │ (Next.js)    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ LAB RDS      │    │ QA RDS       │    │ PROD RDS     │
│ db.t3.micro  │    │ db.t3.small  │    │ db.t3.medium │
│ PostgreSQL   │    │ PostgreSQL   │    │ PostgreSQL   │
└──────────────┘    └──────────────┘    └──────────────┘

SHARED SERVICES (All environments use same):
┌─────────────────────────────────────────────────────────────┐
│ S3 Buckets (Separate per environment)                      │
│  - rentaliq-lab-files                                       │
│  - rentaliq-qa-files                                        │
│  - rentaliq-prod-files                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Lambda Functions (Separate per environment)                │
│  - Photo deletion cron                                      │
│  - Property value updates                                   │
│  - Rent reminders                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Secrets Manager (Per environment)                          │
│  - DATABASE_URL                                             │
│  - API keys (Stripe, OpenAI, etc)                          │
└─────────────────────────────────────────────────────────────┘
```

---

# COST BREAKDOWN (Monthly)

## LAB Environment
| Service | Spec | Cost |
|---------|------|------|
| Amplify | Next.js hosting | $5 (minimal traffic) |
| RDS PostgreSQL | db.t3.micro (1GB RAM) | $15 |
| S3 + CloudFront | 10GB storage, 50GB bandwidth | $3 |
| Lambda | Background jobs | $1 (free tier) |
| Secrets Manager | 3 secrets | $1 |
| **TOTAL LAB** | | **$25/month** |

## QA Environment
| Service | Spec | Cost |
|---------|------|------|
| Amplify | Next.js hosting | $10 (moderate traffic) |
| RDS PostgreSQL | db.t3.small (2GB RAM) | $30 |
| S3 + CloudFront | 25GB storage, 100GB bandwidth | $5 |
| Lambda | Background jobs | $2 |
| Secrets Manager | 3 secrets | $1 |
| **TOTAL QA** | | **$48/month** |

## PROD Environment
| Service | Spec | Cost |
|---------|------|------|
| Amplify | Next.js hosting, auto-scale | $30 (high traffic) |
| RDS PostgreSQL | db.t3.medium (4GB RAM) | $60 |
| S3 + CloudFront | 100GB storage, 1TB bandwidth | $15 |
| Lambda | Background jobs | $10 |
| ElastiCache (Redis) | cache.t3.micro | $15 |
| Secrets Manager | 5 secrets | $2 |
| CloudWatch | Logs, monitoring | $10 |
| **TOTAL PROD** | | **$142/month** |

## Shared Costs
| Service | Cost |
|---------|------|
| Route 53 | Domain + hosted zone: $13/year = $1.10/month |
| ACM SSL Certs | FREE |
| **TOTAL SHARED** | **$1.10/month** |

## **GRAND TOTAL: $216/month** (all 3 environments)

## External API Costs (Production only)
| API | Monthly Cost |
|-----|--------------|
| Bright Data (Zillow scraping) | $99 + $2/scrape |
| Google Maps API | Free tier ($200 credit) |
| OpenAI GPT-4 | ~$50 (100 analyses) |
| Twilio SMS | ~$20 (100 texts) |
| TransUnion | $15/credit check (pay per use) |
| Checkr | $20/background check (pay per use) |
| DocuSign | ~$10/month (pay per envelope) |
| **TOTAL APIs** | **~$180/month** |

## **TOTAL INFRASTRUCTURE + APIs: ~$396/month**

---

# DEPLOYMENT WORKFLOW

## Git Branch Strategy

```
main (production)
  ↑
  │ (merge after QA approval)
  │
qa (QA environment)
  ↑
  │ (merge after LAB testing)
  │
develop (LAB environment)
  ↑
  │ (feature branches)
  │
feature/* (local development)
```

## Deployment Process

### **Step 1: Feature Development (Local)**
```bash
# Create feature branch
git checkout -b feature/tenant-screening

# Work on feature locally
npm run dev

# Commit changes
git add .
git commit -m "Add tenant screening with AI scoring"

# Push to GitHub
git push origin feature/tenant-screening
```

### **Step 2: Deploy to LAB**
```bash
# Merge feature to develop branch
git checkout develop
git merge feature/tenant-screening

# Push to GitHub (auto-deploys to LAB)
git push origin develop
```

**AWS Amplify Auto-Deploy:**
- Detects push to `develop` branch
- Builds Next.js app
- Deploys to `lab.rentaliq.com`
- **Build time:** ~3-5 minutes

### **Step 3: Test in LAB**
- Keith tests feature at `lab.rentaliq.com`
- Verify feature works
- Fix any bugs, repeat Step 1-2

### **Step 4: Deploy to QA**
```bash
# Merge develop to qa branch
git checkout qa
git merge develop

# Push to GitHub (auto-deploys to QA)
git push origin qa
```

**AWS Amplify Auto-Deploy:**
- Detects push to `qa` branch
- Builds Next.js app
- Deploys to `qa.rentaliq.com`
- Uses QA database (Keith's real properties)

### **Step 5: User Acceptance Testing (QA)**
- Keith tests with REAL data (his 2 properties)
- Beta users test features
- Verify everything works end-to-end
- Fix critical bugs (back to LAB)

### **Step 6: Deploy to PROD**
```bash
# Merge qa to main branch
git checkout main
git merge qa

# Tag release
git tag -a v1.0.0 -m "Release: Tenant screening feature"

# Push to GitHub (auto-deploys to PROD)
git push origin main --tags
```

**AWS Amplify Auto-Deploy:**
- Detects push to `main` branch
- Builds Next.js app
- Deploys to `app.rentaliq.com`
- **Production is live!**

---

# DATABASE MIGRATION STRATEGY

## Schema Changes Across Environments

### **Problem:**
- LAB, QA, PROD have separate databases
- Schema changes need to propagate safely

### **Solution: Prisma Migrations**

#### **Step 1: Create Migration (LAB)**
```bash
# Make schema change in prisma/schema.prisma
# Example: Add "tenantScore" field to Tenant model

# Generate migration
npx prisma migrate dev --name add_tenant_score

# This creates:
# - Migration SQL file in prisma/migrations/
# - Updates LAB database
```

#### **Step 2: Commit Migration**
```bash
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "Add tenant score field"
git push origin develop
```

#### **Step 3: Deploy to QA**
```bash
# Merge to qa branch
git checkout qa
git merge develop
git push origin qa

# AWS Amplify runs migration automatically:
# Build step: npx prisma migrate deploy
# This applies migration to QA database
```

#### **Step 4: Deploy to PROD**
```bash
# Merge to main
git checkout main
git merge qa
git push origin main

# AWS Amplify runs migration on PROD database
```

### **Database Backup Before Migration (PROD)**
```bash
# Manual backup command (run before big migrations)
aws rds create-db-snapshot \
  --db-instance-identifier rentaliq-prod \
  --db-snapshot-identifier rentaliq-prod-backup-2024-11-06
```

**Auto-backup:**
- AWS RDS automated daily backups (7-day retention)
- Point-in-time recovery (last 5 minutes)

---

# ENVIRONMENT VARIABLES

## AWS Secrets Manager (Per Environment)

### **LAB Secrets**
```
DATABASE_URL=postgresql://user:pass@rentaliq-lab.abc123.us-east-1.rds.amazonaws.com:5432/rentaliq_lab

NEXTAUTH_SECRET=lab_secret_key_xyz
NEXTAUTH_URL=https://lab.rentaliq.com

# API Keys (use TEST keys in LAB)
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-test-...
BRIGHT_DATA_API_KEY=test_key

# Disable expensive APIs in LAB
ENABLE_ZILLOW_SCRAPING=false
ENABLE_CREDIT_CHECKS=false
```

### **QA Secrets**
```
DATABASE_URL=postgresql://user:pass@rentaliq-qa.abc123.us-east-1.rds.amazonaws.com:5432/rentaliq_qa

NEXTAUTH_SECRET=qa_secret_key_xyz
NEXTAUTH_URL=https://qa.rentaliq.com

# API Keys (use TEST keys in QA)
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-real-... (real key, but rate-limited)
BRIGHT_DATA_API_KEY=real_key

# Enable features for testing
ENABLE_ZILLOW_SCRAPING=true
ENABLE_CREDIT_CHECKS=true (test mode)
```

### **PROD Secrets**
```
DATABASE_URL=postgresql://user:pass@rentaliq-prod.abc123.us-east-1.rds.amazonaws.com:5432/rentaliq_prod

NEXTAUTH_SECRET=prod_secret_key_SUPER_SECURE
NEXTAUTH_URL=https://app.rentaliq.com

# API Keys (PRODUCTION keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
OPENAI_API_KEY=sk-prod-...
BRIGHT_DATA_API_KEY=prod_key
GOOGLE_MAPS_API_KEY=prod_key
TRANSUNION_API_KEY=prod_key
CHECKR_API_KEY=prod_key
DOCUSIGN_API_KEY=prod_key
TWILIO_ACCOUNT_SID=prod_sid
TWILIO_AUTH_TOKEN=prod_token
SENDGRID_API_KEY=prod_key

# Plaid (bank connections)
PLAID_CLIENT_ID=prod_client_id
PLAID_SECRET=prod_secret
PLAID_ENV=production

# QuickBooks
QUICKBOOKS_CLIENT_ID=prod_id
QUICKBOOKS_CLIENT_SECRET=prod_secret

# All features enabled
ENABLE_ZILLOW_SCRAPING=true
ENABLE_CREDIT_CHECKS=true
ENABLE_BACKGROUND_CHECKS=true
ENABLE_DOCUSIGN=true
```

---

# CI/CD PIPELINE (AWS Amplify)

## Build Configuration: `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        # Install dependencies
        - npm ci

        # Generate Prisma Client
        - npx prisma generate

    build:
      commands:
        # Run database migrations (QA/PROD only)
        - |
          if [ "$AWS_BRANCH" = "qa" ] || [ "$AWS_BRANCH" = "main" ]; then
            npx prisma migrate deploy
          fi

        # Build Next.js app
        - npm run build

  artifacts:
    baseDirectory: .next
    files:
      - '**/*'

  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*

# Environment-specific settings
environments:
  develop:
    buildCommand: 'npm run build'
    startCommand: 'npm run start'

  qa:
    buildCommand: 'npm run build'
    startCommand: 'npm run start'

  main:
    buildCommand: 'npm run build'
    startCommand: 'npm run start'
```

## Build Notifications

**Slack/Email Alerts:**
- Build started (LAB, QA, PROD)
- Build succeeded ✅
- Build failed ❌
- Deployment complete

**Example Notification:**
```
🚀 RentalIQ Deployment

Environment: PROD
Branch: main
Commit: abc123f - "Add tenant screening feature"
Status: ✅ SUCCESS
URL: https://app.rentaliq.com
Build Time: 3m 42s
```

---

# MONITORING & LOGGING

## CloudWatch Dashboards

### **LAB Dashboard**
- Request count
- Error rate
- Build/deployment status

### **QA Dashboard**
- Request count
- Error rate
- Feature usage (which features Keith is testing)
- Database query performance

### **PROD Dashboard**
- Real-time request count
- Error rate (alerts if >1%)
- API latency (p50, p95, p99)
- Database connections
- Lambda function execution time
- User signups
- Revenue (Stripe events)

## Alerts

**Critical Alerts (PROD only):**
- Error rate >1% → SMS to Keith
- Database CPU >80% → Email
- API latency >3s → Email
- Stripe payment failures → SMS
- Disk space >85% → Email

**Warning Alerts:**
- Error rate >0.5%
- Database connections >50
- Lambda timeout >10s

---

# ROLLBACK STRATEGY

## If Deployment Breaks PROD

### **Option 1: Instant Rollback (AWS Amplify)**
```bash
# From AWS Console or CLI
aws amplify start-deployment \
  --app-id abc123 \
  --branch-name main \
  --job-id previous_job_id

# Reverts to previous working deployment
# Takes ~30 seconds
```

### **Option 2: Git Revert**
```bash
# Revert bad commit
git revert HEAD

# Push to trigger new deployment
git push origin main

# Takes ~3-5 minutes (full build)
```

### **Option 3: Database Rollback**
```bash
# Restore from automated backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier rentaliq-prod \
  --target-db-instance-identifier rentaliq-prod-restored \
  --restore-time 2024-11-06T10:00:00Z

# Takes ~10-15 minutes
```

---

# INITIAL SETUP CHECKLIST

## **Phase 0: Pre-Deployment (Week 0)**

### Domain & DNS
- [ ] Register `rentaliq.com` on AWS Route 53 ($12/year)
- [ ] Create hosted zone in Route 53
- [ ] Request SSL certificate in ACM (*.rentaliq.com)

### AWS Account Setup
- [ ] Verify Keith's AWS account access
- [ ] Enable billing alerts ($400/month threshold)
- [ ] Create IAM user for deployment (programmatic access)
- [ ] Set up AWS CLI on local machine

### GitHub Setup
- [ ] Create GitHub repository: `rentaliq-platform`
- [ ] Create branches: `develop`, `qa`, `main`
- [ ] Set up branch protection (require PR for `main`)
- [ ] Connect GitHub to AWS Amplify

### Database Setup (RDS)
- [ ] Create LAB database (db.t3.micro)
- [ ] Create QA database (db.t3.small)
- [ ] Create PROD database (db.t3.medium)
- [ ] Enable automated backups (PROD: 7 days)
- [ ] Store DB credentials in Secrets Manager

### S3 Buckets
- [ ] Create `rentaliq-lab-files`
- [ ] Create `rentaliq-qa-files`
- [ ] Create `rentaliq-prod-files`
- [ ] Set lifecycle policies (delete old files)

### Amplify Apps
- [ ] Create LAB app (branch: `develop` → `lab.rentaliq.com`)
- [ ] Create QA app (branch: `qa` → `qa.rentaliq.com`)
- [ ] Create PROD app (branch: `main` → `app.rentaliq.com`)
- [ ] Configure build settings (amplify.yml)
- [ ] Add environment variables from Secrets Manager

### External APIs
- [ ] Stripe account (test + live keys)
- [ ] OpenAI API key
- [ ] Google Maps API key
- [ ] Bright Data account
- [ ] HUD API (if available)
- [ ] TransUnion account (tenant screening)
- [ ] Checkr account (background checks)
- [ ] DocuSign account
- [ ] Twilio account (SMS)
- [ ] SendGrid account (email)

---

# TIMELINE

## **Week 1: Infrastructure Setup**
- Day 1-2: Domain, AWS account, GitHub
- Day 3-4: RDS databases, S3 buckets
- Day 5-7: Amplify setup, test deployments

**Deliverable:** All 3 environments (LAB, QA, PROD) deployed with "Hello World"

## **Week 2-4: Core Development (LAB)**
- Build property management features
- Build tenant management features
- Test in LAB environment
- Deploy to QA for Keith's testing

**Deliverable:** Keith can add properties, track equity, manage tenants in QA

## **Week 5-8: Feature Completion (QA)**
- Tenant screening
- Lease generation
- Rent collection
- Photo management
- Keith tests with REAL data in QA

**Deliverable:** Full tenant management working in QA

## **Week 9-12: Property Analysis (LAB → QA)**
- Google Maps search
- CMA reports
- 3-Expert AI analysis
- Test in LAB, deploy to QA

**Deliverable:** Property analysis tool ready

## **Week 13-16: Advanced Features**
- QuickBooks integration
- Maintenance management
- Automated lease renewals
- Refinance alerts

**Deliverable:** Platform feature-complete in QA

## **Week 17-20: Polish & Launch**
- Bug fixes
- Performance optimization
- User onboarding
- Marketing site
- **🚀 LAUNCH TO PROD**

---

# NEXT STEPS (Immediate)

## **TODAY (November 6, 2025):**

1. **Register Domain**
   - Go to AWS Route 53
   - Register `rentaliq.com` ($12/year)
   - Create hosted zone
   - Request SSL certificate (*.rentaliq.com)

2. **Create GitHub Repo**
   - Create repo: `rentaliq-platform`
   - Push current code
   - Create branches: `develop`, `qa`, `main`

3. **Set Up AWS RDS (LAB Database)**
   - Create db.t3.micro PostgreSQL instance
   - Name: `rentaliq-lab`
   - Store credentials in Secrets Manager

4. **Deploy to LAB**
   - Connect GitHub to AWS Amplify
   - Deploy `develop` branch → `lab.rentaliq.com`
   - Verify "Hello World" works

**Tomorrow:** Set up QA and PROD environments

---

**READY TO START?**

Confirm:
1. ✅ Platform name: RentalIQ
2. ✅ Domain to register: rentaliq.com
3. ✅ AWS account: Ready
4. ✅ 3 environments: LAB → QA → PROD
5. ✅ Start building core features, add more later

**Should I proceed with domain registration and infrastructure setup?**
