"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENARIOS = void 0;
exports.listScenarios = listScenarios;
exports.SCENARIOS = {
    "cicd-docker-build-fail": {
        key: "cicd-docker-build-fail",
        pipeline: "CICD",
        title: "Docker build failed in Build & Push stage",
        service: "GitHub Actions / Docker",
        nodeIds: ["build-push"],
        rawLog: `#12 [backend build 4/6] RUN npm ci
#12 47.31 npm error code EUSAGE
#12 47.31 npm error The \`npm ci\` command can only install with an existing package-lock.json
#12 47.31 npm error Missing: package-lock.json
#12 ERROR: process "/bin/sh -c npm ci" did not complete successfully: exit code 1
Error: buildx failed with: ERROR: failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code 1`,
    },
    "cicd-test-fail": {
        key: "cicd-test-fail",
        pipeline: "CICD",
        title: "GitHub Actions CI unit test failure",
        service: "GitHub Actions - CI",
        nodeIds: ["gha-ci"],
        rawLog: `FAIL src/utils/formatCurrency.test.ts
  ✕ formats cents to dollars (3 ms)
    expect(received).toBe(expected)
    Expected: "$10.00"
    Received: "$10.0"
Tests: 1 failed, 42 passed, 43 total
Error: Process completed with exit code 1.`,
    },
    "cicd-terraform-plan-error": {
        key: "cicd-terraform-plan-error",
        pipeline: "CICD",
        title: "Terraform plan failed: invalid resource reference",
        service: "Terraform",
        nodeIds: ["terraform"],
        rawLog: `Error: Reference to undeclared resource

  on ecs.tf line 42, in resource "aws_ecs_service" "app":
  42:   target_group_arn = aws_lb_target_group.app.arn

A managed resource "aws_lb_target_group" "app" has not been declared in the root module.
Did you mean "aws_lb_target_group.app_tg"?`,
    },
    "cicd-terraform-apply-iam-deny": {
        key: "cicd-terraform-apply-iam-deny",
        pipeline: "CICD",
        title: "Terraform apply failed: IAM permission denied",
        service: "Terraform",
        nodeIds: ["terraform"],
        rawLog: `Error: creating ECS Service (app-service): AccessDeniedException:
User: arn:aws:sts::123456789012:assumed-role/github-actions-deploy/GitHubActions
is not authorized to perform: ecs:CreateService on resource:
arn:aws:ecs:us-east-1:123456789012:service/app-cluster/app-service
because no identity-based policy allows the ecs:CreateService action

  on ecs.tf line 58, in resource "aws_ecs_service" "app":
  58: resource "aws_ecs_service" "app" {`,
    },
    "cicd-deploy-timeout": {
        key: "cicd-deploy-timeout",
        pipeline: "CICD",
        title: "CD pipeline deploy timed out waiting for ECS service stability",
        service: "GitHub Actions - CD / ECS",
        nodeIds: ["gha-cd", "ecs-service"],
        rawLog: `Deploying to ECS cluster app-cluster, service app-service...
Waiting for service app-service to reach steady state...
(x) app-service: 0/2 tasks running, 2 desired
Timeout waiting for service stability after 600s
Error: Process completed with exit code 1.`,
    },
    "infra-ecs-oom": {
        key: "infra-ecs-oom",
        pipeline: "INFRA",
        title: "ECS task crash loop: OutOfMemoryError",
        service: "Amazon ECS",
        nodeIds: ["ecs-service"],
        rawLog: `ECS Task stopped, reason: OutOfMemoryError: Container killed due to memory usage
Task definition: app-service:47, memory limit: 512 MiB
CloudWatch: MemoryUtilization at time of kill: 512/512 MiB (100%)
Task has restarted 6 times in the last 10 minutes (crash loop)`,
    },
    "infra-ecs-image-pull": {
        key: "infra-ecs-image-pull",
        pipeline: "INFRA",
        title: "ECS service stuck: unable to pull image from ECR",
        service: "Amazon ECS / ECR",
        nodeIds: ["ecs-service", "ecr"],
        rawLog: `service app-service was unable to place a task because no container instance met all of its requirements.
CannotPullContainerError: pull image manifest has been retried 5 time(s):
failed to resolve ref "123456789012.dkr.ecr.us-east-1.amazonaws.com/app:latest":
unexpected status: 403 Forbidden (ecr repository policy denies access from this task role)`,
    },
    "infra-eks-crashloop": {
        key: "infra-eks-crashloop",
        pipeline: "INFRA",
        title: "EKS pod stuck in CrashLoopBackOff",
        service: "Amazon EKS",
        nodeIds: ["eks-cluster"],
        rawLog: `pod/app-deployment-7f9c8d-x2k4m   0/1   CrashLoopBackOff   9 (2m ago)   18m
Back-off restarting failed container
Events:
  Liveness probe failed: Get "http://10.2.3.4:8080/healthz": dial tcp 10.2.3.4:8080: connect: connection refused
  Container exited with code 1: panic: failed to connect to database: dial tcp: lookup db-internal: no such host`,
    },
    "infra-lambda-timeout": {
        key: "infra-lambda-timeout",
        pipeline: "INFRA",
        title: "Lambda function timing out under load",
        service: "AWS Lambda",
        nodeIds: ["lambda-fn"],
        rawLog: `REPORT RequestId: 8f2a1e6c-... Duration: 30001.23 ms Billed Duration: 30000 ms
Memory Size: 256 MB Max Memory Used: 251 MB
Task timed out after 30.00 seconds
Throttles: 42 in last 5 minutes (ConcurrentExecutions limit: 50 reached)`,
    },
    "infra-lambda-error-spike": {
        key: "infra-lambda-error-spike",
        pipeline: "INFRA",
        title: "Lambda error rate spike (production traffic impacted)",
        service: "AWS Lambda",
        nodeIds: ["lambda-fn"],
        rawLog: `[ERROR] TypeError: Cannot read properties of undefined (reading 'id')
    at handler (/var/task/index.js:38:22)
CloudWatch Alarm "lambda-error-rate" is in ALARM state
ErrorRate: 87% over last 5 minutes (threshold 5%), ~1,200 invocations/min affected, user-facing API`,
    },
    "infra-rds-pool-exhaustion": {
        key: "infra-rds-pool-exhaustion",
        pipeline: "INFRA",
        title: "RDS Postgres connection pool exhausted",
        service: "Amazon RDS",
        nodeIds: ["rds"],
        rawLog: `FATAL: remaining connection slots are reserved for non-replication superuser connections
CloudWatch: DatabaseConnections at 100/100 (max_connections)
Application logs: "connection timeout acquiring client from pool" (x340 in last 5 min)`,
    },
    "infra-s3-access-denied": {
        key: "infra-s3-access-denied",
        pipeline: "INFRA",
        title: "S3 access denied writing generated reports",
        service: "Amazon S3",
        nodeIds: ["s3"],
        rawLog: `AccessDenied: User: arn:aws:sts::123456789012:assumed-role/ecs-task-role/app
is not authorized to perform: s3:PutObject on resource:
"arn:aws:s3:::app-reports-bucket/2026/07/report.pdf"
because no identity-based policy allows the s3:PutObject action
(non-production bucket, single background job affected)`,
    },
};
function listScenarios() {
    return Object.values(exports.SCENARIOS).map(({ key, pipeline, title, service }) => ({
        key,
        pipeline,
        title,
        service,
        rawLog: "",
    }));
}
