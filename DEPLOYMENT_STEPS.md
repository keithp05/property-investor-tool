# RentalIQ AWS Deployment - Step-by-Step Guide
## Execute These Steps to Deploy LAB Environment

**Platform:** RentalIQ
**Target:** LAB Environment (lab.rentaliq.com)
**Date:** November 6, 2025

---

# STEP 1: Register Domain (15 minutes)

## Option A: AWS Route 53 (Recommended - $12/year)

1. Go to AWS Console: https://console.aws.amazon.com/route53
2. Click **"Registered domains"** → **"Register domain"**
3. Search for: `rentaliq.com`
4. If available, click **"Add to cart"** → **"Continue"**
5. Fill in contact information (use your real info):
   - Contact Type: Person
   - First Name: Keith
   - Last Name: Perez
   - Email: [your-email]
   - Phone: +1.210[rest of number]
   - Address: [your address]
6. **Auto-renew:** Enable (checked)
7. **Privacy protection:** Enable (checked) - hides your info from WHOIS
8. Click **"Continue"** → Review → **"Complete purchase"**
9. **Cost:** $12/year

**Result:** Domain registration in progress (takes 5-15 minutes to complete)

---

## Option B: Namecheap (Cheaper - $8.88/year)

1. Go to: https://www.namecheap.com
2. Search: `rentaliq.com`
3. Add to cart → Checkout
4. **IMPORTANT:** After purchase, you need to point nameservers to AWS Route 53:
   - In Namecheap dashboard → Domain List → Manage
   - Custom DNS → Add NS records from AWS Route 53 hosted zone

**Result:** Domain registered, but requires manual DNS setup

---

# STEP 2: Request SSL Certificate (5 minutes)

1. Go to AWS Certificate Manager: https://console.aws.amazon.com/acm
2. **IMPORTANT:** Make sure you're in **us-east-1 (N. Virginia)** region (required for CloudFront)
3. Click **"Request certificate"** → **"Request a public certificate"**
4. Domain names:
   - Primary: `rentaliq.com`
   - Add another: `*.rentaliq.com` (wildcard for all subdomains)
5. Validation method: **DNS validation** (recommended)
6. Click **"Request"**
7. AWS will show DNS records to add:
   ```
   Name: _xxxxx.rentaliq.com
   Type: CNAME
   Value: _yyyyy.acm-validations.aws.
   ```
8. If you registered with Route 53: Click **"Create records in Route 53"** (auto-adds DNS records)
9. If you used Namecheap: Manually add CNAME records in Namecheap DNS

**Wait 5-10 minutes for validation to complete**

**Result:** SSL certificate validated and ready to use

---

# STEP 3: Create GitHub Repository (10 minutes)

## Via GitHub Website:

1. Go to: https://github.com/new
2. Repository name: `rentaliq-platform`
3. Description: `RentalIQ - Real Estate Investment Platform`
4. Visibility: **Private** (recommended for now)
5. **Do NOT** initialize with README (we have existing code)
6. Click **"Create repository"**

## Push Existing Code:

```bash
cd "/Users/keithperez/Documents/Claud/Realestate App"

# Initialize git if not already
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
prisma/.env
*.db
*.db-journal

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
lerna-debug.log*

# OS
.DS_Store
*.pem
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output/

# Misc
*.tsbuildinfo
next-env.d.ts
.vercel
EOF

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/rentaliq-platform.git

# Create branches
git checkout -b develop  # LAB environment
git add .
git commit -m "Initial commit - RentalIQ platform

Core features:
- Property management dashboard
- Tenant management
- Equity tracking
- Financial analytics
- Database schema (Prisma)
- Authentication (NextAuth)

Ready for LAB deployment"

git push -u origin develop

# Create QA branch
git checkout -b qa
git push -u origin qa

# Create main (PROD) branch
git checkout -b main
git push -u origin main

# Go back to develop for active development
git checkout develop
```

**Result:** GitHub repo with 3 branches ready for deployment

---

# STEP 4: Create LAB Database (20 minutes)

1. Go to AWS RDS: https://console.aws.amazon.com/rds
2. Click **"Create database"**

## Database Settings:

**Engine options:**
- Engine type: **PostgreSQL**
- Engine version: **PostgreSQL 15.4** (or latest 15.x)

**Templates:**
- Select: **Free tier** (for LAB)

**Settings:**
- DB instance identifier: `rentaliq-lab`
- Master username: `rentaliq_admin`
- Master password: **[GENERATE STRONG PASSWORD]**
  - Example: `RentalIQ_Lab_2024!aB3#xY9`
  - **SAVE THIS PASSWORD!**
- Confirm password: [same]

**DB instance class:**
- Select: **db.t3.micro** (1 vCPU, 1 GB RAM)
- Cost: ~$15/month

**Storage:**
- Storage type: **General Purpose SSD (gp3)**
- Allocated storage: **20 GB**
- Storage autoscaling: **Disable** (LAB doesn't need it)

**Connectivity:**
- Compute resource: **Don't connect to an EC2 instance**
- VPC: **Default VPC** (or create new)
- Public access: **Yes** (LAB needs external access)
- VPC security group: **Create new**
  - Name: `rentaliq-lab-db-sg`
- Availability Zone: **No preference**

**Database authentication:**
- Select: **Password authentication**

**Monitoring:**
- Enable Enhanced monitoring: **No** (save cost in LAB)

**Additional configuration:**
- Initial database name: `rentaliq_lab`
- Backup retention period: **1 day** (minimal for LAB)
- Enable encryption: **No** (LAB, save cost)
- Enable automated backups: **Yes** (1 day)
- Maintenance window: **No preference**

**Estimated monthly costs:** ~$15/month

3. Click **"Create database"**

**Wait 10-15 minutes for database to be created**

4. Once created, click on `rentaliq-lab` → **Connectivity & security** tab
5. Copy the **Endpoint**:
   ```
   rentaliq-lab.abc123def456.us-east-1.rds.amazonaws.com
   ```

6. **Security Group Configuration:**
   - Click the security group: `rentaliq-lab-db-sg`
   - Click **"Edit inbound rules"**
   - Add rule:
     - Type: **PostgreSQL**
     - Protocol: **TCP**
     - Port: **5432**
     - Source: **0.0.0.0/0** (anywhere - LAB only, NOT for PROD!)
   - Click **"Save rules"**

**Result:** PostgreSQL database ready and accessible

---

# STEP 5: Store Database Credentials (5 minutes)

1. Go to AWS Secrets Manager: https://console.aws.amazon.com/secretsmanager
2. Click **"Store a new secret"**

## Secret #1: Database Credentials

- Secret type: **Other type of secret**
- Key/value pairs (click **"Plaintext"** tab):

```json
{
  "username": "rentaliq_admin",
  "password": "RentalIQ_Lab_2024!aB3#xY9",
  "host": "rentaliq-lab.abc123def456.us-east-1.rds.amazonaws.com",
  "port": 5432,
  "database": "rentaliq_lab",
  "url": "postgresql://rentaliq_admin:RentalIQ_Lab_2024!aB3#xY9@rentaliq-lab.abc123def456.us-east-1.rds.amazonaws.com:5432/rentaliq_lab"
}
```

**Replace with YOUR actual:**
- Password (from Step 4)
- Host/endpoint (from Step 4)

- Encryption key: **aws/secretsmanager** (default)
- Click **"Next"**

**Secret name and description:**
- Secret name: `rentaliq/lab/database`
- Description: `RentalIQ LAB Database Credentials`
- Tags: (optional)
  - Key: `Environment`, Value: `LAB`
  - Key: `Project`, Value: `RentalIQ`
- Click **"Next"**

**Rotation:** Disable (not needed for LAB)
- Click **"Next"** → **"Store"**

**Cost:** $0.40/month per secret

## Secret #2: Application Environment Variables

- Click **"Store a new secret"** again
- Secret type: **Other type of secret**
- Plaintext:

```json
{
  "NEXTAUTH_SECRET": "lab-nextauth-CHANGE-THIS-TO-RANDOM-STRING",
  "NEXTAUTH_URL": "https://lab.rentaliq.com",
  "NODE_ENV": "development",
  "ENABLE_ZILLOW_SCRAPING": "false",
  "ENABLE_CREDIT_CHECKS": "false",
  "AWS_REGION": "us-east-1",
  "AWS_S3_BUCKET": "rentaliq-lab-files"
}
```

**Generate NEXTAUTH_SECRET:**
```bash
# Run this in terminal:
openssl rand -base64 32
# Example output: kJ7mP4nQ8tR2wS9xV1bC5dE6fG3hI0jK4lM7nO8pQ=
# Replace in secret above
```

- Secret name: `rentaliq/lab/env`
- Description: `RentalIQ LAB Environment Variables`
- Click **"Next"** → **"Next"** → **"Store"**

**Result:** Credentials stored securely, ready for Amplify

---

# STEP 6: Initialize Database Schema (10 minutes)

```bash
cd "/Users/keithperez/Documents/Claud/Realestate App"

# Get database URL from Secrets Manager
export DATABASE_URL="postgresql://rentaliq_admin:YOUR_PASSWORD@rentaliq-lab.ENDPOINT.us-east-1.rds.amazonaws.com:5432/rentaliq_lab"

# Test connection
npx prisma db execute --url "$DATABASE_URL" --stdin <<EOF
SELECT version();
EOF

# If connection works, you'll see PostgreSQL version

# Generate Prisma Client
npx prisma generate

# Run migrations (create all tables)
npx prisma migrate deploy

# Seed database with your admin account
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  console.log('Creating admin user...');

  const hashedPassword = await bcrypt.hash('RentalIQ2024!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'keith@rentaliq.com' },
    update: {},
    create: {
      email: 'keith@rentaliq.com',
      password: hashedPassword,
      name: 'Keith Perez',
      role: 'LANDLORD',
      subscriptionTier: 'ENTERPRISE',
    }
  });

  const landlord = await prisma.landlordProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      phone: '210-555-0100',
      company: 'Keith Perez Properties'
    }
  });

  console.log('✅ Admin user created');
  console.log('Email: keith@rentaliq.com');
  console.log('Password: RentalIQ2024!');
  console.log('Role: LANDLORD (ENTERPRISE tier)');

  await prisma.\$disconnect();
}

seed().catch(console.error);
"
```

**Result:** Database tables created, admin account ready

---

# STEP 7: Create S3 Bucket (5 minutes)

1. Go to AWS S3: https://console.aws.amazon.com/s3
2. Click **"Create bucket"**

**Bucket name:** `rentaliq-lab-files`
- Must be globally unique
- If taken, try: `rentaliq-lab-files-[random-number]`

**AWS Region:** **us-east-1** (same as RDS)

**Object Ownership:** **ACLs disabled** (recommended)

**Block Public Access settings:**
- **Block all public access:** ✅ Checked (files are private by default)

**Bucket Versioning:** **Disable** (LAB doesn't need versions)

**Tags:**
- Key: `Environment`, Value: `LAB`
- Key: `Project`, Value: `RentalIQ`

**Default encryption:**
- Encryption type: **Server-side encryption with Amazon S3 managed keys (SSE-S3)**

**Click "Create bucket"**

## Configure Lifecycle Policy (Auto-delete old files):

1. Click on bucket: `rentaliq-lab-files`
2. Go to **"Management"** tab → **"Create lifecycle rule"**
3. Lifecycle rule name: `delete-old-lab-files`
4. Rule scope: **Apply to all objects in the bucket**
5. Lifecycle rule actions: ✅ **Expire current versions of objects**
6. Days after object creation: **90** (delete after 90 days in LAB)
7. Click **"Create rule"**

## Configure CORS (Allow uploads from web app):

1. Go to **"Permissions"** tab → **"Cross-origin resource sharing (CORS)"**
2. Click **"Edit"** → Paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "https://lab.rentaliq.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

3. Click **"Save changes"**

**Result:** S3 bucket ready for file storage

---

# STEP 8: Deploy to AWS Amplify (30 minutes)

1. Go to AWS Amplify: https://console.aws.amazon.com/amplify
2. Click **"New app"** → **"Host web app"**

## Connect to GitHub:

3. Select **"GitHub"** → Click **"Continue"**
4. Click **"Authorize AWS Amplify"** (authenticate with GitHub)
5. Select repository: **rentaliq-platform**
6. Select branch: **develop** (for LAB environment)
7. Click **"Next"**

## Configure build settings:

**App name:** `rentaliq-lab`

**Environment:** `LAB`

**Build and test settings:**

Amplify should auto-detect Next.js and create this `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npx prisma generate
    build:
      commands:
        - npx prisma migrate deploy
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

If not auto-detected, click **"Edit"** and paste the above.

**Click "Next"**

## Add Environment Variables:

8. Click **"Advanced settings"**
9. Add environment variables (get from Secrets Manager):

**From `rentaliq/lab/database` secret:**
```
DATABASE_URL = postgresql://rentaliq_admin:PASSWORD@rentaliq-lab.ENDPOINT.us-east-1.rds.amazonaws.com:5432/rentaliq_lab
```

**From `rentaliq/lab/env` secret:**
```
NEXTAUTH_SECRET = [your-generated-secret]
NEXTAUTH_URL = https://lab.rentaliq.com
NODE_ENV = development
AWS_REGION = us-east-1
AWS_S3_BUCKET = rentaliq-lab-files
ENABLE_ZILLOW_SCRAPING = false
ENABLE_CREDIT_CHECKS = false
```

**Additional required:**
```
NEXT_PUBLIC_APP_NAME = RentalIQ
NEXT_PUBLIC_ENVIRONMENT = LAB
```

10. Click **"Next"** → Review → **"Save and deploy"**

## First Build (takes 3-5 minutes):

Amplify will:
1. Clone your GitHub repo
2. Install dependencies (`npm ci`)
3. Generate Prisma client
4. Run database migrations
5. Build Next.js app
6. Deploy to CloudFront CDN

**Watch the build logs in real-time**

---

## Configure Custom Domain:

11. Once build succeeds, click **"Domain management"** (left sidebar)
12. Click **"Add domain"**
13. Select domain: **rentaliq.com** (if registered with Route 53, it appears in dropdown)
14. Click **"Configure domain"**
15. Add subdomain:
    - Subdomain: `lab`
    - Branch: `develop`
    - Click **"Save"**
16. Amplify will:
    - Auto-configure Route 53 DNS records
    - Attach SSL certificate from ACM
    - Configure CloudFront distribution

**Wait 5-10 minutes for DNS propagation**

**Result:** `https://lab.rentaliq.com` is LIVE! 🚀

---

# STEP 9: Test LAB Deployment (5 minutes)

1. Open browser: **https://lab.rentaliq.com**
2. You should see RentalIQ login page
3. Login with:
   - Email: `keith@rentaliq.com`
   - Password: `RentalIQ2024!`
4. After login, you should see:
   - Empty dashboard (no properties yet)
   - Navbar with "Add Property", "My Properties", "Tenants", etc.
   - Your name in top right corner
5. Test navigation:
   - Click "Add Property" → Form should load
   - Click "My Properties" → Should show empty state
   - Click profile dropdown → Should show ENTERPRISE tier
6. **SUCCESS!** ✅ LAB environment is live

---

# TROUBLESHOOTING

## Build Fails with "Prisma Client not found":

**Solution:** Make sure `npx prisma generate` is in preBuild commands

## Database connection fails:

**Solution:**
1. Check security group allows inbound 5432 from 0.0.0.0/0
2. Verify DATABASE_URL is correct (password, endpoint)
3. Check RDS is in "Available" state

## Domain not resolving:

**Solution:** DNS propagation takes 5-10 minutes. Check:
```bash
dig lab.rentaliq.com
# Should show CloudFront distribution address
```

## SSL certificate pending validation:

**Solution:** Check DNS records in Route 53 for CNAME validation records

---

# NEXT STEPS (After LAB is Live)

✅ LAB deployed and working
⏭️ Set up QA environment (tomorrow)
⏭️ Set up PROD environment (next week)
⏭️ Start building core features in LAB

---

**Estimated Total Time:** 2 hours
**Estimated Total Cost:** $25/month (LAB environment)

**Questions? Issues? Let me know and I'll help troubleshoot!**
