# Photo Deletion Policy - CRITICAL CORRECTION

**Date:** November 6, 2025
**Issue:** Photo deletion timing must be based on TENANCY END, not LEASE END

---

## THE PROBLEM

**Original (WRONG):**
> "Photos auto-delete 1 year after lease ends"

**Why this is wrong:**
- Tenants can renew leases multiple times
- If tenant renews, the "lease end date" changes but they haven't moved out
- We'd be deleting photos while tenant is still living there
- **This could cause legal issues** (no move-in photos to compare for future move-out)

---

## THE CORRECT POLICY

### Photos Delete 1 Year After **TENANCY ENDS** (Not Lease End)

**Tenancy End = When tenant actually moves out**

---

## DATABASE SCHEMA REQUIREMENT

### Tenant/Tenancy Table Must Track:
```prisma
model Tenant {
  id              String   @id @default(cuid())

  // Lease dates (these can change with renewals)
  leaseStartDate  DateTime
  leaseEndDate    DateTime

  // CRITICAL: Tenancy lifecycle
  tenancyStatus   TenancyStatus @default(ACTIVE)
  moveInDate      DateTime      // When they actually moved in
  moveOutDate     DateTime?     // NULL until they move out
  tenancyEndedAt  DateTime?     // Timestamp when status changed to ENDED

  // Photo management
  moveInPhotos    PropertyPhoto[] @relation("MoveInPhotos")
  moveOutPhotos   PropertyPhoto[] @relation("MoveOutPhotos")
}

enum TenancyStatus {
  PENDING         // Lease signed, not moved in yet
  ACTIVE          // Currently occupying property
  RENEWED         // Lease renewed (still ACTIVE)
  ENDING_SOON     // Gave notice, moving out soon
  ENDED           // Moved out (THIS triggers photo deletion countdown)
}
```

### PropertyPhoto Table:
```prisma
model PropertyPhoto {
  id              String    @id @default(cuid())
  propertyId      String
  tenancyId       String?   // Links to specific tenancy period

  photoType       PhotoType
  imageUrl        String
  uploadedAt      DateTime  @default(now())

  // Auto-deletion
  deleteAt        DateTime? // Set when tenancy ENDS (not lease ends)
  deleted         Boolean   @default(false)
}
```

---

## PHOTO DELETION LOGIC

### Scenario 1: Tenant Renews Lease (Photos KEPT)

```
Timeline:
Jan 1, 2024  → Tenant moves in, takes 35 move-in photos
Dec 31, 2024 → Original lease ends
Dec 1, 2024  → Tenant accepts renewal offer
Jan 1, 2025  → NEW lease starts (same tenant)
Dec 31, 2025 → New lease ends

Database Status:
- tenancyStatus: ACTIVE (never changed to ENDED)
- moveInDate: Jan 1, 2024
- moveOutDate: NULL
- tenancyEndedAt: NULL
- Photo deleteAt: NULL (no deletion scheduled)

Result: Move-in photos from Jan 2024 are KEPT indefinitely while tenant occupies
```

### Scenario 2: Tenant Moves Out (Photos DELETED After 1 Year)

```
Timeline:
Jan 1, 2024  → Tenant moves in, takes 35 move-in photos
Nov 1, 2024  → Tenant gives 60-day notice (not renewing)
Dec 31, 2024 → Lease ends
Dec 31, 2024 → Tenant takes 35 move-out photos
Dec 31, 2024 → Tenant moves out, returns keys

System Actions (Dec 31, 2024):
1. Update tenancy:
   - tenancyStatus: ENDED
   - moveOutDate: Dec 31, 2024
   - tenancyEndedAt: Dec 31, 2024 23:59:59

2. Schedule photo deletion:
   - All photos with tenancyId = this tenant
   - Set deleteAt = Dec 31, 2025 (1 year later)

Timeline Continues:
Jan 1, 2025 - Dec 31, 2025 → Photos available (for disputes, warranty claims)
Dec 31, 2025 23:59:59      → AWS Lambda cron job runs
Jan 1, 2026                → Photos deleted from S3

Result: Photos available for 1 year after move-out, then auto-deleted
```

### Scenario 3: Tenant Renews Multiple Times, Then Moves Out

```
Timeline:
Jan 1, 2024  → Tenant moves in (Lease 1: Jan 2024 - Dec 2024)
Dec 1, 2024  → Renews (Lease 2: Jan 2025 - Dec 2025)
Dec 1, 2025  → Renews again (Lease 3: Jan 2026 - Dec 2026)
Nov 1, 2026  → Gives notice (not renewing)
Dec 31, 2026 → Moves out

Database Throughout:
- Jan 2024 - Dec 2026: tenancyStatus = ACTIVE (same tenancy, different leases)
- Dec 31, 2026: tenancyStatus = ENDED
- Move-in photos from Jan 2024: Kept for 3 years until moveout
- Photo deleteAt: Dec 31, 2027 (1 year after Dec 31, 2026 moveout)

Result: Photos kept entire occupancy period (3 years), deleted 1 year after moveout
```

---

## AWS S3 LIFECYCLE POLICY

### Option 1: Database-Driven Deletion (Recommended)

**Daily Cron Job (AWS Lambda):**
```javascript
// Runs daily at 2 AM
async function deleteExpiredPhotos() {
  const now = new Date();

  // Find all photos scheduled for deletion
  const photosToDelete = await prisma.propertyPhoto.findMany({
    where: {
      deleteAt: {
        lte: now  // deleteAt is in the past
      },
      deleted: false
    }
  });

  // Delete from S3
  for (const photo of photosToDelete) {
    await s3.deleteObject({
      Bucket: 'property-photos',
      Key: photo.s3Key
    });

    // Mark as deleted in database (keep record for audit)
    await prisma.propertyPhoto.update({
      where: { id: photo.id },
      data: {
        deleted: true,
        deletedAt: now,
        imageUrl: null,  // Remove URL
        s3Key: null      // Remove S3 reference
      }
    });
  }

  console.log(`Deleted ${photosToDelete.length} expired photos`);
}
```

### Option 2: S3 Lifecycle Rules (Automatic, cheaper)

```javascript
// When tenancy ends, move photos to special "expiring" folder
async function schedulePhotoExpiration(tenancyId, moveOutDate) {
  const photos = await prisma.propertyPhoto.findMany({
    where: { tenancyId }
  });

  const expirationDate = new Date(moveOutDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  for (const photo of photos) {
    // Copy to expiring folder with date prefix
    const newKey = `expiring/${expirationDate.getTime()}/${photo.s3Key}`;

    await s3.copyObject({
      Bucket: 'property-photos',
      CopySource: `property-photos/${photo.s3Key}`,
      Key: newKey
    });

    await s3.deleteObject({
      Bucket: 'property-photos',
      Key: photo.s3Key
    });

    // Update database
    await prisma.propertyPhoto.update({
      where: { id: photo.id },
      data: { s3Key: newKey, deleteAt: expirationDate }
    });
  }
}

// S3 Lifecycle Rule (set once):
{
  "Rules": [
    {
      "Id": "Delete expired tenant photos",
      "Prefix": "expiring/",
      "Status": "Enabled",
      "Expiration": {
        "Days": 1  // Delete 1 day after object creation (we use prefix date)
      }
    }
  ]
}
```

---

## USER INTERFACE CONSIDERATIONS

### Landlord View:
```
Property: 260 Nesting Tree

📸 PHOTO HISTORY:

CURRENT TENANT (John Smith):
- Status: ACTIVE
- Move-in: Jan 1, 2024
- Move-in Photos: 35 photos (Jan 1, 2024)
- Lease Renewals: 1 (renewed Jan 2025)
- Photos: RETAINED (tenant still occupying)

FORMER TENANTS:

Sarah Johnson (ENDED):
- Occupancy: Jan 2022 - Dec 2023 (2 years)
- Move-in Photos: 35 photos (Jan 1, 2022)
- Move-out Photos: 35 photos (Dec 31, 2023)
- Photo Status: Available until Dec 31, 2024
- Days until deletion: 45 days
[VIEW PHOTOS] [DOWNLOAD ALL] [EXTEND RETENTION]

Mike Williams (ENDED):
- Occupancy: Jan 2020 - Dec 2021 (2 years)
- Photos: DELETED (moved out Dec 2021, deleted Dec 2022)
```

### Tenant View:
```
Your Photos - 260 Nesting Tree

Move-In Photos (Jan 1, 2024):
✅ 35 photos uploaded
📅 These photos protect your security deposit

Your lease has been renewed!
✅ Your photos are saved for when you move out
```

---

## LEGAL COMPLIANCE

### Why 1 Year Retention After Move-Out?

**Legal reasons:**
1. **Deposit disputes:** Most states allow 30 days for deposit return, but tenant can sue up to 2-4 years later
2. **Warranty claims:** If hidden damage discovered after moveout (mold, foundation)
3. **Insurance claims:** Property damage claims can take 6-12 months to process
4. **IRS audit:** Repair expenses can be audited up to 3 years

**1 year is a reasonable balance:**
- Covers most legal dispute windows
- Reasonable data retention (not excessive)
- Reduces storage costs

### Privacy Considerations:

**GDPR/CCPA Compliance:**
- Photos contain PII (tenant belongings visible)
- Must be deleted when no longer needed
- 1 year = "business necessity" (dispute resolution)
- After 1 year = no longer necessary = must delete

**Disclosure in Lease:**
```
SECTION 12: PROPERTY PHOTOS

Tenant agrees to:
1. Upload move-in photos within 7 days of occupancy
2. Upload move-out photos within 3 days of vacating

Landlord will:
1. Store photos securely (encrypted AWS S3)
2. Use photos only for: deposit calculations, damage assessment, insurance claims
3. Delete photos 1 year after tenancy ends (move-out date)
4. Provide tenant with photo download link before deletion

Tenant rights:
- View photos anytime during tenancy
- Download photos before deletion
- Request early deletion (if desired)
```

---

## SUMMARY: KEY DIFFERENCES

| Trigger Event | WRONG Approach | CORRECT Approach |
|---------------|----------------|------------------|
| **Lease End** | Delete photos | Do nothing (tenant might renew) |
| **Lease Renewal** | Create new move-in photos | Keep original photos (same tenant) |
| **Tenancy End (Move-Out)** | Immediate deletion | Set deleteAt = moveOutDate + 1 year |
| **1 Year After Move-Out** | - | Auto-delete from S3, mark deleted in DB |

---

## IMPLEMENTATION CHECKLIST

### Database:
- [ ] Add `tenancyStatus` enum (ACTIVE, RENEWED, ENDED)
- [ ] Add `moveOutDate` field (nullable)
- [ ] Add `tenancyEndedAt` timestamp (nullable)
- [ ] Link `PropertyPhoto` to `tenancyId` (not just propertyId)
- [ ] Add `deleteAt` field to PropertyPhoto
- [ ] Add `deleted` boolean to PropertyPhoto

### Backend Logic:
- [ ] When tenant moves out → Set tenancyStatus = ENDED
- [ ] Calculate deleteAt = moveOutDate + 365 days
- [ ] Update all photos with tenancyId → set deleteAt
- [ ] Create AWS Lambda cron (daily 2 AM) → delete expired photos
- [ ] Create manual override (landlord can extend retention)

### Frontend:
- [ ] Show photo retention status to landlord
- [ ] Show deletion countdown (X days until deletion)
- [ ] Provide "Download All Photos" before deletion
- [ ] Notify landlord 30 days before deletion
- [ ] Allow landlord to extend retention (for legal cases)

### Legal:
- [ ] Add photo retention clause to lease template
- [ ] Create privacy policy disclosure
- [ ] Implement tenant download option
- [ ] Log all deletions (audit trail)

---

**APPROVED BY:** Keith Perez
**DATE:** November 6, 2025
**STATUS:** Ready for implementation
