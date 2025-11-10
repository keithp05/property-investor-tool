# RentalIQ - Terraform Outputs Configuration

# ========================================
# RDS Database Outputs
# ========================================

output "rds_endpoints" {
  description = "RDS database endpoints for all environments"
  value = {
    for env in var.environments : env => {
      endpoint = aws_db_instance.rentaliq[env].endpoint
      address  = aws_db_instance.rentaliq[env].address
      port     = aws_db_instance.rentaliq[env].port
    }
  }
}

output "rds_instance_ids" {
  description = "RDS instance identifiers"
  value = {
    for env in var.environments : env => aws_db_instance.rentaliq[env].id
  }
}

output "rds_arns" {
  description = "RDS instance ARNs"
  value = {
    for env in var.environments : env => aws_db_instance.rentaliq[env].arn
  }
}

output "rds_database_names" {
  description = "RDS database names"
  value = {
    for env in var.environments : env => aws_db_instance.rentaliq[env].db_name
  }
}

# ========================================
# Database Connection Information
# ========================================

output "database_connection_strings" {
  description = "Database connection strings (sensitive - stored in Secrets Manager)"
  sensitive   = true
  value = {
    for env in var.environments : env => {
      postgresql = "postgresql://${var.rds_username}:***@${aws_db_instance.rentaliq[env].address}:${aws_db_instance.rentaliq[env].port}/${var.rds_db_name}"
      jdbc       = "jdbc:postgresql://${aws_db_instance.rentaliq[env].address}:${aws_db_instance.rentaliq[env].port}/${var.rds_db_name}"
    }
  }
}

output "database_usernames" {
  description = "Database master usernames"
  value       = var.rds_username
  sensitive   = true
}

# ========================================
# S3 Bucket Outputs
# ========================================

output "s3_bucket_names" {
  description = "S3 bucket names for all environments"
  value = {
    for env in var.environments : env => aws_s3_bucket.rentaliq[env].id
  }
}

output "s3_bucket_arns" {
  description = "S3 bucket ARNs"
  value = {
    for env in var.environments : env => aws_s3_bucket.rentaliq[env].arn
  }
}

output "s3_bucket_regions" {
  description = "S3 bucket regions"
  value = {
    for env in var.environments : env => aws_s3_bucket.rentaliq[env].region
  }
}

output "s3_bucket_domain_names" {
  description = "S3 bucket domain names"
  value = {
    for env in var.environments : env => aws_s3_bucket.rentaliq[env].bucket_domain_name
  }
}

output "s3_logs_bucket" {
  description = "S3 access logs bucket name"
  value       = aws_s3_bucket.logs.id
}

# ========================================
# Secrets Manager Outputs
# ========================================

output "secrets_manager_db_credentials_arns" {
  description = "ARNs of database credentials secrets"
  value = {
    for env in var.environments : env => aws_secretsmanager_secret.db_credentials[env].arn
  }
}

output "secrets_manager_db_connection_string_arns" {
  description = "ARNs of database connection string secrets"
  value = {
    for env in var.environments : env => aws_secretsmanager_secret.db_connection_string[env].arn
  }
}

output "secrets_manager_api_keys_arns" {
  description = "ARNs of API keys secrets"
  value = {
    for env in var.environments : env => aws_secretsmanager_secret.api_keys[env].arn
  }
}

output "secrets_manager_s3_config_arns" {
  description = "ARNs of S3 configuration secrets"
  value = {
    for env in var.environments : env => aws_secretsmanager_secret.s3_config[env].arn
  }
}

# ========================================
# Security Group Outputs
# ========================================

output "rds_security_group_ids" {
  description = "RDS security group IDs"
  value = {
    for env in var.environments : env => aws_security_group.rds[env].id
  }
}

output "application_security_group_ids" {
  description = "Application security group IDs"
  value = {
    for env in var.environments : env => aws_security_group.application[env].id
  }
}

# ========================================
# IAM Outputs
# ========================================

output "iam_read_secrets_policy_arns" {
  description = "IAM policy ARNs for reading secrets"
  value = {
    for env in var.environments : env => aws_iam_policy.read_secrets[env].arn
  }
}

# ========================================
# Quick Start Commands
# ========================================

output "quick_start_commands" {
  description = "Quick start commands for accessing resources"
  value = {
    for env in var.environments : env => {
      get_db_password       = "aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.db_credentials[env].name} --query SecretString --output text | jq -r .password"
      get_connection_string = "aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.db_connection_string[env].name} --query SecretString --output text | jq -r .DATABASE_URL"
      connect_psql          = "psql $(aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.db_connection_string[env].name} --query SecretString --output text | jq -r .DATABASE_URL)"
      list_s3_files         = "aws s3 ls s3://${aws_s3_bucket.rentaliq[env].id}/"
      upload_to_s3          = "aws s3 cp <local-file> s3://${aws_s3_bucket.rentaliq[env].id}/"
    }
  }
}

# ========================================
# Cost Estimation Outputs
# ========================================

output "estimated_monthly_costs" {
  description = "Estimated monthly costs (approximate)"
  value = {
    lab = {
      rds     = "~$15/month (db.t3.micro, 20GB)"
      s3      = "~$0.50-2/month (depends on usage)"
      secrets = "~$0.40/month (4 secrets)"
      total   = "~$16-18/month"
    }
    qa = {
      rds     = "~$30/month (db.t3.small, 50GB)"
      s3      = "~$1-5/month (depends on usage)"
      secrets = "~$0.40/month (4 secrets)"
      total   = "~$32-36/month"
    }
    prod = {
      rds     = "~$120/month (db.t3.medium, 100GB, Multi-AZ)"
      s3      = "~$2-10/month (depends on usage)"
      secrets = "~$0.40/month (4 secrets)"
      total   = "~$123-131/month"
    }
    all_environments = "~$171-185/month total"
  }
}

# ========================================
# Environment Summary
# ========================================

output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    region       = var.aws_region
    environments = var.environments
    vpc_id       = data.aws_vpc.selected.id
    account_id   = data.aws_caller_identity.current.account_id
    resources = {
      rds_instances   = length(var.environments)
      s3_buckets      = length(var.environments) + 1 # +1 for logs bucket
      secrets         = length(var.environments) * 4
      security_groups = length(var.environments) * 2
      iam_policies    = length(var.environments)
    }
  }
}
