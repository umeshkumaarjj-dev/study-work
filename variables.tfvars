# ============================================================
# General
# ============================================================
aws_region   = "us-east-1"
project_name = "myapp"
environment  = "dev"

# ============================================================
# Networking
# ============================================================
vpc_cidr = "10.0.0.0/16"

# Public subnets — EC2, NAT GW, and ALB span both AZs
public_subnet_1_cidr = "10.0.1.0/24"
public_subnet_2_cidr = "10.0.2.0/24"

# Private app subnet — ECS Fargate tasks
private_app_subnet_cidr = "10.0.10.0/24"

# Private RDS subnets — two AZs required by DB subnet group
private_rds_subnet_1_cidr = "10.0.20.0/24"
private_rds_subnet_2_cidr = "10.0.21.0/24"

availability_zone_1 = "us-east-1a"
availability_zone_2 = "us-east-1b"

# ============================================================
# EC2 Bastion
# ============================================================
# Amazon Linux 2023 AMI for us-east-1 — verify the latest AMI ID at:
# https://console.aws.amazon.com/ec2/home#AMICatalog
ec2_ami           = "ami-0c02fb55956c7d316"
ec2_instance_type = "t3.micro"
ec2_key_name      = "my-key-pair"

# Restrict SSH to your IP — replace with your actual public IP (x.x.x.x/32)
bastion_allowed_cidr = "0.0.0.0/0"

# ============================================================
# Application Load Balancer
# ============================================================
# Paste the ARN of your ACM certificate (must match the ALB region)
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
health_check_path   = "/health"

# ============================================================
# ECS Fargate (1 vCPU / 2 GB — set in task definition)
# ============================================================
ecs_container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest"
ecs_container_port  = 8080
ecs_desired_count   = 1

# ============================================================
# RDS
# ============================================================
rds_engine            = "postgres"
rds_engine_version    = "15.4"
rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20
rds_db_name           = "myappdb"
rds_username          = "dbadmin"
rds_password          = "Ch@ngeMe123!"   # Use AWS Secrets Manager rotation in production
rds_port              = 5432

# ============================================================
# S3
# ============================================================
# Bucket names must be globally unique across all AWS accounts
frontend_bucket_name = "myapp-dev-frontend-20240101"
app_bucket_name      = "myapp-dev-app-storage-20240101"
