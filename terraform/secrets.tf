# RentalIQ - AWS Secrets Manager Configuration

# ========================================
# Database Credentials Secrets
# ========================================

resource "aws_secretsmanager_secret" "db_credentials" {
  for_each = toset(var.environments)

  name        = "${var.project_name}/${each.key}/db/credentials"
  description = "Database credentials for RentalIQ ${each.key} environment"

  recovery_window_in_days = var.secrets_recovery_window_days[each.key]

  tags = {
    Name        = "${var.project_name}-${each.key}-db-credentials"
    Environment = each.key
    Purpose     = "Database credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  for_each = toset(var.environments)

  secret_id = aws_secretsmanager_secret.db_credentials[each.key].id

  secret_string = jsonencode({
    username             = var.rds_username
    password             = random_password.db_password[each.key].result
    engine               = "postgres"
    host                 = aws_db_instance.rentaliq[each.key].address
    port                 = aws_db_instance.rentaliq[each.key].port
    dbname               = var.rds_db_name
    dbInstanceIdentifier = aws_db_instance.rentaliq[each.key].id
  })

  lifecycle {
    ignore_changes = [secret_string] # Prevent terraform from overwriting rotated passwords
  }
}

# ========================================
# Database Connection String Secret
# ========================================

resource "aws_secretsmanager_secret" "db_connection_string" {
  for_each = toset(var.environments)

  name        = "${var.project_name}/${each.key}/db/connection-string"
  description = "Database connection string for RentalIQ ${each.key} environment"

  recovery_window_in_days = var.secrets_recovery_window_days[each.key]

  tags = {
    Name        = "${var.project_name}-${each.key}-db-connection-string"
    Environment = each.key
    Purpose     = "Database connection string"
  }
}

resource "aws_secretsmanager_secret_version" "db_connection_string" {
  for_each = toset(var.environments)

  secret_id = aws_secretsmanager_secret.db_connection_string[each.key].id

  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${var.rds_username}:${random_password.db_password[each.key].result}@${aws_db_instance.rentaliq[each.key].address}:${aws_db_instance.rentaliq[each.key].port}/${var.rds_db_name}"
    JDBC_URL     = "jdbc:postgresql://${aws_db_instance.rentaliq[each.key].address}:${aws_db_instance.rentaliq[each.key].port}/${var.rds_db_name}"
  })

  lifecycle {
    ignore_changes = [secret_string] # Prevent terraform from overwriting rotated passwords
  }
}

# ========================================
# Application API Keys Secret (Optional)
# ========================================

resource "random_password" "api_key" {
  for_each = toset(var.environments)

  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "api_keys" {
  for_each = toset(var.environments)

  name        = "${var.project_name}/${each.key}/api/keys"
  description = "API keys for RentalIQ ${each.key} environment"

  recovery_window_in_days = var.secrets_recovery_window_days[each.key]

  tags = {
    Name        = "${var.project_name}-${each.key}-api-keys"
    Environment = each.key
    Purpose     = "API authentication"
  }
}

resource "aws_secretsmanager_secret_version" "api_keys" {
  for_each = toset(var.environments)

  secret_id = aws_secretsmanager_secret.api_keys[each.key].id

  secret_string = jsonencode({
    api_key        = random_password.api_key[each.key].result
    jwt_secret     = random_password.jwt_secret[each.key].result
    encryption_key = random_password.encryption_key[each.key].result
  })
}

# JWT Secret
resource "random_password" "jwt_secret" {
  for_each = toset(var.environments)

  length  = 64
  special = true
}

# Encryption Key
resource "random_password" "encryption_key" {
  for_each = toset(var.environments)

  length  = 32
  special = false
}

# ========================================
# S3 Bucket Names Secret
# ========================================

resource "aws_secretsmanager_secret" "s3_config" {
  for_each = toset(var.environments)

  name        = "${var.project_name}/${each.key}/s3/config"
  description = "S3 configuration for RentalIQ ${each.key} environment"

  recovery_window_in_days = var.secrets_recovery_window_days[each.key]

  tags = {
    Name        = "${var.project_name}-${each.key}-s3-config"
    Environment = each.key
    Purpose     = "S3 bucket configuration"
  }
}

resource "aws_secretsmanager_secret_version" "s3_config" {
  for_each = toset(var.environments)

  secret_id = aws_secretsmanager_secret.s3_config[each.key].id

  secret_string = jsonencode({
    bucket_name = aws_s3_bucket.rentaliq[each.key].id
    bucket_arn  = aws_s3_bucket.rentaliq[each.key].arn
    region      = var.aws_region
  })
}

# ========================================
# IAM Policy for Applications to Read Secrets
# ========================================

resource "aws_iam_policy" "read_secrets" {
  for_each = toset(var.environments)

  name        = "${var.project_name}-${each.key}-read-secrets-policy"
  description = "Allow reading RentalIQ ${each.key} secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials[each.key].arn,
          aws_secretsmanager_secret.db_connection_string[each.key].arn,
          aws_secretsmanager_secret.api_keys[each.key].arn,
          aws_secretsmanager_secret.s3_config[each.key].arn
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${each.key}-read-secrets-policy"
    Environment = each.key
  }
}

# ========================================
# Secret Rotation Configuration (Optional)
# ========================================

# Uncomment to enable automatic secret rotation
# resource "aws_secretsmanager_secret_rotation" "db_credentials" {
#   for_each = {
#     for env in var.environments : env => env
#     if env == "prod" # Enable rotation for production only
#   }
#
#   secret_id           = aws_secretsmanager_secret.db_credentials[each.key].id
#   rotation_lambda_arn = aws_lambda_function.rotate_secret[each.key].arn
#
#   rotation_rules {
#     automatically_after_days = 30
#   }
# }
