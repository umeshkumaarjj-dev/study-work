# ============================================================
# General
# ============================================================

variable "aws_region" {
  description = "AWS region to deploy all resources"
  type        = string
}

variable "project_name" {
  description = "Short name used as a prefix on every resource"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
}

# ============================================================
# Networking
# ============================================================

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnet_1_cidr" {
  description = "CIDR for public subnet in AZ1 (EC2, NAT GW, ALB)"
  type        = string
}

variable "public_subnet_2_cidr" {
  description = "CIDR for public subnet in AZ2 (ALB requires 2 AZs)"
  type        = string
}

variable "private_app_subnet_cidr" {
  description = "CIDR for private app subnet in AZ1 (ECS Fargate tasks)"
  type        = string
}

variable "private_rds_subnet_1_cidr" {
  description = "CIDR for private RDS subnet in AZ1"
  type        = string
}

variable "private_rds_subnet_2_cidr" {
  description = "CIDR for private RDS subnet in AZ2 (DB subnet group needs 2 AZs)"
  type        = string
}

variable "availability_zone_1" {
  description = "Primary availability zone (e.g. us-east-1a)"
  type        = string
}

variable "availability_zone_2" {
  description = "Secondary availability zone (e.g. us-east-1b)"
  type        = string
}

# ============================================================
# EC2 Bastion
# ============================================================

variable "ec2_ami" {
  description = "AMI ID for the EC2 bastion instance (Amazon Linux 2 or Ubuntu)"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the bastion host"
  type        = string
  default     = "t3.micro"
}

variable "ec2_key_name" {
  description = "Name of the EC2 key pair used for SSH access"
  type        = string
}

variable "bastion_allowed_cidr" {
  description = "CIDR allowed to SSH into the bastion (use your office/VPN IP)"
  type        = string
}

# ============================================================
# Application Load Balancer
# ============================================================

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for the ALB HTTPS listener (must be in the same region)"
  type        = string
}

variable "health_check_path" {
  description = "HTTP path used for the ALB target group health check"
  type        = string
  default     = "/health"
}

# ============================================================
# ECS Fargate
# ============================================================

variable "ecs_container_image" {
  description = "Full Docker image URI (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/app:latest)"
  type        = string
}

variable "ecs_container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "ecs_desired_count" {
  description = "Number of ECS task replicas to run"
  type        = number
  default     = 1
}

# ============================================================
# RDS
# ============================================================

variable "rds_engine" {
  description = "RDS database engine (e.g. postgres, mysql)"
  type        = string
  default     = "postgres"
}

variable "rds_engine_version" {
  description = "Engine version string (e.g. 15.4 for Postgres, 8.0.35 for MySQL)"
  type        = string
  default     = "15.4"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_db_name" {
  description = "Initial database name"
  type        = string
}

variable "rds_username" {
  description = "Master username for the RDS instance"
  type        = string
}

variable "rds_password" {
  description = "Master password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "rds_port" {
  description = "Database port (5432 for Postgres, 3306 for MySQL)"
  type        = number
  default     = 5432
}

# ============================================================
# S3
# ============================================================

variable "frontend_bucket_name" {
  description = "Globally unique S3 bucket name for the frontend (public, served via CloudFront)"
  type        = string
}

variable "app_bucket_name" {
  description = "Globally unique S3 buckets name for application storage (private)"
  type        = string
}
