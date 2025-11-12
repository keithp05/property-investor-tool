# RentalIQ - Terraform Variables Configuration

# ========================================
# General Configuration
# ========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "rentaliq"
}

variable "owner" {
  description = "Owner/team responsible for resources"
  type        = string
  default     = "Keith Perez"
}

# ========================================
# Environment Configuration
# ========================================

variable "environments" {
  description = "List of environments to deploy"
  type        = list(string)
  default     = ["lab", "qa", "prod"]
}

# ========================================
# RDS Configuration
# ========================================

variable "rds_instance_classes" {
  description = "RDS instance classes per environment"
  type        = map(string)
  default = {
    lab  = "db.t3.micro"
    qa   = "db.t3.small"
    prod = "db.t3.medium"
  }
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB per environment"
  type        = map(number)
  default = {
    lab  = 20
    qa   = 50
    prod = 100
  }
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling"
  type        = map(number)
  default = {
    lab  = 50
    qa   = 100
    prod = 500
  }
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.14"
}

variable "rds_backup_retention_period" {
  description = "Backup retention period in days per environment"
  type        = map(number)
  default = {
    lab  = 3
    qa   = 7
    prod = 30
  }
}

variable "rds_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "rds_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for high availability per environment"
  type        = map(bool)
  default = {
    lab  = false
    qa   = false
    prod = true
  }
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection per environment"
  type        = map(bool)
  default = {
    lab  = false
    qa   = false
    prod = true
  }
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on deletion per environment"
  type        = map(bool)
  default = {
    lab  = true
    qa   = true
    prod = false
  }
}

variable "rds_performance_insights_enabled" {
  description = "Enable Performance Insights per environment"
  type        = map(bool)
  default = {
    lab  = false
    qa   = true
    prod = true
  }
}

variable "rds_db_name" {
  description = "Database name"
  type        = string
  default     = "rentaliq"
}

variable "rds_username" {
  description = "Master username for RDS"
  type        = string
  default     = "rentaliq_admin"
  sensitive   = true
}

# ========================================
# S3 Configuration
# ========================================

variable "s3_versioning_enabled" {
  description = "Enable versioning for S3 buckets per environment"
  type        = map(bool)
  default = {
    lab  = false
    qa   = true
    prod = true
  }
}

variable "s3_lifecycle_enabled" {
  description = "Enable lifecycle policies per environment"
  type        = map(bool)
  default = {
    lab  = true
    qa   = true
    prod = true
  }
}

variable "s3_transition_to_ia_days" {
  description = "Days before transitioning to Infrequent Access"
  type        = map(number)
  default = {
    lab  = 90
    qa   = 90
    prod = 90
  }
}

variable "s3_transition_to_glacier_days" {
  description = "Days before transitioning to Glacier"
  type        = map(number)
  default = {
    lab  = 180
    qa   = 180
    prod = 365
  }
}

variable "s3_expiration_days" {
  description = "Days before object expiration (0 = disabled)"
  type        = map(number)
  default = {
    lab  = 365
    qa   = 0
    prod = 0
  }
}

# ========================================
# Security Configuration
# ========================================

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access RDS (application servers)"
  type        = list(string)
  default     = ["10.0.0.0/8"] # Adjust to your VPC CIDR
}

variable "vpc_id" {
  description = "VPC ID where resources will be deployed (leave empty to use default VPC)"
  type        = string
  default     = ""
}

# ========================================
# Secrets Manager Configuration
# ========================================

variable "secrets_recovery_window_days" {
  description = "Recovery window for deleted secrets per environment"
  type        = map(number)
  default = {
    lab  = 0
    qa   = 7
    prod = 30
  }
}

# ========================================
# Monitoring & Logging
# ========================================

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs for RDS per environment"
  type        = map(bool)
  default = {
    lab  = false
    qa   = true
    prod = true
  }
}

variable "log_exports" {
  description = "List of log types to export to CloudWatch"
  type        = list(string)
  default     = ["postgresql", "upgrade"]
}

# ========================================
# Cost Optimization
# ========================================

variable "enable_auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "s3_intelligent_tiering_enabled" {
  description = "Enable S3 Intelligent-Tiering per environment"
  type        = map(bool)
  default = {
    lab  = false
    qa   = false
    prod = true
  }
}

# ========================================
# Cron Job Configuration
# ========================================

variable "cron_secret" {
  description = "Secret token for authenticating cron job requests"
  type        = string
  sensitive   = true
  default     = ""
}

variable "amplify_domain" {
  description = "Amplify app domain for API endpoint"
  type        = string
  default     = "https://develop.d3q1fuby25122q.amplifyapp.com"
}
