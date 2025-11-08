# RentalIQ - AWS Infrastructure Architecture

## Architecture Overview

This document describes the AWS infrastructure architecture for RentalIQ across LAB, QA, and PROD environments.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AWS Cloud - us-east-1                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │  LAB ENV      │  │  QA ENV       │  │  PROD ENV     │          │
│  ├───────────────┤  ├───────────────┤  ├───────────────┤          │
│  │               │  │               │  │               │          │
│  │  RDS PG       │  │  RDS PG       │  │  RDS PG       │          │
│  │  db.t3.micro  │  │  db.t3.small  │  │  db.t3.medium │          │
│  │  20 GB        │  │  50 GB        │  │  100 GB       │          │
│  │  Single-AZ    │  │  Single-AZ    │  │  Multi-AZ     │          │
│  │  3-day backup │  │  7-day backup │  │  30-day backup│          │
│  │               │  │               │  │               │          │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘          │
│          │                  │                  │                  │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐          │
│  │  Security     │  │  Security     │  │  Security     │          │
│  │  Group        │  │  Group        │  │  Group        │          │
│  │  (Port 5432)  │  │  (Port 5432)  │  │  (Port 5432)  │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │  S3 Bucket    │  │  S3 Bucket    │  │  S3 Bucket    │          │
│  │  lab-files    │  │  qa-files     │  │  prod-files   │          │
│  │  • Encrypted  │  │  • Encrypted  │  │  • Encrypted  │          │
│  │  • Lifecycle  │  │  • Versioning │  │  • Versioning │          │
│  │               │  │  • Lifecycle  │  │  • Lifecycle  │          │
│  └───────────────┘  └───────────────┘  └───────┬───────┘          │
│                                                 │                  │
│                                         ┌───────▼───────┐          │
│                                         │  Access Logs  │          │
│                                         │  Bucket       │          │
│                                         └───────────────┘          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────┐          │
│  │          AWS Secrets Manager                        │          │
│  ├─────────────────────────────────────────────────────┤          │
│  │  • rentaliq/lab/db/credentials                      │          │
│  │  • rentaliq/lab/db/connection-string                │          │
│  │  • rentaliq/lab/api/keys                            │          │
│  │  • rentaliq/lab/s3/config                           │          │
│  │                                                      │          │
│  │  • rentaliq/qa/db/credentials                       │          │
│  │  • rentaliq/qa/db/connection-string                 │          │
│  │  • rentaliq/qa/api/keys                             │          │
│  │  • rentaliq/qa/s3/config                            │          │
│  │                                                      │          │
│  │  • rentaliq/prod/db/credentials                     │          │
│  │  • rentaliq/prod/db/connection-string               │          │
│  │  • rentaliq/prod/api/keys                           │          │
│  │  • rentaliq/prod/s3/config                          │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────┐          │
│  │          IAM Policies                               │          │
│  ├─────────────────────────────────────────────────────┤          │
│  │  • rentaliq-lab-read-secrets-policy                 │          │
│  │  • rentaliq-qa-read-secrets-policy                  │          │
│  │  • rentaliq-prod-read-secrets-policy                │          │
│  │  • rentaliq-rds-monitoring-role (PROD)              │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Network Architecture

### VPC Structure

```
┌─────────────────────────────────────────────────────────┐
│  VPC (Default or Custom)                                │
│                                                          │
│  ┌────────────────────┐      ┌────────────────────┐    │
│  │  Availability      │      │  Availability      │    │
│  │  Zone A            │      │  Zone B            │    │
│  │                    │      │                    │    │
│  │  ┌──────────────┐  │      │  ┌──────────────┐  │    │
│  │  │  DB Subnet   │  │      │  │  DB Subnet   │  │    │
│  │  │  (Private)   │  │      │  │  (Private)   │  │    │
│  │  │              │  │      │  │              │  │    │
│  │  │  RDS Primary │  │      │  │  RDS Standby │  │    │
│  │  │  (PROD)      │  │      │  │  (PROD)      │  │    │
│  │  │              │  │      │  │              │  │    │
│  │  │  RDS LAB/QA  │  │      │  │              │  │    │
│  │  └──────────────┘  │      │  └──────────────┘  │    │
│  │                    │      │                    │    │
│  │  ┌──────────────┐  │      │  ┌──────────────┐  │    │
│  │  │  App Subnet  │  │      │  │  App Subnet  │  │    │
│  │  │  (Private)   │  │      │  │  (Private)   │  │    │
│  │  │              │  │      │  │              │  │    │
│  │  │  EC2/ECS/    │  │      │  │  EC2/ECS/    │  │    │
│  │  │  Lambda      │  │      │  │  Lambda      │  │    │
│  │  └──────────────┘  │      │  └──────────────┘  │    │
│  └────────────────────┘      └────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Security Groups

```
┌─────────────────────────────────────────────────────────┐
│  Application Security Group                             │
│  (rentaliq-{env}-app-sg)                                │
│                                                          │
│  Ingress:                                                │
│  • HTTPS (443) from Internet                             │
│  • HTTP (80) from Internet                               │
│                                                          │
│  Egress:                                                 │
│  • PostgreSQL (5432) to RDS Security Group               │
│  • HTTPS (443) to Internet                               │
│  • HTTP (80) to Internet                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Port 5432
                      ▼
┌─────────────────────────────────────────────────────────┐
│  RDS Security Group                                      │
│  (rentaliq-{env}-rds-sg)                                │
│                                                          │
│  Ingress:                                                │
│  • PostgreSQL (5432) from Application SG                 │
│  • PostgreSQL (5432) from specified CIDR blocks          │
│                                                          │
│  Egress:                                                 │
│  • All traffic (for updates, patches)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Application to Database

```
┌──────────────┐
│ Application  │
│ (EC2/ECS/    │
│  Lambda)     │
└──────┬───────┘
       │
       │ 1. Request DB credentials
       ▼
┌────────────────────┐
│ AWS Secrets        │
│ Manager            │
│ • Get credentials  │
│ • Get conn string  │
└──────┬─────────────┘
       │
       │ 2. Return credentials
       ▼
┌──────────────┐
│ Application  │
│ Establishes  │
│ Connection   │
└──────┬───────┘
       │
       │ 3. Connect via PostgreSQL (Port 5432)
       ▼
┌────────────────────┐
│ RDS Security Group │
│ Validates source   │
└──────┬─────────────┘
       │
       │ 4. Allow connection
       ▼
┌────────────────────┐
│ RDS PostgreSQL     │
│ Database Instance  │
│ • Authenticate     │
│ • Execute queries  │
└────────────────────┘
```

### File Upload to S3

```
┌──────────────┐
│ Application  │
│ User Upload  │
└──────┬───────┘
       │
       │ 1. Request S3 config
       ▼
┌────────────────────┐
│ AWS Secrets        │
│ Manager            │
│ • Get bucket name  │
│ • Get bucket ARN   │
└──────┬─────────────┘
       │
       │ 2. Return S3 config
       ▼
┌──────────────┐
│ Application  │
│ Prepares     │
│ Upload       │
└──────┬───────┘
       │
       │ 3. PUT Object (HTTPS)
       ▼
┌────────────────────┐
│ S3 Bucket          │
│ • Encrypt file     │
│ • Store file       │
│ • Update metadata  │
└──────┬─────────────┘
       │
       │ 4. Log access (PROD only)
       ▼
┌────────────────────┐
│ S3 Access Logs     │
│ Bucket             │
└────────────────────┘
```

---

## Resource Naming Convention

### Pattern
`{project}-{environment}-{resource-type}-{suffix}`

### Examples

**RDS Instances:**
- `rentaliq-lab-db`
- `rentaliq-qa-db`
- `rentaliq-prod-db`

**S3 Buckets:**
- `rentaliq-lab-files`
- `rentaliq-qa-files`
- `rentaliq-prod-files`
- `rentaliq-access-logs`

**Security Groups:**
- `rentaliq-lab-rds-sg`
- `rentaliq-qa-rds-sg`
- `rentaliq-prod-rds-sg`
- `rentaliq-lab-app-sg`
- `rentaliq-qa-app-sg`
- `rentaliq-prod-app-sg`

**Secrets:**
- `rentaliq/lab/db/credentials`
- `rentaliq/qa/db/connection-string`
- `rentaliq/prod/api/keys`
- `rentaliq/prod/s3/config`

**IAM Policies:**
- `rentaliq-lab-read-secrets-policy`
- `rentaliq-qa-read-secrets-policy`
- `rentaliq-prod-read-secrets-policy`

---

## Environment Comparison

| Feature                  | LAB              | QA               | PROD             |
|--------------------------|------------------|------------------|------------------|
| **RDS Instance Class**   | db.t3.micro      | db.t3.small      | db.t3.medium     |
| **Storage**              | 20 GB            | 50 GB            | 100 GB           |
| **Max Storage**          | 50 GB            | 100 GB           | 500 GB           |
| **Multi-AZ**             | No               | No               | Yes              |
| **Backup Retention**     | 3 days           | 7 days           | 30 days          |
| **Performance Insights** | No               | Yes              | Yes              |
| **Enhanced Monitoring**  | No               | No               | Yes (60s)        |
| **Deletion Protection**  | No               | No               | Yes              |
| **Final Snapshot**       | Skip             | Skip             | Create           |
| **CloudWatch Logs**      | No               | Yes              | Yes              |
| **S3 Versioning**        | No               | Yes              | Yes              |
| **S3 Access Logs**       | No               | No               | Yes              |
| **S3 Intelligent Tier**  | No               | No               | Yes              |
| **Secret Recovery**      | 0 days           | 7 days           | 30 days          |
| **Estimated Cost/Month** | ~$16-18          | ~$32-36          | ~$123-131        |

---

## Security Architecture

### Encryption at Rest

- **RDS:** AES-256 encryption enabled for all instances
- **S3:** Server-side encryption (SSE-S3) for all buckets
- **Secrets Manager:** Automatic encryption with AWS-managed keys

### Encryption in Transit

- **RDS:** SSL/TLS connections supported (enforce in application)
- **S3:** HTTPS required for all API calls
- **Secrets Manager:** HTTPS only

### Access Control

```
┌─────────────────────────────────────────────────────────┐
│  IAM User/Role                                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ AssumeRole / Use Credentials
                  ▼
┌─────────────────────────────────────────────────────────┐
│  IAM Policy (read-secrets-policy)                        │
│  • Allow secretsmanager:GetSecretValue                   │
│  • Allow secretsmanager:DescribeSecret                   │
│  • Resource: rentaliq/{env}/*                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ API Call
                  ▼
┌─────────────────────────────────────────────────────────┐
│  AWS Secrets Manager                                     │
│  • Validate IAM permissions                              │
│  • Decrypt secret                                        │
│  • Return plaintext value                                │
└─────────────────────────────────────────────────────────┘
```

### Network Isolation

- **RDS:** Private subnets only, no public IP
- **Application:** Private subnets with NAT gateway for outbound
- **Security Groups:** Least-privilege rules per environment

---

## Backup & Disaster Recovery

### RDS Backups

**Automated Backups:**
- LAB: 3 days retention
- QA: 7 days retention
- PROD: 30 days retention

**Backup Window:** 03:00-04:00 UTC (avoid business hours)

**Manual Snapshots:**
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier rentaliq-prod-db \
  --db-snapshot-identifier rentaliq-prod-manual-$(date +%Y%m%d)
```

### S3 Versioning

**QA & PROD:**
- Versioning enabled
- Previous versions retained
- Can restore accidentally deleted/overwritten files

**LAB:**
- Versioning disabled (cost savings)

### Recovery Point Objective (RPO)

- **LAB:** Up to 24 hours data loss acceptable
- **QA:** Up to 1 hour data loss acceptable
- **PROD:** < 5 minutes (with automated backups)

### Recovery Time Objective (RTO)

- **LAB:** 4-8 hours
- **QA:** 2-4 hours
- **PROD:** < 1 hour (with Multi-AZ failover)

### Disaster Recovery Procedures

**RDS Restore:**
```bash
# Restore from automated backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier rentaliq-prod-db \
  --target-db-instance-identifier rentaliq-prod-db-restored \
  --restore-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier rentaliq-prod-db-restored \
  --db-snapshot-identifier rentaliq-prod-backup-20251108
```

**S3 Restore:**
```bash
# List versions
aws s3api list-object-versions \
  --bucket rentaliq-prod-files \
  --prefix path/to/file.txt

# Restore specific version
aws s3api copy-object \
  --bucket rentaliq-prod-files \
  --copy-source rentaliq-prod-files/path/to/file.txt?versionId=VERSION_ID \
  --key path/to/file.txt
```

---

## Monitoring & Alerting

### RDS CloudWatch Metrics

**Monitored Metrics:**
- CPUUtilization
- DatabaseConnections
- FreeStorageSpace
- ReadLatency / WriteLatency
- ReadIOPS / WriteIOPS
- NetworkReceiveThroughput / NetworkTransmitThroughput

**Recommended Alarms:**
```bash
# CPU > 80% for 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name rentaliq-prod-db-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=DBInstanceIdentifier,Value=rentaliq-prod-db
```

### S3 CloudWatch Metrics

**Monitored Metrics:**
- BucketSizeBytes
- NumberOfObjects
- AllRequests
- 4xxErrors / 5xxErrors

### Performance Insights (QA & PROD)

- Query performance analysis
- Wait event analysis
- Database load monitoring
- 7-day retention

---

## Cost Optimization

### Strategies Implemented

1. **Right-Sizing:**
   - LAB: db.t3.micro (smallest)
   - QA: db.t3.small
   - PROD: db.t3.medium (can scale up)

2. **Storage Auto-Scaling:**
   - Start small, grow automatically
   - Prevents over-provisioning

3. **Backup Optimization:**
   - Short retention for non-prod (3-7 days)
   - Long retention only for PROD (30 days)

4. **S3 Lifecycle Policies:**
   - Transition to Infrequent Access (90 days)
   - Transition to Glacier (180-365 days)
   - Expire old files (LAB only)

5. **Single-AZ for Non-Prod:**
   - LAB/QA don't need Multi-AZ
   - PROD uses Multi-AZ for HA

6. **Performance Insights:**
   - Disabled for LAB
   - Enabled for QA/PROD only

### Future Optimizations

1. **Reserved Instances:**
   - Purchase 1-year RI for PROD (30% savings)

2. **Savings Plans:**
   - Commit to compute usage (flexible)

3. **S3 Intelligent-Tiering:**
   - Already configured for PROD
   - Automatically moves data between tiers

4. **Schedule Start/Stop:**
   - Stop LAB/QA databases outside business hours
   - Save ~60% on non-prod costs

---

## Scaling Strategy

### Vertical Scaling (RDS)

```bash
# Upgrade instance class
aws rds modify-db-instance \
  --db-instance-identifier rentaliq-prod-db \
  --db-instance-class db.t3.large \
  --apply-immediately
```

### Horizontal Scaling (RDS)

**Read Replicas:**
```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier rentaliq-prod-db-replica-1 \
  --source-db-instance-identifier rentaliq-prod-db
```

### Storage Scaling (RDS)

- **Automatic:** Already configured (max_allocated_storage)
- **Manual:** Increase allocated_storage in Terraform

### S3 Scaling

- Infinite scale (no configuration needed)
- Pay only for what you use

---

## Compliance & Governance

### Tagging Strategy

All resources tagged with:
- `Project: RentalIQ`
- `Environment: lab|qa|prod`
- `ManagedBy: Terraform`
- `Owner: Keith Perez`

Additional tags as needed:
- `Backup: true`
- `Critical: true` (PROD only)
- `CostCenter: <value>`
- `Application: rentaliq`

### Audit Trails

**Recommended:**
1. Enable AWS CloudTrail
2. Enable AWS Config
3. Enable VPC Flow Logs
4. Enable S3 Access Logs (PROD)

### Compliance Frameworks

Architecture supports:
- SOC 2
- HIPAA (with additional configuration)
- PCI DSS (with additional configuration)
- GDPR (with proper data handling)

---

## Future Enhancements

### Phase 2 (Recommended)

1. **VPC Endpoints:**
   - S3 VPC Endpoint (reduce data transfer costs)
   - Secrets Manager VPC Endpoint (private access)

2. **KMS Encryption:**
   - Customer-managed keys
   - Fine-grained access control

3. **Advanced Monitoring:**
   - CloudWatch Dashboards
   - CloudWatch Alarms
   - AWS X-Ray integration

4. **Automated Backups:**
   - AWS Backup service
   - Cross-region backup copies

### Phase 3 (Advanced)

1. **Multi-Region:**
   - RDS cross-region read replicas
   - S3 cross-region replication
   - Route 53 health checks

2. **Infrastructure as Code:**
   - Terraform modules
   - CI/CD for infrastructure
   - GitOps workflow

3. **Serverless:**
   - Aurora Serverless for variable workloads
   - Lambda functions for automation

4. **Advanced Security:**
   - WAF (Web Application Firewall)
   - GuardDuty (threat detection)
   - Security Hub (compliance dashboard)

---

## Maintenance Windows

### RDS Maintenance

- **Preferred Window:** Sunday 04:00-05:00 UTC
- **Automatic Minor Version Upgrades:** Enabled
- **Apply Immediately:** LAB only

### Patching Strategy

1. **LAB:** Apply immediately (test ground)
2. **QA:** Apply within 1 week
3. **PROD:** Apply after QA validation (within 2 weeks)

---

## Contact & Support

**Infrastructure Owner:** Keith Perez

**AWS Support Plan:** Basic (recommend upgrading to Business for production)

**Escalation:**
1. Check CloudWatch metrics
2. Review CloudTrail logs
3. Open AWS Support ticket
4. Engage on-call engineer

---

**Document Version:** 1.0
**Last Updated:** November 8, 2025
**Next Review:** February 8, 2026
