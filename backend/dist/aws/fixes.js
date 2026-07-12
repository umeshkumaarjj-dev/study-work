"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRealFix = executeRealFix;
const client_ecs_1 = require("@aws-sdk/client-ecs");
const client_s3_1 = require("@aws-sdk/client-s3");
/**
 * Executes a real, live AWS remediation. `fixAction` is a deterministic key set by
 * the health-check logic in aws/services.ts - never inferred from the AI's
 * free-text diagnosis. Only add an action here once it is verified safe and
 * reversible; anything else should stay manual.
 */
async function executeRealFix(auth, fixAction, resourceId) {
    if (fixAction === "ecs_restart_service") {
        const [clusterArn, serviceArn] = resourceId.split("::");
        if (!clusterArn || !serviceArn)
            throw new Error("Invalid ECS resource id for restart.");
        const client = new client_ecs_1.ECSClient({ region: auth.region, credentials: auth.credentials });
        await client.send(new client_ecs_1.UpdateServiceCommand({ cluster: clusterArn, service: serviceArn, forceNewDeployment: true }));
        return `Forced a new ECS deployment (rolling restart) for ${serviceArn.split("/").pop()}.`;
    }
    if (fixAction === "s3_block_public_access") {
        const client = new client_s3_1.S3Client({ region: auth.region, credentials: auth.credentials });
        await client.send(new client_s3_1.PutPublicAccessBlockCommand({
            Bucket: resourceId,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true,
            },
        }));
        return `Enabled S3 Block Public Access on bucket "${resourceId}".`;
    }
    throw new Error(`No automated remediation is implemented for action "${fixAction}" yet.`);
}
