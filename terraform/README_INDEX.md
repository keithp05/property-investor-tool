# RentalIQ Terraform - Documentation Index

Quick navigation to all documentation files.

## Quick Start

🚀 **New to this project?** Start here:
- [QUICK_START.md](QUICK_START.md) - 5-minute setup guide

## Core Documentation

📚 **Main documentation files:**

1. **[README.md](README.md)** - Complete guide
   - Prerequisites and installation
   - Deployment instructions
   - Accessing resources
   - Cost estimates
   - Security best practices
   - Troubleshooting
   - Cleanup instructions

2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Infrastructure architecture
   - High-level architecture diagrams
   - Network architecture
   - Data flow diagrams
   - Resource naming conventions
   - Environment comparison
   - Security architecture
   - Backup & disaster recovery
   - Monitoring & alerting
   - Cost optimization
   - Scaling strategy
   - Compliance & governance

3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
   - Pre-deployment checklist
   - Phase-by-phase deployment steps
   - Post-deployment verification
   - Maintenance schedules
   - Troubleshooting guide
   - Rollback procedures

## Configuration Files

🔧 **Terraform configuration:**

- **[main.tf](main.tf)** - Provider configuration
- **[variables.tf](variables.tf)** - Variable definitions
- **[outputs.tf](outputs.tf)** - Output definitions
- **[rds.tf](rds.tf)** - RDS PostgreSQL instances
- **[s3.tf](s3.tf)** - S3 buckets and policies
- **[secrets.tf](secrets.tf)** - AWS Secrets Manager
- **[security-groups.tf](security-groups.tf)** - Security groups
- **[example.tfvars](example.tfvars)** - Example variable values

## What Gets Deployed?

### Environments
- **LAB** - Development/testing (~$16-18/month)
- **QA** - Quality assurance (~$32-36/month)
- **PROD** - Production (~$123-131/month)

### Resources Per Environment
- 1 RDS PostgreSQL instance
- 1 S3 bucket for file storage
- 4 AWS Secrets Manager secrets
- 2 Security groups (RDS + Application)
- 1 IAM policy

### Shared Resources
- 1 S3 bucket for access logs
- 1 IAM role for RDS monitoring (PROD)

### Total Resources (All Environments)
- 3 RDS instances
- 4 S3 buckets
- 12 secrets
- 6 security groups
- 3 IAM policies
- 1 IAM role

## Common Tasks

### Initial Setup
```bash
# 1. Initialize
terraform init

# 2. Customize (optional)
cp example.tfvars terraform.tfvars
# Edit terraform.tfvars

# 3. Deploy
terraform plan
terraform apply
```

### Get Database Credentials
```bash
aws secretsmanager get-secret-value \
  --secret-id rentaliq/prod/db/credentials \
  --query SecretString --output text | jq -r .password
```

### Connect to Database
```bash
DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id rentaliq/prod/db/connection-string \
  --query SecretString --output text | jq -r .DATABASE_URL)
psql "$DB_URL"
```

### View Resources
```bash
terraform output
terraform state list
```

### Destroy Resources
```bash
terraform destroy
```

## File Structure

```
terraform/
├── README.md                   # Main documentation (you are here)
├── README_INDEX.md             # This index file
├── QUICK_START.md              # 5-minute setup guide
├── ARCHITECTURE.md             # Architecture documentation
├── DEPLOYMENT_CHECKLIST.md     # Deployment checklist
├── main.tf                     # Provider configuration
├── variables.tf                # Variable definitions
├── outputs.tf                  # Output definitions
├── rds.tf                      # RDS configuration
├── s3.tf                       # S3 configuration
├── secrets.tf                  # Secrets Manager configuration
├── security-groups.tf          # Security group configuration
├── example.tfvars              # Example variables
├── .gitignore                  # Git ignore rules
└── terraform.tfvars            # Your custom values (create this, not committed)
```

## Support

- **Terraform Docs:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **AWS RDS Docs:** https://docs.aws.amazon.com/rds/
- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/
- **Terraform Community:** https://discuss.hashicorp.com/c/terraform-core

## Version

- **Version:** 1.0.0
- **Last Updated:** November 8, 2025
- **Terraform:** >= 1.0
- **AWS Provider:** ~> 5.0

## Author

**Keith Perez**  
Project: RentalIQ  
Date: November 2025
