# RentalIQ - Terraform Infrastructure Configuration
# Deploy LAB, QA, and PROD environments for RentalIQ platform

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Store Terraform state in S3 (uncomment after first run)
  # backend "s3" {
  #   bucket = "rentaliq-terraform-state"
  #   key    = "rentaliq/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "RentalIQ"
      ManagedBy = "Terraform"
      Owner     = "Keith Perez"
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for available AZs
data "aws_availability_zones" "available" {
  state = "available"
}
