# RentalIQ - Example Terraform Variables File
# Copy this file to terraform.tfvars and customize for your deployment

# ========================================
# General Configuration
# ========================================

aws_region   = "us-east-1"
project_name = "rentaliq"
owner        = "Keith Perez"

# ========================================
# Environment Configuration
# ========================================

# Deploy all environments (default)
environments = ["lab", "qa", "prod"]

# Or deploy single environment:
# environments = ["lab"]
# environments = ["qa"]
# environments = ["prod"]

# Or deploy subset:
# environments = ["lab", "qa"]

# ========================================
# RDS Configuration Overrides (Optional)
# ========================================

# Customize instance classes per environment
# rds_instance_classes = {
#   lab  = "db.t3.micro"
#   qa   = "db.t3.small"
#   prod = "db.t3.large"     # Upgrade to larger instance
# }

# Customize storage sizes
# rds_allocated_storage = {
#   lab  = 20
#   qa   = 50
#   prod = 200               # Increase production storage
# }

# Customize backup retention
# rds_backup_retention_period = {
#   lab  = 1                  # Minimum for cost savings
#   qa   = 7
#   prod = 30
# }

# ========================================
# Security Configuration
# ========================================

# IMPORTANT: Customize this for your VPC CIDR blocks
# This controls which IP ranges can access your databases
allowed_cidr_blocks = ["10.0.0.0/16"]

# If you have multiple CIDR blocks:
# allowed_cidr_blocks = [
#   "10.0.0.0/16",           # Production VPC
#   "10.1.0.0/16",           # QA VPC
#   "10.2.0.0/16"            # Lab VPC
# ]

# Specify your VPC ID (leave empty to use default VPC)
# vpc_id = "vpc-xxxxxxxxx"
vpc_id = ""

# ========================================
# S3 Configuration Overrides (Optional)
# ========================================

# Customize lifecycle policies
# s3_transition_to_ia_days = {
#   lab  = 30                # Move to IA after 30 days
#   qa   = 60
#   prod = 90
# }

# s3_transition_to_glacier_days = {
#   lab  = 90
#   qa   = 120
#   prod = 180
# }

# ========================================
# Secrets Manager Configuration
# ========================================

# Customize recovery windows for deleted secrets
# secrets_recovery_window_days = {
#   lab  = 0                 # Immediate deletion for lab
#   qa   = 7                 # 7 day recovery for QA
#   prod = 30                # 30 day recovery for production
# }

# ========================================
# Monitoring Configuration
# ========================================

# Enable CloudWatch logs for all environments
# enable_cloudwatch_logs = {
#   lab  = true
#   qa   = true
#   prod = true
# }

# ========================================
# Cost Optimization
# ========================================

# Disable Multi-AZ for all non-production to save costs
# rds_multi_az = {
#   lab  = false
#   qa   = false
#   prod = true
# }

# Enable S3 Intelligent-Tiering for production only
# s3_intelligent_tiering_enabled = {
#   lab  = false
#   qa   = false
#   prod = true
# }
