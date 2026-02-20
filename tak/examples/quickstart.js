#!/usr/bin/env node
/**
 * TAK SDK Quickstart Example
 * 
 * This example demonstrates the full TAK coordination flow:
 * 1. Register two agents (Buyer and Seller)
 * 2. Create a service request
 * 3. Submit an offer
 * 4. Accept the offer
 * 5. Create a deal
 * 6. Approve the deal
 * 7. Execute the deal via MCP
 * 
 * Run: npm install tak-sdk && node quickstart.js
 */

const TAK = require("tak-sdk");

// Helper to generate unique IDs
const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

async function main() {
    // Initialize TAK client
    const tak = new TAK({ baseUrl: "http://localhost:3000" });
    
    console.log("╔════════════════════════════════════════╗");
    console.log("║  TAK SDK Quickstart Example            ║");
    console.log("║  Coordination Flow (6 stages)          ║");
    console.log("╚════════════════════════════════════════╝\n");
    
    try {
        // ──────────────────────────────────────────────────────────
        // STAGE 1: Register Agents
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 1: Registering agents...\n");
        
        const buyerAgent = await tak.createAgent({
            name: `BuyerAgent_${uid("b")}`,
            description: "Autonomous buyer of market data",
            capabilities: ["request_service", "negotiate"],
            endpoint_url: "https://buyer.example.com/webhook",
        });
        console.log(`✓ Buyer agent registered: ${buyerAgent.id}`);
        
        const sellerAgent = await tak.createAgent({
            name: `DataAgent_${uid("d")}`,
            description: "Autonomous provider of market data",
            capabilities: ["offer_service", "negotiate"],
            endpoint_url: "https://data.example.com/webhook",
        });
        console.log(`✓ Seller agent registered: ${sellerAgent.id}\n`);
        
        // ──────────────────────────────────────────────────────────
        // STAGE 2: Create Service Request
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 2: Creating service request...\n");
        
        const maxPrice = 2000000000; // 2 TON in nanoTON
        const request = await tak.createRequest({
            requester_agent_id: buyerAgent.id,
            service_query: "market_data Q4 2024",
            max_price_nano: maxPrice,
            schema_version: "tak/0.1",
            idempotency_key: uid("req"),
        });
        console.log(`✓ Request created: ${request.id}`);
        console.log(`  Service: ${request.service_query}`);
        console.log(`  Max price: ${request.max_price_nano} nanoTON (${request.max_price_nano / 1e9} TON)`);
        console.log(`  Status: ${request.status}\n`);
        
        // ──────────────────────────────────────────────────────────
        // STAGE 3: Submit Offer
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 3: Submitting offer...\n");
        
        const offerPrice = 1500000000; // 1.5 TON in nanoTON
        const offer = await tak.submitOffer({
            request_id: request.id,
            provider_agent_id: sellerAgent.id,
            price_nano: offerPrice,
            terms: "JSON delivery. SLA: <10 seconds. Data refresh: hourly.",
            schema_version: "tak/0.1",
            idempotency_key: uid("off"),
        });
        console.log(`✓ Offer submitted: ${offer.id}`);
        console.log(`  Provider: ${sellerAgent.name}`);
        console.log(`  Price: ${offer.price_nano} nanoTON (${offer.price_nano / 1e9} TON)`);
        console.log(`  Terms: ${offer.terms}`);
        console.log(`  Status: ${offer.status}\n`);
        
        // ──────────────────────────────────────────────────────────
        // STAGE 4: Accept Offer
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 4: Accepting offer...\n");
        
        const acceptedOffer = await tak.acceptOffer(offer.id);
        console.log(`✓ Offer accepted: ${acceptedOffer.id}`);
        console.log(`  Status: ${acceptedOffer.status}`);
        console.log(`  Other offers auto-rejected: ${acceptedOffer.other_offers_auto_rejected || 0}\n`);
        
        // ──────────────────────────────────────────────────────────
        // STAGE 5: Create Deal (Immutable Snapshot)
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 5: Creating deal (immutable snapshot)...\n");
        
        const deal = await tak.createDeal({
            request_id: request.id,
            offer_id: offer.id,
            schema_version: "tak/0.1",
            idempotency_key: uid("deal"),
        });
        console.log(`✓ Deal created: ${deal.id}`);
        console.log(`  Payer: ${deal.payer_agent_id}`);
        console.log(`  Payee: ${deal.payee_agent_id}`);
        console.log(`  Amount: ${deal.amount_nano} nanoTON (${deal.amount_nano / 1e9} TON)`);
        console.log(`  Status: ${deal.status}`);
        console.log(`  🔒 Deal parameters locked — immutable snapshot created\n`);
        
        // ──────────────────────────────────────────────────────────
        // STAGE 6: Approve Deal (Security Gate)
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 6: Approving deal (explicit security gate)...\n");
        
        const approvedDeal = await tak.approveDeal(deal.id);
        console.log(`✓ Deal approved: ${approvedDeal.id}`);
        console.log(`  Status: ${approvedDeal.status}`);
        console.log(`  Approved at: ${approvedDeal.approved_at}`);
        console.log(`  🛡️  Explicit approval gate passed — ready for execution\n`);
        
        // ──────────────────────────────────────────────────────────
        // STAGE 7: Execute Deal (via MCP Adapter)
        // ──────────────────────────────────────────────────────────
        console.log("📋 STAGE 7: Executing deal (via MCP Adapter)...\n");
        
        const executedDeal = await tak.executeDeal(deal.id);
        console.log(`✓ Deal executed: ${executedDeal.id}`);
        console.log(`  Status: ${executedDeal.status}`);
        console.log(`  Execution receipt: ${executedDeal.execution_receipt}`);
        console.log(`  Executed at: ${executedDeal.executed_at}`);
        console.log(`  Adapter used: ${executedDeal.adapter}`);
        console.log(`  Message: ${executedDeal.message}\n`);
        
        // ──────────────────────────────────────────────────────────
        // Summary
        // ──────────────────────────────────────────────────────────
        console.log("╔════════════════════════════════════════╗");
        console.log("║          FLOW COMPLETE ⚡              ║");
        console.log("╚════════════════════════════════════════╝\n");
        
        console.log("Summary of coordination flow:");
        console.log(`  • Buyer Agent:     ${buyerAgent.id}`);
        console.log(`  • Seller Agent:    ${sellerAgent.id}`);
        console.log(`  • Request:         ${request.id}`);
        console.log(`  • Offer:           ${offer.id}`);
        console.log(`  • Deal:            ${deal.id}`);
        console.log(`  • Execution Rcpt:  ${executedDeal.execution_receipt}\n`);
        
        console.log("Security signals:");
        console.log(`  ✓ Immutable deal snapshot (Stage 5)`);
        console.log(`  ✓ Explicit approval gate (Stage 6)`);
        console.log(`  ✓ TAK never held funds (delegated to MCP)\n`);
        
        console.log("Key Architecture:");
        console.log(`  1. TAK (off-chain coordination) ✓ Complete`);
        console.log(`  2. MCP Adapter (execution) ✓ ${executedDeal.adapter}`);
        console.log(`  3. TON Blockchain (settlement) ← Next tier\n`);
        
        console.log("Message:");
        console.log("  TAK provides the coordination layer that TON currently lacks.");
        console.log("  Agents discover services. Agents negotiate price.");
        console.log("  Agreements are secured. Execution happens safely through TON MCP.\n");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.body) {
            console.error("Details:", error.body);
        }
        process.exit(1);
    }
}

// Run the example
main();
