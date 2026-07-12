"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWS_CATALOG = void 0;
// A curated 50-service subset of AWS's console service catalog, grouped the way
// the AWS Console groups them. `supported: true` means real list+health (and for
// some, real remediation) is wired up in aws/services.ts + routes/aws.ts;
// `false` entries render in the UI but are clearly marked as not yet wired up
// rather than faking data for them.
exports.AWS_CATALOG = [
    // Compute
    { key: "ec2", label: "EC2", shortLabel: "EC2", category: "Compute", supported: true },
    { key: "elasticbeanstalk", label: "Elastic Beanstalk", shortLabel: "EB", category: "Compute", supported: false },
    { key: "lightsail", label: "Lightsail", shortLabel: "LS", category: "Compute", supported: false },
    { key: "batch", label: "AWS Batch", shortLabel: "BAT", category: "Compute", supported: false },
    { key: "apprunner", label: "App Runner", shortLabel: "AR", category: "Compute", supported: false },
    // Containers & Serverless
    { key: "ecs", label: "Elastic Container Service", shortLabel: "ECS", category: "Containers & Serverless", supported: true },
    { key: "eks", label: "Elastic Kubernetes Service", shortLabel: "EKS", category: "Containers & Serverless", supported: true },
    { key: "lambda", label: "Lambda", shortLabel: "λ", category: "Containers & Serverless", supported: true },
    { key: "ecr", label: "Elastic Container Registry", shortLabel: "ECR", category: "Containers & Serverless", supported: true },
    // Storage
    { key: "s3", label: "S3", shortLabel: "S3", category: "Storage", supported: true },
    { key: "efs", label: "EFS", shortLabel: "EFS", category: "Storage", supported: true },
    { key: "ebs", label: "EBS", shortLabel: "EBS", category: "Storage", supported: false },
    { key: "s3glacier", label: "S3 Glacier", shortLabel: "GLC", category: "Storage", supported: false },
    { key: "storagegateway", label: "Storage Gateway", shortLabel: "SGW", category: "Storage", supported: false },
    { key: "fsx", label: "FSx", shortLabel: "FSX", category: "Storage", supported: false },
    // Database
    { key: "rds", label: "RDS", shortLabel: "RDS", category: "Database", supported: true },
    { key: "dynamodb", label: "DynamoDB", shortLabel: "DDB", category: "Database", supported: true },
    { key: "aurora", label: "Aurora", shortLabel: "AUR", category: "Database", supported: false },
    { key: "documentdb", label: "DocumentDB", shortLabel: "DOC", category: "Database", supported: false },
    { key: "neptune", label: "Neptune", shortLabel: "NEP", category: "Database", supported: false },
    { key: "redshift", label: "Redshift", shortLabel: "RS", category: "Database", supported: false },
    { key: "elasticache", label: "ElastiCache", shortLabel: "EC", category: "Database", supported: false },
    // Networking & Content Delivery
    { key: "vpc", label: "VPC", shortLabel: "VPC", category: "Networking & Content Delivery", supported: true },
    { key: "elb", label: "Elastic Load Balancing", shortLabel: "ELB", category: "Networking & Content Delivery", supported: true },
    { key: "cloudfront", label: "CloudFront", shortLabel: "CF", category: "Networking & Content Delivery", supported: true },
    { key: "route53", label: "Route 53", shortLabel: "R53", category: "Networking & Content Delivery", supported: false },
    { key: "directconnect", label: "Direct Connect", shortLabel: "DX", category: "Networking & Content Delivery", supported: false },
    { key: "globalaccelerator", label: "Global Accelerator", shortLabel: "GA", category: "Networking & Content Delivery", supported: false },
    { key: "appmesh", label: "App Mesh", shortLabel: "AM", category: "Networking & Content Delivery", supported: false },
    // Application Integration
    { key: "sqs", label: "SQS", shortLabel: "SQS", category: "Application Integration", supported: true },
    { key: "sns", label: "SNS", shortLabel: "SNS", category: "Application Integration", supported: true },
    { key: "eventbridge", label: "EventBridge", shortLabel: "EB", category: "Application Integration", supported: true },
    { key: "stepfunctions", label: "Step Functions", shortLabel: "SFN", category: "Application Integration", supported: true },
    { key: "amazonmq", label: "Amazon MQ", shortLabel: "MQ", category: "Application Integration", supported: false },
    // Security, Identity & Compliance
    { key: "secretsmanager", label: "Secrets Manager", shortLabel: "SEC", category: "Security, Identity & Compliance", supported: true },
    { key: "kms", label: "KMS", shortLabel: "KMS", category: "Security, Identity & Compliance", supported: true },
    { key: "acm", label: "Certificate Manager", shortLabel: "ACM", category: "Security, Identity & Compliance", supported: true },
    { key: "iam", label: "IAM", shortLabel: "IAM", category: "Security, Identity & Compliance", supported: true },
    { key: "guardduty", label: "GuardDuty", shortLabel: "GD", category: "Security, Identity & Compliance", supported: false },
    { key: "inspector", label: "Inspector", shortLabel: "INS", category: "Security, Identity & Compliance", supported: false },
    { key: "shield", label: "Shield", shortLabel: "SHD", category: "Security, Identity & Compliance", supported: false },
    { key: "waf", label: "WAF", shortLabel: "WAF", category: "Security, Identity & Compliance", supported: true },
    { key: "cognito", label: "Cognito", shortLabel: "COG", category: "Security, Identity & Compliance", supported: false },
    // Management & Governance
    { key: "ssm", label: "Systems Manager", shortLabel: "SSM", category: "Management & Governance", supported: true },
    { key: "cloudformation", label: "CloudFormation", shortLabel: "CFN", category: "Management & Governance", supported: true },
    { key: "cloudwatch", label: "CloudWatch", shortLabel: "CW", category: "Management & Governance", supported: true },
    { key: "cloudtrail", label: "CloudTrail", shortLabel: "CT", category: "Management & Governance", supported: false },
    // Developer Tools
    { key: "codebuild", label: "CodeBuild", shortLabel: "CB", category: "Developer Tools", supported: false },
    { key: "codepipeline", label: "CodePipeline", shortLabel: "CP", category: "Developer Tools", supported: false },
    // Machine Learning
    { key: "bedrock", label: "Bedrock", shortLabel: "AI", category: "Machine Learning", supported: true },
];
