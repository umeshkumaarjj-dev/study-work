"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANVAS_SIZE = exports.TOPOLOGY_NODES = exports.TOPOLOGY_GROUPS = void 0;
exports.TOPOLOGY_GROUPS = [
    { id: "cicd", label: "CI/CD Pipeline", x: 20, y: 20, width: 1450, height: 150 },
    { id: "public-subnet", label: "Public Subnet", x: 20, y: 200, width: 420, height: 380 },
    { id: "private-subnet", label: "Private Subnet (ECS / EKS / Lambda)", x: 470, y: 200, width: 560, height: 380 },
    { id: "data-ai", label: "Data, Messaging & AI Services", x: 1060, y: 200, width: 500, height: 440 },
];
exports.TOPOLOGY_NODES = [
    // CI/CD pipeline
    { id: "dev-vcs", label: "Developer (VS Code)", shortLabel: "DEV", category: "dev", group: "cicd", x: 60, y: 90 },
    { id: "scm-repo", label: "GitHub Repo", shortLabel: "SCM", category: "scm", group: "cicd", x: 230, y: 90 },
    { id: "branch-main", label: "Branch", shortLabel: "BR", category: "scm", group: "cicd", x: 400, y: 90 },
    { id: "gha-ci", label: "GitHub Actions - CI (build & test)", shortLabel: "CI", category: "cicd", group: "cicd", x: 570, y: 90 },
    { id: "build-push", label: "Build & Push (Docker -> ECR)", shortLabel: "BLD", category: "cicd", group: "cicd", x: 740, y: 90 },
    { id: "terraform", label: "Terraform Plan/Apply", shortLabel: "TF", category: "iac", group: "cicd", x: 910, y: 90 },
    { id: "gha-cd", label: "GitHub Actions - CD (deploy)", shortLabel: "CD", category: "cicd", group: "cicd", x: 1080, y: 90 },
    { id: "ecr", label: "Amazon ECR", shortLabel: "ECR", category: "registry", group: "cicd", x: 1250, y: 90 },
    // Public subnet
    { id: "igw", label: "Internet Gateway", shortLabel: "IGW", category: "network", group: "public-subnet", x: 60, y: 260 },
    { id: "nat", label: "NAT Gateway", shortLabel: "NAT", category: "network", group: "public-subnet", x: 240, y: 260 },
    { id: "alb", label: "Application Load Balancer", shortLabel: "ALB", category: "network", group: "public-subnet", x: 60, y: 420 },
    { id: "rds", label: "RDS Postgres", shortLabel: "RDS", category: "data", group: "public-subnet", x: 240, y: 420 },
    // Private subnet (ECS / EKS / Lambda)
    { id: "ecs-batch", label: "ECS Batch (EC2, x4)", shortLabel: "BATCH", category: "compute", group: "private-subnet", x: 500, y: 260 },
    { id: "ecs-service", label: "ECS Service (KB creation)", shortLabel: "ECS", category: "compute", group: "private-subnet", x: 680, y: 260 },
    { id: "ecs-task", label: "ECS Task (Daily CRON)", shortLabel: "TASK", category: "compute", group: "private-subnet", x: 860, y: 260 },
    { id: "eks-cluster", label: "EKS Cluster", shortLabel: "EKS", category: "compute", group: "private-subnet", x: 500, y: 420 },
    { id: "lambda-fn", label: "Lambda Functions", shortLabel: "λ", category: "compute", group: "private-subnet", x: 680, y: 420 },
    // Data, Messaging & AI Services
    { id: "s3", label: "Amazon S3", shortLabel: "S3", category: "data", group: "data-ai", x: 1090, y: 260 },
    { id: "sqs", label: "Amazon SQS", shortLabel: "SQS", category: "messaging", group: "data-ai", x: 1240, y: 260 },
    { id: "eventbridge-pipes", label: "EventBridge Pipes", shortLabel: "EB-P", category: "messaging", group: "data-ai", x: 1390, y: 260 },
    { id: "eventbridge-rules", label: "EventBridge Rules", shortLabel: "EB-R", category: "messaging", group: "data-ai", x: 1090, y: 410 },
    { id: "eventbridge-scheduler", label: "EventBridge Scheduler", shortLabel: "EB-S", category: "messaging", group: "data-ai", x: 1240, y: 410 },
    { id: "bedrock", label: "Amazon Bedrock (Claude/Titan/Nova)", shortLabel: "AI", category: "ai", group: "data-ai", x: 1390, y: 410 },
    { id: "transcribe", label: "Amazon Transcribe", shortLabel: "TR", category: "ai", group: "data-ai", x: 1090, y: 560 },
    { id: "parameter-store", label: "Parameter Store", shortLabel: "PS", category: "config", group: "data-ai", x: 1240, y: 560 },
    { id: "cloudwatch", label: "CloudWatch", shortLabel: "CW", category: "monitoring", group: "data-ai", x: 1390, y: 560 },
];
exports.CANVAS_SIZE = { width: 1650, height: 700 };
