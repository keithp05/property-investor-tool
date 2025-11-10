# RentalIQ - S3 Bucket Configuration

# ========================================
# S3 Buckets for File Storage
# ========================================

resource "aws_s3_bucket" "rentaliq" {
  for_each = toset(var.environments)

  bucket = "${lower(var.project_name)}-${each.key}-files"

  tags = {
    Name        = "${var.project_name}-${each.key}-files"
    Environment = each.key
    Purpose     = "Application file storage"
  }
}

# ========================================
# S3 Bucket Versioning
# ========================================

resource "aws_s3_bucket_versioning" "rentaliq" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.rentaliq[each.key].id

  versioning_configuration {
    status = var.s3_versioning_enabled[each.key] ? "Enabled" : "Suspended"
  }
}

# ========================================
# S3 Bucket Encryption
# ========================================

resource "aws_s3_bucket_server_side_encryption_configuration" "rentaliq" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.rentaliq[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
      # For production, consider using KMS:
      # sse_algorithm     = "aws:kms"
      # kms_master_key_id = aws_kms_key.s3[each.key].arn
    }
    bucket_key_enabled = true
  }
}

# ========================================
# S3 Bucket Public Access Block
# ========================================

resource "aws_s3_bucket_public_access_block" "rentaliq" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.rentaliq[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ========================================
# S3 Bucket Lifecycle Configuration
# ========================================

resource "aws_s3_bucket_lifecycle_configuration" "rentaliq" {
  for_each = {
    for env in var.environments : env => env
    if var.s3_lifecycle_enabled[env]
  }

  bucket = aws_s3_bucket.rentaliq[each.key].id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = var.s3_transition_to_ia_days[each.key]
      storage_class = "STANDARD_IA"
    }

    filter {}
  }

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    transition {
      days          = var.s3_transition_to_glacier_days[each.key]
      storage_class = "GLACIER"
    }

    filter {}
  }

  dynamic "rule" {
    for_each = var.s3_expiration_days[each.key] > 0 ? [1] : []

    content {
      id     = "expire-old-objects"
      status = "Enabled"

      expiration {
        days = var.s3_expiration_days[each.key]
      }

      filter {}
    }
  }

  # Clean up incomplete multipart uploads
  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    filter {}
  }

  # Delete old versions (if versioning enabled)
  dynamic "rule" {
    for_each = var.s3_versioning_enabled[each.key] ? [1] : []

    content {
      id     = "expire-old-versions"
      status = "Enabled"

      noncurrent_version_expiration {
        noncurrent_days = 90
      }

      filter {}
    }
  }
}

# ========================================
# S3 Bucket Intelligent-Tiering (Production)
# ========================================

resource "aws_s3_bucket_intelligent_tiering_configuration" "rentaliq" {
  for_each = {
    for env in var.environments : env => env
    if var.s3_intelligent_tiering_enabled[env]
  }

  bucket = aws_s3_bucket.rentaliq[each.key].id
  name   = "EntireBucket"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}

# ========================================
# S3 Bucket Logging
# ========================================

# Create logging bucket
resource "aws_s3_bucket" "logs" {
  bucket = "${lower(var.project_name)}-access-logs"

  tags = {
    Name    = "${var.project_name}-access-logs"
    Purpose = "S3 access logs"
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle for log bucket
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    filter {}
  }
}

# Enable logging for production bucket
resource "aws_s3_bucket_logging" "rentaliq_prod" {
  count = contains(var.environments, "prod") ? 1 : 0

  bucket = aws_s3_bucket.rentaliq["prod"].id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/prod/"
}

# ========================================
# S3 Bucket CORS Configuration (if needed)
# ========================================

resource "aws_s3_bucket_cors_configuration" "rentaliq" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.rentaliq[each.key].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"] # Restrict this to your application domain
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ========================================
# S3 Bucket Policy (Optional - for application access)
# ========================================

# Uncomment and customize if you need bucket policies
# resource "aws_s3_bucket_policy" "rentaliq" {
#   for_each = toset(var.environments)
#
#   bucket = aws_s3_bucket.rentaliq[each.key].id
#
#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowApplicationAccess"
#         Effect = "Allow"
#         Principal = {
#           AWS = aws_iam_role.application[each.key].arn
#         }
#         Action = [
#           "s3:GetObject",
#           "s3:PutObject",
#           "s3:DeleteObject"
#         ]
#         Resource = "${aws_s3_bucket.rentaliq[each.key].arn}/*"
#       }
#     ]
#   })
# }
