"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopologyState = getTopologyState;
const db_1 = require("../db");
const serialize_1 = require("../serialize");
const topology_1 = require("./topology");
const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const ACTIVE_STATUSES = [
    "detected",
    "diagnosing",
    "pending_approval",
    "auto_approved",
    "approved",
    "fixing",
];
function statusToNodeStatus(status) {
    if (status === "pending_approval")
        return "pending_approval";
    if (status === "fixing" || status === "approved" || status === "auto_approved")
        return "fixing";
    return "error"; // detected | diagnosing
}
async function getTopologyState() {
    const activeErrors = await db_1.prisma.errorEvent.findMany({
        where: { status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: "desc" },
    });
    const byNode = new Map();
    for (const err of activeErrors) {
        const nodeStatus = statusToNodeStatus(err.status);
        for (const nodeId of (0, serialize_1.parseNodeIds)(err.nodeIds)) {
            const existing = byNode.get(nodeId);
            const existingRank = existing?.severity ? SEVERITY_RANK[existing.severity] : -1;
            const currentRank = err.severity ? SEVERITY_RANK[err.severity] : 0;
            if (!existing || currentRank >= existingRank) {
                byNode.set(nodeId, {
                    errorId: err.id,
                    severity: err.severity ?? null,
                    status: nodeStatus,
                });
            }
        }
    }
    const nodes = topology_1.TOPOLOGY_NODES.map((node) => {
        const active = byNode.get(node.id);
        return {
            ...node,
            status: active?.status ?? "healthy",
            severity: active?.severity ?? null,
            activeErrorId: active?.errorId ?? null,
        };
    });
    return { groups: topology_1.TOPOLOGY_GROUPS, nodes, canvas: topology_1.CANVAS_SIZE };
}
