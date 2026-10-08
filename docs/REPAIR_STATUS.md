# Local repair review — 2026-10-08

Branch: `codex/repair-20261008`, based on `b80b8e8`.
The original shared checkout is unchanged. The initial repair was verified locally;
the subsequent deployment was explicitly authorized by Keith. No credential rotation,
test email or test SMS has been performed.

## Deployment preparation

- Verified Amplify app `Rental-IQ` (`d3q1fuby25122q`), branch `develop`, serves
  `https://app.satx-property.com`. The existing sign-in URL was aligned with this domain.
- Read-only inspection of the configured RDS database found nine completed migrations,
  one user, two properties and 26 applications. The missing schema objects match the
  additive repair migrations. Preserve those records.
- Requested recovery snapshot `rentaliq-pre-repair-20261008`; release must wait for it
  to become available.
- Amplify now runs the isolated regression suite and prepares an ignored, mode-0600
  `.env.production` from explicitly allowed application settings before migrations.
  Temporary build AWS credentials are excluded. Secrets are not placed in Next's
  public `env` configuration. Artifact access must remain limited to deployment operators.
- Required runtime settings are present. Certn signing configuration remains absent;
  signed screening callbacks stay unavailable until configured.
- Deployment success must be established from the Amplify job and live endpoint checks;
  these preparation notes alone do not assert that the release is live.

## Repaired

- Removed server secrets from Next config and removed the embedded database credential.
  `DATABASE_URL` is required; no remote fallback is allowed.
- Nine diagnostic endpoints now return 404 in all environments. Password diagnostic UI
  and the admin users page's password-test action have been retired.
- Admin password verification now produces a 10-minute challenge, not an admin session.
  MFA enrollment is challenge-specific and cannot replace a completed enrollment.
  Verification uses otplib, a five-attempt challenge limit, one-use challenges,
  TOTP replay prevention, and serializable database transactions.
- Versioned admin sessions require a database record and can be revoked by server logout.
  Prior bypass sessions are rejected. The three obsolete `/api/admin/auth/` login/MFA
  endpoints return 410 and direct callers to `/admin/login`.
- User password login enforces active/suspended status and MFA, with an authenticator
  field in the form. Magic links are consumed atomically.
- Public signup accepts only landlord/tenant roles, normalizes email, and creates the
  account and profile in one nested database operation.
- Property detail reads require ownership and no longer return Plaid access tokens.
  Fixed the tenancy rent field and application notification import/name fields.
- Application fees are verified with Stripe: succeeded status, application identity,
  currency, amount and refunds. Client paid flags cannot establish payment. Submission
  is conditional on pending status; payment-intent creation checks link expiry and
  uses an idempotency key. Stripe callbacks recheck current payment state.
- Certn callbacks verify `Certn-Signature` against the raw request body, with SHA-256
  HMAC, v1-only signatures, constant-time comparison, and a five-minute timestamp window.
  Missing configuration returns 503; invalid signatures return 401 before database writes.
  Provider reference: https://docs.certn.co/api/guides/use-the-api/webhooks
- Dynamic route parameters in document, pro connection, lender and application handlers
  follow Next 15's asynchronous parameter contract.
- Added migrations for administrator settings and missing schema objects. Reviewed diff
  adds missing tables/fields/enums; it drops a redundant index and an array default,
  with no table or column deletion.

## Verification

- `npm test`: isolated source/handler tests with dummy secrets and explicit mocked imports.
- `node --test tests/database.integration.cjs`: real disposable PostgreSQL tests for
  concurrent MFA completion, replay denial, revocation, atomic signup and uniqueness.
  This explicitly uses `/tmp/realestate-repair-db/socket`, port 55439, user `repair_test`;
  it cannot accept a live DATABASE_URL. Its cleanup deletes dummy accounts and admin
  settings in that disposable test cluster only. Run only after recreating that cluster.
- Every committed migration applied to a fresh PostgreSQL 16 test cluster. Prisma's
  database-to-schema diff then reported no difference.
- Production compilation ran inside a macOS sandbox denying all network access and
  writes to the shared checkout. Build configuration still skips existing type/lint
  failures; compilation success is not a clean type/lint result or a launch approval.
- Full type/lint checks are compared with a snapshot of the unchanged baseline.
  Remaining failures include old property-listing types/import script, Plaid income
  fields absent from the schema, short-term-rental fallback structures and unrelated
  UI/service typing. They are not suppressed by the new test command.

## Before any deployment

1. Determine the live hosting target and whether real accounts/data must be preserved.
2. Compare the live schema/migration history read-only and arrange a backup. Environments
   previously changed with db push may already contain some new migration objects;
   the local clean-install proof does not authorize blindly applying these migrations.
3. Supply server-side runtime configuration through the hosting secret manager:
   DATABASE_URL, NEXTAUTH_SECRET, ADMIN_SECRET, and enabled provider settings.
   Signed Certn delivery requires CERTN_WEBHOOK_SECRET from Certn and signing enabled.
   Deployment preparation handles existing values in memory without displaying them.
4. Existing legacy `admin_mfa_config` enrollments require explicit migration. The new
   flow preserves them and refuses automatic replacement. Existing `admin_mfa_secret`
   plus `admin_mfa_verified=true` enrollments remain usable.
5. Revoke/rotate previously committed or exposed credentials with the account owner.
6. Finish type/lint cleanup and restore build gates. Complete browser/provider sandbox
   tests, rate limiting, notification retry/deduplication, data retention and sensitive
   applicant-data handling before accepting real applications.
7. Billing and maintenance still contain demo/nonpersistent workflows. Contractor,
   accounting and several screening handoffs also remain unfinished. This branch is
   a tested repair increment, not a claim that every advertised feature is operational.
