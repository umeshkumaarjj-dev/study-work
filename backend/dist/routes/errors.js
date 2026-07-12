"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const approvalService_1 = require("../engine/approvalService");
const activityLog_1 = require("../engine/activityLog");
const serialize_1 = require("../serialize");
exports.errorsRouter = (0, express_1.Router)();
exports.errorsRouter.get("/", async (req, res) => {
    const { awsServiceKey, awsResourceId, scmNodeKey, scmResourceId } = req.query;
    const extra = {};
    if (typeof awsServiceKey === "string")
        extra.awsServiceKey = awsServiceKey;
    if (typeof awsResourceId === "string")
        extra.awsResourceId = awsResourceId;
    if (typeof scmNodeKey === "string")
        extra.scmNodeKey = scmNodeKey;
    if (typeof scmResourceId === "string")
        extra.scmResourceId = scmResourceId;
    // Simulated events are a personal sandbox (only their creator sees them, and
    // they're wiped on that user's logout - see routes/auth.ts); real aws_live/
    // scm_live issues stay visible to the whole team regardless of who found them.
    const errors = await db_1.prisma.errorEvent.findMany({
        where: {
            ...extra,
            OR: [{ origin: { not: "simulated" } }, { origin: "simulated", userId: req.user.id }],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
    res.json(errors.map(serialize_1.toApiErrorEvent));
});
exports.errorsRouter.get("/:id", async (req, res) => {
    const errorEvent = await db_1.prisma.errorEvent.findUnique({
        where: { id: req.params.id },
        include: { timeline: { orderBy: { at: "asc" } } },
    });
    if (!errorEvent || (errorEvent.origin === "simulated" && errorEvent.userId !== req.user.id)) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json((0, serialize_1.toApiErrorEvent)(errorEvent));
});
exports.errorsRouter.post("/:id/approve", async (req, res) => {
    try {
        const errorEvent = await (0, approvalService_1.approveError)(req.params.id, req.user.name, req.user.id);
        await (0, activityLog_1.logActivity)(req.user, "approved_fix", errorEvent.title, { errorEventId: errorEvent.id });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.errorsRouter.post("/:id/reject", async (req, res) => {
    try {
        const errorEvent = await (0, approvalService_1.rejectError)(req.params.id, req.user.name);
        await (0, activityLog_1.logActivity)(req.user, "rejected_fix", errorEvent.title, { errorEventId: errorEvent.id });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
