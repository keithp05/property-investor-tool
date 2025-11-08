# RentalIQ Terraform - Quick Start Guide

## 5-Minute Setup

### Step 1: Install Prerequisites (if needed)

```bash
# Install Terraform
brew install terraform

# Install AWS CLI
brew install awscli

# Install jq
brew install jq
```

### Step 2: Configure AWS

```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
```

### Step 3: Initialize Terraform

```bash
# Navigate to terraform directory
cd /Users/keithperez/Documents/Claud/Realestate\ App/terraform/

# Initialize Terraform
terraform init
```

### Step 4: Customize (Optional)

```bash
# Copy example variables file
cp example.tfvars terraform.tfvars

# Edit with your settings
# vim terraform.tfvars
```

**Important:** Update `allowed_cidr_blocks` in `terraform.tfvars` to match your VPC CIDR!

### Step 5: Deploy

```bash
# Preview changes
terraform plan

# Deploy all environments (LAB, QA, PROD)
terraform apply

# Type 'yes' when prompted
```

**Deployment time:** 15-20 minutes

---

## What Gets Created?

### RDS PostgreSQL Databases
- `rentaliq-lab-db` (db.t3.micro, 20GB)
- `rentaliq-qa-db` (db.t3.small, 50GB)
- `rentaliq-prod-db` (db.t3.medium, 100GB, Multi-AZ)

### S3 Buckets
- `rentaliq-lab-files`
- `rentaliq-qa-files`
- `rentaliq-prod-files`
- `rentaliq-access-logs`

### AWS Secrets (per environment)
- Database credentials
- Connection strings
- API keys
- S3 configuration

### Security
- RDS security groups
- Application security groups
- IAM policies

---

## After Deployment

### Get Database Password

```bash
# LAB
aws secretsmanager get-secret-value \
  --secret-id rentaliq/lab/db/credentials \
  --query SecretString --output text | jq -r .password

# QA
aws secretsmanager get-secret-value \
  --secret-id rentaliq/qa/db/credentials \
  --query SecretString --output text | jq -r .password

# PROD
aws secretsmanager get-secret-value \
  --secret-id rentaliq/prod/db/credentials \
  --query SecretString --output text | jq -r .password
```

### Get Connection String

```bash
# LAB
aws secretsmanager get-secret-value \
  --secret-id rentaliq/lab/db/connection-string \
  --query SecretString --output text | jq -r .DATABASE_URL
```

### Connect to Database

```bash
# Get connection string and connect
DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id rentaliq/lab/db/connection-string \
  --query SecretString --output text | jq -r .DATABASE_URL)

psql "$DB_URL"
```

### View All Outputs

```bash
terraform output
```

---

## Deploy Single Environment

### LAB Only

```bash
# Create lab.tfvars
cat > lab.tfvars << 'EOF'
environments = ["lab"]
EOF

# Deploy
terraform apply -var-file=lab.tfvars
```

### QA Only

```bash
# Create qa.tfvars
cat > qa.tfvars << 'EOF'
environments = ["qa"]
EOF

# Deploy
terraform apply -var-file=qa.tfvars
```

### PROD Only

```bash
# Create prod.tfvars
cat > prod.tfvars << 'EOF'
environments = ["prod"]
EOF

# Deploy
terraform apply -var-file=prod.tfvars
```

---

## Common Commands

```bash
# View current state
terraform show

# List all resources
terraform state list

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Refresh state
terraform refresh

# View specific output
terraform output rds_endpoints
terraform output s3_bucket_names

# Destroy everything (WARNING!)
terraform destroy
```

---

## Estimated Costs

| Environment | Monthly Cost |
|-------------|--------------|
| LAB         | ~$16-18      |
| QA          | ~$32-36      |
| PROD        | ~$123-131    |
| **TOTAL**   | **~$171-185**|

---

## Troubleshooting

### "Insufficient IAM permissions"

Attach these policies to your IAM user:
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess`
- `SecretsManagerReadWrite`
- `IAMFullAccess`
- `AmazonEC2FullAccess`

### "Bucket already exists"

S3 bucket names are globally unique. Edit `s3.tf` and change bucket name.

### "Invalid parameter value"

Check instance class is available in your region:
```bash
aws rds describe-orderable-db-instance-options \
  --engine postgres \
  --query 'OrderableDBInstanceOptions[?DBInstanceClass==`db.t3.micro`]'
```

---

## Security Checklist

- [ ] AWS credentials configured securely
- [ ] `terraform.tfvars` added to `.gitignore`
- [ ] `allowed_cidr_blocks` customized for your VPC
- [ ] Production deletion protection enabled
- [ ] Backups configured appropriately
- [ ] CloudWatch alarms set up (separate)
- [ ] AWS Budgets configured for cost alerts

---

## Next Steps

1. **Test Connectivity**
   - Connect to LAB database
   - Upload test file to S3
   - Verify secrets are accessible

2. **Configure Application**
   - Update app config with database endpoints
   - Configure S3 bucket access
   - Implement Secrets Manager SDK

3. **Set Up Monitoring**
   - CloudWatch alarms for RDS CPU/storage
   - S3 bucket monitoring
   - Cost and usage alerts

4. **Production Hardening**
   - Enable MFA delete on PROD S3
   - Configure secret rotation
   - Set up VPC endpoints
   - Enable CloudTrail logging

---

## File Structure

```
terraform/
├── README.md              # Full documentation
├── QUICK_START.md         # This file
├── main.tf                # Provider configuration
├── variables.tf           # Variable definitions
├── outputs.tf             # Output definitions
├── rds.tf                 # RDS databases
├── s3.tf                  # S3 buckets
├── secrets.tf             # AWS Secrets Manager
├── security-groups.tf     # Security groups
├── example.tfvars         # Example variables
├── .gitignore            # Git ignore rules
└── terraform.tfvars      # Your custom values (not committed)
```

---

## Support

For detailed documentation, see [README.md](README.md)

For Terraform AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

---

**Happy deploying! 🚀**
