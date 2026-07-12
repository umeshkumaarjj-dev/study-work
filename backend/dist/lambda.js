"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const serverless_http_1 = __importDefault(require("serverless-http"));
const app_1 = require("./app");
// Lambda entry point (see template.yaml: Handler: dist/lambda.handler).
// API Gateway (HTTP API, payload format 2.0) invokes this per-request; there is
// no persistent process between invocations, which is why nothing in this app
// relies on in-memory state surviving across requests (no Socket.IO, no
// fire-and-forget background work - see engine/errorPipeline.ts).
exports.handler = (0, serverless_http_1.default)(app_1.app);
