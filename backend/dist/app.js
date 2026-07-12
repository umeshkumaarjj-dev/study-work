"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const topology_1 = require("./routes/topology");
const errors_1 = require("./routes/errors");
const simulate_1 = require("./routes/simulate");
const connections_1 = require("./routes/connections");
const aws_1 = require("./routes/aws");
const scm_1 = require("./routes/scm");
const chat_1 = require("./routes/chat");
const auth_1 = require("./routes/auth");
const activity_1 = require("./routes/activity");
const middleware_1 = require("./auth/middleware");
// Shared Express app - used both for local dev (index.ts calls app.listen) and
// for Lambda (lambda.ts wraps this with serverless-http). No live-update push
// channel (Socket.IO) here: the frontend polls GET /api/errors and
// GET /api/topology instead, since Lambda invocations don't keep a process
// alive to push over a WebSocket - see App.tsx.
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
// Raised from the default 100kb so chat attachments (base64 images/PDFs) fit.
exports.app.use(express_1.default.json({ limit: "12mb" }));
exports.app.use((0, cookie_parser_1.default)());
exports.app.get("/api/health", (_req, res) => res.json({ ok: true }));
exports.app.use("/api/auth", auth_1.authRouter);
// Everything below requires a signed-in session.
exports.app.use("/api/topology", middleware_1.requireAuth, topology_1.topologyRouter);
exports.app.use("/api/errors", middleware_1.requireAuth, errors_1.errorsRouter);
exports.app.use("/api/simulate", middleware_1.requireAuth, simulate_1.simulateRouter);
exports.app.use("/api/connections", middleware_1.requireAuth, connections_1.connectionsRouter);
exports.app.use("/api/aws", middleware_1.requireAuth, aws_1.awsRouter);
exports.app.use("/api/scm", middleware_1.requireAuth, scm_1.scmRouter);
exports.app.use("/api/chat", middleware_1.requireAuth, chat_1.chatRouter);
exports.app.use("/api/activity", middleware_1.requireAuth, activity_1.activityRouter);
