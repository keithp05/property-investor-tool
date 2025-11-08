# RentalIQ - Quick Deploy Guide (AWS Console)
## Get RentalIQ Live in 30 Minutes

**GitHub Repository:** https://github.com/keithp05/property-investor-tool
**Branches:** `develop` (LAB), `qa` (QA), `main` (PROD)
**AWS Account:** 306095098617

---

# 🚀 FASTEST PATH TO DEPLOYMENT

Since AWS Amplify and domain registration work best through the Console, here's the quickest way to get RentalIQ live:

---

## STEP 1: Deploy to AWS Amplify (15 minutes)

### Open AWS Amplify Console:
https://console.aws.amazon.com/amplify/home?region=us-east-1

### Click "New app" → "Host web app"

### Select GitHub:
- Click "GitHub"
- Click "Authorize AWS Amplify" (if not already authorized)

### Select Repository:
- Repository: `keithp05/property-investor-tool`
- Branch: `develop` (for LAB environment)
- Click "Next"

### App Settings:
- App name: `rentaliq-lab`
- Environment: `LAB`
- Build settings: **Auto-detected** (uses your amplify.yml file)
- Click "Next"

### Add Environment Variables (IMPORTANT!):
Click "Advanced settings" and add these:

```
DATABASE_URL = TO_BE_CREATED
NEXTAUTH_SECRET = generate-this-below
NEXTAUTH_URL = https://[your-amplify-url].amplifyapp.com
NODE_ENV = development
NEXT_PUBLIC_APP_NAME = RentalIQ
NEXT_PUBLIC_ENVIRONMENT = LAB
```

**Generate NEXTAUTH_SECRET:**
Run in terminal:
```bash
openssl rand -base64 32
```
Copy the output and paste it as `NEXTAUTH_SECRET` value.

### Save and Deploy:
- Click "Next" → "Save and deploy"
- **Wait 3-5 minutes** for first build

### Get Your URL:
Once deployed, you'll get a URL like:
`https://develop.d1a2b3c4d5e6f7.amplifyapp.com`

**Save this URL!**

---

## STEP 2: Create PostgreSQL Database (10 minutes)

### Open RDS Console:
https://console.aws.amazon.com/rds/home?region=us-east-1

### Click "Create database"

### Choose settings:
- **Engine:** PostgreSQL
- **Version:** PostgreSQL 15.4
- **Templates:** Free tier
- **DB instance identifier:** `rentaliq-lab`
- **Master username:** `rentaliq_admin`
- **Master password:** [Create strong password - SAVE THIS!]
  - Example: `RentalIQ_Lab_2024!xY9#aB`
- **DB instance class:** db.t3.micro
- **Storage:** 20 GB
- **Public access:** Yes (for LAB)
- **VPC security group:** Create new
  - Name: `rentaliq-lab-db-sg`
- **Initial database name:** `rentaliq_lab`

### Click "Create database"

**Wait 10 minutes** for database to be created.

### Get Database Endpoint:
Once created:
1. Click on `rentaliq-lab` database
2. Go to "Connectivity & security" tab
3. Copy the **Endpoint** (looks like: `rentaliq-lab.abc123.us-east-1.rds.amazonaws.com`)

### Configure Security Group:
1. Click the security group name (under "VPC security groups")
2. Click "Edit inbound rules"
3. Click "Add rule"
   - Type: PostgreSQL
   - Port: 5432
   - Source: Anywhere-IPv4 (0.0.0.0/0) - **LAB only!**
4. Click "Save rules"

---

## STEP 3: Update Amplify with Database URL (2 minutes)

### Go back to Amplify Console:
https://console.aws.amazon.com/amplify/home?region=us-east-1

### Click on `rentaliq-lab` app

### Go to "Environment variables" (left sidebar)

### Edit `DATABASE_URL`:
Replace `TO_BE_CREATED` with:
```
postgresql://rentaliq_admin:[YOUR_PASSWORD]@[YOUR_ENDPOINT]:5432/rentaliq_lab
```

**Example:**
```
postgresql://rentaliq_admin:RentalIQ_Lab_2024!xY9#aB@rentaliq-lab.abc123.us-east-1.rds.amazonaws.com:5432/rentaliq_lab
```

### Save Changes

### Redeploy:
- Go to "Deployments" tab
- Click "Redeploy this version"
- Wait 3-5 minutes

---

## STEP 4: Initialize Database (3 minutes)

### Run on your local machine:

```bash
cd "/Users/keithperez/Documents/Claud/Realestate App"

# Set database URL (use YOUR actual values!)
export DATABASE_URL="postgresql://rentaliq_admin:YOUR_PASSWORD@YOUR_ENDPOINT:5432/rentaliq_lab"

# Run migrations (create all tables)
npx prisma migrate deploy

# Create admin account
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
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

  console.log('✅ Admin user created: keith@rentaliq.com');
  console.log('   Password: RentalIQ2024!');

  await prisma.\$disconnect();
}

seed().catch(console.error);
"
```

---

## STEP 5: Test Your Deployment! (1 minute)

### Open your Amplify URL in browser:
`https://develop.d1a2b3c4d5e6f7.amplifyapp.com`

### You should see:
- RentalIQ login page

### Login with:
- Email: `keith@rentaliq.com`
- Password: `RentalIQ2024!`

### After login:
- ✅ See empty dashboard
- ✅ Click "Add Property" → form loads
- ✅ Navigation works

### 🎉 SUCCESS! RentalIQ is LIVE!

---

## OPTIONAL: Add Custom Domain (Tomorrow)

### Register Domain:
https://console.aws.amazon.com/route53/home#DomainRegistration:

1. Search for: `rentaliq.com`
2. Add to cart → Purchase ($12/year)
3. Wait for registration (can take hours)

### Add Domain to Amplify:
Once registered:
1. In Amplify Console → "Domain management"
2. Click "Add domain"
3. Select `rentaliq.com`
4. Add subdomain: `lab` → branch `develop`
5. Amplify auto-configures DNS + SSL

**Result:** `https://lab.rentaliq.com`

---

## WHAT YOU HAVE NOW:

✅ **GitHub:** Code in 3 branches (develop, qa, main)
✅ **AWS Amplify:** Auto-deploys on git push to develop
✅ **PostgreSQL:** Database with schema + admin account
✅ **Live URL:** https://[your-url].amplifyapp.com
✅ **Login:** keith@rentaliq.com / RentalIQ2024!

---

## NEXT STEPS:

1. **Add Your Properties:**
   - Click "Add Property"
   - Enter: 260 Nesting Tree, San Antonio, TX 78253
   - Enter: 8302 Chivalry, San Antonio, TX 78254

2. **Test Features:**
   - Property dashboard
   - Equity tracking
   - Financial analytics

3. **Deploy QA Environment:**
   - Same process, use `qa` branch
   - Separate database

4. **Deploy PROD:**
   - Same process, use `main` branch
   - Production database with backups

---

## TROUBLESHOOTING:

### Build Fails:
- Check Amplify build logs
- Verify environment variables are set
- Ensure DATABASE_URL is correct

### Can't Connect to Database:
- Check security group allows port 5432
- Verify password in DATABASE_URL
- Ensure RDS is "Available" status

### Login Fails:
- Verify you ran database migrations
- Verify you created admin user
- Check Amplify logs for errors

---

## COSTS:

**Current Setup (LAB only):**
- Amplify: ~$5/month
- RDS db.t3.micro: ~$15/month
- **Total: ~$20/month**

**With Domain:**
- rentaliq.com: $12/year = $1/month
- **Total: ~$21/month**

---

## SUMMARY:

This gets you a fully functional RentalIQ platform deployed to AWS in ~30 minutes.

The platform will:
- Auto-deploy when you push to GitHub
- Run on production-grade infrastructure
- Scale as you add features
- Be accessible from anywhere

**Your Amplify URL is your live platform - start using it!**

Questions? Issues? Let me know!
