"use strict";
/**
 * TAK — MockMCPAdapter
 *
 * MVP implementation. Returns a fake receipt hash.
 * Swap this for TonMCPAdapter in production.
 *
 * To replace:
 *   1. Create TonMCPAdapter extends MCPAdapter in this folder
 *   2. Change the import in src/index.js:
 *      const adapter = new TonMCPAdapter({ rpcUrl: "..." });
 *      app.set("mcpAdapter", adapter);
 */
const MCPAdapter = require("./MCPAdapter");
const { v4: uuidv4 } = require("uuid");

class MockMCPAdapter extends MCPAdapter {
    constructor() {
        super();
        this.name = "MockMCPAdapter";
        console.log("[TAK] MCP adapter: MockMCPAdapter (MVP — returns fake receipt)");
    }

    async execute_payment(deal) {
        // Simulate a brief async call
        await new Promise(r => setTimeout(r, 120));

        const receipt = `mcp_receipt_${uuidv4().replace(/-/g, "").slice(0, 16)}`;

        console.log(
            `[MockMCPAdapter] execute_payment(deal=${deal.id}) → ${receipt}`
        );

        return receipt;
    }
}

module.exports = MockMCPAdapter;
