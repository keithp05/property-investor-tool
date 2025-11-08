# RentalIQ Terraform - Deployment Checklist

Use this checklist to ensure a smooth deployment of RentalIQ infrastructure to AWS.

---

## Pre-Deployment Checklist

### 1. Prerequisites Installed

- [ ] Terraform >= 1.0 installed
  ```bash
  terraform version
  ```

- [ ] AWS CLI >= 2.0 installed
  ```bash
  aws --version
  ```

- [ ] jq installed (for JSON parsing)
  ```bash
  jq --version
  ```

- [ ] PostgreSQL client installed (optional, for testing)
  ```bash
  psql --version
  ```

### 2. AWS Account Setup

- [ ] AWS account created
- [ ] IAM user created with programmatic access
- [ ] IAM user has required permissions:
  - [ ] AmazonRDSFullAccess
  - [ ] AmazonS3FullAccess
  - [ ] SecretsManagerReadWrite
  - [ ] IAMFullAccess
  - [ ] AmazonEC2FullAccess

- [ ] AWS credentials configured
  ```bash
  aws configure
  aws sts get-caller-identity
  ```

- [ ] Default region set to desired region (e.g., us-east-1)

### 3. Network Configuration

- [ ] VPC identified (or using default VPC)
  ```bash
  aws ec2 describe-vpcs
  ```

- [ ] Subnet groups exist in VPC
  ```bash
  aws ec2 describe-subnets --filters "Name=vpc-id,Values=<VPC_ID>"
  ```

- [ ] CIDR blocks documented for security group rules

### 4. Configuration Review

- [ ] Review `variables.tf` - understand all variables
- [ ] Review `main.tf` - check AWS region
- [ ] Review `example.tfvars` - understand customization options
- [ ] Create `terraform.tfvars` with custom values
- [ ] Update `allowed_cidr_blocks` in `terraform.tfvars`
- [ ] Update `vpc_id` if not using default VPC

### 5. Cost Awareness

- [ ] Reviewed estimated costs in README.md
- [ ] Monthly budget approved (~$171-185 for all environments)
- [ ] AWS Budgets configured for alerts
- [ ] Cost allocation tags understood

### 6. Security Review

- [ ] `.gitignore` file present
- [ ] `terraform.tfvars` will NOT be committed to git
- [ ] SSH keys and credentials secured
- [ ] Secret management strategy understood

---

## Deployment Checklist

### Phase 1: Initialize

- [ ] Navigate to terraform directory
  ```bash
  cd /Users/keithperez/Documents/Claud/Realestate\ App/terraform/
  ```

- [ ] Initialize Terraform
  ```bash
  terraform init
  ```

- [ ] Verify initialization successful
  - [ ] `.terraform` directory created
  - [ ] Provider plugins downloaded

### Phase 2: Validate

- [ ] Format Terraform files
  ```bash
  terraform fmt -recursive
  ```

- [ ] Validate configuration
  ```bash
  terraform validate
  ```

- [ ] Review main.tf provider configuration
- [ ] Review all .tf files for errors

### Phase 3: Plan

- [ ] Generate execution plan
  ```bash
  terraform plan -out=tfplan
  ```

- [ ] Review planned changes:
  - [ ] Number of resources to create matches expectations
  - [ ] Resource names are correct
  - [ ] Tags are properly set
  - [ ] No unexpected deletions
  - [ ] Security groups configured correctly

- [ ] Save plan output for reference

### Phase 4: Deploy (LAB First)

**Start with LAB environment only:**

- [ ] Create `lab.tfvars`
  ```hcl
  environments = ["lab"]
  ```

- [ ] Plan LAB deployment
  ```bash
  terraform plan -var-file=lab.tfvars
  ```

- [ ] Apply LAB deployment
  ```bash
  terraform apply -var-file=lab.tfvars
  ```

- [ ] Monitor deployment progress (15-20 minutes)

- [ ] Verify LAB resources created:
  - [ ] RDS instance: `rentaliq-lab-db`
  - [ ] S3 bucket: `rentaliq-lab-files`
  - [ ] Secrets created (4 secrets)
  - [ ] Security groups created

### Phase 5: Test LAB Environment

- [ ] Get RDS endpoint
  ```bash
  terraform output rds_endpoints
  ```

- [ ] Retrieve database password
  ```bash
  aws secretsmanager get-secret-value --secret-id rentaliq/lab/db/credentials --query SecretString --output text | jq -r .password
  ```

- [ ] Get connection string
  ```bash
  aws secretsmanager get-secret-value --secret-id rentaliq/lab/db/connection-string --query SecretString --output text | jq -r .DATABASE_URL
  ```

- [ ] Test database connection
  ```bash
  psql "<CONNECTION_STRING>"
  ```

- [ ] Create test table
  ```sql
  CREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(100));
  INSERT INTO test (name) VALUES ('Test Entry');
  SELECT * FROM test;
  DROP TABLE test;
  \q
  ```

- [ ] Test S3 bucket
  ```bash
  echo "Test file" > test.txt
  aws s3 cp test.txt s3://rentaliq-lab-files/
  aws s3 ls s3://rentaliq-lab-files/
  aws s3 rm s3://rentaliq-lab-files/test.txt
  rm test.txt
  ```

- [ ] Verify encryption enabled
  ```bash
  aws s3api get-bucket-encryption --bucket rentaliq-lab-files
  ```

- [ ] Test IAM policy (if applicable)

### Phase 6: Deploy QA Environment

- [ ] Create `qa.tfvars`
  ```hcl
  environments = ["qa"]
  ```

- [ ] Plan QA deployment
  ```bash
  terraform plan -var-file=qa.tfvars
  ```

- [ ] Apply QA deployment
  ```bash
  terraform apply -var-file=qa.tfvars
  ```

- [ ] Verify QA resources created

- [ ] Test QA database connectivity

- [ ] Test QA S3 bucket access

### Phase 7: Deploy PROD Environment

**IMPORTANT: Double-check all settings before deploying PROD!**

- [ ] Review PROD-specific settings:
  - [ ] Multi-AZ enabled
  - [ ] Deletion protection enabled
  - [ ] 30-day backup retention
  - [ ] Performance Insights enabled
  - [ ] Enhanced Monitoring enabled

- [ ] Create `prod.tfvars`
  ```hcl
  environments = ["prod"]
  ```

- [ ] Plan PROD deployment
  ```bash
  terraform plan -var-file=prod.tfvars
  ```

- [ ] Review plan carefully (PROD is critical!)

- [ ] Apply PROD deployment
  ```bash
  terraform apply -var-file=prod.tfvars
  ```

- [ ] Monitor deployment (may take longer due to Multi-AZ)

- [ ] Verify PROD resources created

- [ ] Test PROD database connectivity (read-only test)

- [ ] Test PROD S3 bucket access

---

## Post-Deployment Checklist

### 1. Verification

- [ ] All environments deployed successfully
  ```bash
  terraform state list
  ```

- [ ] Review all outputs
  ```bash
  terraform output
  ```

- [ ] Verify resource counts match expectations:
  - [ ] 3 RDS instances (or count of environments)
  - [ ] 4 S3 buckets (3 + logs bucket)
  - [ ] 12 secrets (4 per environment)
  - [ ] 6 security groups (2 per environment)

### 2. AWS Console Verification

- [ ] RDS Console - verify all instances running
- [ ] S3 Console - verify all buckets created
- [ ] Secrets Manager - verify all secrets created
- [ ] VPC Console - verify security groups
- [ ] CloudWatch - verify metrics appearing

### 3. Documentation

- [ ] Document all outputs in secure location:
  - [ ] RDS endpoints
  - [ ] S3 bucket names
  - [ ] Secret ARNs
  - [ ] Security group IDs

- [ ] Save `terraform.tfstate` backup
  ```bash
  cp terraform.tfstate terraform.tfstate.backup
  ```

- [ ] Document deployment date and version

- [ ] Update runbook with environment-specific details

### 4. Security Hardening

- [ ] Rotate initial database passwords (optional)
- [ ] Configure secret rotation (optional)
- [ ] Enable MFA delete on PROD S3 bucket
  ```bash
  aws s3api put-bucket-versioning \
    --bucket rentaliq-prod-files \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::ACCOUNT_ID:mfa/USER MFA_CODE"
  ```

- [ ] Configure CloudTrail for audit logging
- [ ] Enable AWS Config for compliance
- [ ] Set up VPC Flow Logs

### 5. Monitoring & Alerting

- [ ] Create CloudWatch Dashboard
  ```bash
  # See ARCHITECTURE.md for alarm examples
  ```

- [ ] Configure CloudWatch Alarms:
  - [ ] RDS CPU > 80%
  - [ ] RDS Free Storage < 10%
  - [ ] RDS Database Connections > threshold
  - [ ] S3 4xx/5xx errors

- [ ] Configure SNS topics for alerts

- [ ] Test alert notifications

### 6. Backup Verification

- [ ] Verify RDS automated backups configured
  ```bash
  aws rds describe-db-instances \
    --db-instance-identifier rentaliq-prod-db \
    --query 'DBInstances[0].{Retention:BackupRetentionPeriod,Window:PreferredBackupWindow}'
  ```

- [ ] Create initial manual snapshot (PROD)
  ```bash
  aws rds create-db-snapshot \
    --db-instance-identifier rentaliq-prod-db \
    --db-snapshot-identifier rentaliq-prod-initial-snapshot
  ```

- [ ] Verify S3 versioning enabled (QA/PROD)
  ```bash
  aws s3api get-bucket-versioning --bucket rentaliq-prod-files
  ```

- [ ] Test backup restoration procedure (LAB)

### 7. Access Management

- [ ] Create IAM roles for application servers
- [ ] Attach read-secrets policies to application roles
- [ ] Test application access to secrets
- [ ] Document least-privilege access patterns

### 8. Cost Management

- [ ] Set up AWS Cost Explorer
- [ ] Create monthly budget alert
- [ ] Tag all resources consistently
- [ ] Enable cost allocation tags
- [ ] Review initial costs after 24 hours

### 9. Disaster Recovery

- [ ] Document RTO/RPO requirements
- [ ] Create DR runbook
- [ ] Test backup restoration (LAB environment)
- [ ] Document recovery procedures
- [ ] Schedule DR drills

### 10. Application Integration

- [ ] Update application configuration with:
  - [ ] RDS endpoint for each environment
  - [ ] Secret ARNs for credential retrieval
  - [ ] S3 bucket names
  - [ ] AWS region

- [ ] Test application database connectivity
- [ ] Test application S3 file upload/download
- [ ] Test application secret retrieval
- [ ] Perform end-to-end application tests

---

## Maintenance Checklist

### Daily

- [ ] Check CloudWatch dashboards for anomalies
- [ ] Review CloudWatch alarms (if any triggered)
- [ ] Monitor AWS Health Dashboard

### Weekly

- [ ] Review RDS Performance Insights (QA/PROD)
- [ ] Check backup success/failure
- [ ] Review S3 storage metrics
- [ ] Check AWS costs

### Monthly

- [ ] Review and optimize costs
- [ ] Update Terraform to latest version
- [ ] Review security group rules
- [ ] Test backup restoration
- [ ] Review CloudTrail logs for anomalies
- [ ] Update documentation

### Quarterly

- [ ] Review and update architecture
- [ ] Perform disaster recovery drill
- [ ] Review and rotate secrets
- [ ] Review IAM policies and access
- [ ] Capacity planning review
- [ ] Consider Reserved Instance purchases

---

## Troubleshooting Common Issues

### Issue: Terraform init fails

- [ ] Check internet connectivity
- [ ] Verify Terraform version >= 1.0
- [ ] Delete `.terraform` directory and retry
- [ ] Check for typos in `main.tf`

### Issue: Insufficient IAM permissions

- [ ] Verify IAM policies attached
- [ ] Check AWS credentials configured
- [ ] Test with `aws sts get-caller-identity`
- [ ] Review error message for specific missing permission

### Issue: RDS instance creation fails

- [ ] Check subnet group has subnets in at least 2 AZs
- [ ] Verify instance class available in region
- [ ] Check VPC has sufficient IP addresses
- [ ] Review CloudTrail logs for detailed error

### Issue: S3 bucket name already taken

- [ ] S3 bucket names are globally unique
- [ ] Modify bucket name in `s3.tf`
- [ ] Add account ID to bucket name for uniqueness

### Issue: Terraform state lock

- [ ] Another terraform process may be running
- [ ] Force unlock if safe: `terraform force-unlock <LOCK_ID>`
- [ ] Check for zombie processes

---

## Rollback Procedures

### If Deployment Fails

1. **Review Error Messages**
   ```bash
   terraform show
   ```

2. **Destroy Failed Resources**
   ```bash
   terraform destroy -target=<FAILED_RESOURCE>
   ```

3. **Fix Configuration**
   - Update .tf files
   - Validate changes

4. **Re-deploy**
   ```bash
   terraform apply
   ```

### If Need to Destroy Everything

**WARNING: This will delete all data!**

1. **Create Final Backups**
   ```bash
   # RDS snapshot
   aws rds create-db-snapshot --db-instance-identifier rentaliq-prod-db --db-snapshot-identifier pre-destroy-backup

   # S3 sync
   aws s3 sync s3://rentaliq-prod-files ./backup/
   ```

2. **Disable Deletion Protection (PROD)**
   ```bash
   aws rds modify-db-instance --db-instance-identifier rentaliq-prod-db --no-deletion-protection
   ```

3. **Destroy Resources**
   ```bash
   terraform destroy
   ```

---

## Success Criteria

Deployment is successful when:

- [ ] All Terraform resources created without errors
- [ ] All database instances in "available" state
- [ ] All S3 buckets accessible
- [ ] All secrets retrievable
- [ ] Database connectivity confirmed
- [ ] S3 file operations working
- [ ] Application can connect to all resources
- [ ] Backups configured and working
- [ ] Monitoring and alerts configured
- [ ] No unexpected costs incurred
- [ ] Documentation updated
- [ ] Team notified of new infrastructure

---

## Sign-Off

**Deployment completed by:** _______________
**Date:** _______________
**Environment(s) deployed:** [ ] LAB [ ] QA [ ] PROD
**Issues encountered:** _______________
**Notes:** _______________

---

**Version:** 1.0
**Last Updated:** November 8, 2025
