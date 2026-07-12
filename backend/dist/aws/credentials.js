"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAwsAuth = getAwsAuth;
const credential_providers_1 = require("@aws-sdk/credential-providers");
const credential_provider_sso_1 = require("@aws-sdk/credential-provider-sso");
const db_1 = require("../db");
async function getAwsAuth(userId) {
    const row = await db_1.prisma.connection.findUnique({ where: { userId_type: { userId, type: "aws" } } });
    if (!row || row.status !== "connected" || !row.config) {
        throw new Error("AWS is not connected. Use the \"Connect AWS\" button first.");
    }
    const config = JSON.parse(row.config);
    const region = config.region;
    if (config.authMethod === "keys") {
        if (!config.accessKeyId || !config.secretAccessKey) {
            throw new Error("Stored AWS access key credentials are incomplete.");
        }
        return {
            region,
            credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        };
    }
    if (config.authMethod === "role") {
        if (!config.roleArn)
            throw new Error("Stored AWS role connection is missing a role ARN.");
        return {
            region,
            // Assumes the role using the server's own ambient credentials (env vars, shared
            // config/profile, or instance/task role) as the base identity - the standard
            // pattern for role-based AWS access. Requires that base identity to exist wherever
            // this backend runs and to be trusted by the target role.
            credentials: (0, credential_providers_1.fromTemporaryCredentials)({
                params: {
                    RoleArn: config.roleArn,
                    ExternalId: config.externalId || undefined,
                    RoleSessionName: "self-healing-cloud-automation",
                },
                clientConfig: { region },
            }),
        };
    }
    if (config.authMethod === "sso") {
        if (!config.ssoStartUrl || !config.ssoAccountId || !config.ssoRoleName) {
            throw new Error("Stored AWS SSO connection is incomplete.");
        }
        return {
            region,
            // Requires an active `aws sso login` session on this machine for the same start
            // URL/account/role - the SDK reads the cached SSO token, it does not perform the
            // browser login itself.
            credentials: (0, credential_provider_sso_1.fromSSO)({
                ssoStartUrl: config.ssoStartUrl,
                ssoAccountId: config.ssoAccountId,
                ssoRegion: region,
                ssoRoleName: config.ssoRoleName,
            }),
        };
    }
    throw new Error(`Unsupported AWS auth method: ${config.authMethod}`);
}
