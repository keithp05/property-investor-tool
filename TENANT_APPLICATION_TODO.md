# Tenant Application Feature - TODO

## ✅ COMPLETED
- [x] Database schema created (TenantApplication model)
- [x] Schema committed to GitHub

## 📋 REMAINING TASKS

### 1. API Endpoints
- [ ] `POST /api/applications/generate` - Generate unique application link for property
- [ ] `GET /api/applications/[link]` - Get application details by link
- [ ] `POST /api/applications/[link]/submit` - Submit completed application
- [ ] `POST /api/applications/[link]/payment` - Process application fee
- [ ] `POST /api/applications/[link]/screening` - Trigger credit/background checks

### 2. Frontend - Application Form (`/app/apply/[link]/page.tsx`)
**Multi-step form with:**
- Step 1: Personal Info (name, DOB, SSN, email, phone)
- Step 2: Current Employment
- Step 3: Employment History (if < 2 years at current)
- Step 4: References (2 contacts)
- Step 5: Current Address Info
- Step 6: Previous Address (if < 2 years at current)
- Step 7: Additional Occupants
- Step 8: Second Applicant (optional)
- Step 9: Pets
- Step 10: Document Upload (pay stubs, ID)
- Step 11: Payment ($50 application fee)
- Step 12: Submit & Screening Authorization

### 3. Frontend - Landlord Dashboard
- [ ] "Generate Application Link" button on property page
- [ ] View all applications for a property
- [ ] Application status tracking
- [ ] View credit/background check results

### 4. Integrations

#### Stripe Payment
- [ ] Create payment intent for $50 application fee
- [ ] Payment confirmation
- [ ] Receipt generation

#### Credit Check (Choose one)
- **TransUnion SmartMove** (Recommended - tenant-pays model)
  - API endpoint: https://api.transunion.com
  - Cost: ~$25/report (paid by applicant)
- **Experian Connect**
  - API endpoint: https://api.experian.com
  - Cost: ~$20/report

#### Background Check
- **Checkr** (Recommended)
  - API: https://api.checkr.com
  - Cost: ~$25/check
  - Includes: Criminal records, eviction history, sex offender registry

### 5. File Upload (S3)
- [ ] Pay stub upload endpoint
- [ ] ID document upload endpoint
- [ ] Secure file storage (encrypt SSN, DOB)

### 6. Email Notifications
- [ ] Send application link to tenant
- [ ] Notify landlord when application submitted
- [ ] Notify applicant when screening complete
- [ ] Approval/denial notification

## 🔑 Environment Variables Needed
```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# TransUnion SmartMove
TRANSUNION_API_KEY=...
TRANSUNION_API_SECRET=...

# Checkr
CHECKR_API_KEY=...

# AWS S3 (already configured)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=rentaliq-lab-files
```

## 📊 Application Flow
1. Landlord clicks "Generate Application Link" on property
2. System creates unique link: `/apply/{unique-id}`
3. Landlord sends link to prospective tenant
4. Tenant fills out multi-step form
5. Tenant uploads pay stubs and ID
6. Tenant pays $50 application fee (Stripe)
7. System automatically triggers:
   - Credit check (TransUnion)
   - Background check (Checkr)
8. Landlord receives notification with results
9. Landlord approves/denies application

## 🔒 Security Considerations
- Encrypt SSN in database
- Encrypt DOB
- Secure file storage (private S3 bucket)
- Application links expire after 30 days
- Only landlord can view screening results
- FCRA compliance for credit/background checks

## 💰 Costs Per Application
- Application Fee (charged to tenant): $50
  - Stripe fee: ~$1.75 (3.5%)
  - Credit check: $25
  - Background check: $25
  - Net profit: -$1.75 (break-even)

## 📝 Notes
- Consider charging $75-100 application fee to cover costs + profit
- Add fraud detection (multiple applications from same SSN)
- Store screening results for 7 years (FCRA requirement)
- Add adverse action notice if denied
