"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
const db_1 = require("../db");
async function logActivity(user, action, targetLabel, opts) {
    await db_1.prisma.activityLog.create({
        data: {
            userId: user.id,
            userName: user.name,
            action,
            targetLabel,
            errorEventId: opts?.errorEventId ?? null,
            details: opts?.details ?? null,
        },
    });
}
