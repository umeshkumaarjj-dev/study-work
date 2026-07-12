"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const authService_1 = require("../auth/authService");
const middleware_1 = require("../auth/middleware");
const activityLog_1 = require("../engine/activityLog");
exports.authRouter = (0, express_1.Router)();
// Lets the signup form warn as soon as the user leaves the email field, instead
// of only after they submit the whole form. Doesn't reveal anything beyond
// "taken or not" - no user details.
exports.authRouter.get("/check-email", async (req, res) => {
    const email = req.query.email;
    if (!email || typeof email !== "string" || !email.includes("@")) {
        res.json({ available: true });
        return;
    }
    const existing = await db_1.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    res.json({ available: !existing });
});
exports.authRouter.post("/signup", async (req, res) => {
    const { email, password, name, role, leadCode } = req.body || {};
    if (!email || typeof email !== "string" || !email.includes("@")) {
        res.status(400).json({ error: "A valid email is required." });
        return;
    }
    if (!password || typeof password !== "string" || !(0, authService_1.isStrongPassword)(password)) {
        res.status(400).json({ error: authService_1.PASSWORD_REQUIREMENT });
        return;
    }
    if (!name || typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "Name is required." });
        return;
    }
    const normalizedRole = role === "lead" ? "lead" : "resource";
    // The client's role choice is never trusted on its own - signing up as a lead
    // requires the shared LEAD_SIGNUP_CODE (backend/.env), so a resource can't just
    // pick "lead" (or make a second account) to grant themselves lead access.
    if (normalizedRole === "lead" && !(0, authService_1.isValidLeadCode)(leadCode)) {
        res.status(403).json({ error: "That lead access code is not valid. Ask an existing lead for the current code." });
        return;
    }
    try {
        const user = await (0, authService_1.signup)(email, password, name, normalizedRole);
        const token = (0, authService_1.signToken)(user);
        res.cookie(authService_1.SESSION_COOKIE, token, authService_1.SESSION_COOKIE_OPTIONS);
        res.json({ user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
    }
    try {
        const user = await (0, authService_1.login)(email, password);
        const token = (0, authService_1.signToken)(user);
        res.cookie(authService_1.SESSION_COOKIE, token, authService_1.SESSION_COOKIE_OPTIONS);
        res.json({ user });
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
});
// Connections (SCM PAT, AWS keys/role/SSO) are stored per-user, so logging out
// only ever disconnects the connections belonging to the person who just logged
// out - other concurrently signed-in users keep their own SCM/AWS access.
// Simulated events are that same user's personal sandbox (never shown to anyone
// else - see routes/errors.ts), so they're deleted here too rather than left to
// linger as stale demo clutter for the next login.
exports.authRouter.post("/logout", async (req, res) => {
    const token = req.cookies?.[authService_1.SESSION_COOKIE];
    const user = typeof token === "string" ? (0, authService_1.verifyToken)(token) : null;
    if (user) {
        const connected = await db_1.prisma.connection.findMany({
            where: { userId: user.id, type: { in: ["scm", "aws"] }, status: "connected" },
        });
        if (connected.length > 0) {
            await db_1.prisma.connection.updateMany({
                where: { userId: user.id, type: { in: ["scm", "aws"] } },
                data: { status: "disconnected", summary: null, config: null, connectedAt: null },
            });
            for (const row of connected) {
                await (0, activityLog_1.logActivity)(user, `disconnected_${row.type}`, `${row.type} (auto-disconnected at logout)`).catch(() => undefined);
            }
        }
        const simulated = await db_1.prisma.errorEvent.findMany({ where: { userId: user.id, origin: "simulated" }, select: { id: true } });
        if (simulated.length > 0) {
            const ids = simulated.map((e) => e.id);
            await db_1.prisma.timelineEntry.deleteMany({ where: { errorEventId: { in: ids } } });
            await db_1.prisma.errorEvent.deleteMany({ where: { id: { in: ids } } });
        }
    }
    res.clearCookie(authService_1.SESSION_COOKIE);
    res.json({ ok: true });
});
exports.authRouter.get("/me", middleware_1.requireAuth, (req, res) => {
    res.json({ user: req.user });
});
