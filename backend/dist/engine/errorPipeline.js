"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerScenario = triggerScenario;
exports.triggerAwsResourceIssue = triggerAwsResourceIssue;
exports.triggerScmResourceIssue = triggerScmResourceIssue;
exports.triggerScmResourceIssueWithDiagnosis = triggerScmResourceIssueWithDiagnosis;
exports.applyFix = applyFix;
const db_1 = require("../db");
const diagnosisService_1 = require("../ai/diagnosisService");
const scenarios_1 = require("../simulator/scenarios");
const MockScmProvider_1 = require("../providers/scm/MockScmProvider");
const MockCloudProvider_1 = require("../providers/cloud/MockCloudProvider");
const credentials_1 = require("../aws/credentials");
const fixes_1 = require("../aws/fixes");
const github_1 = require("../scm/github");
const fixes_2 = require("../scm/fixes");
const eventStore_1 = require("./eventStore");
const scmProvider = new MockScmProvider_1.MockScmProvider();
const cloudProvider = new MockCloudProvider_1.MockCloudProvider();
const ACTIVE_STATUSES = ["detected", "diagnosing", "pending_approval", "auto_approved", "approved", "fixing"];
// Diagnosis (and, for auto-approved low-severity issues, the fix itself) always
// completes before the triggering request returns - there's no push channel to
// notify the frontend afterwards (see api/client.ts polling), and on Lambda
// nothing is guaranteed to run once a response has been sent anyway.
async function triggerScenario(scenarioKey, userId) {
    const scenario = scenarios_1.SCENARIOS[scenarioKey];
    if (!scenario)
        throw new Error(`Unknown scenario: ${scenarioKey}`);
    const errorEvent = await db_1.prisma.errorEvent.create({
        data: {
            pipeline: scenario.pipeline,
            scenarioKey: scenario.key,
            nodeIds: JSON.stringify(scenario.nodeIds),
            title: scenario.title,
            service: scenario.service,
            rawLog: scenario.rawLog,
            status: "detected",
            origin: "simulated",
            userId,
        },
    });
    await (0, eventStore_1.addTimeline)(errorEvent.id, `Error detected: ${scenario.title}`, "system");
    await processDiagnosis(errorEvent.id, scenario, "simulated");
    return (await db_1.prisma.errorEvent.findUniqueOrThrow({ where: { id: errorEvent.id } }));
}
/**
 * Called when a user selects a real AWS resource and its live health check comes
 * back non-healthy. Reuses an existing active error for the same resource instead
 * of creating duplicates on repeated checks.
 */
async function triggerAwsResourceIssue(service, resourceId, detail, userId) {
    const existing = await db_1.prisma.errorEvent.findFirst({
        where: { awsServiceKey: service, awsResourceId: resourceId, status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: "desc" },
    });
    if (existing)
        return existing;
    const title = `${detail.name}: ${detail.statusLabel}`;
    const rawLog = detail.details.map((d) => `${d.label}: ${d.value}`).join("\n");
    const errorEvent = await db_1.prisma.errorEvent.create({
        data: {
            pipeline: "INFRA",
            scenarioKey: `aws:${service}`,
            nodeIds: JSON.stringify([]),
            title,
            service: detail.subtitle || service,
            rawLog,
            status: "detected",
            origin: "aws_live",
            userId,
            awsServiceKey: service,
            awsResourceId: resourceId,
            fixAction: detail.fixAction ?? null,
        },
    });
    await (0, eventStore_1.addTimeline)(errorEvent.id, `Issue detected on real AWS resource: ${title}`, "system");
    await processDiagnosis(errorEvent.id, { pipeline: "INFRA", title, service: errorEvent.service, rawLog }, "aws_live");
    return db_1.prisma.errorEvent.findUniqueOrThrow({ where: { id: errorEvent.id } });
}
/**
 * Called when a user checks a real GitHub Actions workflow run and it turns out to
 * have failed. Reuses an existing active error for the same run instead of
 * creating duplicates on repeated checks - mirrors triggerAwsResourceIssue above.
 */
async function triggerScmResourceIssue(nodeKey, resourceId, detail, userId) {
    const existing = await db_1.prisma.errorEvent.findFirst({
        where: { scmNodeKey: nodeKey, scmResourceId: resourceId, status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: "desc" },
    });
    if (existing)
        return existing;
    const title = `${detail.name}: ${detail.statusLabel}`;
    const rawLog = detail.details.map((d) => `${d.label}: ${d.value}`).join("\n");
    const errorEvent = await db_1.prisma.errorEvent.create({
        data: {
            pipeline: "CICD",
            scenarioKey: `scm:${nodeKey}`,
            nodeIds: JSON.stringify([nodeKey]),
            title,
            service: detail.subtitle || nodeKey,
            rawLog,
            status: "detected",
            origin: "scm_live",
            userId,
            scmNodeKey: nodeKey,
            scmResourceId: resourceId,
            fixAction: detail.fixAction ?? null,
        },
    });
    await (0, eventStore_1.addTimeline)(errorEvent.id, `Issue detected on real GitHub resource: ${title}`, "system");
    await processDiagnosis(errorEvent.id, { pipeline: "CICD", title, service: errorEvent.service, rawLog }, "scm_live");
    return db_1.prisma.errorEvent.findUniqueOrThrow({ where: { id: errorEvent.id } });
}
/**
 * Called for a real GitHub resource where the diagnosis was already computed
 * synchronously as part of the health check itself (e.g. the AI already reviewed
 * a Terraform file's content) - skips the generic log-based diagnose() call that
 * triggerScmResourceIssue kicks off, since running it again on the same content
 * would be redundant and isn't what it's prompted for.
 */
async function triggerScmResourceIssueWithDiagnosis(nodeKey, resourceId, detail, diagnosis, userId) {
    const existing = await db_1.prisma.errorEvent.findFirst({
        where: { scmNodeKey: nodeKey, scmResourceId: resourceId, status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: "desc" },
    });
    if (existing)
        return existing;
    const title = `${detail.name}: ${detail.statusLabel}`;
    const rawLog = detail.details.map((d) => `${d.label}: ${d.value}`).join("\n");
    const errorEvent = await db_1.prisma.errorEvent.create({
        data: {
            pipeline: "CICD",
            scenarioKey: `scm:${nodeKey}`,
            nodeIds: JSON.stringify([nodeKey]),
            title,
            service: diagnosis.service,
            rawLog,
            rootCause: diagnosis.rootCause,
            severity: diagnosis.severity,
            fixType: diagnosis.fixType,
            fixSummary: diagnosis.fixSummary,
            fixDetail: diagnosis.fixDetail,
            status: "pending_approval",
            origin: "scm_live",
            userId,
            scmNodeKey: nodeKey,
            scmResourceId: resourceId,
            fixAction: detail.fixAction ?? null,
        },
    });
    await (0, eventStore_1.addTimeline)(errorEvent.id, `Issue detected on real GitHub resource: ${title}`, "system");
    await (0, eventStore_1.addTimeline)(errorEvent.id, `Diagnosis complete (severity: ${diagnosis.severity}). Proposed fix: ${diagnosis.fixSummary}`, "ai");
    await (0, eventStore_1.addTimeline)(errorEvent.id, "This is a real GitHub resource - waiting for human approval.", "system");
    return errorEvent;
}
async function processDiagnosis(errorId, scenario, origin) {
    await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "diagnosing" } });
    await (0, eventStore_1.addTimeline)(errorId, "Running AI diagnosis...", "system");
    let diagnosis;
    try {
        diagnosis = await (0, diagnosisService_1.diagnose)(scenario);
    }
    catch (err) {
        await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "failed" } });
        await (0, eventStore_1.addTimeline)(errorId, `Diagnosis failed: ${err.message}`, "system");
        return;
    }
    // Real AWS/SCM resources always require manual approval, regardless of severity.
    // Only simulated scenarios auto-apply low-severity fixes.
    const nextStatus = origin === "simulated" && diagnosis.severity === "low" ? "auto_approved" : "pending_approval";
    await db_1.prisma.errorEvent.update({
        where: { id: errorId },
        data: {
            service: diagnosis.service,
            rootCause: diagnosis.rootCause,
            severity: diagnosis.severity,
            fixType: diagnosis.fixType,
            fixSummary: diagnosis.fixSummary,
            fixDetail: diagnosis.fixDetail,
            status: nextStatus,
        },
    });
    await (0, eventStore_1.addTimeline)(errorId, `Diagnosis complete (severity: ${diagnosis.severity}). Proposed fix: ${diagnosis.fixSummary}`, "ai");
    if (nextStatus === "auto_approved") {
        await (0, eventStore_1.addTimeline)(errorId, "Severity is low - auto-approved for immediate fix.", "system");
        await applyFix(errorId);
    }
    else {
        const reason = origin === "aws_live"
            ? "This is a real AWS resource"
            : origin === "scm_live"
                ? "This is a real GitHub resource"
                : `Severity is ${diagnosis.severity}`;
        await (0, eventStore_1.addTimeline)(errorId, `${reason} - waiting for human approval.`, "system");
    }
}
async function applyFix(errorId, userId) {
    const errorEvent = await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "fixing" } });
    await (0, eventStore_1.addTimeline)(errorId, "Applying fix...", "system");
    try {
        if (errorEvent.origin === "aws_live") {
            if (!errorEvent.fixAction || !errorEvent.awsResourceId) {
                await (0, eventStore_1.addTimeline)(errorId, "No automated remediation is implemented for this resource type yet. Please apply the recommended fix above manually in the AWS console.", "system");
                await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "failed" } });
            }
            else {
                // aws_live/scm_live issues always require manual approval (see
                // processDiagnosis above), so applyFix always has a userId by the time it
                // reaches here - only the simulated auto-approve path calls it without one.
                if (!userId)
                    throw new Error("Cannot apply a real AWS fix without knowing which user's connection to use.");
                const auth = await (0, credentials_1.getAwsAuth)(userId);
                const message = await (0, fixes_1.executeRealFix)(auth, errorEvent.fixAction, errorEvent.awsResourceId);
                await (0, eventStore_1.addTimeline)(errorId, message, "aws-provider");
                await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "resolved" } });
                await (0, eventStore_1.addTimeline)(errorId, "Fix applied successfully on your real AWS resource. Marked resolved.", "system");
            }
        }
        else if (errorEvent.origin === "scm_live") {
            if (!errorEvent.fixAction || !errorEvent.scmResourceId) {
                await (0, eventStore_1.addTimeline)(errorId, "No automated remediation is implemented for this resource type yet. Please apply the recommended fix above manually on GitHub.", "system");
                await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "failed" } });
            }
            else {
                if (!userId)
                    throw new Error("Cannot apply a real GitHub fix without knowing which user's connection to use.");
                const auth = await (0, github_1.getGithubAuth)(userId);
                const message = await (0, fixes_2.executeRealScmFix)(auth, errorEvent.fixAction, errorEvent.scmResourceId);
                await (0, eventStore_1.addTimeline)(errorId, message, "scm-provider");
                await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "resolved" } });
                await (0, eventStore_1.addTimeline)(errorId, "Fix applied successfully on your real GitHub resource. Marked resolved.", "system");
            }
        }
        else if (errorEvent.fixType === "code_diff") {
            const result = await scmProvider.proposeFix({
                errorId,
                title: errorEvent.title,
                fixDiff: errorEvent.fixDetail || "",
            });
            await (0, eventStore_1.addTimeline)(errorId, result.message, "scm-provider");
            await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "resolved" } });
            await (0, eventStore_1.addTimeline)(errorId, "Fix applied successfully. Marked resolved.", "system");
        }
        else {
            const result = await cloudProvider.applyRemediation({
                errorId,
                service: errorEvent.service,
                title: errorEvent.title,
                fixSteps: errorEvent.fixDetail || "",
            });
            await (0, eventStore_1.addTimeline)(errorId, result.confirmation, "cloud-provider");
            await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "resolved" } });
            await (0, eventStore_1.addTimeline)(errorId, "Fix applied successfully. Marked resolved.", "system");
        }
    }
    catch (err) {
        await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "failed" } });
        await (0, eventStore_1.addTimeline)(errorId, `Fix failed: ${err.message}`, "system");
    }
}
