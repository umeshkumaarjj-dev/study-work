"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const middleware_1 = require("../auth/middleware");
exports.activityRouter = (0, express_1.Router)();
// Lead-only: powers the History view and the lead chatbot's team-activity
// queries. Every meaningful action (approve/reject, real resource checks, fix
// application) is logged via engine/activityLog.ts as it happens.
exports.activityRouter.get("/", middleware_1.requireLead, async (req, res) => {
    const { userName, from, to } = req.query;
    const where = {};
    if (typeof userName === "string" && userName)
        where.userName = userName;
    if (typeof from === "string" || typeof to === "string") {
        where.createdAt = {};
        if (typeof from === "string")
            where.createdAt.gte = new Date(from);
        if (typeof to === "string")
            where.createdAt.lte = new Date(to);
    }
    const entries = await db_1.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 300,
    });
    res.json(entries);
});
