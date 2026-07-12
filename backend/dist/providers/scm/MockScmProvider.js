"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockScmProvider = void 0;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
class MockScmProvider {
    async proposeFix(context) {
        await sleep(1200);
        const prNumber = Math.floor(1000 + Math.random() * 9000);
        return {
            prUrl: `https://github.com/your-org/your-repo/pull/${prNumber}`,
            message: `Opened PR #${prNumber} "Fix: ${context.title}" with the proposed diff.`,
        };
    }
}
exports.MockScmProvider = MockScmProvider;
