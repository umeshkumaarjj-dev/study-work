"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const eventStore_1 = require("../engine/eventStore");
const activityLog_1 = require("../engine/activityLog");
const chatService_1 = require("../ai/chatService");
const solutionVerifier_1 = require("../ai/solutionVerifier");
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.post("/", async (req, res) => {
    const { message, history, attachment } = req.body || {};
    if ((!message || typeof message !== "string") && !attachment) {
        res.status(400).json({ error: "message is required" });
        return;
    }
    try {
        const result = await (0, chatService_1.chat)(message || "", Array.isArray(history) ? history : [], attachment ?? null, req.user.role);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// The user claims to already know a working fix for a specific, previously-seen
// problem and uploads it (text note, image, or document). Claude compares it
// against the AI's own proposed fix for that exact ErrorEvent; if the user's
// solution wins (or is confirmed equally valid), it's recorded as the fix and
// the issue is marked resolved - otherwise the existing fix/approval flow is
// left untouched.
exports.chatRouter.post("/verify-solution", async (req, res) => {
    const { errorEventId, attachment, note } = req.body || {};
    if (!errorEventId || typeof errorEventId !== "string") {
        res.status(400).json({ error: "errorEventId is required" });
        return;
    }
    try {
        const errorEvent = await db_1.prisma.errorEvent.findUnique({ where: { id: errorEventId } });
        if (!errorEvent) {
            res.status(404).json({ error: "That event no longer exists." });
            return;
        }
        const verdict = await (0, solutionVerifier_1.verifySolution)({
            title: errorEvent.title,
            rootCause: errorEvent.rootCause,
            rawLog: errorEvent.rawLog,
            aiFixSummary: errorEvent.fixSummary,
            aiFixDetail: errorEvent.fixDetail,
            userNote: typeof note === "string" ? note : "",
            attachment: attachment ?? null,
        });
        await (0, eventStore_1.addTimeline)(errorEventId, `User submitted a proposed solution for review${note ? `: "${note}"` : "."}`, "user");
        await (0, eventStore_1.addTimeline)(errorEventId, `AI comparison verdict: ${verdict.verdict} - ${verdict.explanation}`, "ai");
        const updated = verdict.verdict === "user_better" || verdict.verdict === "equivalent";
        if (updated) {
            await db_1.prisma.errorEvent.update({
                where: { id: errorEventId },
                data: {
                    fixSummary: verdict.recommendedFixSummary,
                    fixDetail: verdict.recommendedFixDetail,
                    status: "resolved",
                },
            });
            await (0, eventStore_1.addTimeline)(errorEventId, "User-verified solution accepted and applied as the fix. Marked resolved.", "system");
            await (0, activityLog_1.logActivity)(req.user, "accepted_user_solution", errorEvent.title, { errorEventId });
        }
        const reply = verdict.verdict === "user_better"
            ? `The solution you provided is correct! ${verdict.explanation} I've recorded it as the fix for "${errorEvent.title}" and marked it resolved.`
            : verdict.verdict === "equivalent"
                ? `Your solution checks out. ${verdict.explanation} I've recorded it as the fix for "${errorEvent.title}" and marked it resolved.`
                : `Thanks for sharing that, but the existing proposed fix looks more precise for this specific problem. ${verdict.explanation} I've kept the original fix in place - you can still approve/reject it from the event.`;
        res.json({ reply, verdict: verdict.verdict, updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
