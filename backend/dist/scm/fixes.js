"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRealScmFix = executeRealScmFix;
/**
 * Executes a real, live GitHub remediation. `fixAction` is a deterministic key set
 * by the health-check logic in scm/resources.ts - never inferred from the AI's
 * free-text diagnosis. Only add an action here once it is verified safe and
 * reversible; anything else should stay manual (mirrors aws/fixes.ts).
 */
async function executeRealScmFix(auth, fixAction, resourceId) {
    if (fixAction.startsWith("gh_rerun_failed_jobs")) {
        // The run id is either embedded in fixAction (set when a commit/repo check
        // found an associated failed run, e.g. "gh_rerun_failed_jobs:12345") or, for
        // a directly-checked workflow run, encoded in the resourceId ("run:12345").
        const embedded = fixAction.includes(":") ? fixAction.split(":")[1] : null;
        const runId = embedded ? Number(embedded) : Number(resourceId.replace(/^run:/, ""));
        if (!runId || Number.isNaN(runId))
            throw new Error("Could not determine which workflow run to re-run.");
        await auth.octokit.actions.reRunWorkflowFailedJobs({ owner: auth.owner, repo: auth.repo, run_id: runId });
        return `Re-triggered the failed jobs for GitHub Actions run #${runId}.`;
    }
    throw new Error(`No automated remediation is implemented for action "${fixAction}" yet.`);
}
