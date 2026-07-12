"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claude = exports.MODEL = void 0;
exports.assertValidBedrockResponse = assertValidBedrockResponse;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
// Claude via Amazon Bedrock, not the direct Anthropic API - billed through AWS,
// authenticated with AWS credentials instead of an ANTHROPIC_API_KEY.
//
// This talks to Bedrock's native Converse API directly via @aws-sdk/client-bedrock-runtime
// rather than @anthropic-ai/bedrock-sdk: that package (v0.32.0, latest as of writing) signs
// its requests with SigV4 service name "bedrock" instead of "bedrock-runtime", which AWS
// rejects with a generic UnknownOperationException - verified directly against this account.
// The functions below adapt the Anthropic Messages API shape (used by diagnosisService.ts,
// chatService.ts, iacAnalyzer.ts, solutionVerifier.ts) to/from Bedrock's Converse shape so none
// of those files need to know which transport is underneath.
//
// Credentials: if BEDROCK_AWS_ACCESS_KEY_ID/BEDROCK_AWS_SECRET_ACCESS_KEY aren't set, this falls
// back to the standard AWS credential provider chain (env vars, a shared ~/.aws/credentials
// profile, or an EC2/ECS/Lambda instance role). This is a single, server-level credential for
// the AI backend itself - separate from each user's own "Connect AWS" connection (used to browse
// *their* infra, see aws/credentials.ts).
const region = process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION;
if (!region) {
    console.warn("[ai] BEDROCK_AWS_REGION (or AWS_REGION) is not set - Bedrock calls will fail. Set it in backend/.env.");
}
const awsAccessKey = process.env.BEDROCK_AWS_ACCESS_KEY_ID || undefined;
const awsSecretKey = process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || undefined;
if (!awsAccessKey || !awsSecretKey) {
    console.warn("[ai] BEDROCK_AWS_ACCESS_KEY_ID/BEDROCK_AWS_SECRET_ACCESS_KEY not set - falling back to the default AWS credential chain.");
}
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({
    region: region || "us-east-1",
    credentials: awsAccessKey && awsSecretKey
        ? { accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey, sessionToken: process.env.BEDROCK_AWS_SESSION_TOKEN || undefined }
        : undefined,
});
// Bedrock model IDs differ from direct-API model names and depend on what your AWS account/
// region has been granted access to in the Bedrock console (Model access page). Newer Claude
// models only support on-demand invocation via a cross-region inference profile ID ("us."
// prefix) rather than the bare model ID - verify/update this against what's enabled for you.
exports.MODEL = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-sonnet-4-5-20250929-v1:0";
function imageFormat(mediaType) {
    const fmt = mediaType.split("/")[1];
    return fmt === "jpeg" || fmt === "png" || fmt === "gif" || fmt === "webp" ? fmt : "png";
}
function toConverseContentBlock(block) {
    const b = block;
    if (b.type === "text")
        return { text: b.text };
    if (b.type === "image") {
        const source = b.source;
        return {
            image: { format: imageFormat(source.media_type), source: { bytes: Buffer.from(source.data, "base64") } },
        };
    }
    if (b.type === "document") {
        const source = b.source;
        return {
            document: { format: "pdf", name: "attachment", source: { bytes: Buffer.from(source.data, "base64") } },
        };
    }
    if (b.type === "tool_use") {
        return { toolUse: { toolUseId: b.id, name: b.name, input: b.input } };
    }
    if (b.type === "tool_result") {
        const resultContent = b.content;
        return {
            toolResult: {
                toolUseId: b.tool_use_id,
                content: typeof resultContent === "string" ? [{ text: resultContent }] : resultContent,
            },
        };
    }
    return { text: JSON.stringify(b) };
}
function toConverseMessage(m) {
    const content = typeof m.content === "string" ? [{ text: m.content }] : m.content.map(toConverseContentBlock);
    return { role: m.role, content };
}
exports.claude = {
    messages: {
        async create(params) {
            const command = new client_bedrock_runtime_1.ConverseCommand({
                modelId: params.model,
                system: params.system ? [{ text: params.system }] : undefined,
                messages: params.messages.map(toConverseMessage),
                inferenceConfig: { maxTokens: params.max_tokens },
                toolConfig: params.tools?.length
                    ? {
                        tools: params.tools.map((t) => ({
                            toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.input_schema } },
                        })),
                        toolChoice: params.tool_choice ? { tool: { name: params.tool_choice.name } } : { auto: {} },
                    }
                    : undefined,
            });
            const res = await bedrockClient.send(command);
            const outBlocks = res.output?.message?.content || [];
            const content = outBlocks.map((b) => {
                if (b.text != null) {
                    return { type: "text", text: b.text, citations: null };
                }
                if (b.toolUse) {
                    return {
                        type: "tool_use",
                        id: b.toolUse.toolUseId,
                        name: b.toolUse.name,
                        input: b.toolUse.input,
                    };
                }
                return { type: "text", text: "", citations: null };
            });
            return { content, stop_reason: res.stopReason ?? null };
        },
    },
};
/**
 * Defensive guard against a malformed/empty response reaching the calling
 * code's `response.content.find(...)` - see history in this file for why.
 */
function assertValidBedrockResponse(response) {
    const content = response?.content;
    if (!Array.isArray(content)) {
        throw new Error(`Bedrock did not return a valid Claude response (got ${JSON.stringify(response).slice(0, 200)}). ` +
            "Check BEDROCK_AWS_REGION, BEDROCK_AWS_ACCESS_KEY_ID/SECRET, and that BEDROCK_MODEL_ID is enabled under Bedrock > Model access in the AWS console, in backend/.env.");
    }
}
