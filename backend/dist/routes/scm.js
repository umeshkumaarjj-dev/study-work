"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scmRouter = void 0;
const express_1 = require("express");
const errorPipeline_1 = require("../engine/errorPipeline");
const resources_1 = require("../scm/resources");
exports.scmRouter = (0, express_1.Router)();
exports.scmRouter.get("/resources/:node/tree", async (req, res) => {
    const { node } = req.params;
    if (!(0, resources_1.isScmNodeKey)(node)) {
        res.status(400).json({ error: `Unsupported SCM node: ${node}` });
        return;
    }
    try {
        const tree = await (0, resources_1.getScmResourceTree)(node, req.user.id);
        res.json(tree);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Fetches live status for a GitHub resource (commit, PR, workflow run, or a
// browsed repo) and, if it isn't healthy, opens (or reuses) a tracked issue that
// runs through the same AI diagnosis + severity-approval engine as simulated
// scenarios and real AWS checks. Real SCM issues always require manual approval -
// see engine/errorPipeline.ts.
exports.scmRouter.post("/resources/:node/check", async (req, res) => {
    const { node } = req.params;
    const id = req.query.id;
    if (!(0, resources_1.isScmNodeKey)(node)) {
        res.status(400).json({ error: `Unsupported SCM node: ${node}` });
        return;
    }
    if (!id || typeof id !== "string") {
        res.status(400).json({ error: "Query param 'id' is required." });
        return;
    }
    try {
        if ((0, resources_1.isFileResourceId)(id)) {
            // Repo file browsing (under scm-repo): the AI review is already the full
            // diagnosis, so skip the generic log-based diagnose() pass entirely.
            const { detail, diagnosis } = await (0, resources_1.checkIacFile)(id, req.user.id);
            if (!diagnosis) {
                res.json({ detail, errorEventId: null });
                return;
            }
            const errorEvent = await (0, errorPipeline_1.triggerScmResourceIssueWithDiagnosis)(node, id, detail, diagnosis, req.user.id);
            res.json({ detail, errorEventId: errorEvent.id });
            return;
        }
        const detail = await (0, resources_1.getScmResourceDetail)(node, id, req.user.id);
        if (detail.status === "healthy") {
            res.json({ detail, errorEventId: null });
            return;
        }
        const errorEvent = await (0, errorPipeline_1.triggerScmResourceIssue)(node, id, detail, req.user.id);
        res.json({ detail, errorEventId: errorEvent.id });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
