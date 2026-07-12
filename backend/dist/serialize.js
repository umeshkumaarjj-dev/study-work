"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNodeIds = parseNodeIds;
exports.toApiErrorEvent = toApiErrorEvent;
function parseNodeIds(nodeIds) {
    try {
        const parsed = JSON.parse(nodeIds);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function toApiErrorEvent(errorEvent) {
    return { ...errorEvent, nodeIds: parseNodeIds(errorEvent.nodeIds) };
}
