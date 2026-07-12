"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_REQUIREMENT = exports.SESSION_COOKIE_OPTIONS = exports.SESSION_COOKIE = void 0;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.isStrongPassword = isStrongPassword;
exports.isValidLeadCode = isValidLeadCode;
exports.signup = signup;
exports.login = login;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
if (!process.env.JWT_SECRET) {
    console.warn("[auth] JWT_SECRET is not set - using an insecure default. Set it in backend/.env.");
}
const COOKIE_NAME = "shca_session";
const TOKEN_TTL = "7d";
function toAuthUser(user) {
    return { id: user.id, email: user.email, name: user.name, role: user.role === "lead" ? "lead" : "resource" };
}
function signToken(user) {
    return jsonwebtoken_1.default.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
}
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded?.id || !decoded?.email)
            return null;
        return decoded;
    }
    catch {
        return null;
    }
}
exports.SESSION_COOKIE = COOKIE_NAME;
exports.SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    // Required for browsers to send the cookie over HTTPS-only in production
    // (CloudFront). Left off for local http://localhost dev, where "Secure"
    // cookies would just get silently dropped.
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
exports.PASSWORD_REQUIREMENT = "Password must be at least 9 characters and include an uppercase letter, a lowercase letter, and a special character.";
function isStrongPassword(password) {
    if (password.length < 9)
        return false;
    if (!/[a-z]/.test(password))
        return false;
    if (!/[A-Z]/.test(password))
        return false;
    if (!/[^a-zA-Z0-9]/.test(password))
        return false;
    return true;
}
const LEAD_SIGNUP_CODE = process.env.LEAD_SIGNUP_CODE || "";
if (!process.env.LEAD_SIGNUP_CODE) {
    console.warn("[auth] LEAD_SIGNUP_CODE is not set - nobody will be able to sign up as a lead. Set it in backend/.env.");
}
function isValidLeadCode(code) {
    return typeof code === "string" && LEAD_SIGNUP_CODE.length > 0 && code === LEAD_SIGNUP_CODE;
}
async function signup(email, password, name, role) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing)
        throw new Error("An account with that email already exists.");
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await db_1.prisma.user.create({
        data: { email: normalizedEmail, passwordHash, name: name.trim(), role },
    });
    return toAuthUser(user);
}
async function login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user)
        throw new Error("Invalid email or password.");
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid)
        throw new Error("Invalid email or password.");
    return toAuthUser(user);
}
