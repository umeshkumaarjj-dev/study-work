"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySolution = verifySolution;
const claudeClient_1 = require("./claudeClient");
const chatService_1 = require("./chatService");
const SYSTEM_PROMPT = `You are reviewing a proposed fix for a known issue in a self-healing cloud automation
platform. You will be given the original problem (title, root cause, raw log), the AI's previously
proposed fix, and a solution submitted by a human user (as text, an image, or a document) who says
they've encountered and solved this exact problem before.

Compare the two for correctness and precision for THIS SPECIFIC problem. A user's real-world,
previously-verified experience can be more trustworthy than a first-pass AI diagnosis - do not
automatically favor the AI's answer just because it came first. If the user's solution is vague,
irrelevant, or clearly wrong, say so and keep the AI's fix. Call submit_verdict exactly once.`;
const VERDICT_TOOL = {
    name: "submit_verdict",
    description: "Submit the comparison verdict between the AI-diagnosed fix and the user-submitted solution.",
    input_schema: {
        type: "object",
        properties: {
            verdict: {
                type: "string",
                enum: ["user_better", "ai_better", "equivalent"],
                description: "user_better: the user's solution is more correct/precise. ai_better: the AI's original fix should stand. equivalent: both are valid, the user's is confirmed correct too.",
            },
            explanation: { type: "string", description: "2-4 sentences explaining the comparison and decision." },
            recommendedFixSummary: {
                type: "string",
                description: "One-sentence summary of the fix that should be recorded as the final fix (whichever wins, or a merge of both).",
            },
            recommendedFixDetail: { type: "string", description: "Full detail of the fix that should be recorded (diff or steps)." },
        },
        required: ["verdict", "explanation", "recommendedFixSummary", "recommendedFixDetail"],
    },
};
async function verifySolution(params) {
    const { blocks, inlineText } = params.attachment ? (0, chatService_1.attachmentContentBlocks)(params.attachment) : { blocks: undefined, inlineText: undefined };
    const promptText = `Problem: ${params.title}
Root cause (AI diagnosis): ${params.rootCause || "Not yet diagnosed"}
Raw log/error:
${params.rawLog}

AI's proposed fix summary: ${params.aiFixSummary || "None yet"}
AI's proposed fix detail:
${params.aiFixDetail || "None yet"}

User's note: ${params.userNote || "(no additional note provided)"}
${inlineText ? `User's attached solution (file content):\n${inlineText}` : params.attachment ? `User attached a file: ${params.attachment.name} (see attached content).` : "(no file attached, judge from the note only)"}`;
    const content = blocks ? [...blocks, { type: "text", text: promptText }] : promptText;
    const response = await claudeClient_1.claude.messages.create({
        model: claudeClient_1.MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [VERDICT_TOOL],
        tool_choice: { type: "tool", name: "submit_verdict" },
        messages: [{ role: "user", content }],
    });
    (0, claudeClient_1.assertValidBedrockResponse)(response);
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse)
        throw new Error("The model did not return a verdict.");
    const input = toolUse.input;
    const verdict = ["user_better", "ai_better", "equivalent"].includes(input.verdict)
        ? input.verdict
        : "ai_better";
    return {
        verdict,
        explanation: input.explanation || "No explanation provided.",
        recommendedFixSummary: input.recommendedFixSummary || params.aiFixSummary || "No fix summary.",
        recommendedFixDetail: input.recommendedFixDetail || params.aiFixDetail || "",
    };
}
