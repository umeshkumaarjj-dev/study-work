"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
// Local dev entry point only - see lambda.ts for the deployed Lambda handler.
const port = Number(process.env.PORT) || 4000;
app_1.app.listen(port, () => {
    console.log(`[backend] listening on :${port}`);
});
