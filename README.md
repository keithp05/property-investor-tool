# 🏠 Property Investor Tool

A complete Real Estate Investor Platform for finding properties, analyzing deals, managing tenants, and streamlining property operations.

[![GitHub](https://img.shields.io/badge/GitHub-property--investor--tool-blue?logo=github)](https://github.com/keithp05/property-investor-tool)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/keithp05/property-investor-tool.git
cd property-investor-tool

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

Visit http://localhost:3000 to see your app!

---

## ✨ Features

### 🔍 Property Search
- **Multi-Source Aggregation** - Search from County Records, Craigslist, and Bright Data
- **3 Search Methods** - City/State, ZIP code, or GPS location
- **Auction Properties** - Track tax sales and foreclosures with countdown timers
- **Demo Data Fallback** - Works without API keys for testing

### 📊 AI-Powered Analysis
- **CMA Reports** - AI-generated Comparative Market Analysis with GPT-4o-mini
- **Sales Comparables** - Find similar properties with automated valuation
- **Rental Comparables** - Estimate rental income potential
- **Crime Scoring** - A-F safety grades for any location
- **Investment Recommendations** - AI analysis of investment potential

### 👥 Tenant Management
- **Tenant Database** - Track tenant information and lease details
- **Lease Tracking** - Monitor lease expiration dates
- **Renewal Workflow** - Automated lease renewal process
- **Screening** - Store tenant screening data

### 💰 Billing & Payments
- **15+ Bill Types** - Rent, utilities, HOA, lawn care, pest control, and more
- **Recurring Bills** - Auto-generate monthly/quarterly/annual bills
- **Payment Tracking** - 10 payment methods supported
- **Late Fees** - Automatic late fee calculation
- **Auto-Pay** - Tenant auto-payment enrollment

### 📝 Lease Management
- **Lease Generation** - Create professional leases with line items
- **Vendor Accounts** - Track account numbers for utilities and services
- **Renewal Workflow** - 90-day lease expiration warnings
- **Calendar Invites** - Send rent reminders with .ics files

### 🏗️ Property Inspections
- **Move-In/Move-Out** - Document property condition
- **Photo Uploads** - Before/after photo comparison
- **LiDAR Floor Plans** - iOS RoomPlan integration
- **AI Damage Assessment** - Classify wear & tear vs damage
- **Security Deposits** - Auto-calculate refund amounts

### 💼 Accounting Integrations
- **10+ Platforms** - QuickBooks, Xero, Wave, FreshBooks, and more
- **Auto-Sync** - Income and expenses sync automatically
- **OAuth 2.0** - Secure authentication
- **Transaction Matching** - Link bills to accounting entries

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma ORM (SQLite dev, PostgreSQL prod)
- **AI**: OpenAI GPT-4o-mini
- **APIs**: Bright Data, OpenStreetMap, OpenAI Vision

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/keithp05/property-investor-tool.git
   cd property-investor-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```env
   # Required
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

   # Optional - Property Data
   BRIGHT_DATA_API_TOKEN="your-token-here"
   BRIGHT_DATA_DATASET_ID="your-dataset-id"

   # Optional - AI Analysis
   OPENAI_API_KEY="sk-your-key-here"
   ```

4. **Initialize the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Visit http://localhost:3000
   - Create an account and start exploring!

---

## 🚀 Deployment

### Quick Deploy to Vercel (5 minutes)

1. **Via Vercel Dashboard**
   - Go to https://vercel.com/signup
   - Click "Continue with GitHub"
   - Import `keithp05/property-investor-tool`
   - Click "Deploy"

2. **Via Command Line**
   ```bash
   npx vercel login
   npx vercel --prod --yes
   ```

3. **Add Environment Variables**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and API keys

4. **Optional: Add Production Database**
   ```bash
   # Set up AWS RDS PostgreSQL with auto-scaling
   ./setup-aws-rds.sh

   # Run migrations
   ./prepare-production-db.sh
   ```

**Full deployment guide**: See [QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md)

---

## 💰 Pricing & Costs

### Development (Free)
- Runs on SQLite with demo data
- Perfect for testing and development
- **Cost: $0/month**

### Production (Starting at ~$15/month)
- **Vercel**: FREE (or $20/mo for custom domain)
- **AWS RDS PostgreSQL**: ~$12-15/month (db.t4g.micro)
- **Auto-scales** to $240/month at high traffic

---

## 📁 Project Structure

```
property-investor-tool/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── properties/        # Property search & details
│   │   ├── tenants/           # Tenant management
│   │   └── ...
│   ├── services/              # Business logic
│   │   ├── propertyAggregator.ts
│   │   ├── propertyAnalysisService.ts
│   │   ├── demoDataService.ts
│   │   └── ...
│   └── types/                 # TypeScript types
├── scripts/                   # Deployment scripts
│   ├── deploy-to-vercel.sh
│   ├── setup-aws-rds.sh
│   └── prepare-production-db.sh
└── docs/                      # Documentation
    ├── QUICK_START_DEPLOYMENT.md
    ├── DEPLOYMENT_CHECKLIST.md
    └── ...
```

---

## 🎯 Use Cases

### For Real Estate Investors
- Find undervalued properties and auction deals
- Analyze investment potential with AI-powered reports
- Track portfolio performance

### For Landlords
- Manage multiple tenants and properties
- Automate rent collection and billing
- Track maintenance and repairs

### For Property Managers
- Handle lease renewals and inspections
- Integrate with accounting software
- Generate professional reports

---

## 📚 Documentation

- **[READY_TO_DEPLOY.md](./READY_TO_DEPLOY.md)** - Deployment overview
- **[QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md)** - Step-by-step deployment
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Complete checklist
- **[DEPLOY.md](./DEPLOY.md)** - Technical details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[FEATURE_SUMMARY.md](./FEATURE_SUMMARY.md)** - Complete feature list

---

## 🔒 Security

- ✅ HTTPS/SSL encryption (automatic via Vercel)
- ✅ Environment variables encrypted
- ✅ Database SSL connections
- ✅ No hardcoded API keys
- ✅ OAuth 2.0 for integrations

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [OpenAI](https://openai.com/)
- Property data from [Bright Data](https://brightdata.com/)
- Deployed on [Vercel](https://vercel.com/)

---

## 📞 Support

- **GitHub Issues**: [Report a bug](https://github.com/keithp05/property-investor-tool/issues)
- **Documentation**: See the `docs/` directory
- **Vercel Support**: https://vercel.com/support

---

## 🎉 Live Demo

**Coming Soon** - Check back for a live demo URL!

---

**Built with ❤️ for real estate investors**

