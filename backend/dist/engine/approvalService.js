"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveError = approveError;
exports.rejectError = rejectError;
const db_1 = require("../db");
const errorPipeline_1 = require("./errorPipeline");
const eventStore_1 = require("./eventStore");
async function approveError(errorId, actorName = "user", userId) {
    const errorEvent = await db_1.prisma.errorEvent.findUnique({ where: { id: errorId } });
    if (!errorEvent)
        throw new Error("Error event not found");
    if (errorEvent.status !== "pending_approval") {
        throw new Error(`Cannot approve an error event in status "${errorEvent.status}"`);
    }
    await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "approved" } });
    await (0, eventStore_1.addTimeline)(errorId, `Fix approved by ${actorName}.`, "user");
    // Real AWS/GitHub fixes run using the approving user's own connected
    // credentials, not necessarily whoever originally triggered the check.
    await (0, errorPipeline_1.applyFix)(errorId, userId);
    return errorEvent;
}
async function rejectError(errorId, actorName = "user") {
    const errorEvent = await db_1.prisma.errorEvent.findUnique({ where: { id: errorId } });
    if (!errorEvent)
        throw new Error("Error event not found");
    if (errorEvent.status !== "pending_approval") {
        throw new Error(`Cannot reject an error event in status "${errorEvent.status}"`);
    }
    await db_1.prisma.errorEvent.update({ where: { id: errorId }, data: { status: "rejected" } });
    await (0, eventStore_1.addTimeline)(errorId, `Fix rejected by ${actorName}.`, "user");
    return errorEvent;
}
