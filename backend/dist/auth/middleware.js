"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireLead = requireLead;
const authService_1 = require("./authService");
function requireAuth(req, res, next) {
    const token = req.cookies?.[authService_1.SESSION_COOKIE];
    const user = typeof token === "string" ? (0, authService_1.verifyToken)(token) : null;
    if (!user) {
        res.status(401).json({ error: "Not signed in." });
        return;
    }
    req.user = user;
    next();
}
function requireLead(req, res, next) {
    if (req.user?.role !== "lead") {
        res.status(403).json({ error: "Only leads can access this." });
        return;
    }
    next();
}
