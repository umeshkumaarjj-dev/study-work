"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const activityLog_1 = require("../engine/activityLog");
exports.connectionsRouter = (0, express_1.Router)();
function mask(value, keep = 4) {
    if (value.length <= keep * 2)
        return "*".repeat(Math.max(value.length, 4));
    return `${value.slice(0, keep)}${"*".repeat(6)}${value.slice(-keep)}`;
}
async function connectionResponse(userId) {
    const rows = await db_1.prisma.connection.findMany({ where: { userId, type: { in: ["scm", "aws"] } } });
    const byType = new Map(rows.map((r) => [r.type, r]));
    const toInfo = (type) => {
        const row = byType.get(type);
        return {
            status: row?.status ?? "disconnected",
            summary: row?.summary ?? null,
            connectedAt: row?.connectedAt ?? null,
        };
    };
    return { scm: toInfo("scm"), aws: toInfo("aws") };
}
exports.connectionsRouter.get("/", async (req, res) => {
    res.json(await connectionResponse(req.user.id));
});
exports.connectionsRouter.post("/scm", async (req, res) => {
    const { patToken, repoUrl } = req.body || {};
    if (!patToken || typeof patToken !== "string" || patToken.trim().length < 8) {
        res.status(400).json({ error: "A valid personal access token is required." });
        return;
    }
    if (!repoUrl || typeof repoUrl !== "string" || !repoUrl.includes("/")) {
        res.status(400).json({ error: "A valid repository URL (owner/repo or full URL) is required." });
        return;
    }
    const summary = `GitHub - ${repoUrl} (token ${mask(patToken)})`;
    const userId = req.user.id;
    await db_1.prisma.connection.upsert({
        where: { userId_type: { userId, type: "scm" } },
        create: {
            userId,
            type: "scm",
            status: "connected",
            summary,
            config: JSON.stringify({ provider: "github", patToken, repoUrl }),
            connectedAt: new Date(),
        },
        update: {
            status: "connected",
            summary,
            config: JSON.stringify({ provider: "github", patToken, repoUrl }),
            connectedAt: new Date(),
        },
    });
    await (0, activityLog_1.logActivity)(req.user, "connected_scm", repoUrl);
    res.json(await connectionResponse(userId));
});
exports.connectionsRouter.post("/aws", async (req, res) => {
    const body = req.body || {};
    const { authMethod, region } = body;
    if (!region || typeof region !== "string") {
        res.status(400).json({ error: "AWS region is required." });
        return;
    }
    let summary;
    let config;
    if (authMethod === "keys") {
        const { accessKeyId, secretAccessKey } = body;
        if (!accessKeyId || !secretAccessKey) {
            res.status(400).json({ error: "Access key ID and secret access key are required." });
            return;
        }
        summary = `Access Keys - ${mask(accessKeyId)} (${region})`;
        config = { authMethod, accessKeyId, secretAccessKey, region };
    }
    else if (authMethod === "role") {
        const { roleArn, externalId } = body;
        if (!roleArn || typeof roleArn !== "string" || !roleArn.startsWith("arn:aws:iam::")) {
            res.status(400).json({ error: "A valid IAM role ARN is required (arn:aws:iam::...)." });
            return;
        }
        summary = `IAM Role - ${roleArn} (${region})`;
        config = { authMethod, roleArn, externalId: externalId || null, region };
    }
    else if (authMethod === "sso") {
        const { ssoStartUrl, ssoAccountId, ssoRoleName } = body;
        if (!ssoStartUrl || !ssoAccountId || !ssoRoleName) {
            res.status(400).json({ error: "SSO start URL, account ID, and role name are required." });
            return;
        }
        summary = `AWS SSO - account ${ssoAccountId} / role ${ssoRoleName} (${region})`;
        config = { authMethod, ssoStartUrl, ssoAccountId, ssoRoleName, region };
    }
    else {
        res.status(400).json({ error: "authMethod must be one of: keys, role, sso." });
        return;
    }
    const userId = req.user.id;
    await db_1.prisma.connection.upsert({
        where: { userId_type: { userId, type: "aws" } },
        create: { userId, type: "aws", status: "connected", summary, config: JSON.stringify(config), connectedAt: new Date() },
        update: { status: "connected", summary, config: JSON.stringify(config), connectedAt: new Date() },
    });
    await (0, activityLog_1.logActivity)(req.user, "connected_aws", summary);
    res.json(await connectionResponse(userId));
});
exports.connectionsRouter.delete("/:type", async (req, res) => {
    const { type } = req.params;
    if (type !== "scm" && type !== "aws") {
        res.status(400).json({ error: "type must be scm or aws." });
        return;
    }
    const userId = req.user.id;
    await db_1.prisma.connection.upsert({
        where: { userId_type: { userId, type } },
        create: { userId, type, status: "disconnected" },
        update: { status: "disconnected", summary: null, config: null, connectedAt: null },
    });
    await (0, activityLog_1.logActivity)(req.user, `disconnected_${type}`, type);
    res.json(await connectionResponse(userId));
});
