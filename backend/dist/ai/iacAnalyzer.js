"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeIacFile = analyzeIacFile;
const claudeClient_1 = require("./claudeClient");
const SEVERITY_VALUES = ["low", "medium", "high", "critical"];
const SYSTEM_PROMPT = `You are a Terraform/IaC reviewer inside a self-healing cloud automation platform.
You are given the full contents of a single Terraform file (.tf, .tfvars, or .tf.json) from a repository.
Carefully check it for real problems: HCL syntax errors, invalid or undefined resource/variable references,
missing required arguments, type mismatches, hardcoded secrets, or configuration that would fail "terraform plan/apply".

Do NOT invent problems. If the file looks syntactically valid and reasonably safe, report hasError: false.
Only report hasError: true for a concrete, specific issue you can point to in this file's content.

Always respond by calling the submit_iac_review tool exactly once.`;
const IAC_REVIEW_TOOL = {
    name: "submit_iac_review",
    description: "Submit the review verdict for a single Terraform/IaC file.",
    input_schema: {
        type: "object",
        properties: {
            hasError: { type: "boolean", description: "True only if there is a concrete, specific problem in this file." },
            rootCause: { type: "string", description: "2-4 sentence explanation of the problem (empty string if hasError is false)." },
            severity: { type: "string", enum: SEVERITY_VALUES },
            fixSummary: { type: "string", description: "One sentence summary of the proposed fix (empty string if hasError is false)." },
            fixDetail: {
                type: "string",
                description: "A small unified diff against this file's content that fixes the problem. Plain text, no markdown fences. Empty string if hasError is false.",
            },
        },
        required: ["hasError", "rootCause", "severity", "fixSummary", "fixDetail"],
    },
};
async function analyzeIacFile(path, content) {
    const response = await claudeClient_1.claude.messages.create({
        model: claudeClient_1.MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [IAC_REVIEW_TOOL],
        tool_choice: { type: "tool", name: "submit_iac_review" },
        messages: [{ role: "user", content: `File: ${path}\n\n${content.slice(0, 12000)}` }],
    });
    (0, claudeClient_1.assertValidBedrockResponse)(response);
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse)
        throw new Error("Model did not return an IaC review.");
    const input = toolUse.input;
    if (!input.hasError)
        return { hasError: false, diagnosis: null };
    const severity = SEVERITY_VALUES.includes(input.severity) ? input.severity : "medium";
    return {
        hasError: true,
        diagnosis: {
            service: path,
            rootCause: input.rootCause || "The model flagged an issue but did not explain it.",
            severity,
            fixType: "code_diff",
            fixSummary: input.fixSummary || "No fix summary provided.",
            fixDetail: input.fixDetail || "",
        },
    };
}
