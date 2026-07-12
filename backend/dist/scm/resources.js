"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCM_NODE_KEYS = void 0;
exports.isScmNodeKey = isScmNodeKey;
exports.isFileResourceId = isFileResourceId;
exports.checkIacFile = checkIacFile;
exports.getScmResourceTree = getScmResourceTree;
exports.getScmResourceDetail = getScmResourceDetail;
const github_1 = require("./github");
const iacAnalyzer_1 = require("../ai/iacAnalyzer");
exports.SCM_NODE_KEYS = ["dev-vcs", "scm-repo", "branch-main", "gha-ci", "build-push", "terraform", "gha-cd"];
function isScmNodeKey(value) {
    return exports.SCM_NODE_KEYS.includes(value);
}
function runStatus(status, conclusion) {
    if (conclusion === "success")
        return "healthy";
    if (conclusion === "failure" || conclusion === "timed_out" || conclusion === "cancelled" || conclusion === "action_required")
        return "error";
    if (status === "in_progress" || status === "queued" || status === "waiting")
        return "warning";
    return "healthy";
}
function commitLine(message) {
    return (message || "").split("\n")[0].slice(0, 72);
}
// --- shared: did a given commit push cleanly, or did it break CI? -------------
async function findFailedRunForCommit(octokit, owner, repo, sha) {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({ owner, repo, head_sha: sha, per_page: 5 });
    const failed = data.workflow_runs.find((r) => runStatus(r.status, r.conclusion) === "error");
    return failed ? { runId: failed.id, run: failed } : null;
}
async function checkCommitStatus(octokit, owner, repo, sha, subtitleFallback) {
    const { data: commit } = await octokit.repos.getCommit({ owner, repo, ref: sha });
    const message = commitLine(commit.commit.message);
    let status = "healthy";
    let statusLabel = "Pushed cleanly";
    let fixAction;
    const details = [
        { label: "Commit", value: sha },
        { label: "Author", value: commit.commit.author?.name || "unknown" },
        { label: "Date", value: commit.commit.author?.date || "unknown" },
        { label: "URL", value: commit.html_url },
    ];
    try {
        const combined = await octokit.repos.getCombinedStatusForRef({ owner, repo, ref: sha });
        details.push({ label: "Combined status", value: combined.data.state });
        if (combined.data.state === "failure" || combined.data.state === "error") {
            status = "error";
            statusLabel = "Push introduced a failing check";
            for (const s of combined.data.statuses.filter((s) => s.state === "failure" || s.state === "error")) {
                details.push({ label: `Check: ${s.context}`, value: s.description || s.state });
            }
        }
    }
    catch {
        // No commit-status checks configured for this repo - not an error.
    }
    const failedRun = await findFailedRunForCommit(octokit, owner, repo, sha).catch(() => null);
    if (failedRun) {
        status = "error";
        statusLabel = "CI failed on this commit";
        fixAction = `gh_rerun_failed_jobs:${failedRun.runId}`;
        details.push({ label: "Failing workflow run", value: `#${failedRun.run.run_number} - ${failedRun.run.name || "workflow"}` });
    }
    return {
        id: `commit:${sha}`,
        name: message || sha.slice(0, 7),
        subtitle: subtitleFallback || sha.slice(0, 7),
        status,
        statusLabel,
        details,
        fixAction,
    };
}
// --- dev-vcs: "did my last commit/push break anything?" ------------------------
async function getDevVcsTree(userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: commits } = await octokit.repos.listCommits({ owner, repo, sha: repoData.default_branch, per_page: 8 });
    return commits.map((c) => ({
        id: `commit:${c.sha}`,
        name: commitLine(c.commit.message),
        type: "commit",
        status: "healthy",
        statusLabel: c.sha.slice(0, 7),
        checkable: true,
    }));
}
async function getCommitDetail(sha, userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    return checkCommitStatus(octokit, owner, repo, sha);
}
// --- scm-repo: browse every repo the token can see, drill into its file tree,
//     and (for Terraform/.tfvars files) run an AI content review for errors -----
const MAX_REPOS_WITH_FILE_TREE = 10;
const MAX_TREE_ENTRIES_PER_REPO = 250;
const IAC_FILE_PATTERN = /\.(tf|tfvars)$/i;
function buildFileTree(entries, fullName) {
    const usable = entries.filter((e) => Boolean(e.path && e.type));
    const sorted = [...usable].sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
    const byPath = new Map();
    const roots = [];
    for (const entry of sorted) {
        const parts = entry.path.split("/");
        const name = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join("/");
        const isDir = entry.type === "tree";
        const node = {
            id: `${fullName}::${entry.path}`,
            name: IAC_FILE_PATTERN.test(name) ? `${name} (Terraform)` : name,
            type: isDir ? "folder" : "file",
            status: "healthy",
            statusLabel: isDir ? "Folder" : entry.size != null ? `File (${entry.size}B)` : "File",
            checkable: !isDir,
            children: isDir ? [] : undefined,
        };
        byPath.set(entry.path, node);
        const parent = parentPath ? byPath.get(parentPath) : undefined;
        if (parent && parent.children)
            parent.children.push(node);
        else
            roots.push(node);
    }
    return roots;
}
async function getScmRepoTree(userId) {
    const octokit = await (0, github_1.getGithubOctokit)(userId);
    const { data } = await octokit.repos.listForAuthenticatedUser({ sort: "pushed", per_page: MAX_REPOS_WITH_FILE_TREE });
    const nodes = [];
    for (const r of data) {
        const [owner, name] = r.full_name.split("/");
        let children;
        try {
            const ref = await octokit.git.getRef({ owner, repo: name, ref: `heads/${r.default_branch}` });
            const treeData = await octokit.git.getTree({ owner, repo: name, tree_sha: ref.data.object.sha, recursive: "true" });
            const built = buildFileTree(treeData.data.tree.slice(0, MAX_TREE_ENTRIES_PER_REPO), r.full_name);
            children = built.length > 0 ? built : undefined;
        }
        catch {
            // Empty repo, or the tree couldn't be fetched - still list the repo itself.
        }
        nodes.push({
            id: `repo:${r.full_name}`,
            name: r.full_name,
            type: "repository",
            status: "healthy",
            statusLabel: r.private ? "Private" : "Public",
            checkable: true,
            children,
        });
    }
    return nodes;
}
async function getRepoCheckDetail(fullName, userId) {
    const [owner, repo] = fullName.split("/");
    if (!owner || !repo)
        throw new Error(`Invalid repository id: ${fullName}`);
    const octokit = await (0, github_1.getGithubOctokit)(userId);
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: commits } = await octokit.repos.listCommits({ owner, repo, sha: repoData.default_branch, per_page: 1 });
    const latest = commits[0];
    if (!latest) {
        return { id: `repo:${fullName}`, name: fullName, subtitle: "Empty repository", status: "healthy", statusLabel: "No commits yet", details: [] };
    }
    const detail = await checkCommitStatus(octokit, owner, repo, latest.sha, fullName);
    // Cross-repo checks are informational only: automated fix execution always
    // targets the single connected repo (see scm/fixes.ts + engine/errorPipeline.ts),
    // so never attach a fixAction for a repo other than that one.
    return { ...detail, id: `repo:${fullName}`, name: fullName, fixAction: undefined };
}
function splitFileId(resourceId) {
    const idx = resourceId.indexOf("::");
    if (idx === -1)
        throw new Error(`Invalid file resource id: ${resourceId}`);
    return [resourceId.slice(0, idx), resourceId.slice(idx + 2)];
}
function isFileResourceId(resourceId) {
    return resourceId.includes("::");
}
/**
 * Fetches a repo file's content and, for Terraform/.tfvars files, runs an AI
 * content review to detect real config errors (invalid references, missing
 * required args, etc). Returns a Diagnosis only when the review found a concrete
 * issue - the caller decides whether to open a tracked ErrorEvent from it.
 */
async function checkIacFile(resourceId, userId) {
    const [fullName, path] = splitFileId(resourceId);
    const [owner, repo] = fullName.split("/");
    if (!owner || !repo)
        throw new Error(`Invalid repository in file id: ${fullName}`);
    const octokit = await (0, github_1.getGithubOctokit)(userId);
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file")
        throw new Error("That path is a folder, not a file.");
    const details = [
        { label: "Repo", value: fullName },
        { label: "Path", value: data.path },
        { label: "Size", value: `${data.size} bytes` },
        { label: "URL", value: data.html_url || "" },
    ];
    let content = "";
    if (data.encoding === "base64" && data.content) {
        try {
            content = Buffer.from(data.content, "base64").toString("utf-8");
        }
        catch {
            content = "";
        }
    }
    const isText = Boolean(content) && !content.includes(String.fromCharCode(0));
    if (isText && content.length < 40000) {
        details.push({ label: "Preview (first 40 lines)", value: content.split("\n").slice(0, 40).join("\n") });
    }
    const name = path.split("/").pop() || path;
    const isIac = IAC_FILE_PATTERN.test(path);
    if (!isIac || !isText) {
        return { detail: { id: resourceId, name, subtitle: fullName, status: "healthy", statusLabel: "File", details }, diagnosis: null };
    }
    const review = await (0, iacAnalyzer_1.analyzeIacFile)(path, content);
    if (!review.hasError || !review.diagnosis) {
        return {
            detail: { id: resourceId, name, subtitle: fullName, status: "healthy", statusLabel: "Terraform file - no issues found", details },
            diagnosis: null,
        };
    }
    details.push({ label: "AI finding", value: review.diagnosis.rootCause });
    return {
        detail: { id: resourceId, name, subtitle: fullName, status: "error", statusLabel: "Terraform error detected", details },
        diagnosis: review.diagnosis,
    };
}
// --- branch-main: commit history + open PR merge-conflict status ---------------
async function getBranchTree(userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const [branches, commits, prs] = await Promise.all([
        octokit.repos.listBranches({ owner, repo, per_page: 100 }),
        octokit.repos.listCommits({ owner, repo, sha: repoData.default_branch, per_page: 15 }),
        octokit.pulls.list({ owner, repo, state: "open", per_page: 15 }),
    ]);
    const branchNodes = branches.data.map((b) => ({
        id: `branch:${b.name}`,
        name: b.name,
        type: "branch",
        status: "healthy",
        statusLabel: b.name === repoData.default_branch ? "Default" : b.protected ? "Protected" : "Branch",
        checkable: true,
    }));
    const commitNodes = commits.data.map((c) => ({
        id: `commit:${c.sha}`,
        name: commitLine(c.commit.message),
        type: "commit",
        status: "healthy",
        statusLabel: c.sha.slice(0, 7),
        checkable: true,
    }));
    const prNodes = prs.data.map((p) => ({
        id: `pr:${p.number}`,
        name: `#${p.number} ${p.title}`,
        type: "pull-request",
        status: "healthy",
        statusLabel: p.draft ? "Draft" : "Open",
        checkable: true,
    }));
    return [
        { id: "folder:branches", name: `Branches (${branchNodes.length})`, type: "folder", status: "healthy", statusLabel: "Folder", checkable: false, children: branchNodes },
        { id: "folder:commits", name: `Commit History - ${repoData.default_branch} (${commitNodes.length})`, type: "folder", status: "healthy", statusLabel: "Folder", checkable: false, children: commitNodes },
        { id: "folder:prs", name: `Open Pull Requests (${prNodes.length})`, type: "folder", status: "healthy", statusLabel: "Folder", checkable: false, children: prNodes },
    ];
}
async function getBranchDetail(name, userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    const { data } = await octokit.repos.getBranch({ owner, repo, branch: name });
    const tipDetail = await checkCommitStatus(octokit, owner, repo, data.commit.sha, name);
    return {
        ...tipDetail,
        id: `branch:${name}`,
        name,
        subtitle: `${data.protected ? "Protected" : "Unprotected"} - tip ${data.commit.sha.slice(0, 7)}`,
    };
}
async function getPrDetail(number, userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    const { data } = await octokit.pulls.get({ owner, repo, pull_number: number });
    const conflict = data.mergeable_state === "dirty";
    const blocked = data.mergeable_state === "blocked" || data.mergeable_state === "unstable";
    const status = conflict ? "error" : blocked ? "warning" : "healthy";
    const statusLabel = conflict ? "Merge conflict" : blocked ? "Blocked (checks/reviews)" : data.draft ? "Draft" : "Mergeable";
    return {
        id: `pr:${number}`,
        name: `#${data.number} ${data.title}`,
        subtitle: `${data.head.ref} -> ${data.base.ref}`,
        status,
        statusLabel,
        // No fixAction: merge conflicts can't be safely auto-resolved - the AI
        // diagnosis still runs and proposes how to resolve it, but a human applies it.
        details: [
            { label: "Author", value: data.user?.login || "unknown" },
            { label: "State", value: data.state },
            { label: "Mergeable state", value: data.mergeable_state || "unknown (still computing - try again shortly)" },
            { label: "Created", value: data.created_at },
            { label: "URL", value: data.html_url },
        ],
    };
}
// --- gha-ci / gha-cd / build-push / terraform: GitHub Actions workflow runs ----
const KEYWORD_FILTERS = {
    "build-push": ["build", "docker", "push"],
    terraform: ["terraform", "tf", "iac", "infra"],
};
async function getWorkflowTree(nodeKey, userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    const { data } = await octokit.actions.listRepoWorkflows({ owner, repo, per_page: 100 });
    let workflows = data.workflows;
    const keywords = KEYWORD_FILTERS[nodeKey];
    if (keywords) {
        const filtered = workflows.filter((w) => keywords.some((k) => w.name.toLowerCase().includes(k) || w.path.toLowerCase().includes(k)));
        if (filtered.length > 0)
            workflows = filtered;
    }
    const nodes = [];
    for (const wf of workflows) {
        const runs = await octokit.actions.listWorkflowRuns({ owner, repo, workflow_id: wf.id, per_page: 5 });
        const runNodes = runs.data.workflow_runs.map((r) => ({
            id: `run:${r.id}`,
            name: `#${r.run_number} ${r.display_title || wf.name}`,
            type: "workflow-run",
            status: runStatus(r.status, r.conclusion),
            statusLabel: r.conclusion || r.status || "unknown",
            checkable: true,
        }));
        nodes.push({
            id: `workflow:${wf.id}`,
            name: wf.name,
            type: "workflow",
            status: runNodes.some((n) => n.status === "error") ? "error" : "healthy",
            statusLabel: wf.state,
            checkable: false,
            children: runNodes,
        });
    }
    return nodes;
}
async function decodeJobLogTail(octokit, owner, repo, jobId) {
    try {
        const logs = await octokit.actions.downloadJobLogsForWorkflowRun({ owner, repo, job_id: jobId });
        const raw = logs.data;
        const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf-8") : "";
        return text ? text.slice(-2000) : null;
    }
    catch {
        // Best-effort - logs can expire or the PAT may lack access.
        return null;
    }
}
async function getWorkflowRunDetail(resourceId, userId) {
    const { octokit, owner, repo } = await (0, github_1.getGithubAuth)(userId);
    const runId = Number(resourceId.slice("run:".length));
    const { data: run } = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
    const status = runStatus(run.status, run.conclusion);
    const details = [
        { label: "Workflow", value: run.name || "" },
        { label: "Run #", value: String(run.run_number) },
        { label: "Status", value: run.status || "unknown" },
        { label: "Conclusion", value: run.conclusion || "pending" },
        { label: "Branch", value: run.head_branch || "unknown" },
        { label: "Triggered by", value: run.event },
        { label: "Actor", value: run.actor?.login || "unknown" },
        { label: "Started", value: run.run_started_at || "" },
        { label: "URL", value: run.html_url },
    ];
    if (status === "error") {
        const { data: jobsData } = await octokit.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId });
        for (const job of jobsData.jobs.filter((j) => j.conclusion === "failure")) {
            const failedSteps = (job.steps || []).filter((s) => s.conclusion === "failure").map((s) => s.name);
            details.push({
                label: `Failed job: ${job.name}`,
                value: failedSteps.length ? `Failed steps: ${failedSteps.join(", ")}` : "Job failed",
            });
            const logTail = await decodeJobLogTail(octokit, owner, repo, job.id);
            if (logTail)
                details.push({ label: `Log excerpt (${job.name})`, value: logTail });
        }
    }
    return {
        id: resourceId,
        name: `${run.name || "Workflow"} #${run.run_number}`,
        subtitle: `${run.head_branch || ""} - ${run.event}`,
        status,
        statusLabel: run.conclusion || run.status || "unknown",
        details,
        fixAction: status === "error" ? "gh_rerun_failed_jobs" : undefined,
    };
}
// --- dispatchers ----------------------------------------------------------------
async function getScmResourceTree(nodeKey, userId) {
    switch (nodeKey) {
        case "dev-vcs":
            return getDevVcsTree(userId);
        case "scm-repo":
            return getScmRepoTree(userId);
        case "branch-main":
            return getBranchTree(userId);
        case "gha-ci":
        case "gha-cd":
        case "build-push":
        case "terraform":
            return getWorkflowTree(nodeKey, userId);
    }
}
async function getScmResourceDetail(_nodeKey, resourceId, userId) {
    if (resourceId.startsWith("run:"))
        return getWorkflowRunDetail(resourceId, userId);
    if (resourceId.startsWith("commit:"))
        return getCommitDetail(resourceId.slice("commit:".length), userId);
    if (resourceId.startsWith("pr:"))
        return getPrDetail(Number(resourceId.slice("pr:".length)), userId);
    if (resourceId.startsWith("repo:"))
        return getRepoCheckDetail(resourceId.slice("repo:".length), userId);
    if (resourceId.startsWith("branch:"))
        return getBranchDetail(resourceId.slice("branch:".length), userId);
    throw new Error(`Unrecognized SCM resource id: ${resourceId}`);
}
