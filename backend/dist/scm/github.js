"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOwnerRepo = parseOwnerRepo;
exports.getGithubAuth = getGithubAuth;
exports.getGithubOctokit = getGithubOctokit;
const rest_1 = require("@octokit/rest");
const db_1 = require("../db");
function parseOwnerRepo(repoUrl) {
    const cleaned = repoUrl.trim().replace(/\.git$/, "").replace(/\/+$/, "");
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)$/i);
    if (match)
        return { owner: match[1], repo: match[2] };
    const parts = cleaned.split("/").filter(Boolean);
    if (parts.length >= 2)
        return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
    throw new Error(`Could not parse an owner/repo from "${repoUrl}".`);
}
async function getStoredConfig(userId) {
    const row = await db_1.prisma.connection.findUnique({ where: { userId_type: { userId, type: "scm" } } });
    if (!row || row.status !== "connected" || !row.config) {
        throw new Error('SCM is not connected. Use the "Connect SCM" button first.');
    }
    return JSON.parse(row.config);
}
/** Auth scoped to the single repo this user connected (repoUrl in the SCM connection form). */
async function getGithubAuth(userId) {
    const config = await getStoredConfig(userId);
    const { owner, repo } = parseOwnerRepo(config.repoUrl);
    const octokit = new rest_1.Octokit({ auth: config.patToken });
    return { octokit, owner, repo };
}
/** Just this user's authenticated client, for browsing across every repo their PAT can see. */
async function getGithubOctokit(userId) {
    const config = await getStoredConfig(userId);
    return new rest_1.Octokit({ auth: config.patToken });
}
