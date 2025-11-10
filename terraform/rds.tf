# RentalIQ - RDS PostgreSQL Database Configuration

# ========================================
# Random Password Generation
# ========================================

resource "random_password" "db_password" {
  for_each = toset(var.environments)

  length  = 32
  special = true
  # Avoid special characters that cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}:?"
}

# ========================================
# DB Subnet Group
# ========================================

# Get default VPC if vpc_id not provided
data "aws_vpc" "selected" {
  id      = var.vpc_id != "" ? var.vpc_id : null
  default = var.vpc_id == "" ? true : null
}

# Get subnets for the VPC
data "aws_subnets" "database" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

resource "aws_db_subnet_group" "rentaliq" {
  for_each = toset(var.environments)

  name       = "${lower(var.project_name)}-${each.key}-db-subnet-group"
  subnet_ids = data.aws_subnets.database.ids

  tags = {
    Name        = "${var.project_name}-${each.key}-db-subnet-group"
    Environment = each.key
  }
}

# ========================================
# RDS Parameter Group
# ========================================

# Commented out temporarily - using default parameter group
# Custom parameters can be added later after RDS is created

# resource "aws_db_parameter_group" "rentaliq" {
#   for_each = toset(var.environments)
#
#   name   = "${lower(var.project_name)}-${each.key}-pg15-params"
#   family = "postgres15"
#
#   # Performance tuning parameters
#   parameter {
#     name  = "shared_preload_libraries"
#     value = "pg_stat_statements"
#     apply_method = "pending-reboot"  # Static parameter
#   }
#
#   parameter {
#     name  = "log_statement"
#     value = "all"
#   }
#
#   parameter {
#     name  = "log_min_duration_statement"
#     value = "1000" # Log queries taking more than 1 second
#   }
#
#   parameter {
#     name  = "max_connections"
#     value = each.key == "prod" ? "200" : "100"
#   }
#
#   tags = {
#     Name        = "${var.project_name}-${each.key}-parameter-group"
#     Environment = each.key
#   }
# }

# ========================================
# RDS PostgreSQL Instances
# ========================================

resource "aws_db_instance" "rentaliq" {
  for_each = toset(var.environments)

  # Instance configuration
  identifier     = "${lower(var.project_name)}-${each.key}-db"
  instance_class = var.rds_instance_classes[each.key]
  engine         = "postgres"
  engine_version = var.rds_engine_version

  # Database configuration
  db_name  = var.rds_db_name
  username = var.rds_username
  password = random_password.db_password[each.key].result
  port     = 5432

  # Storage configuration
  allocated_storage     = var.rds_allocated_storage[each.key]
  max_allocated_storage = var.rds_max_allocated_storage[each.key]
  storage_type          = "gp3"
  storage_encrypted     = true
  # KMS key can be added here for production
  # kms_key_id = aws_kms_key.rds[each.key].arn

  # High availability
  multi_az               = var.rds_multi_az[each.key]
  db_subnet_group_name   = aws_db_subnet_group.rentaliq[each.key].name
  vpc_security_group_ids = [aws_security_group.rds[each.key].id]

  # Backup configuration
  backup_retention_period   = var.rds_backup_retention_period[each.key]
  backup_window             = var.rds_backup_window
  maintenance_window        = var.rds_maintenance_window
  skip_final_snapshot       = var.rds_skip_final_snapshot[each.key]
  final_snapshot_identifier = var.rds_skip_final_snapshot[each.key] ? null : "${var.project_name}-${each.key}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Deletion protection
  deletion_protection = var.rds_deletion_protection[each.key]

  # Monitoring & Logging
  performance_insights_enabled          = var.rds_performance_insights_enabled[each.key]
  performance_insights_retention_period = var.rds_performance_insights_enabled[each.key] ? 7 : null
  enabled_cloudwatch_logs_exports       = var.enable_cloudwatch_logs[each.key] ? var.log_exports : []
  monitoring_interval                   = each.key == "prod" ? 60 : 0
  monitoring_role_arn                   = each.key == "prod" ? aws_iam_role.rds_monitoring[0].arn : null

  # Parameter group - using default for now
  # parameter_group_name = aws_db_parameter_group.rentaliq[each.key].name

  # Upgrades
  auto_minor_version_upgrade = var.enable_auto_minor_version_upgrade
  apply_immediately          = each.key == "lab" ? true : false

  # Public access
  publicly_accessible = false

  # Copy tags to snapshots
  copy_tags_to_snapshot = true

  tags = {
    Name        = "${var.project_name}-${each.key}-database"
    Environment = each.key
    Backup      = "true"
    Critical    = each.key == "prod" ? "true" : "false"
  }

  lifecycle {
    prevent_destroy = false      # Set to true for production in real deployment
    ignore_changes  = [password] # Prevent password changes from triggering replacement
  }
}

# ========================================
# IAM Role for Enhanced Monitoring
# ========================================

resource "aws_iam_role" "rds_monitoring" {
  count = contains(var.environments, "prod") ? 1 : 0

  name = "${var.project_name}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = contains(var.environments, "prod") ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
