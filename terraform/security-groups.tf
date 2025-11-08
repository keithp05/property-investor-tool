# RentalIQ - Security Groups Configuration

# ========================================
# RDS Security Groups
# ========================================

resource "aws_security_group" "rds" {
  for_each = toset(var.environments)

  name        = "${var.project_name}-${each.key}-rds-sg"
  description = "Security group for RentalIQ ${each.key} RDS PostgreSQL database"
  vpc_id      = data.aws_vpc.selected.id

  tags = {
    Name        = "${var.project_name}-${each.key}-rds-sg"
    Environment = each.key
  }
}

# ========================================
# RDS Security Group Rules - Ingress
# ========================================

# Allow PostgreSQL access from specified CIDR blocks
resource "aws_vpc_security_group_ingress_rule" "rds_postgresql" {
  for_each = toset(var.environments)

  security_group_id = aws_security_group.rds[each.key].id
  description       = "PostgreSQL access from application servers"

  from_port   = 5432
  to_port     = 5432
  ip_protocol = "tcp"
  cidr_ipv4   = var.allowed_cidr_blocks[0] # Primary CIDR

  tags = {
    Name        = "${var.project_name}-${each.key}-rds-postgresql"
    Environment = each.key
  }
}

# Additional CIDR blocks if needed
resource "aws_vpc_security_group_ingress_rule" "rds_postgresql_additional" {
  for_each = {
    for pair in flatten([
      for env in var.environments : [
        for idx, cidr in slice(var.allowed_cidr_blocks, 1, length(var.allowed_cidr_blocks)) : {
          env  = env
          cidr = cidr
          idx  = idx
        }
      ]
    ]) : "${pair.env}-${pair.idx}" => pair
  }

  security_group_id = aws_security_group.rds[each.value.env].id
  description       = "PostgreSQL access from additional CIDR ${each.value.idx + 1}"

  from_port   = 5432
  to_port     = 5432
  ip_protocol = "tcp"
  cidr_ipv4   = each.value.cidr

  tags = {
    Name        = "${var.project_name}-${each.value.env}-rds-postgresql-${each.value.idx + 1}"
    Environment = each.value.env
  }
}

# ========================================
# RDS Security Group Rules - Egress
# ========================================

# Allow all outbound traffic (needed for patches, updates, etc.)
resource "aws_vpc_security_group_egress_rule" "rds_all" {
  for_each = toset(var.environments)

  security_group_id = aws_security_group.rds[each.key].id
  description       = "Allow all outbound traffic"

  ip_protocol = "-1"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name        = "${var.project_name}-${each.key}-rds-egress"
    Environment = each.key
  }
}

# ========================================
# Application Security Group (Optional)
# ========================================

# Create security group for application servers that will access RDS
resource "aws_security_group" "application" {
  for_each = toset(var.environments)

  name        = "${var.project_name}-${each.key}-app-sg"
  description = "Security group for RentalIQ ${each.key} application servers"
  vpc_id      = data.aws_vpc.selected.id

  tags = {
    Name        = "${var.project_name}-${each.key}-app-sg"
    Environment = each.key
  }
}

# Allow application to access RDS
resource "aws_vpc_security_group_ingress_rule" "rds_from_app" {
  for_each = toset(var.environments)

  security_group_id = aws_security_group.rds[each.key].id
  description       = "PostgreSQL access from application security group"

  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.application[each.key].id

  tags = {
    Name        = "${var.project_name}-${each.key}-rds-from-app"
    Environment = each.key
  }
}

# Allow HTTPS outbound for application (for API calls, updates, etc.)
resource "aws_vpc_security_group_egress_rule" "app_https" {
  for_each = toset(var.environments)

  security_group_id = aws_security_group.application[each.key].id
  description       = "HTTPS outbound access"

  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name        = "${var.project_name}-${each.key}-app-https"
    Environment = each.key
  }
}

# Allow HTTP outbound for application
resource "aws_vpc_security_group_egress_rule" "app_http" {
  for_each = toset(var.environments)

  security_group_id = aws_security_group.application[each.key].id
  description       = "HTTP outbound access"

  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name        = "${var.project_name}-${each.key}-app-http"
    Environment = each.key
  }
}

# Allow application to access RDS (outbound)
resource "aws_vpc_security_group_egress_rule" "app_to_rds" {
  for_each = toset(var.environments)

  security_group_id = aws_security_group.application[each.key].id
  description       = "PostgreSQL access to RDS"

  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.rds[each.key].id

  tags = {
    Name        = "${var.project_name}-${each.key}-app-to-rds"
    Environment = each.key
  }
}

# ========================================
# Security Group for VPC Endpoints (Optional)
# ========================================

# Uncomment if using VPC endpoints for S3, Secrets Manager, etc.
# resource "aws_security_group" "vpc_endpoints" {
#   name        = "${var.project_name}-vpc-endpoints-sg"
#   description = "Security group for VPC endpoints"
#   vpc_id      = data.aws_vpc.selected.id
#
#   ingress {
#     description = "HTTPS from VPC"
#     from_port   = 443
#     to_port     = 443
#     protocol    = "tcp"
#     cidr_blocks = [data.aws_vpc.selected.cidr_block]
#   }
#
#   tags = {
#     Name = "${var.project_name}-vpc-endpoints-sg"
#   }
# }
