"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTimeline = addTimeline;
const db_1 = require("../db");
async function addTimeline(errorEventId, message, actor) {
    await db_1.prisma.timelineEntry.create({ data: { errorEventId, message, actor } });
}
