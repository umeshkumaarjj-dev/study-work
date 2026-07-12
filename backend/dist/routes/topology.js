"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologyRouter = void 0;
const express_1 = require("express");
const topologyService_1 = require("../topology/topologyService");
exports.topologyRouter = (0, express_1.Router)();
exports.topologyRouter.get("/", async (_req, res) => {
    const state = await (0, topologyService_1.getTopologyState)();
    res.json(state);
});
