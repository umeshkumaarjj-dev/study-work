"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCloudProvider = void 0;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
class MockCloudProvider {
    async applyRemediation(context) {
        await sleep(1500);
        return {
            confirmation: `Applied remediation against ${context.service}: ${context.fixSteps.split("\n")[0]}`,
        };
    }
}
exports.MockCloudProvider = MockCloudProvider;
