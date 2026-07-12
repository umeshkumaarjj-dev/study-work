"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateRouter = void 0;
const express_1 = require("express");
const scenarios_1 = require("../simulator/scenarios");
const errorPipeline_1 = require("../engine/errorPipeline");
const serialize_1 = require("../serialize");
exports.simulateRouter = (0, express_1.Router)();
exports.simulateRouter.get("/scenarios", (_req, res) => {
    res.json((0, scenarios_1.listScenarios)());
});
// Simulations are a personal sandbox (private to whoever triggered them, wiped
// on their logout - see routes/errors.ts and routes/auth.ts) - not tracked in
// the team history, since they're demo data, not a real change to anything.
exports.simulateRouter.post("/:scenarioKey", async (req, res) => {
    try {
        const errorEvent = await (0, errorPipeline_1.triggerScenario)(req.params.scenarioKey, req.user.id);
        res.json((0, serialize_1.toApiErrorEvent)(errorEvent));
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
