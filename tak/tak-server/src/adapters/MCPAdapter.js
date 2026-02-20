"use strict";
/**
 * TAK — MCP Adapter interface
 *
 * Implement this to connect TAK deal execution to any MCP backend.
 *
 * Usage:
 *   class TonMCPAdapter extends MCPAdapter {
 *     async execute_payment(deal) {
 *       // call real TON MCP transaction API
 *       const hash = await tonMCP.send({ ... });
 *       return hash;
 *     }
 *   }
 *
 * Then inject into tak-server:
 *   const adapter = new TonMCPAdapter(config);
 *   app.set("mcpAdapter", adapter);
 */
class MCPAdapter {
    /**
     * Execute a payment for a given deal.
     *
     * @param {Object} deal - The deal record from the database
     * @param {string} deal.id
     * @param {string} deal.payer_agent_id
     * @param {string} deal.payee_agent_id
     * @param {number} deal.amount_nano  - nanoTON (integer)
     * @returns {Promise<string>}        - Receipt / tx hash string
     */
    async execute_payment(deal) {
        throw new Error(
            "MCPAdapter.execute_payment() is not implemented. " +
            "Subclass MCPAdapter and provide a real implementation."
        );
    }
}

module.exports = MCPAdapter;
