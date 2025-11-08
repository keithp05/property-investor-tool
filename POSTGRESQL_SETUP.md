# PostgreSQL Setup Guide

## Phase 1 Authentication & Database - Setup Instructions

Your Prisma schema is ready with all Phase 1 models! Now you need to set up PostgreSQL.

## Install PostgreSQL on macOS

### Option 1: Homebrew (Recommended)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create your database
createdb realestate_investor
```

### Option 2: Postgres.app (GUI)

1. Download from https://postgresapp.com/
2. Install and open Postgres.app
3. Click "Initialize" to create a new PostgreSQL server
4. Database will run on `localhost:5432`

### Option 3: Docker

```bash
# Run PostgreSQL in Docker
docker run --name realestate-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=user \
  -e POSTGRES_DB=realestate_investor \
  -p 5432:5432 \
  -d postgres:16
```

## Update .env File

After installing PostgreSQL, update your `.env` file with the correct credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/realestate_investor"
```

Change `user` and `password` to match your PostgreSQL installation:
- **Homebrew**: Default user is your macOS username, no password
- **Postgres.app**: Default user is your macOS username, no password
- **Docker**: Use the credentials you set in the docker run command

### Example for Homebrew/Postgres.app:
```env
DATABASE_URL="postgresql://keithperez@localhost:5432/realestate_investor"
```

### Example for Docker:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/realestate_investor"
```

## Run Prisma Migrations

Once PostgreSQL is running and `.env` is configured:

```bash
# Run migrations to create all tables
npx prisma migrate dev --name phase1_init

# This will create:
# - User, Account, Session tables (NextAuth)
# - LandlordProfile, TenantProfile
# - Property, PropertyPhoto (with cloud-agnostic fields)
# - Tenant, RentPayment (with Stripe, QuickBooks fields)
# - MaintenanceRequest, MaintenancePhoto
# - WeatherData (for dashboard widget)
```

## Verify Setup

```bash
# Open Prisma Studio to view your database
npx prisma studio

# This will open http://localhost:5555 with a GUI to view/edit data
```

## What's Ready

✅ **Prisma Schema**: Complete with all Phase 1 models
✅ **Prisma Client**: Generated and ready to use
✅ **Environment Variables**: Configured for AWS S3, SES, Stripe, QuickBooks
✅ **Cloud-Agnostic Design**: Storage and email adapters ready

## Next Steps (After PostgreSQL is Running)

1. ✅ Run migrations: `npx prisma migrate dev --name phase1_init`
2. ⏳ Configure NextAuth
3. ⏳ Create login/signup pages
4. ⏳ Implement role-based access control
5. ⏳ Add subscription tiers (Free, Pro, Enterprise)
6. ⏳ Set up Stripe payments
7. ⏳ Create cloud-agnostic storage adapter
8. ⏳ Create landlord dashboard with weather widget

## Troubleshooting

### "Can't reach database server at localhost:5432"
- PostgreSQL is not running. Start it with `brew services start postgresql@16`
- Or check if Postgres.app is running
- Or verify Docker container is running: `docker ps`

### "role does not exist"
Your DATABASE_URL user doesn't match PostgreSQL. Check with:
```bash
psql -l  # List all databases and users
```

### "database does not exist"
Create the database:
```bash
createdb realestate_investor
```
