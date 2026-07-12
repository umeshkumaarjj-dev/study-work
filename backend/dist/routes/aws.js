"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsRouter = void 0;
const express_1 = require("express");
const credentials_1 = require("../aws/credentials");
const catalog_1 = require("../aws/catalog");
const errorPipeline_1 = require("../engine/errorPipeline");
const services_1 = require("../aws/services");
exports.awsRouter = (0, express_1.Router)();
const SERVICE_KEYS = [
    "ec2",
    "ecs",
    "eks",
    "lambda",
    "ecr",
    "s3",
    "efs",
    "rds",
    "dynamodb",
    "vpc",
    "elb",
    "cloudfront",
    "sqs",
    "sns",
    "eventbridge",
    "stepfunctions",
    "secretsmanager",
    "kms",
    "acm",
    "ssm",
    "cloudformation",
    "iam",
    "waf",
    "cloudwatch",
    "bedrock",
];
function isServiceKey(value) {
    return SERVICE_KEYS.includes(value);
}
const LIST_FNS = {
    ec2: services_1.listEc2Instances,
    ecs: services_1.listEcsServices,
    eks: services_1.listEksClusters,
    lambda: services_1.listLambdaFunctions,
    ecr: services_1.listEcrRepositories,
    s3: services_1.listS3Buckets,
    efs: services_1.listEfsFileSystems,
    rds: services_1.listRdsInstances,
    dynamodb: services_1.listDynamoTables,
    vpc: services_1.listVpcs,
    elb: services_1.listLoadBalancers,
    cloudfront: services_1.listCloudFrontDistributions,
    sqs: services_1.listSqsQueues,
    sns: services_1.listSnsTopics,
    eventbridge: services_1.listEventBridgeRules,
    stepfunctions: services_1.listStateMachines,
    secretsmanager: services_1.listSecrets,
    kms: services_1.listKmsKeys,
    acm: services_1.listCertificates,
    ssm: services_1.listSsmParameters,
    cloudformation: services_1.listStacks,
    iam: services_1.listIamUsers,
    waf: services_1.listWebAcls,
    cloudwatch: services_1.listCloudWatchAlarms,
    bedrock: services_1.listBedrockModels,
};
const HEALTH_FNS = {
    ec2: services_1.getEc2InstanceHealth,
    ecs: services_1.getEcsServiceHealth,
    eks: services_1.getEksClusterHealth,
    lambda: services_1.getLambdaFunctionHealth,
    ecr: services_1.getEcrRepositoryHealth,
    s3: services_1.getS3BucketHealth,
    efs: services_1.getEfsFileSystemHealth,
    rds: services_1.getRdsInstanceHealth,
    dynamodb: services_1.getDynamoTableHealth,
    vpc: services_1.getVpcHealth,
    elb: services_1.getLoadBalancerHealth,
    cloudfront: services_1.getCloudFrontDistributionHealth,
    sqs: services_1.getSqsQueueHealth,
    sns: services_1.getSnsTopicHealth,
    eventbridge: services_1.getEventBridgeRuleHealth,
    stepfunctions: services_1.getStateMachineHealth,
    secretsmanager: services_1.getSecretHealth,
    kms: services_1.getKmsKeyHealth,
    acm: services_1.getCertificateHealth,
    ssm: services_1.getSsmParameterHealth,
    cloudformation: services_1.getStackHealth,
    iam: services_1.getIamUserHealth,
    waf: services_1.getWebAclHealth,
    cloudwatch: services_1.getCloudWatchAlarmHealth,
    bedrock: services_1.getBedrockModelHealth,
};
// Services with a real, natural AWS sub-resource hierarchy get a dedicated tree
// builder (see aws/services.ts); everything else is wrapped as a flat, one-level
// tree from its existing list function.
const TREE_FNS = {
    ec2: (auth) => (0, services_1.getFlatTree)(auth, services_1.listEc2Instances, "instance"),
    ecs: services_1.getEcsTree,
    eks: services_1.getEksTree,
    lambda: (auth) => (0, services_1.getFlatTree)(auth, services_1.listLambdaFunctions, "function"),
    ecr: (auth) => (0, services_1.getFlatTree)(auth, services_1.listEcrRepositories, "repository"),
    s3: (auth) => (0, services_1.getFlatTree)(auth, services_1.listS3Buckets, "bucket"),
    efs: (auth) => (0, services_1.getFlatTree)(auth, services_1.listEfsFileSystems, "file-system"),
    rds: (auth) => (0, services_1.getFlatTree)(auth, services_1.listRdsInstances, "instance"),
    dynamodb: services_1.getDynamoTree,
    vpc: services_1.getVpcTree,
    elb: services_1.getElbTree,
    cloudfront: (auth) => (0, services_1.getFlatTree)(auth, services_1.listCloudFrontDistributions, "distribution"),
    sqs: (auth) => (0, services_1.getFlatTree)(auth, services_1.listSqsQueues, "queue"),
    sns: services_1.getSnsTree,
    eventbridge: (auth) => (0, services_1.getFlatTree)(auth, services_1.listEventBridgeRules, "rule"),
    stepfunctions: (auth) => (0, services_1.getFlatTree)(auth, services_1.listStateMachines, "state-machine"),
    secretsmanager: (auth) => (0, services_1.getFlatTree)(auth, services_1.listSecrets, "secret"),
    kms: (auth) => (0, services_1.getFlatTree)(auth, services_1.listKmsKeys, "key"),
    acm: (auth) => (0, services_1.getFlatTree)(auth, services_1.listCertificates, "certificate"),
    ssm: (auth) => (0, services_1.getFlatTree)(auth, services_1.listSsmParameters, "parameter"),
    cloudformation: (auth) => (0, services_1.getFlatTree)(auth, services_1.listStacks, "stack"),
    iam: (auth) => (0, services_1.getFlatTree)(auth, services_1.listIamUsers, "user"),
    waf: (auth) => (0, services_1.getFlatTree)(auth, services_1.listWebAcls, "web-acl"),
    cloudwatch: (auth) => (0, services_1.getFlatTree)(auth, services_1.listCloudWatchAlarms, "alarm"),
    bedrock: (auth) => (0, services_1.getFlatTree)(auth, services_1.listBedrockModels, "model"),
};
exports.awsRouter.get("/catalog", (_req, res) => {
    res.json(catalog_1.AWS_CATALOG);
});
exports.awsRouter.get("/resources/:service/tree", async (req, res) => {
    const { service } = req.params;
    if (!isServiceKey(service)) {
        res.status(400).json({ error: `Unsupported AWS service: ${service}` });
        return;
    }
    try {
        const auth = await (0, credentials_1.getAwsAuth)(req.user.id);
        const tree = await TREE_FNS[service](auth);
        res.json(tree);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.awsRouter.get("/resources/:service", async (req, res) => {
    const { service } = req.params;
    if (!isServiceKey(service)) {
        res.status(400).json({ error: `Unsupported AWS service: ${service}` });
        return;
    }
    try {
        const auth = await (0, credentials_1.getAwsAuth)(req.user.id);
        const resources = await LIST_FNS[service](auth);
        res.json(resources);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.awsRouter.get("/resources/:service/health", async (req, res) => {
    const { service } = req.params;
    const id = req.query.id;
    if (!isServiceKey(service)) {
        res.status(400).json({ error: `Unsupported AWS service: ${service}` });
        return;
    }
    if (!id || typeof id !== "string") {
        res.status(400).json({ error: "Query param 'id' is required." });
        return;
    }
    try {
        const auth = await (0, credentials_1.getAwsAuth)(req.user.id);
        const detail = await HEALTH_FNS[service](auth, id);
        res.json(detail);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Fetches live health for a resource and, if it isn't healthy, opens (or reuses) a
// tracked issue that runs through the same AI diagnosis + severity-approval engine
// as simulated scenarios. Real AWS issues always require manual approval - see
// engine/errorPipeline.ts.
exports.awsRouter.post("/resources/:service/check", async (req, res) => {
    const { service } = req.params;
    const id = req.query.id;
    if (!isServiceKey(service)) {
        res.status(400).json({ error: `Unsupported AWS service: ${service}` });
        return;
    }
    if (!id || typeof id !== "string") {
        res.status(400).json({ error: "Query param 'id' is required." });
        return;
    }
    try {
        const auth = await (0, credentials_1.getAwsAuth)(req.user.id);
        const detail = await HEALTH_FNS[service](auth, id);
        if (detail.status === "healthy") {
            res.json({ detail, errorEventId: null });
            return;
        }
        const errorEvent = await (0, errorPipeline_1.triggerAwsResourceIssue)(service, id, detail, req.user.id);
        res.json({ detail, errorEventId: errorEvent.id });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
