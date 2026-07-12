"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEcsServices = listEcsServices;
exports.getEcsServiceHealth = getEcsServiceHealth;
exports.listEksClusters = listEksClusters;
exports.getEksClusterHealth = getEksClusterHealth;
exports.listLambdaFunctions = listLambdaFunctions;
exports.getLambdaFunctionHealth = getLambdaFunctionHealth;
exports.listRdsInstances = listRdsInstances;
exports.getRdsInstanceHealth = getRdsInstanceHealth;
exports.listS3Buckets = listS3Buckets;
exports.getS3BucketHealth = getS3BucketHealth;
exports.listEc2Instances = listEc2Instances;
exports.getEc2InstanceHealth = getEc2InstanceHealth;
exports.listVpcs = listVpcs;
exports.getVpcHealth = getVpcHealth;
exports.listDynamoTables = listDynamoTables;
exports.getDynamoTableHealth = getDynamoTableHealth;
exports.listCloudFrontDistributions = listCloudFrontDistributions;
exports.getCloudFrontDistributionHealth = getCloudFrontDistributionHealth;
exports.listLoadBalancers = listLoadBalancers;
exports.getLoadBalancerHealth = getLoadBalancerHealth;
exports.listSqsQueues = listSqsQueues;
exports.getSqsQueueHealth = getSqsQueueHealth;
exports.listSnsTopics = listSnsTopics;
exports.getSnsTopicHealth = getSnsTopicHealth;
exports.listEventBridgeRules = listEventBridgeRules;
exports.getEventBridgeRuleHealth = getEventBridgeRuleHealth;
exports.getEcsTree = getEcsTree;
exports.getEksTree = getEksTree;
exports.getVpcTree = getVpcTree;
exports.getDynamoTree = getDynamoTree;
exports.getElbTree = getElbTree;
exports.getSnsTree = getSnsTree;
exports.getFlatTree = getFlatTree;
exports.listEcrRepositories = listEcrRepositories;
exports.getEcrRepositoryHealth = getEcrRepositoryHealth;
exports.listEfsFileSystems = listEfsFileSystems;
exports.getEfsFileSystemHealth = getEfsFileSystemHealth;
exports.listStateMachines = listStateMachines;
exports.getStateMachineHealth = getStateMachineHealth;
exports.listSecrets = listSecrets;
exports.getSecretHealth = getSecretHealth;
exports.listKmsKeys = listKmsKeys;
exports.getKmsKeyHealth = getKmsKeyHealth;
exports.listCertificates = listCertificates;
exports.getCertificateHealth = getCertificateHealth;
exports.listSsmParameters = listSsmParameters;
exports.getSsmParameterHealth = getSsmParameterHealth;
exports.listStacks = listStacks;
exports.getStackHealth = getStackHealth;
exports.listIamUsers = listIamUsers;
exports.getIamUserHealth = getIamUserHealth;
exports.listWebAcls = listWebAcls;
exports.getWebAclHealth = getWebAclHealth;
exports.listCloudWatchAlarms = listCloudWatchAlarms;
exports.getCloudWatchAlarmHealth = getCloudWatchAlarmHealth;
exports.listBedrockModels = listBedrockModels;
exports.getBedrockModelHealth = getBedrockModelHealth;
const client_ecs_1 = require("@aws-sdk/client-ecs");
const client_eks_1 = require("@aws-sdk/client-eks");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const client_rds_1 = require("@aws-sdk/client-rds");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_ec2_1 = require("@aws-sdk/client-ec2");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_cloudfront_1 = require("@aws-sdk/client-cloudfront");
const client_elastic_load_balancing_v2_1 = require("@aws-sdk/client-elastic-load-balancing-v2");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_sns_1 = require("@aws-sdk/client-sns");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const client_ecr_1 = require("@aws-sdk/client-ecr");
const client_efs_1 = require("@aws-sdk/client-efs");
const client_sfn_1 = require("@aws-sdk/client-sfn");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client_kms_1 = require("@aws-sdk/client-kms");
const client_acm_1 = require("@aws-sdk/client-acm");
const client_ssm_1 = require("@aws-sdk/client-ssm");
const client_cloudformation_1 = require("@aws-sdk/client-cloudformation");
const client_iam_1 = require("@aws-sdk/client-iam");
const client_wafv2_1 = require("@aws-sdk/client-wafv2");
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const client_bedrock_1 = require("@aws-sdk/client-bedrock");
function toFlatTree(items, type) {
    return items.map((item) => ({
        id: item.id,
        name: item.name,
        type,
        status: item.status,
        statusLabel: `${item.subtitle ? item.subtitle + " - " : ""}${item.statusLabel}`,
        checkable: true,
    }));
}
// ---------- ECS ----------
function ecsClient(auth) {
    return new client_ecs_1.ECSClient({ region: auth.region, credentials: auth.credentials });
}
function ecsServiceStatus(runningCount, desiredCount, status) {
    if (status && status !== "ACTIVE")
        return "error";
    if (runningCount < desiredCount)
        return "error";
    return "healthy";
}
async function listEcsServices(auth) {
    const client = ecsClient(auth);
    const { clusterArns = [] } = await client.send(new client_ecs_1.ListClustersCommand({}));
    const results = [];
    for (const clusterArn of clusterArns) {
        const { serviceArns = [] } = await client.send(new client_ecs_1.ListServicesCommand({ cluster: clusterArn }));
        if (serviceArns.length === 0)
            continue;
        const { services = [] } = await client.send(new client_ecs_1.DescribeServicesCommand({ cluster: clusterArn, services: serviceArns }));
        for (const s of services) {
            const running = s.runningCount ?? 0;
            const desired = s.desiredCount ?? 0;
            results.push({
                id: `${clusterArn}::${s.serviceArn}`,
                name: s.serviceName || "unknown-service",
                subtitle: clusterArn.split("/").pop() || clusterArn,
                status: ecsServiceStatus(running, desired, s.status),
                statusLabel: `${running}/${desired} tasks running`,
            });
        }
    }
    return results;
}
async function getEcsServiceHealth(auth, resourceId) {
    const [clusterArn, serviceArn] = resourceId.split("::");
    if (!clusterArn || !serviceArn)
        throw new Error("Invalid ECS resource id.");
    const client = ecsClient(auth);
    const { services = [] } = await client.send(new client_ecs_1.DescribeServicesCommand({ cluster: clusterArn, services: [serviceArn] }));
    const s = services[0];
    if (!s)
        throw new Error("ECS service not found (it may have been deleted).");
    const running = s.runningCount ?? 0;
    const desired = s.desiredCount ?? 0;
    const status = ecsServiceStatus(running, desired, s.status);
    const recentEvents = (s.events || [])
        .slice(0, 5)
        .map((e) => `${e.createdAt ? new Date(e.createdAt).toLocaleString() : ""}: ${e.message || ""}`);
    return {
        id: resourceId,
        name: s.serviceName || "unknown-service",
        subtitle: clusterArn.split("/").pop() || clusterArn,
        status,
        statusLabel: `${running}/${desired} tasks running`,
        // Restarting (forcing a new deployment) is a safe, standard remediation when
        // a service is short of its desired task count.
        fixAction: running < desired ? "ecs_restart_service" : undefined,
        details: [
            { label: "Cluster", value: clusterArn },
            { label: "Status", value: s.status || "unknown" },
            { label: "Desired / Running / Pending", value: `${desired} / ${running} / ${s.pendingCount ?? 0}` },
            { label: "Launch type", value: s.launchType || "n/a" },
            { label: "Task definition", value: s.taskDefinition || "n/a" },
            { label: "Recent events", value: recentEvents.join("\n") || "None" },
        ],
    };
}
// ---------- EKS ----------
function eksClient(auth) {
    return new client_eks_1.EKSClient({ region: auth.region, credentials: auth.credentials });
}
function eksStatus(status) {
    if (status === "ACTIVE")
        return "healthy";
    if (status === "FAILED")
        return "error";
    return "warning";
}
async function listEksClusters(auth) {
    const client = eksClient(auth);
    const { clusters = [] } = await client.send(new client_eks_1.ListClustersCommand({}));
    const results = [];
    for (const name of clusters) {
        const { cluster } = await client.send(new client_eks_1.DescribeClusterCommand({ name }));
        results.push({
            id: name,
            name,
            subtitle: cluster?.version ? `Kubernetes ${cluster.version}` : "EKS cluster",
            status: eksStatus(cluster?.status),
            statusLabel: cluster?.status || "unknown",
        });
    }
    return results;
}
async function getEksClusterHealth(auth, resourceId) {
    const client = eksClient(auth);
    const { cluster } = await client.send(new client_eks_1.DescribeClusterCommand({ name: resourceId }));
    if (!cluster)
        throw new Error("EKS cluster not found (it may have been deleted).");
    const issues = (cluster.health?.issues || []).map((i) => `${i.code || "Issue"}: ${i.message || ""}`);
    return {
        id: resourceId,
        name: cluster.name || resourceId,
        subtitle: cluster.version ? `Kubernetes ${cluster.version}` : "EKS cluster",
        status: eksStatus(cluster.status),
        statusLabel: cluster.status || "unknown",
        details: [
            { label: "Status", value: cluster.status || "unknown" },
            { label: "Version", value: cluster.version || "n/a" },
            { label: "Endpoint", value: cluster.endpoint || "n/a" },
            { label: "Platform version", value: cluster.platformVersion || "n/a" },
            { label: "Health issues", value: issues.join("\n") || "None reported" },
        ],
    };
}
// ---------- Lambda ----------
function lambdaClient(auth) {
    return new client_lambda_1.LambdaClient({ region: auth.region, credentials: auth.credentials });
}
function lambdaStatus(state) {
    if (state === "Active")
        return "healthy";
    if (state === "Failed")
        return "error";
    return "warning";
}
async function listLambdaFunctions(auth) {
    const client = lambdaClient(auth);
    const { Functions = [] } = await client.send(new client_lambda_1.ListFunctionsCommand({}));
    return Functions.map((f) => ({
        id: f.FunctionName || "unknown",
        name: f.FunctionName || "unknown",
        subtitle: f.Runtime || "n/a",
        status: lambdaStatus(f.State),
        statusLabel: f.State || "unknown",
    }));
}
async function getLambdaFunctionHealth(auth, resourceId) {
    const client = lambdaClient(auth);
    const { Configuration } = await client.send(new client_lambda_1.GetFunctionCommand({ FunctionName: resourceId }));
    if (!Configuration)
        throw new Error("Lambda function not found (it may have been deleted).");
    return {
        id: resourceId,
        name: Configuration.FunctionName || resourceId,
        subtitle: Configuration.Runtime || "n/a",
        status: lambdaStatus(Configuration.State),
        statusLabel: Configuration.State || "unknown",
        details: [
            { label: "State", value: Configuration.State || "unknown" },
            { label: "Last update status", value: Configuration.LastUpdateStatus || "n/a" },
            { label: "State reason", value: Configuration.StateReason || "None" },
            { label: "Memory", value: `${Configuration.MemorySize ?? "?"} MB` },
            { label: "Timeout", value: `${Configuration.Timeout ?? "?"} s` },
            { label: "Last modified", value: Configuration.LastModified || "n/a" },
        ],
    };
}
// ---------- RDS ----------
function rdsClient(auth) {
    return new client_rds_1.RDSClient({ region: auth.region, credentials: auth.credentials });
}
function rdsStatus(status) {
    if (status === "available")
        return "healthy";
    if (["failed", "incompatible-parameters", "storage-full"].includes(status || ""))
        return "error";
    return "warning";
}
async function listRdsInstances(auth) {
    const client = rdsClient(auth);
    const { DBInstances = [] } = await client.send(new client_rds_1.DescribeDBInstancesCommand({}));
    return DBInstances.map((db) => ({
        id: db.DBInstanceIdentifier || "unknown",
        name: db.DBInstanceIdentifier || "unknown",
        subtitle: db.Engine || "n/a",
        status: rdsStatus(db.DBInstanceStatus),
        statusLabel: db.DBInstanceStatus || "unknown",
    }));
}
async function getRdsInstanceHealth(auth, resourceId) {
    const client = rdsClient(auth);
    const { DBInstances = [] } = await client.send(new client_rds_1.DescribeDBInstancesCommand({ DBInstanceIdentifier: resourceId }));
    const db = DBInstances[0];
    if (!db)
        throw new Error("RDS instance not found (it may have been deleted).");
    return {
        id: resourceId,
        name: db.DBInstanceIdentifier || resourceId,
        subtitle: db.Engine || "n/a",
        status: rdsStatus(db.DBInstanceStatus),
        statusLabel: db.DBInstanceStatus || "unknown",
        details: [
            { label: "Status", value: db.DBInstanceStatus || "unknown" },
            { label: "Engine", value: `${db.Engine || "n/a"} ${db.EngineVersion || ""}`.trim() },
            { label: "Instance class", value: db.DBInstanceClass || "n/a" },
            { label: "Storage", value: `${db.AllocatedStorage ?? "?"} GB` },
            { label: "Multi-AZ", value: db.MultiAZ ? "Yes" : "No" },
            { label: "Endpoint", value: db.Endpoint ? `${db.Endpoint.Address}:${db.Endpoint.Port}` : "n/a" },
        ],
    };
}
// ---------- S3 ----------
function s3Client(auth) {
    return new client_s3_1.S3Client({ region: auth.region, credentials: auth.credentials });
}
async function listS3Buckets(auth) {
    const client = s3Client(auth);
    const { Buckets = [] } = await client.send(new client_s3_1.ListBucketsCommand({}));
    return Buckets.map((b) => ({
        id: b.Name || "unknown",
        name: b.Name || "unknown",
        subtitle: b.CreationDate ? `Created ${new Date(b.CreationDate).toLocaleDateString()}` : "",
        status: "healthy",
        statusLabel: "Exists",
    }));
}
async function getS3BucketHealth(auth, resourceId) {
    const client = s3Client(auth);
    let publicAccess = "No public access block configured";
    let status = "warning";
    try {
        const { PublicAccessBlockConfiguration: cfg } = await client.send(new client_s3_1.GetPublicAccessBlockCommand({ Bucket: resourceId }));
        const blocked = Boolean(cfg?.BlockPublicAcls && cfg?.BlockPublicPolicy && cfg?.IgnorePublicAcls && cfg?.RestrictPublicBuckets);
        publicAccess = blocked ? "Blocked (all public access settings on)" : "Partially open - review public access settings";
        status = blocked ? "healthy" : "warning";
    }
    catch {
        // No public access block configuration found - leave the default warning above.
    }
    let region = "unknown";
    try {
        const { LocationConstraint } = await client.send(new client_s3_1.GetBucketLocationCommand({ Bucket: resourceId }));
        region = LocationConstraint || "us-east-1";
    }
    catch {
        // Ignore - region stays "unknown".
    }
    return {
        id: resourceId,
        name: resourceId,
        subtitle: region,
        status,
        statusLabel: status === "healthy" ? "Public access blocked" : "Check public access settings",
        // Enabling Block Public Access is a safe, standard, fully reversible remediation.
        fixAction: status === "healthy" ? undefined : "s3_block_public_access",
        details: [
            { label: "Region", value: region },
            { label: "Public access", value: publicAccess },
        ],
    };
}
// ---------- EC2 ----------
function ec2Client(auth) {
    return new client_ec2_1.EC2Client({ region: auth.region, credentials: auth.credentials });
}
function ec2InstanceStatus(state) {
    if (state === "running")
        return "healthy";
    if (state === "stopped" || state === "terminated")
        return "error";
    return "warning";
}
function ec2Name(instance) {
    return instance.Tags?.find((t) => t.Key === "Name")?.Value || instance.InstanceId || "unknown";
}
async function listEc2Instances(auth) {
    const client = ec2Client(auth);
    const { Reservations = [] } = await client.send(new client_ec2_1.DescribeInstancesCommand({}));
    const instances = Reservations.flatMap((r) => r.Instances || []);
    return instances.map((i) => ({
        id: i.InstanceId || "unknown",
        name: ec2Name(i),
        subtitle: i.InstanceType || "n/a",
        status: ec2InstanceStatus(i.State?.Name),
        statusLabel: i.State?.Name || "unknown",
    }));
}
async function getEc2InstanceHealth(auth, resourceId) {
    const client = ec2Client(auth);
    const { Reservations = [] } = await client.send(new client_ec2_1.DescribeInstancesCommand({ InstanceIds: [resourceId] }));
    const instance = Reservations.flatMap((r) => r.Instances || [])[0];
    if (!instance)
        throw new Error("EC2 instance not found (it may have been terminated).");
    return {
        id: resourceId,
        name: ec2Name(instance),
        subtitle: instance.InstanceType || "n/a",
        status: ec2InstanceStatus(instance.State?.Name),
        statusLabel: instance.State?.Name || "unknown",
        details: [
            { label: "State", value: instance.State?.Name || "unknown" },
            { label: "Instance type", value: instance.InstanceType || "n/a" },
            { label: "Availability zone", value: instance.Placement?.AvailabilityZone || "n/a" },
            { label: "Private IP", value: instance.PrivateIpAddress || "n/a" },
            { label: "Public IP", value: instance.PublicIpAddress || "n/a" },
            { label: "VPC", value: instance.VpcId || "n/a" },
        ],
    };
}
// ---------- VPC ----------
async function listVpcs(auth) {
    const client = ec2Client(auth);
    const { Vpcs = [] } = await client.send(new client_ec2_1.DescribeVpcsCommand({}));
    return Vpcs.map((v) => {
        const name = v.Tags?.find((t) => t.Key === "Name")?.Value || v.VpcId || "unknown";
        return {
            id: v.VpcId || "unknown",
            name,
            subtitle: v.CidrBlock || "n/a",
            status: v.State === "available" ? "healthy" : "warning",
            statusLabel: v.State || "unknown",
        };
    });
}
async function getVpcHealth(auth, resourceId) {
    const client = ec2Client(auth);
    const { Vpcs = [] } = await client.send(new client_ec2_1.DescribeVpcsCommand({ VpcIds: [resourceId] }));
    const vpc = Vpcs[0];
    if (!vpc)
        throw new Error("VPC not found (it may have been deleted).");
    const name = vpc.Tags?.find((t) => t.Key === "Name")?.Value || vpc.VpcId || "unknown";
    return {
        id: resourceId,
        name,
        subtitle: vpc.CidrBlock || "n/a",
        status: vpc.State === "available" ? "healthy" : "warning",
        statusLabel: vpc.State || "unknown",
        details: [
            { label: "State", value: vpc.State || "unknown" },
            { label: "CIDR block", value: vpc.CidrBlock || "n/a" },
            { label: "Default VPC", value: vpc.IsDefault ? "Yes" : "No" },
            { label: "DHCP options", value: vpc.DhcpOptionsId || "n/a" },
        ],
    };
}
// ---------- DynamoDB ----------
function dynamoClient(auth) {
    return new client_dynamodb_1.DynamoDBClient({ region: auth.region, credentials: auth.credentials });
}
function dynamoStatus(status) {
    if (status === "ACTIVE")
        return "healthy";
    if (status === "DELETING")
        return "error";
    return "warning";
}
async function listDynamoTables(auth) {
    const client = dynamoClient(auth);
    const { TableNames = [] } = await client.send(new client_dynamodb_1.ListTablesCommand({}));
    const results = [];
    for (const name of TableNames) {
        const { Table } = await client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: name }));
        results.push({
            id: name,
            name,
            subtitle: Table?.ItemCount !== undefined ? `${Table.ItemCount} items` : "n/a",
            status: dynamoStatus(Table?.TableStatus),
            statusLabel: Table?.TableStatus || "unknown",
        });
    }
    return results;
}
async function getDynamoTableHealth(auth, resourceId) {
    const client = dynamoClient(auth);
    const { Table } = await client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: resourceId }));
    if (!Table)
        throw new Error("DynamoDB table not found (it may have been deleted).");
    return {
        id: resourceId,
        name: resourceId,
        subtitle: Table.ItemCount !== undefined ? `${Table.ItemCount} items` : "n/a",
        status: dynamoStatus(Table.TableStatus),
        statusLabel: Table.TableStatus || "unknown",
        details: [
            { label: "Status", value: Table.TableStatus || "unknown" },
            { label: "Item count", value: String(Table.ItemCount ?? "n/a") },
            { label: "Size", value: `${Table.TableSizeBytes ?? 0} bytes` },
            { label: "Billing mode", value: Table.BillingModeSummary?.BillingMode || "PROVISIONED" },
        ],
    };
}
// ---------- CloudFront ----------
function cloudFrontClient(auth) {
    return new client_cloudfront_1.CloudFrontClient({ region: auth.region, credentials: auth.credentials });
}
async function listCloudFrontDistributions(auth) {
    const client = cloudFrontClient(auth);
    const { DistributionList } = await client.send(new client_cloudfront_1.ListDistributionsCommand({}));
    const items = DistributionList?.Items || [];
    return items.map((d) => ({
        id: d.Id || "unknown",
        name: d.DomainName || d.Id || "unknown",
        subtitle: (d.Aliases?.Items || []).join(", ") || "No custom domain",
        status: d.Enabled ? (d.Status === "Deployed" ? "healthy" : "warning") : "warning",
        statusLabel: d.Enabled ? d.Status || "unknown" : "Disabled",
    }));
}
async function getCloudFrontDistributionHealth(auth, resourceId) {
    const client = cloudFrontClient(auth);
    const { Distribution } = await client.send(new client_cloudfront_1.GetDistributionCommand({ Id: resourceId }));
    if (!Distribution)
        throw new Error("CloudFront distribution not found (it may have been deleted).");
    const config = Distribution.DistributionConfig;
    const enabled = Boolean(config?.Enabled);
    return {
        id: resourceId,
        name: Distribution.DomainName || resourceId,
        subtitle: (config?.Aliases?.Items || []).join(", ") || "No custom domain",
        status: enabled ? (Distribution.Status === "Deployed" ? "healthy" : "warning") : "warning",
        statusLabel: enabled ? Distribution.Status || "unknown" : "Disabled",
        details: [
            { label: "Status", value: Distribution.Status || "unknown" },
            { label: "Enabled", value: enabled ? "Yes" : "No" },
            { label: "Domain name", value: Distribution.DomainName || "n/a" },
            { label: "Price class", value: config?.PriceClass || "n/a" },
        ],
    };
}
// ---------- Elastic Load Balancing (ALB/NLB) ----------
function elbClient(auth) {
    return new client_elastic_load_balancing_v2_1.ElasticLoadBalancingV2Client({ region: auth.region, credentials: auth.credentials });
}
async function listLoadBalancers(auth) {
    const client = elbClient(auth);
    const { LoadBalancers = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeLoadBalancersCommand({}));
    return LoadBalancers.map((lb) => ({
        id: lb.LoadBalancerArn || "unknown",
        name: lb.LoadBalancerName || "unknown",
        subtitle: lb.Type || "n/a",
        status: lb.State?.Code === "active" ? "healthy" : lb.State?.Code === "failed" ? "error" : "warning",
        statusLabel: lb.State?.Code || "unknown",
    }));
}
async function getLoadBalancerHealth(auth, resourceId) {
    const client = elbClient(auth);
    const { LoadBalancers = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeLoadBalancersCommand({ LoadBalancerArns: [resourceId] }));
    const lb = LoadBalancers[0];
    if (!lb)
        throw new Error("Load balancer not found (it may have been deleted).");
    let unhealthyTargets = 0;
    let totalTargets = 0;
    try {
        const { TargetGroups = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeTargetGroupsCommand({ LoadBalancerArn: resourceId }));
        for (const tg of TargetGroups) {
            if (!tg.TargetGroupArn)
                continue;
            const { TargetHealthDescriptions = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeTargetHealthCommand({ TargetGroupArn: tg.TargetGroupArn }));
            totalTargets += TargetHealthDescriptions.length;
            unhealthyTargets += TargetHealthDescriptions.filter((t) => t.TargetHealth?.State !== "healthy").length;
        }
    }
    catch {
        // Target group lookup is best-effort; fall back to load balancer state only.
    }
    const status = lb.State?.Code === "failed" ? "error" : lb.State?.Code !== "active" || unhealthyTargets > 0 ? "warning" : "healthy";
    return {
        id: resourceId,
        name: lb.LoadBalancerName || resourceId,
        subtitle: lb.Type || "n/a",
        status,
        statusLabel: totalTargets > 0 ? `${totalTargets - unhealthyTargets}/${totalTargets} targets healthy` : lb.State?.Code || "unknown",
        details: [
            { label: "State", value: lb.State?.Code || "unknown" },
            { label: "Type", value: lb.Type || "n/a" },
            { label: "Scheme", value: lb.Scheme || "n/a" },
            { label: "DNS name", value: lb.DNSName || "n/a" },
            { label: "Targets", value: totalTargets > 0 ? `${totalTargets - unhealthyTargets}/${totalTargets} healthy` : "No target groups" },
        ],
    };
}
// ---------- SQS ----------
function sqsClient(auth) {
    return new client_sqs_1.SQSClient({ region: auth.region, credentials: auth.credentials });
}
async function listSqsQueues(auth) {
    const client = sqsClient(auth);
    const { QueueUrls = [] } = await client.send(new client_sqs_1.ListQueuesCommand({}));
    const results = [];
    for (const url of QueueUrls) {
        const { Attributes } = await client.send(new client_sqs_1.GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"] }));
        const visible = Number(Attributes?.ApproximateNumberOfMessages ?? 0);
        const name = url.split("/").pop() || url;
        results.push({
            id: url,
            name,
            subtitle: `${visible} messages`,
            status: visible > 1000 ? "warning" : "healthy",
            statusLabel: `${visible} messages queued`,
        });
    }
    return results;
}
async function getSqsQueueHealth(auth, resourceId) {
    const client = sqsClient(auth);
    const { Attributes } = await client.send(new client_sqs_1.GetQueueAttributesCommand({
        QueueUrl: resourceId,
        AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible", "ApproximateNumberOfMessagesDelayed"],
    }));
    if (!Attributes)
        throw new Error("SQS queue not found (it may have been deleted).");
    const visible = Number(Attributes.ApproximateNumberOfMessages ?? 0);
    const name = resourceId.split("/").pop() || resourceId;
    return {
        id: resourceId,
        name,
        subtitle: `${visible} messages`,
        status: visible > 1000 ? "warning" : "healthy",
        statusLabel: `${visible} messages queued`,
        details: [
            { label: "Messages available", value: String(visible) },
            { label: "Messages in flight", value: String(Attributes.ApproximateNumberOfMessagesNotVisible ?? 0) },
            { label: "Messages delayed", value: String(Attributes.ApproximateNumberOfMessagesDelayed ?? 0) },
        ],
    };
}
// ---------- SNS ----------
function snsClient(auth) {
    return new client_sns_1.SNSClient({ region: auth.region, credentials: auth.credentials });
}
async function listSnsTopics(auth) {
    const client = snsClient(auth);
    const { Topics = [] } = await client.send(new client_sns_1.ListTopicsCommand({}));
    return Topics.map((t) => {
        const arn = t.TopicArn || "unknown";
        return {
            id: arn,
            name: arn.split(":").pop() || arn,
            subtitle: "SNS topic",
            status: "healthy",
            statusLabel: "Exists",
        };
    });
}
async function getSnsTopicHealth(auth, resourceId) {
    const client = snsClient(auth);
    const { Attributes } = await client.send(new client_sns_1.GetTopicAttributesCommand({ TopicArn: resourceId }));
    if (!Attributes)
        throw new Error("SNS topic not found (it may have been deleted).");
    const subscriptions = Number(Attributes.SubscriptionsConfirmed ?? 0);
    return {
        id: resourceId,
        name: resourceId.split(":").pop() || resourceId,
        subtitle: "SNS topic",
        status: "healthy",
        statusLabel: `${subscriptions} confirmed subscriptions`,
        details: [
            { label: "Confirmed subscriptions", value: String(subscriptions) },
            { label: "Pending subscriptions", value: String(Attributes.SubscriptionsPending ?? 0) },
            { label: "Display name", value: Attributes.DisplayName || "n/a" },
        ],
    };
}
// ---------- EventBridge ----------
function eventBridgeClient(auth) {
    return new client_eventbridge_1.EventBridgeClient({ region: auth.region, credentials: auth.credentials });
}
async function listEventBridgeRules(auth) {
    const client = eventBridgeClient(auth);
    const { Rules = [] } = await client.send(new client_eventbridge_1.ListRulesCommand({}));
    return Rules.map((r) => ({
        id: r.Name || "unknown",
        name: r.Name || "unknown",
        subtitle: r.ScheduleExpression || r.EventPattern ? "Pattern rule" : "n/a",
        status: r.State === "ENABLED" ? "healthy" : "warning",
        statusLabel: r.State || "unknown",
    }));
}
async function getEventBridgeRuleHealth(auth, resourceId) {
    const client = eventBridgeClient(auth);
    const { Name, State, ScheduleExpression, EventPattern, Description } = await client.send(new client_eventbridge_1.DescribeRuleCommand({ Name: resourceId }));
    if (!Name)
        throw new Error("EventBridge rule not found (it may have been deleted).");
    return {
        id: resourceId,
        name: Name,
        subtitle: ScheduleExpression ? "Scheduled rule" : "Pattern rule",
        status: State === "ENABLED" ? "healthy" : "warning",
        statusLabel: State || "unknown",
        details: [
            { label: "State", value: State || "unknown" },
            { label: "Schedule", value: ScheduleExpression || "n/a" },
            { label: "Event pattern", value: EventPattern || "n/a" },
            { label: "Description", value: Description || "n/a" },
        ],
    };
}
// ==================== Resource trees (drill-down browsing) ====================
// Each service exposes its real, natural AWS sub-resource hierarchy - e.g. an ECS
// cluster's services and tasks, or a load balancer's listeners/rules and target
// groups/targets - the same way the AWS Console groups them. Only the primary,
// "checkable" resource type in each tree runs through the AI diagnosis pipeline;
// structural/child nodes (tasks, listeners, rules, subnets, etc.) are
// informational browsing only.
async function getEcsTree(auth) {
    const client = ecsClient(auth);
    const { clusterArns = [] } = await client.send(new client_ecs_1.ListClustersCommand({}));
    const clusterNodes = [];
    for (const clusterArn of clusterArns) {
        const clusterName = clusterArn.split("/").pop() || clusterArn;
        const serviceNodes = [];
        const { serviceArns = [] } = await client.send(new client_ecs_1.ListServicesCommand({ cluster: clusterArn }));
        if (serviceArns.length > 0) {
            const { services = [] } = await client.send(new client_ecs_1.DescribeServicesCommand({ cluster: clusterArn, services: serviceArns }));
            for (const s of services) {
                const running = s.runningCount ?? 0;
                const desired = s.desiredCount ?? 0;
                const taskNodes = [];
                try {
                    const { taskArns = [] } = await client.send(new client_ecs_1.ListTasksCommand({ cluster: clusterArn, serviceName: s.serviceName }));
                    if (taskArns.length > 0) {
                        const { tasks = [] } = await client.send(new client_ecs_1.DescribeTasksCommand({ cluster: clusterArn, tasks: taskArns }));
                        for (const t of tasks) {
                            const lastStatus = t.lastStatus || "UNKNOWN";
                            taskNodes.push({
                                id: t.taskArn || "unknown",
                                name: (t.taskArn || "unknown").split("/").pop() || "task",
                                type: "task",
                                status: lastStatus === "RUNNING" ? "healthy" : lastStatus === "STOPPED" ? "error" : "warning",
                                statusLabel: `${lastStatus}${t.healthStatus ? ` / ${t.healthStatus}` : ""}`,
                                checkable: false,
                            });
                        }
                    }
                }
                catch {
                    // Task listing is best-effort; service-level status is already known.
                }
                serviceNodes.push({
                    id: `${clusterArn}::${s.serviceArn}`,
                    name: s.serviceName || "unknown-service",
                    type: "service",
                    status: ecsServiceStatus(running, desired, s.status),
                    statusLabel: `${running}/${desired} tasks running`,
                    checkable: true,
                    children: taskNodes,
                });
            }
        }
        clusterNodes.push({
            id: clusterArn,
            name: clusterName,
            type: "cluster",
            status: serviceNodes.some((n) => n.status === "error") ? "error" : serviceNodes.some((n) => n.status === "warning") ? "warning" : "healthy",
            statusLabel: `${serviceNodes.length} services`,
            checkable: false,
            children: serviceNodes,
        });
    }
    return clusterNodes;
}
async function getEksTree(auth) {
    const client = eksClient(auth);
    const { clusters = [] } = await client.send(new client_eks_1.ListClustersCommand({}));
    const nodes = [];
    for (const name of clusters) {
        const { cluster } = await client.send(new client_eks_1.DescribeClusterCommand({ name }));
        const nodegroupNodes = [];
        try {
            const { nodegroups = [] } = await client.send(new client_eks_1.ListNodegroupsCommand({ clusterName: name }));
            for (const ngName of nodegroups) {
                const { nodegroup } = await client.send(new client_eks_1.DescribeNodegroupCommand({ clusterName: name, nodegroupName: ngName }));
                nodegroupNodes.push({
                    id: `${name}::${ngName}`,
                    name: ngName,
                    type: "nodegroup",
                    status: nodegroup?.status === "ACTIVE" ? "healthy" : nodegroup?.status === "CREATE_FAILED" ? "error" : "warning",
                    statusLabel: `${nodegroup?.status || "unknown"} - ${nodegroup?.scalingConfig?.desiredSize ?? "?"} nodes`,
                    checkable: false,
                });
            }
        }
        catch {
            // Nodegroup listing is best-effort (e.g. Fargate-only clusters have none).
        }
        nodes.push({
            id: name,
            name,
            type: "cluster",
            status: eksStatus(cluster?.status),
            statusLabel: cluster?.status || "unknown",
            checkable: true,
            children: nodegroupNodes,
        });
    }
    return nodes;
}
async function getVpcTree(auth) {
    const client = ec2Client(auth);
    const { Vpcs = [] } = await client.send(new client_ec2_1.DescribeVpcsCommand({}));
    const nodes = [];
    for (const v of Vpcs) {
        const vpcId = v.VpcId || "unknown";
        const name = v.Tags?.find((t) => t.Key === "Name")?.Value || vpcId;
        const filters = [{ Name: "vpc-id", Values: [vpcId] }];
        const [{ Subnets = [] }, { RouteTables = [] }, { SecurityGroups = [] }] = await Promise.all([
            client.send(new client_ec2_1.DescribeSubnetsCommand({ Filters: filters })),
            client.send(new client_ec2_1.DescribeRouteTablesCommand({ Filters: filters })),
            client.send(new client_ec2_1.DescribeSecurityGroupsCommand({ Filters: filters })),
        ]);
        const subnetNodes = Subnets.map((s) => ({
            id: s.SubnetId || "unknown",
            name: s.Tags?.find((t) => t.Key === "Name")?.Value || s.SubnetId || "unknown",
            type: "subnet",
            status: s.State === "available" ? "healthy" : "warning",
            statusLabel: `${s.CidrBlock || "n/a"} - ${s.AvailabilityZone || "n/a"}`,
            checkable: false,
        }));
        const routeTableNodes = RouteTables.map((rt) => ({
            id: rt.RouteTableId || "unknown",
            name: rt.Tags?.find((t) => t.Key === "Name")?.Value || rt.RouteTableId || "unknown",
            type: "route-table",
            status: "healthy",
            statusLabel: `${rt.Routes?.length ?? 0} routes`,
            checkable: false,
        }));
        const sgNodes = SecurityGroups.map((sg) => ({
            id: sg.GroupId || "unknown",
            name: sg.GroupName || sg.GroupId || "unknown",
            type: "security-group",
            status: "healthy",
            statusLabel: `${sg.IpPermissions?.length ?? 0} inbound rules`,
            checkable: false,
        }));
        nodes.push({
            id: vpcId,
            name,
            type: "vpc",
            status: v.State === "available" ? "healthy" : "warning",
            statusLabel: v.CidrBlock || "n/a",
            checkable: true,
            children: [
                { id: `${vpcId}::subnets`, name: "Subnets", type: "folder", status: "healthy", statusLabel: `${subnetNodes.length}`, checkable: false, children: subnetNodes },
                { id: `${vpcId}::route-tables`, name: "Route Tables", type: "folder", status: "healthy", statusLabel: `${routeTableNodes.length}`, checkable: false, children: routeTableNodes },
                { id: `${vpcId}::security-groups`, name: "Security Groups", type: "folder", status: "healthy", statusLabel: `${sgNodes.length}`, checkable: false, children: sgNodes },
            ],
        });
    }
    return nodes;
}
async function getDynamoTree(auth) {
    const client = dynamoClient(auth);
    const { TableNames = [] } = await client.send(new client_dynamodb_1.ListTablesCommand({}));
    const nodes = [];
    for (const name of TableNames) {
        const { Table } = await client.send(new client_dynamodb_1.DescribeTableCommand({ TableName: name }));
        const indexNodes = [
            ...(Table?.GlobalSecondaryIndexes || []).map((idx) => ({
                id: `${name}::${idx.IndexName}`,
                name: idx.IndexName || "unknown",
                type: "index",
                status: (idx.IndexStatus === "ACTIVE" ? "healthy" : "warning"),
                statusLabel: `GSI - ${idx.IndexStatus || "unknown"}`,
                checkable: false,
            })),
            ...(Table?.LocalSecondaryIndexes || []).map((idx) => ({
                id: `${name}::${idx.IndexName}`,
                name: idx.IndexName || "unknown",
                type: "index",
                status: "healthy",
                statusLabel: "LSI",
                checkable: false,
            })),
        ];
        nodes.push({
            id: name,
            name,
            type: "table",
            status: dynamoStatus(Table?.TableStatus),
            statusLabel: Table?.TableStatus || "unknown",
            checkable: true,
            children: indexNodes,
        });
    }
    return nodes;
}
async function getElbTree(auth) {
    const client = elbClient(auth);
    const { LoadBalancers = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeLoadBalancersCommand({}));
    const nodes = [];
    for (const lb of LoadBalancers) {
        const lbArn = lb.LoadBalancerArn || "unknown";
        const lbName = lb.LoadBalancerName || "unknown";
        const listenerNodes = [];
        try {
            const { Listeners = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeListenersCommand({ LoadBalancerArn: lbArn }));
            for (const l of Listeners) {
                const ruleNodes = [];
                try {
                    const { Rules = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeRulesCommand({ ListenerArn: l.ListenerArn }));
                    for (const r of Rules) {
                        const conditionSummary = (r.Conditions || [])
                            .map((c) => c.Field)
                            .filter(Boolean)
                            .join(", ");
                        ruleNodes.push({
                            id: r.RuleArn || "unknown",
                            name: r.IsDefault ? "Default rule" : `Priority ${r.Priority}`,
                            type: "rule",
                            status: "healthy",
                            statusLabel: conditionSummary || "No conditions",
                            checkable: false,
                        });
                    }
                }
                catch {
                    // Rule listing best-effort.
                }
                listenerNodes.push({
                    id: l.ListenerArn || "unknown",
                    name: `${l.Protocol || "?"}:${l.Port ?? "?"}`,
                    type: "listener",
                    status: "healthy",
                    statusLabel: `${ruleNodes.length} rules`,
                    checkable: false,
                    children: ruleNodes,
                });
            }
        }
        catch {
            // Listener listing best-effort.
        }
        const targetGroupNodes = [];
        try {
            const { TargetGroups = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeTargetGroupsCommand({ LoadBalancerArn: lbArn }));
            for (const tg of TargetGroups) {
                const targetNodes = [];
                let unhealthy = 0;
                try {
                    const { TargetHealthDescriptions = [] } = await client.send(new client_elastic_load_balancing_v2_1.DescribeTargetHealthCommand({ TargetGroupArn: tg.TargetGroupArn }));
                    for (const t of TargetHealthDescriptions) {
                        const healthy = t.TargetHealth?.State === "healthy";
                        if (!healthy)
                            unhealthy += 1;
                        targetNodes.push({
                            id: `${tg.TargetGroupArn}::${t.Target?.Id}:${t.Target?.Port}`,
                            name: `${t.Target?.Id || "unknown"}:${t.Target?.Port ?? ""}`,
                            type: "target",
                            status: healthy ? "healthy" : "error",
                            statusLabel: t.TargetHealth?.State || "unknown",
                            checkable: false,
                        });
                    }
                }
                catch {
                    // Target health lookup best-effort.
                }
                targetGroupNodes.push({
                    id: tg.TargetGroupArn || "unknown",
                    name: tg.TargetGroupName || "unknown",
                    type: "target-group",
                    status: unhealthy > 0 ? "warning" : "healthy",
                    statusLabel: `${targetNodes.length - unhealthy}/${targetNodes.length} targets healthy`,
                    checkable: false,
                    children: targetNodes,
                });
            }
        }
        catch {
            // Target group listing best-effort.
        }
        const status = lb.State?.Code === "failed" ? "error" : lb.State?.Code !== "active" ? "warning" : "healthy";
        nodes.push({
            id: lbArn,
            name: lbName,
            type: "load-balancer",
            status,
            statusLabel: lb.State?.Code || "unknown",
            checkable: true,
            children: [
                { id: `${lbArn}::listeners`, name: "Listeners", type: "folder", status: "healthy", statusLabel: `${listenerNodes.length}`, checkable: false, children: listenerNodes },
                { id: `${lbArn}::target-groups`, name: "Target Groups", type: "folder", status: "healthy", statusLabel: `${targetGroupNodes.length}`, checkable: false, children: targetGroupNodes },
            ],
        });
    }
    return nodes;
}
async function getSnsTree(auth) {
    const client = snsClient(auth);
    const { Topics = [] } = await client.send(new client_sns_1.ListTopicsCommand({}));
    const nodes = [];
    for (const t of Topics) {
        const arn = t.TopicArn || "unknown";
        const subscriptionNodes = [];
        try {
            const { Subscriptions = [] } = await client.send(new client_sns_1.ListSubscriptionsByTopicCommand({ TopicArn: arn }));
            for (const s of Subscriptions) {
                const pending = s.SubscriptionArn === "PendingConfirmation";
                subscriptionNodes.push({
                    id: s.SubscriptionArn || "unknown",
                    name: `${s.Protocol || "?"}: ${s.Endpoint || "unknown"}`,
                    type: "subscription",
                    status: pending ? "warning" : "healthy",
                    statusLabel: pending ? "Pending confirmation" : "Confirmed",
                    checkable: false,
                });
            }
        }
        catch {
            // Subscription listing best-effort.
        }
        nodes.push({
            id: arn,
            name: arn.split(":").pop() || arn,
            type: "topic",
            status: "healthy",
            statusLabel: `${subscriptionNodes.length} subscriptions`,
            checkable: true,
            children: subscriptionNodes,
        });
    }
    return nodes;
}
async function getFlatTree(auth, listFn, type) {
    const items = await listFn(auth);
    return toFlatTree(items, type);
}
// ==================== Additional real services ====================
// ---------- ECR ----------
function ecrClient(auth) {
    return new client_ecr_1.ECRClient({ region: auth.region, credentials: auth.credentials });
}
async function listEcrRepositories(auth) {
    const client = ecrClient(auth);
    const { repositories = [] } = await client.send(new client_ecr_1.DescribeRepositoriesCommand({}));
    return repositories.map((r) => ({
        id: r.repositoryName || "unknown",
        name: r.repositoryName || "unknown",
        subtitle: r.repositoryUri || "n/a",
        status: "healthy",
        statusLabel: r.imageScanningConfiguration?.scanOnPush ? "Scan on push enabled" : "Scan on push disabled",
    }));
}
async function getEcrRepositoryHealth(auth, resourceId) {
    const client = ecrClient(auth);
    const { repositories = [] } = await client.send(new client_ecr_1.DescribeRepositoriesCommand({ repositoryNames: [resourceId] }));
    const repo = repositories[0];
    if (!repo)
        throw new Error("ECR repository not found (it may have been deleted).");
    // Whether an image has actually landed in this repo is the real signal for
    // "did the build & push step succeed" - an empty repo means nothing was pushed.
    let imageCount = 0;
    let latestPush = null;
    let latestTag = "untagged";
    try {
        const { imageDetails = [] } = await client.send(new client_ecr_1.DescribeImagesCommand({ repositoryName: resourceId }));
        imageCount = imageDetails.length;
        const sorted = [...imageDetails].sort((a, b) => (b.imagePushedAt?.getTime() ?? 0) - (a.imagePushedAt?.getTime() ?? 0));
        if (sorted[0]) {
            latestPush = sorted[0].imagePushedAt ?? null;
            latestTag = sorted[0].imageTags?.[0] || "untagged";
        }
    }
    catch {
        // Best-effort; if image listing fails we still report repo-level info below.
    }
    const status = imageCount === 0 ? "warning" : "healthy";
    const statusLabel = imageCount === 0 ? "No image pushed yet" : `${imageCount} image(s) - latest: ${latestTag}`;
    return {
        id: resourceId,
        name: repo.repositoryName || resourceId,
        subtitle: repo.repositoryUri || "n/a",
        status,
        statusLabel,
        details: [
            { label: "URI", value: repo.repositoryUri || "n/a" },
            { label: "Created", value: repo.createdAt ? new Date(repo.createdAt).toLocaleString() : "n/a" },
            { label: "Image count", value: String(imageCount) },
            { label: "Latest image tag", value: latestTag },
            { label: "Latest pushed at", value: latestPush ? latestPush.toLocaleString() : "never" },
            { label: "Image tag mutability", value: repo.imageTagMutability || "n/a" },
            { label: "Scan on push", value: repo.imageScanningConfiguration?.scanOnPush ? "Enabled" : "Disabled" },
        ],
    };
}
// ---------- EFS ----------
function efsClient(auth) {
    return new client_efs_1.EFSClient({ region: auth.region, credentials: auth.credentials });
}
function efsStatus(state) {
    if (state === "available")
        return "healthy";
    if (state === "error")
        return "error";
    return "warning";
}
function efsSizeLabel(sizeBytes) {
    return `${(((sizeBytes ?? 0) / (1024 * 1024)).toFixed(1))} MB`;
}
async function listEfsFileSystems(auth) {
    const client = efsClient(auth);
    const { FileSystems = [] } = await client.send(new client_efs_1.DescribeFileSystemsCommand({}));
    return FileSystems.map((fs) => ({
        id: fs.FileSystemId || "unknown",
        name: fs.Name || fs.FileSystemId || "unknown",
        subtitle: efsSizeLabel(fs.SizeInBytes?.Value),
        status: efsStatus(fs.LifeCycleState),
        statusLabel: fs.LifeCycleState || "unknown",
    }));
}
async function getEfsFileSystemHealth(auth, resourceId) {
    const client = efsClient(auth);
    const { FileSystems = [] } = await client.send(new client_efs_1.DescribeFileSystemsCommand({ FileSystemId: resourceId }));
    const fs = FileSystems[0];
    if (!fs)
        throw new Error("EFS file system not found (it may have been deleted).");
    return {
        id: resourceId,
        name: fs.Name || resourceId,
        subtitle: efsSizeLabel(fs.SizeInBytes?.Value),
        status: efsStatus(fs.LifeCycleState),
        statusLabel: fs.LifeCycleState || "unknown",
        details: [
            { label: "Lifecycle state", value: fs.LifeCycleState || "unknown" },
            { label: "Performance mode", value: fs.PerformanceMode || "n/a" },
            { label: "Throughput mode", value: fs.ThroughputMode || "n/a" },
            { label: "Size", value: efsSizeLabel(fs.SizeInBytes?.Value) },
        ],
    };
}
// ---------- Step Functions ----------
function sfnClient(auth) {
    return new client_sfn_1.SFNClient({ region: auth.region, credentials: auth.credentials });
}
async function listStateMachines(auth) {
    const client = sfnClient(auth);
    const { stateMachines = [] } = await client.send(new client_sfn_1.ListStateMachinesCommand({}));
    return stateMachines.map((sm) => ({
        id: sm.stateMachineArn || "unknown",
        name: sm.name || "unknown",
        subtitle: sm.type || "n/a",
        status: "healthy",
        statusLabel: sm.type || "STANDARD",
    }));
}
async function getStateMachineHealth(auth, resourceId) {
    const client = sfnClient(auth);
    const desc = await client.send(new client_sfn_1.DescribeStateMachineCommand({ stateMachineArn: resourceId }));
    const status = desc.status === "ACTIVE" ? "healthy" : "warning";
    return {
        id: resourceId,
        name: desc.name || resourceId,
        subtitle: desc.type || "n/a",
        status,
        statusLabel: desc.status || "unknown",
        details: [
            { label: "Status", value: desc.status || "unknown" },
            { label: "Type", value: desc.type || "n/a" },
            { label: "Created", value: desc.creationDate ? new Date(desc.creationDate).toLocaleString() : "n/a" },
        ],
    };
}
// ---------- Secrets Manager ----------
function secretsManagerClient(auth) {
    return new client_secrets_manager_1.SecretsManagerClient({ region: auth.region, credentials: auth.credentials });
}
async function listSecrets(auth) {
    const client = secretsManagerClient(auth);
    const { SecretList = [] } = await client.send(new client_secrets_manager_1.ListSecretsCommand({}));
    return SecretList.map((s) => ({
        id: s.ARN || s.Name || "unknown",
        name: s.Name || "unknown",
        subtitle: s.RotationEnabled ? "Rotation enabled" : "Rotation disabled",
        status: (s.RotationEnabled ? "healthy" : "warning"),
        statusLabel: s.RotationEnabled ? "Rotation enabled" : "Rotation disabled",
    }));
}
async function getSecretHealth(auth, resourceId) {
    const client = secretsManagerClient(auth);
    const desc = await client.send(new client_secrets_manager_1.DescribeSecretCommand({ SecretId: resourceId }));
    const status = desc.RotationEnabled ? "healthy" : "warning";
    return {
        id: resourceId,
        name: desc.Name || resourceId,
        subtitle: desc.RotationEnabled ? "Rotation enabled" : "Rotation disabled",
        status,
        statusLabel: desc.RotationEnabled ? "Rotation enabled" : "Rotation disabled",
        details: [
            { label: "Rotation enabled", value: desc.RotationEnabled ? "Yes" : "No" },
            { label: "Last rotated", value: desc.LastRotatedDate ? new Date(desc.LastRotatedDate).toLocaleString() : "Never" },
            { label: "Last changed", value: desc.LastChangedDate ? new Date(desc.LastChangedDate).toLocaleString() : "n/a" },
        ],
    };
}
// ---------- KMS ----------
function kmsClient(auth) {
    return new client_kms_1.KMSClient({ region: auth.region, credentials: auth.credentials });
}
function kmsStatus(state) {
    if (state === "Enabled")
        return "healthy";
    if (state === "PendingDeletion")
        return "error";
    return "warning";
}
async function listKmsKeys(auth) {
    const client = kmsClient(auth);
    const { Keys = [] } = await client.send(new client_kms_1.ListKeysCommand({}));
    const results = [];
    for (const k of Keys) {
        if (!k.KeyId)
            continue;
        try {
            const { KeyMetadata } = await client.send(new client_kms_1.DescribeKeyCommand({ KeyId: k.KeyId }));
            results.push({
                id: k.KeyId,
                name: KeyMetadata?.Description || k.KeyId,
                subtitle: KeyMetadata?.KeyUsage || "n/a",
                status: kmsStatus(KeyMetadata?.KeyState),
                statusLabel: KeyMetadata?.KeyState || "unknown",
            });
        }
        catch {
            // Skip keys we can't describe (e.g. some AWS-managed keys).
        }
    }
    return results;
}
async function getKmsKeyHealth(auth, resourceId) {
    const client = kmsClient(auth);
    const { KeyMetadata } = await client.send(new client_kms_1.DescribeKeyCommand({ KeyId: resourceId }));
    if (!KeyMetadata)
        throw new Error("KMS key not found (it may have been deleted).");
    return {
        id: resourceId,
        name: KeyMetadata.Description || resourceId,
        subtitle: KeyMetadata.KeyUsage || "n/a",
        status: kmsStatus(KeyMetadata.KeyState),
        statusLabel: KeyMetadata.KeyState || "unknown",
        details: [
            { label: "State", value: KeyMetadata.KeyState || "unknown" },
            { label: "Key manager", value: KeyMetadata.KeyManager || "n/a" },
            { label: "Key usage", value: KeyMetadata.KeyUsage || "n/a" },
            { label: "Enabled", value: KeyMetadata.Enabled ? "Yes" : "No" },
        ],
    };
}
// ---------- ACM (Certificate Manager) ----------
function acmClient(auth) {
    return new client_acm_1.ACMClient({ region: auth.region, credentials: auth.credentials });
}
function acmStatus(status) {
    if (status === "ISSUED")
        return "healthy";
    if (status === "EXPIRED" || status === "FAILED" || status === "REVOKED")
        return "error";
    return "warning";
}
async function listCertificates(auth) {
    const client = acmClient(auth);
    const { CertificateSummaryList = [] } = await client.send(new client_acm_1.ListCertificatesCommand({}));
    return CertificateSummaryList.map((c) => ({
        id: c.CertificateArn || "unknown",
        name: c.DomainName || "unknown",
        subtitle: c.CertificateArn?.split("/").pop() || "n/a",
        status: acmStatus(c.Status),
        statusLabel: c.Status || "unknown",
    }));
}
async function getCertificateHealth(auth, resourceId) {
    const client = acmClient(auth);
    const { Certificate } = await client.send(new client_acm_1.DescribeCertificateCommand({ CertificateArn: resourceId }));
    if (!Certificate)
        throw new Error("ACM certificate not found (it may have been deleted).");
    return {
        id: resourceId,
        name: Certificate.DomainName || resourceId,
        subtitle: Certificate.Type || "n/a",
        status: acmStatus(Certificate.Status),
        statusLabel: Certificate.Status || "unknown",
        details: [
            { label: "Status", value: Certificate.Status || "unknown" },
            { label: "Type", value: Certificate.Type || "n/a" },
            { label: "Not after", value: Certificate.NotAfter ? new Date(Certificate.NotAfter).toLocaleString() : "n/a" },
            { label: "In use by", value: `${Certificate.InUseBy?.length ?? 0} resources` },
        ],
    };
}
// ---------- Systems Manager (Parameter Store) ----------
function ssmClient(auth) {
    return new client_ssm_1.SSMClient({ region: auth.region, credentials: auth.credentials });
}
async function listSsmParameters(auth) {
    const client = ssmClient(auth);
    const { Parameters = [] } = await client.send(new client_ssm_1.DescribeParametersCommand({}));
    return Parameters.map((p) => ({
        id: p.Name || "unknown",
        name: p.Name || "unknown",
        subtitle: p.Type || "n/a",
        status: "healthy",
        statusLabel: p.Type || "String",
    }));
}
async function getSsmParameterHealth(auth, resourceId) {
    const client = ssmClient(auth);
    const { Parameters = [] } = await client.send(new client_ssm_1.DescribeParametersCommand({ ParameterFilters: [{ Key: "Name", Values: [resourceId] }] }));
    const p = Parameters[0];
    if (!p)
        throw new Error("Parameter not found (it may have been deleted).");
    return {
        id: resourceId,
        name: p.Name || resourceId,
        subtitle: p.Type || "n/a",
        status: "healthy",
        statusLabel: p.Type || "String",
        details: [
            { label: "Type", value: p.Type || "n/a" },
            { label: "Tier", value: p.Tier || "Standard" },
            { label: "Last modified", value: p.LastModifiedDate ? new Date(p.LastModifiedDate).toLocaleString() : "n/a" },
            { label: "Version", value: String(p.Version ?? "n/a") },
        ],
    };
}
// ---------- CloudFormation ----------
function cfnClient(auth) {
    return new client_cloudformation_1.CloudFormationClient({ region: auth.region, credentials: auth.credentials });
}
function cfnStatus(status) {
    if (!status)
        return "warning";
    if (status.includes("ROLLBACK") || status.includes("FAILED"))
        return "error";
    if (status.endsWith("_COMPLETE"))
        return "healthy";
    return "warning";
}
async function listStacks(auth) {
    const client = cfnClient(auth);
    const { StackSummaries = [] } = await client.send(new client_cloudformation_1.ListStacksCommand({
        StackStatusFilter: [
            "CREATE_COMPLETE",
            "UPDATE_COMPLETE",
            "UPDATE_ROLLBACK_COMPLETE",
            "CREATE_IN_PROGRESS",
            "UPDATE_IN_PROGRESS",
            "ROLLBACK_COMPLETE",
            "CREATE_FAILED",
            "ROLLBACK_FAILED",
            "UPDATE_ROLLBACK_FAILED",
        ],
    }));
    return StackSummaries.map((s) => ({
        id: s.StackName || "unknown",
        name: s.StackName || "unknown",
        subtitle: s.StackStatus || "n/a",
        status: cfnStatus(s.StackStatus),
        statusLabel: s.StackStatus || "unknown",
    }));
}
async function getStackHealth(auth, resourceId) {
    const client = cfnClient(auth);
    const { Stacks = [] } = await client.send(new client_cloudformation_1.DescribeStacksCommand({ StackName: resourceId }));
    const stack = Stacks[0];
    if (!stack)
        throw new Error("CloudFormation stack not found (it may have been deleted).");
    return {
        id: resourceId,
        name: stack.StackName || resourceId,
        subtitle: stack.StackStatus || "n/a",
        status: cfnStatus(stack.StackStatus),
        statusLabel: stack.StackStatus || "unknown",
        details: [
            { label: "Status", value: stack.StackStatus || "unknown" },
            { label: "Status reason", value: stack.StackStatusReason || "None" },
            { label: "Created", value: stack.CreationTime ? new Date(stack.CreationTime).toLocaleString() : "n/a" },
            { label: "Last updated", value: stack.LastUpdatedTime ? new Date(stack.LastUpdatedTime).toLocaleString() : "n/a" },
        ],
    };
}
// ---------- IAM ----------
function iamClient(auth) {
    return new client_iam_1.IAMClient({ region: auth.region, credentials: auth.credentials });
}
const STALE_KEY_WARNING_DAYS = 90;
const STALE_KEY_ERROR_DAYS = 180;
function daysSince(date) {
    if (!date)
        return null;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
async function listIamUsers(auth) {
    const client = iamClient(auth);
    const { Users = [] } = await client.send(new client_iam_1.ListUsersCommand({}));
    return Users.map((u) => ({
        id: u.UserName || "unknown",
        name: u.UserName || "unknown",
        subtitle: u.Arn || "n/a",
        status: "healthy",
        statusLabel: u.PasswordLastUsed ? `Console last used ${new Date(u.PasswordLastUsed).toLocaleDateString()}` : "No console login",
    }));
}
// Real security signal, not a fake diagnosis: an old active access key (rotation
// best practice) or no MFA is a genuine, checkable IAM hygiene problem.
async function getIamUserHealth(auth, resourceId) {
    const client = iamClient(auth);
    const [{ AccessKeyMetadata = [] }, mfaResult] = await Promise.all([
        client.send(new client_iam_1.ListAccessKeysCommand({ UserName: resourceId })),
        client.send(new client_iam_1.ListMFADevicesCommand({ UserName: resourceId })).catch(() => ({ MFADevices: [] })),
    ]);
    const activeKeys = AccessKeyMetadata.filter((k) => k.Status === "Active");
    const keyAges = activeKeys.map((k) => daysSince(k.CreateDate) ?? 0);
    const oldestKeyAge = keyAges.length > 0 ? Math.max(...keyAges) : 0;
    const hasMfa = (mfaResult.MFADevices || []).length > 0;
    let status = "healthy";
    let statusLabel = "Healthy";
    if (oldestKeyAge >= STALE_KEY_ERROR_DAYS) {
        status = "error";
        statusLabel = `Active access key is ${oldestKeyAge} days old - rotate it`;
    }
    else if (oldestKeyAge >= STALE_KEY_WARNING_DAYS) {
        status = "warning";
        statusLabel = `Active access key is ${oldestKeyAge} days old`;
    }
    else if (!hasMfa) {
        status = "warning";
        statusLabel = "No MFA device enabled";
    }
    return {
        id: resourceId,
        name: resourceId,
        subtitle: `${activeKeys.length} active access key(s)`,
        status,
        statusLabel,
        details: [
            { label: "Active access keys", value: String(activeKeys.length) },
            { label: "Oldest active key age", value: keyAges.length > 0 ? `${oldestKeyAge} days` : "No active keys" },
            { label: "MFA enabled", value: hasMfa ? "Yes" : "No" },
        ],
    };
}
// ---------- WAF (WAFv2, regional web ACLs) ----------
function wafClient(auth) {
    return new client_wafv2_1.WAFV2Client({ region: auth.region, credentials: auth.credentials });
}
async function listWebAcls(auth) {
    const client = wafClient(auth);
    const { WebACLs = [] } = await client.send(new client_wafv2_1.ListWebACLsCommand({ Scope: "REGIONAL" }));
    return WebACLs.map((w) => ({
        id: `${w.Name}::${w.Id}`,
        name: w.Name || "unknown",
        subtitle: w.Description || "Regional Web ACL",
        status: "healthy",
        statusLabel: "Web ACL",
    }));
}
async function getWebAclHealth(auth, resourceId) {
    const [name, id] = resourceId.split("::");
    if (!name || !id)
        throw new Error("Invalid WAF Web ACL id.");
    const client = wafClient(auth);
    const { WebACL } = await client.send(new client_wafv2_1.GetWebACLCommand({ Name: name, Id: id, Scope: "REGIONAL" }));
    if (!WebACL)
        throw new Error("WAF Web ACL not found (it may have been deleted).");
    // A Web ACL with zero rules is a real, checkable misconfiguration: it's
    // attached but providing no actual protection.
    const ruleCount = (WebACL.Rules || []).length;
    const status = ruleCount === 0 ? "error" : "healthy";
    const statusLabel = ruleCount === 0 ? "No rules configured - not actually protecting anything" : `${ruleCount} rule(s) active`;
    return {
        id: resourceId,
        name: WebACL.Name || name,
        subtitle: WebACL.Description || "Regional Web ACL",
        status,
        statusLabel,
        details: [
            { label: "Rules", value: String(ruleCount) },
            {
                label: "Default action",
                value: WebACL.DefaultAction?.Allow ? "Allow" : WebACL.DefaultAction?.Block ? "Block" : "unknown",
            },
            { label: "Capacity used", value: String(WebACL.Capacity ?? "unknown") },
        ],
    };
}
// ---------- CloudWatch (alarms) ----------
function cloudwatchClient(auth) {
    return new client_cloudwatch_1.CloudWatchClient({ region: auth.region, credentials: auth.credentials });
}
function alarmStatus(state) {
    if (state === "ALARM")
        return "error";
    if (state === "INSUFFICIENT_DATA")
        return "warning";
    return "healthy";
}
async function listCloudWatchAlarms(auth) {
    const client = cloudwatchClient(auth);
    const { MetricAlarms = [] } = await client.send(new client_cloudwatch_1.DescribeAlarmsCommand({}));
    return MetricAlarms.map((a) => ({
        id: a.AlarmName || "unknown",
        name: a.AlarmName || "unknown",
        subtitle: a.MetricName || a.AlarmDescription || "n/a",
        status: alarmStatus(a.StateValue),
        statusLabel: a.StateValue || "unknown",
    }));
}
async function getCloudWatchAlarmHealth(auth, resourceId) {
    const client = cloudwatchClient(auth);
    const { MetricAlarms = [] } = await client.send(new client_cloudwatch_1.DescribeAlarmsCommand({ AlarmNames: [resourceId] }));
    const alarm = MetricAlarms[0];
    if (!alarm)
        throw new Error("CloudWatch alarm not found (it may have been deleted).");
    return {
        id: resourceId,
        name: alarm.AlarmName || resourceId,
        subtitle: alarm.MetricName || "n/a",
        status: alarmStatus(alarm.StateValue),
        statusLabel: alarm.StateValue || "unknown",
        details: [
            { label: "State", value: alarm.StateValue || "unknown" },
            { label: "State reason", value: alarm.StateReason || "None" },
            { label: "Metric", value: `${alarm.Namespace || "?"} / ${alarm.MetricName || "?"}` },
            { label: "Comparison", value: `${alarm.ComparisonOperator || "?"} ${alarm.Threshold ?? "?"}` },
            {
                label: "Last updated",
                value: alarm.StateUpdatedTimestamp ? new Date(alarm.StateUpdatedTimestamp).toLocaleString() : "n/a",
            },
        ],
    };
}
// ---------- Bedrock (foundation models) ----------
function bedrockClient(auth) {
    return new client_bedrock_1.BedrockClient({ region: auth.region, credentials: auth.credentials });
}
async function listBedrockModels(auth) {
    const client = bedrockClient(auth);
    const { modelSummaries = [] } = await client.send(new client_bedrock_1.ListFoundationModelsCommand({}));
    return modelSummaries.map((m) => ({
        id: m.modelId || "unknown",
        name: m.modelName || m.modelId || "unknown",
        subtitle: m.providerName || "n/a",
        status: m.modelLifecycle?.status === "LEGACY" ? "warning" : "healthy",
        statusLabel: m.modelLifecycle?.status || "ACTIVE",
    }));
}
// AWS's own foundation-model catalog, not a user resource - "health" here means
// whether the model is still an active offering vs. being phased out (LEGACY),
// which is real, useful info if a pipeline depends on it.
async function getBedrockModelHealth(auth, resourceId) {
    const client = bedrockClient(auth);
    const { modelSummaries = [] } = await client.send(new client_bedrock_1.ListFoundationModelsCommand({}));
    const model = modelSummaries.find((m) => m.modelId === resourceId);
    if (!model)
        throw new Error("Bedrock foundation model not found.");
    const isLegacy = model.modelLifecycle?.status === "LEGACY";
    return {
        id: resourceId,
        name: model.modelName || resourceId,
        subtitle: model.providerName || "n/a",
        status: isLegacy ? "warning" : "healthy",
        statusLabel: model.modelLifecycle?.status || "ACTIVE",
        details: [
            { label: "Provider", value: model.providerName || "n/a" },
            { label: "Lifecycle status", value: model.modelLifecycle?.status || "ACTIVE" },
            { label: "Input modalities", value: (model.inputModalities || []).join(", ") || "n/a" },
            { label: "Output modalities", value: (model.outputModalities || []).join(", ") || "n/a" },
            { label: "On-demand supported", value: model.inferenceTypesSupported?.includes("ON_DEMAND") ? "Yes" : "No" },
        ],
    };
}
