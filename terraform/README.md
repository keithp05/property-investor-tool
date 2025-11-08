# RentalIQ - Terraform Infrastructure as Code

This directory contains Terraform configurations for deploying RentalIQ infrastructure to AWS across multiple environments (LAB, QA, PROD).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Infrastructure Components](#infrastructure-components)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Accessing Resources](#accessing-resources)
- [Cost Estimates](#cost-estimates)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Cleanup](#cleanup)

---

## Overview

This Terraform configuration deploys a complete multi-environment infrastructure for RentalIQ on AWS, including:

- **RDS PostgreSQL databases** (LAB, QA, PROD)
- **S3 buckets** for file storage
- **AWS Secrets Manager** for secure credential management
- **Security Groups** for network access control
- **IAM policies** for resource access

All environments are deployed with:
- ✅ Encryption at rest enabled
- ✅ Automated backups configured
- ✅ Security best practices applied
- ✅ Proper tagging for resource management
- ✅ Cost optimization settings

---

## Prerequisites

### Required Tools

1. **Terraform** (>= 1.0)
   ```bash
   # macOS
   brew install terraform

   # Verify installation
   terraform version
   ```

2. **AWS CLI** (>= 2.0)
   ```bash
   # macOS
   brew install awscli

   # Verify installation
   aws --version
   ```

3. **jq** (for parsing JSON outputs)
   ```bash
   # macOS
   brew install jq
   ```

### AWS Configuration

1. **Configure AWS credentials:**
   ```bash
   aws configure
   ```

   Provide:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., `us-east-1`)
   - Default output format (`json`)

2. **Verify AWS access:**
   ```bash
   aws sts get-caller-identity
   ```

3. **Set required permissions:**

   Your AWS user/role needs permissions for:
   - RDS (create, modify, delete instances)
   - S3 (create, configure buckets)
   - Secrets Manager (create, update secrets)
   - EC2 (security groups, VPC operations)
   - IAM (create policies and roles)

---

## Infrastructure Components

### RDS PostgreSQL Instances

| Environment | Instance Class | Storage | Multi-AZ | Backup Retention |
|-------------|---------------|---------|----------|------------------|
| **LAB**     | db.t3.micro   | 20 GB   | No       | 3 days          |
| **QA**      | db.t3.small   | 50 GB   | No       | 7 days          |
| **PROD**    | db.t3.medium  | 100 GB  | Yes      | 30 days         |

**Features:**
- PostgreSQL 15.4
- Automated backups
- Storage auto-scaling enabled
- Encryption at rest
- Performance Insights (QA & PROD)
- Enhanced monitoring (PROD)

### S3 Buckets

- `rentaliq-lab-files` - LAB environment file storage
- `rentaliq-qa-files` - QA environment file storage
- `rentaliq-prod-files` - PROD environment file storage
- `rentaliq-access-logs` - S3 access logs

**Features:**
- Server-side encryption (AES256)
- Versioning (QA & PROD)
- Lifecycle policies for cost optimization
- Public access blocked
- CORS configured for web access

### AWS Secrets Manager

Each environment has 4 secrets:
1. **Database credentials** - Username, password, connection details
2. **Connection strings** - PostgreSQL and JDBC URLs
3. **API keys** - Application API authentication
4. **S3 configuration** - Bucket names and settings

### Security Groups

- **RDS Security Groups** - Control database access
- **Application Security Groups** - For EC2/ECS/Lambda resources
- Least-privilege access rules
- Environment-isolated

---

## Directory Structure

```
terraform/
├── README.md                 # This file
├── main.tf                   # Provider and backend configuration
├── variables.tf              # Input variables and defaults
├── outputs.tf                # Output values after deployment
├── rds.tf                    # RDS PostgreSQL instances
├── s3.tf                     # S3 buckets and policies
├── secrets.tf                # AWS Secrets Manager
├── security-groups.tf        # Security groups and rules
├── terraform.tfvars          # Variable values (create this)
└── .gitignore               # Git ignore file (create this)
```

---

## Quick Start

### 1. Clone and Navigate

```bash
cd /Users/keithperez/Documents/Claud/Realestate\ App/terraform/
```

### 2. Create Variable File (Optional)

Create `terraform.tfvars` to customize settings:

```hcl
# terraform.tfvars
aws_region = "us-east-1"
owner      = "Your Name"

# Customize CIDR blocks for database access
allowed_cidr_blocks = ["10.0.0.0/16"]

# Optional: Customize instance sizes
rds_instance_classes = {
  lab  = "db.t3.micro"
  qa   = "db.t3.small"
  prod = "db.t3.large"  # Upgrade to larger instance
}
```

### 3. Create .gitignore

**IMPORTANT:** Prevent sensitive files from being committed:

```bash
cat > .gitignore << 'EOF'
# Terraform files
.terraform/
*.tfstate
*.tfstate.*
*.tfvars
.terraform.lock.hcl
crash.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# Sensitive files
*.pem
*.key
.env
secrets/
EOF
```

### 4. Initialize Terraform

```bash
terraform init
```

This downloads required providers (AWS, Random).

### 5. Validate Configuration

```bash
terraform validate
```

### 6. Preview Changes

```bash
terraform plan
```

Review the planned changes carefully.

### 7. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. Deployment takes ~15-20 minutes.

---

## Deployment

### Deploy All Environments (LAB, QA, PROD)

```bash
# Full deployment
terraform apply -auto-approve
```

### Deploy Single Environment

Use Terraform targeting:

```bash
# Deploy only LAB environment
terraform apply \
  -target='aws_db_instance.rentaliq["lab"]' \
  -target='aws_s3_bucket.rentaliq["lab"]' \
  -target='aws_secretsmanager_secret.db_credentials["lab"]' \
  -target='aws_security_group.rds["lab"]'
```

### Environment-Specific tfvars

Create environment-specific variable files:

**lab.tfvars:**
```hcl
environments = ["lab"]
```

**qa.tfvars:**
```hcl
environments = ["qa"]
```

**prod.tfvars:**
```hcl
environments = ["prod"]
```

Deploy with:
```bash
terraform apply -var-file="lab.tfvars"
terraform apply -var-file="qa.tfvars"
terraform apply -var-file="prod.tfvars"
```

### Using Terraform Workspaces

Alternative approach using workspaces:

```bash
# Create workspaces
terraform workspace new lab
terraform workspace new qa
terraform workspace new prod

# Deploy to specific workspace
terraform workspace select lab
terraform apply -var="environments=[\"lab\"]"

terraform workspace select qa
terraform apply -var="environments=[\"qa\"]"

terraform workspace select prod
terraform apply -var="environments=[\"prod\"]"
```

---

## Accessing Resources

### Get All Outputs

```bash
terraform output
```

### Get Specific Output

```bash
# RDS endpoints
terraform output rds_endpoints

# S3 bucket names
terraform output s3_bucket_names

# Secret ARNs
terraform output secrets_manager_db_credentials_arns
```

### Retrieve Database Password

```bash
# LAB environment
aws secretsmanager get-secret-value \
  --secret-id rentaliq/lab/db/credentials \
  --query SecretString \
  --output text | jq -r .password

# QA environment
aws secretsmanager get-secret-value \
  --secret-id rentaliq/qa/db/credentials \
  --query SecretString \
  --output text | jq -r .password

# PROD environment
aws secretsmanager get-secret-value \
  --secret-id rentaliq/prod/db/credentials \
  --query SecretString \
  --output text | jq -r .password
```

### Get Database Connection String

```bash
# LAB
aws secretsmanager get-secret-value \
  --secret-id rentaliq/lab/db/connection-string \
  --query SecretString \
  --output text | jq -r .DATABASE_URL

# QA
aws secretsmanager get-secret-value \
  --secret-id rentaliq/qa/db/connection-string \
  --query SecretString \
  --output text | jq -r .DATABASE_URL

# PROD
aws secretsmanager get-secret-value \
  --secret-id rentaliq/prod/db/connection-string \
  --query SecretString \
  --output text | jq -r .DATABASE_URL
```

### Connect to Database via psql

```bash
# Get connection string and connect
export DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id rentaliq/lab/db/connection-string \
  --query SecretString \
  --output text | jq -r .DATABASE_URL)

psql "$DB_URL"
```

### Access S3 Buckets

```bash
# List files in LAB bucket
aws s3 ls s3://rentaliq-lab-files/

# Upload file to QA bucket
aws s3 cp myfile.txt s3://rentaliq-qa-files/

# Download file from PROD bucket
aws s3 cp s3://rentaliq-prod-files/myfile.txt ./

# Sync directory to S3
aws s3 sync ./local-dir s3://rentaliq-lab-files/uploads/
```

### View RDS Instances

```bash
# List all RDS instances
aws rds describe-db-instances \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `rentaliq`)].{Name:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint.Address}'

# Get specific instance details
aws rds describe-db-instances \
  --db-instance-identifier rentaliq-prod-db
```

---

## Cost Estimates

### Monthly Cost Breakdown

| Environment | RDS        | S3       | Secrets Manager | Total/Month |
|-------------|------------|----------|-----------------|-------------|
| **LAB**     | ~$15       | ~$1      | ~$0.40         | ~$16-18     |
| **QA**      | ~$30       | ~$3      | ~$0.40         | ~$32-36     |
| **PROD**    | ~$120      | ~$5      | ~$0.40         | ~$123-131   |
| **TOTAL**   | **~$165**  | **~$9**  | **~$1.20**     | **~$171-185** |

**Notes:**
- Costs are estimates for us-east-1 region
- S3 costs vary with usage (storage, requests, data transfer)
- RDS costs include storage, compute, and backups
- PROD uses Multi-AZ, doubling RDS costs
- Data transfer and requests not included

### Cost Optimization Tips

1. **Use Smaller Instances for Non-Prod:**
   - LAB: db.t3.micro (included in free tier for first year)
   - QA: db.t3.small

2. **Enable S3 Lifecycle Policies:**
   - Already configured in terraform
   - Moves old objects to cheaper storage tiers

3. **Reduce Backup Retention:**
   - LAB: 3 days
   - QA: 7 days
   - Only PROD needs 30 days

4. **Stop Non-Production Instances:**
   ```bash
   # Stop LAB database when not in use
   aws rds stop-db-instance --db-instance-identifier rentaliq-lab-db

   # Start when needed
   aws rds start-db-instance --db-instance-identifier rentaliq-lab-db
   ```

5. **Use Reserved Instances (PROD):**
   - 1-year commitment: ~30% savings
   - 3-year commitment: ~50% savings

### Monitor Costs

```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '-1 month' +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE
```

Set up AWS Budgets:
1. Go to AWS Billing Console
2. Create Budget
3. Set monthly budget (e.g., $200)
4. Configure email alerts at 50%, 80%, 100%

---

## Security Best Practices

### 1. Database Security

✅ **Implemented:**
- Encryption at rest enabled
- Private subnets (not publicly accessible)
- Security groups restrict access
- Strong random passwords (32 characters)
- Automated backups
- Deletion protection (PROD)

🔒 **Additional Recommendations:**
- Enable SSL/TLS connections only
- Rotate passwords regularly (use Secrets Manager rotation)
- Enable audit logging
- Use IAM database authentication

### 2. S3 Security

✅ **Implemented:**
- Server-side encryption
- Public access blocked
- Versioning enabled (QA/PROD)
- Bucket policies restrict access
- Access logging enabled

🔒 **Additional Recommendations:**
- Enable MFA delete for PROD
- Use S3 Object Lock for compliance
- Implement bucket policies for least privilege
- Enable CloudTrail for S3 API logging

### 3. Secrets Management

✅ **Implemented:**
- Random password generation
- Secrets stored in AWS Secrets Manager
- Recovery windows configured
- IAM policies for access control

🔒 **Additional Recommendations:**
- Enable automatic secret rotation
- Use different secrets per environment
- Audit secret access via CloudTrail
- Implement least-privilege IAM policies

### 4. Network Security

✅ **Implemented:**
- Security groups with least privilege
- VPC isolation
- No public database access
- Separate security groups per environment

🔒 **Additional Recommendations:**
- Use VPC endpoints for AWS services
- Enable VPC Flow Logs
- Implement Network ACLs
- Use AWS PrivateLink

### 5. Compliance & Monitoring

**Enable CloudTrail:**
```bash
aws cloudtrail create-trail \
  --name rentaliq-audit-trail \
  --s3-bucket-name rentaliq-cloudtrail-logs
```

**Enable AWS Config:**
```bash
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::ACCOUNT_ID:role/config-role
```

**Set up CloudWatch Alarms:**
- Database CPU > 80%
- Database storage < 10%
- Failed login attempts
- Unauthorized API calls

---

## Troubleshooting

### Common Issues

#### 1. "Error: error creating DB Instance: InvalidParameterValue"

**Cause:** Invalid instance class or parameter combination.

**Solution:**
```bash
# Verify instance class is available in your region
aws rds describe-orderable-db-instance-options \
  --engine postgres \
  --query 'OrderableDBInstanceOptions[?DBInstanceClass==`db.t3.micro`]'
```

#### 2. "Error: insufficient IAM permissions"

**Cause:** Your AWS user lacks required permissions.

**Solution:** Attach these managed policies to your IAM user:
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess`
- `SecretsManagerReadWrite`
- `IAMFullAccess`
- `AmazonEC2FullAccess` (for VPC/Security Groups)

#### 3. "Error: InvalidDBInstanceState"

**Cause:** RDS instance is in transitional state.

**Solution:** Wait 5-10 minutes and retry:
```bash
aws rds describe-db-instances \
  --db-instance-identifier rentaliq-lab-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

#### 4. "Error: Bucket already exists"

**Cause:** S3 bucket name is globally taken.

**Solution:** Modify bucket name in `s3.tf`:
```hcl
bucket = "${var.project_name}-${each.key}-files-${data.aws_caller_identity.current.account_id}"
```

#### 5. Terraform State Lock

**Cause:** Previous terraform run didn't complete.

**Solution:**
```bash
# Force unlock (use carefully)
terraform force-unlock <LOCK_ID>
```

### Debug Mode

Enable detailed logging:
```bash
export TF_LOG=DEBUG
terraform apply
```

### Verify Resources

```bash
# Check RDS
aws rds describe-db-instances --output table

# Check S3
aws s3 ls

# Check Secrets
aws secretsmanager list-secrets --output table

# Check Security Groups
aws ec2 describe-security-groups \
  --filters "Name=tag:Project,Values=RentalIQ" \
  --output table
```

---

## Cleanup

### Destroy All Resources

**⚠️ WARNING:** This will delete ALL resources including databases and data!

```bash
# Preview what will be destroyed
terraform plan -destroy

# Destroy everything
terraform destroy
```

### Destroy Specific Environment

```bash
# Destroy only LAB
terraform destroy \
  -target='aws_db_instance.rentaliq["lab"]' \
  -target='aws_s3_bucket.rentaliq["lab"]' \
  -target='aws_secretsmanager_secret.db_credentials["lab"]'
```

### Cleanup Before Destroy

For production, create final backups:

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier rentaliq-prod-db \
  --db-snapshot-identifier rentaliq-prod-final-backup-$(date +%Y%m%d)

# Export S3 data
aws s3 sync s3://rentaliq-prod-files/ ./prod-backup/
```

### Post-Destroy Verification

```bash
# Verify RDS deleted
aws rds describe-db-instances --output table

# Verify S3 deleted
aws s3 ls

# Verify Secrets deleted
aws secretsmanager list-secrets --output table

# Check for orphaned resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=RentalIQ
```

---

## Advanced Topics

### Remote State Management

For team collaboration, use S3 backend:

1. **Create state bucket:**
   ```bash
   aws s3 mb s3://rentaliq-terraform-state
   aws s3api put-bucket-versioning \
     --bucket rentaliq-terraform-state \
     --versioning-configuration Status=Enabled
   ```

2. **Uncomment backend in main.tf:**
   ```hcl
   backend "s3" {
     bucket = "rentaliq-terraform-state"
     key    = "rentaliq/terraform.tfstate"
     region = "us-east-1"
   }
   ```

3. **Migrate state:**
   ```bash
   terraform init -migrate-state
   ```

### Terraform Modules

Organize code into reusable modules:

```
terraform/
├── modules/
│   ├── rds/
│   ├── s3/
│   └── secrets/
└── environments/
    ├── lab/
    ├── qa/
    └── prod/
```

### CI/CD Integration

**GitHub Actions example:**
```yaml
name: Terraform Deploy

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: hashicorp/setup-terraform@v1
      - name: Terraform Init
        run: terraform init
      - name: Terraform Plan
        run: terraform plan
      - name: Terraform Apply
        run: terraform apply -auto-approve
```

---

## Support & Resources

### Documentation

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

### Useful Commands

```bash
# Format Terraform files
terraform fmt -recursive

# Validate configuration
terraform validate

# Show current state
terraform show

# List resources
terraform state list

# Import existing resource
terraform import aws_s3_bucket.rentaliq existing-bucket-name

# Refresh state
terraform refresh

# Graph dependencies
terraform graph | dot -Tpng > graph.png
```

### Getting Help

- [Terraform Community Forum](https://discuss.hashicorp.com/c/terraform-core)
- [AWS Support](https://console.aws.amazon.com/support/)
- [Stack Overflow - Terraform](https://stackoverflow.com/questions/tagged/terraform)

---

## Version History

- **v1.0.0** (2025-11-08) - Initial production-ready configuration
  - Multi-environment support (LAB, QA, PROD)
  - RDS PostgreSQL instances
  - S3 buckets with lifecycle policies
  - AWS Secrets Manager integration
  - Security groups and IAM policies
  - Comprehensive documentation

---

## License

This infrastructure code is proprietary to RentalIQ project.

---

## Author

**Keith Perez**
- Project: RentalIQ
- Date: November 2025

---

## Notes

- Always review `terraform plan` before applying changes
- Test changes in LAB before deploying to QA/PROD
- Keep Terraform version updated
- Never commit `.tfvars` files with sensitive data
- Regularly review AWS costs
- Implement monitoring and alerts
- Follow security best practices
- Document any customizations

---

**Happy Terraforming! 🚀**
