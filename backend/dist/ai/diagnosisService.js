"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnose = diagnose;
const claudeClient_1 = require("./claudeClient");
const SEVERITY_VALUES = ["low", "medium", "high", "critical"];
const SYSTEM_PROMPT = `You are the diagnosis engine inside a self-healing cloud automation platform.
You are given a raw error/log excerpt from either a CI/CD pipeline (GitHub Actions, Docker build, Terraform plan/apply)
or a live AWS infrastructure service (ECS, EKS, Lambda, RDS, S3, etc).

Classify severity using this rubric:
- "low": isolated/non-prod issue, no user impact, trivially and safely auto-fixable (e.g. a flaky test, a missing lockfile, a non-prod bucket permission).
- "medium": blocks a pipeline or degrades a non-critical path, contained blast radius, but the fix should be reviewed before applying.
- "high": a production service is degraded or a deploy is blocked with real risk, fix requires a meaningful infra/code change.
- "critical": active production outage, data loss risk, or broad user-facing impact right now.

Propose a concrete fix:
- fixType "code_diff" when the fix is a change to source/IaC/workflow code (produce a small unified diff in fixDetail).
- fixType "infra_action" when the fix is an operational action against live AWS resources (produce numbered remediation steps in fixDetail).

Always respond by calling the submit_diagnosis tool exactly once. Be specific and concise.`;
const DIAGNOSIS_TOOL = {
    name: "submit_diagnosis",
    description: "Submit the structured diagnosis and proposed fix for an infrastructure or CI/CD error.",
    input_schema: {
        type: "object",
        properties: {
            service: { type: "string", description: "The specific AWS/CI service most responsible for the error." },
            rootCause: { type: "string", description: "2-4 sentence explanation of the likely root cause." },
            severity: { type: "string", enum: SEVERITY_VALUES },
            fixType: { type: "string", enum: ["code_diff", "infra_action"] },
            fixSummary: { type: "string", description: "One sentence summary of the proposed fix." },
            fixDetail: {
                type: "string",
                description: "For code_diff: a small unified diff. For infra_action: numbered remediation steps. Plain text, no markdown fences.",
            },
        },
        required: ["service", "rootCause", "severity", "fixType", "fixSummary", "fixDetail"],
    },
};
async function diagnose(scenario) {
    const response = await claudeClient_1.claude.messages.create({
        model: claudeClient_1.MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [DIAGNOSIS_TOOL],
        tool_choice: { type: "tool", name: "submit_diagnosis" },
        messages: [
            {
                role: "user",
                content: `Pipeline: ${scenario.pipeline}\nTitle: ${scenario.title}\nService: ${scenario.service}\n\nRaw log/error:\n${scenario.rawLog}`,
            },
        ],
    });
    (0, claudeClient_1.assertValidBedrockResponse)(response);
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse) {
        throw new Error("Model did not return a diagnosis");
    }
    const input = toolUse.input;
    const severity = SEVERITY_VALUES.includes(input.severity)
        ? input.severity
        : "medium";
    return {
        service: input.service || scenario.service,
        rootCause: input.rootCause || "The model did not provide a root cause.",
        severity,
        fixType: input.fixType === "infra_action" ? "infra_action" : "code_diff",
        fixSummary: input.fixSummary || "No fix summary provided.",
        fixDetail: input.fixDetail || "",
    };
}
