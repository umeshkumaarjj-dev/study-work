"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentContentBlocks = attachmentContentBlocks;
exports.chat = chat;
const claudeClient_1 = require("./claudeClient");
const db_1 = require("../db");
const serialize_1 = require("../serialize");
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB decoded
/**
 * Turns a ChatAttachment into either Claude content blocks (image/document) or
 * decoded inline text (plain text files). Shared between the general chat
 * endpoint and the solution-verification flow so both handle attachments
 * identically.
 */
function attachmentContentBlocks(attachment) {
    const decodedBytes = Math.floor((attachment.data.length * 3) / 4);
    if (decodedBytes > MAX_ATTACHMENT_BYTES) {
        throw new Error(`Attachment is too large (max ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB).`);
    }
    if (attachment.kind === "image") {
        if (!IMAGE_TYPES.has(attachment.mediaType)) {
            throw new Error(`Unsupported image type: ${attachment.mediaType}. Use PNG, JPEG, GIF, or WebP.`);
        }
        return {
            blocks: [
                { type: "image", source: { type: "base64", media_type: attachment.mediaType, data: attachment.data } },
            ],
        };
    }
    if (attachment.kind === "document") {
        if (attachment.mediaType !== "application/pdf") {
            throw new Error(`Unsupported document type: ${attachment.mediaType}. Only PDF is supported for document attachments.`);
        }
        return {
            blocks: [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } }],
        };
    }
    if (!TEXT_TYPES.has(attachment.mediaType) && !attachment.mediaType.startsWith("text/")) {
        throw new Error(`Unsupported file type: ${attachment.mediaType}. Use an image, PDF, or plain text file.`);
    }
    return { inlineText: Buffer.from(attachment.data, "base64").toString("utf-8") };
}
function buildUserContent(message, attachment) {
    if (!attachment)
        return message;
    const { blocks, inlineText } = attachmentContentBlocks(attachment);
    if (blocks) {
        return [...blocks, { type: "text", text: message || `Describe or analyze this file (${attachment.name}).` }];
    }
    return `${message}\n\n[Attached file: ${attachment.name}]\n${inlineText}`;
}
const SYSTEM_PROMPT = `You are the assistant embedded in a self-healing cloud automation dashboard.
You cover BOTH sides of the platform equally: the SCM/CI-CD pipeline (GitHub, Actions, Docker builds,
Terraform plan/apply) and AWS infrastructure (ECS, EKS, Lambda, RDS, S3, and more). Don't favor one side -
if the user asks about their repo, pipeline, or SCM connection, answer that as directly and thoroughly as
an AWS infrastructure question.

You help the user understand issues detected on either side: what was detected, the AI's root cause
analysis, the proposed or applied fix, severity, and approval status. You can also tell the user whether
their SCM (GitHub) and AWS accounts are currently connected, and a masked summary of each connection.

When the user names a specific resource (e.g. "splitz-eus1-dev-ecs"), use query_events with that name as
searchText to find matching issues - resource names usually appear in the event title or service field.

Always call a tool to look up real data before answering any question about specific events, counts,
history, or connection status - never guess or invent incidents. If a tool returns nothing relevant, say
so plainly. Be concise and reference actual titles, severities, and statuses from the tool results.`;
const QUERY_EVENTS_TOOL = {
    name: "query_events",
    description: "Search the platform's detected-issue history across both SCM/CI-CD and AWS infra, optionally filtered.",
    input_schema: {
        type: "object",
        properties: {
            pipeline: { type: "string", enum: ["CICD", "INFRA"], description: "Filter by pipeline type - CICD covers SCM/GitHub/Terraform" },
            status: {
                type: "string",
                enum: ["detected", "diagnosing", "pending_approval", "auto_approved", "approved", "rejected", "fixing", "resolved", "failed"],
            },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            searchText: { type: "string", description: "Case-insensitive substring match against the event title or service name" },
            limit: { type: "number", description: "Max results to return, default 10, max 50" },
        },
    },
};
const CONNECTION_STATUS_TOOL = {
    name: "get_connection_status",
    description: "Check whether the SCM (GitHub) and/or AWS account are currently connected, with a masked summary of each.",
    input_schema: { type: "object", properties: {} },
};
const QUERY_ACTIVITY_TOOL = {
    name: "query_team_activity",
    description: "Lead-only: search the team activity log (who did what and when - approvals, rejections, resource checks, simulations, connections). Use this when asked what a specific person worked on, or for a date/date-range summary of team activity.",
    input_schema: {
        type: "object",
        properties: {
            userName: { type: "string", description: "Filter to one person's name (case-sensitive exact match as stored)." },
            from: { type: "string", description: "ISO date/time lower bound, inclusive." },
            to: { type: "string", description: "ISO date/time upper bound, inclusive." },
            limit: { type: "number", description: "Max results to return, default 20, max 100." },
        },
    },
};
async function runGetConnectionStatus() {
    const rows = await db_1.prisma.connection.findMany({ where: { type: { in: ["scm", "aws"] } } });
    const byType = new Map(rows.map((r) => [r.type, r]));
    const toInfo = (type) => {
        const row = byType.get(type);
        return { status: row?.status ?? "disconnected", summary: row?.summary ?? null, connectedAt: row?.connectedAt ?? null };
    };
    return { scm: toInfo("scm"), aws: toInfo("aws") };
}
async function runQueryEvents(input) {
    const where = {};
    if (input.pipeline)
        where.pipeline = input.pipeline;
    if (input.status)
        where.status = input.status;
    if (input.severity)
        where.severity = input.severity;
    if (input.searchText) {
        where.OR = [{ title: { contains: input.searchText } }, { service: { contains: input.searchText } }];
    }
    const take = Math.min(Number(input.limit) || 10, 50);
    const rows = await db_1.prisma.errorEvent.findMany({ where, orderBy: { createdAt: "desc" }, take });
    return rows.map((row) => {
        const event = (0, serialize_1.toApiErrorEvent)(row);
        return {
            id: event.id,
            pipeline: event.pipeline,
            title: event.title,
            service: event.service,
            severity: event.severity,
            status: event.status,
            rootCause: event.rootCause,
            fixSummary: event.fixSummary,
            origin: event.origin,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
        };
    });
}
async function runQueryActivity(input) {
    const where = {};
    if (input.userName)
        where.userName = input.userName;
    if (input.from || input.to) {
        where.createdAt = {};
        if (input.from)
            where.createdAt.gte = new Date(input.from);
        if (input.to)
            where.createdAt.lte = new Date(input.to);
    }
    const take = Math.min(Number(input.limit) || 20, 100);
    const rows = await db_1.prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, take });
    return rows.map((r) => ({
        userName: r.userName,
        action: r.action,
        targetLabel: r.targetLabel,
        details: r.details,
        at: r.createdAt,
    }));
}
async function chat(message, history, attachment, role = "resource") {
    const messages = [
        ...history.slice(-20).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: buildUserContent(message, attachment) },
    ];
    const isLead = role === "lead";
    const tools = isLead ? [QUERY_EVENTS_TOOL, CONNECTION_STATUS_TOOL, QUERY_ACTIVITY_TOOL] : [QUERY_EVENTS_TOOL, CONNECTION_STATUS_TOOL];
    const system = isLead
        ? `${SYSTEM_PROMPT}\n\nYou are talking to a LEAD. They can also ask what a specific team member worked on, or for a\nsummary of team activity over a date range - use query_team_activity for those questions.`
        : SYSTEM_PROMPT;
    const relatedErrors = [];
    const addRelated = (id, title) => {
        if (typeof id === "string" && typeof title === "string" && !relatedErrors.some((e) => e.id === id)) {
            relatedErrors.push({ id, title });
        }
    };
    for (let iteration = 0; iteration < 4; iteration++) {
        const response = await claudeClient_1.claude.messages.create({
            model: claudeClient_1.MODEL,
            max_tokens: 1024,
            system,
            tools,
            messages,
        });
        (0, claudeClient_1.assertValidBedrockResponse)(response);
        if (response.stop_reason !== "tool_use") {
            const text = response.content.find((b) => b.type === "text");
            return { reply: text?.text || "I don't have a specific answer for that.", relatedErrors };
        }
        messages.push({ role: "assistant", content: response.content });
        const toolUses = response.content.filter((b) => b.type === "tool_use");
        const toolResults = [];
        for (const use of toolUses) {
            if (use.name === "get_connection_status") {
                const result = await runGetConnectionStatus();
                toolResults.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
            }
            else if (use.name === "query_team_activity") {
                const result = await runQueryActivity(use.input);
                toolResults.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
            }
            else {
                const result = await runQueryEvents(use.input);
                for (const r of result)
                    addRelated(r.id, r.title);
                toolResults.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
            }
        }
        messages.push({ role: "user", content: toolResults });
    }
    return { reply: "I looked into it but couldn't reach a final answer - try rephrasing with more specifics.", relatedErrors };
}
