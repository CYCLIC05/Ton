/**
 * TAK — Full Demo Flow Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the complete BuyerAgent ↔ DataAgent coordination flow:
 *
 *   1. BuyerAgent creates a request (max 2 TON)
 *   2. DataAgent submits an offer (1.5 TON)
 *   3. BuyerAgent accepts the offer
 *   4. Deal is created (status: awaiting_approval)
 *   5. Deal is approved
 *   6. Deal is executed via MockMCPAdapter
 *   7. Print: deal status, receipt, timestamps
 *
 * Usage:
 *   node examples/demo_flow_runner.js
 *
 * Prerequisites:
 *   cd tak-server && npm install && npm run dev   (in a separate terminal)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TAK = require("../tak-sdk/src/index");

const tak = new TAK({ baseUrl: "http://localhost:3000" });

const TEAL = "\x1b[36m";
const GREEN = "\x1b[32m";
const AMBER = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(stage, color, message, data = null) {
    console.log(`\n${color}${BOLD}[Stage ${stage}]${RESET} ${message}`);
    if (data) {
        const lines = JSON.stringify(data, null, 2).split("\n");
        lines.forEach(l => console.log(`  ${DIM}${l}${RESET}`));
    }
}

function nanoToTon(nano) {
    return (parseInt(nano) / 1_000_000_000).toFixed(1) + " TON";
}

async function runFullFlow() {
    console.log(`
${TEAL}${BOLD}╔══════════════════════════════════════════════════╗
║  TAK — Demo Flow Runner                          ║
║  BuyerAgent ↔ DataAgent · Full Coordination      ║
╚══════════════════════════════════════════════════╝${RESET}
`);

    // ── Resolve seeded agents ─────────────────────────────────
    log(0, DIM, "Resolving seeded agents from TAK registry…");
    const { agents } = await tak.listAgents();
    const buyer = agents.find(a => a.name === "BuyerAgent");
    const data = agents.find(a => a.name === "DataAgent");

    if (!buyer || !data) {
        console.error(`${"\x1b[31m"}ERROR: BuyerAgent or DataAgent not found.`);
        console.error(`Make sure the server is running: cd tak-server && npm run dev${RESET}`);
        process.exit(1);
    }
    console.log(`  ${DIM}BuyerAgent: ${buyer.id}${RESET}`);
    console.log(`  ${DIM}DataAgent:  ${data.id}${RESET}`);

    // ── Resolve seeded service ────────────────────────────────
    const { services } = await tak.listServices();
    const svc = services.find(s => s.service_name === "market_data");
    if (!svc) {
        console.error("ERROR: market_data service not found. Did the server seed?");
        process.exit(1);
    }
    console.log(`  ${DIM}Service: ${svc.service_name} @ ${nanoToTon(svc.base_price_nano)} (${svc.base_price_nano} nanoTON)${RESET}`);

    // ─────────────────────────────────────────────────────────
    // Stage 1: BuyerAgent creates a request
    // ─────────────────────────────────────────────────────────
    log(1, AMBER, "BuyerAgent creates a request (ceiling: 2 TON)");
    const request = await tak.createRequest({
        requester_agent_id: buyer.id,
        service_query: "market_data Q4 normalized dataset",
        max_price_nano: 2_000_000_000,   // 2 TON in nanoTON
    });
    log(1, AMBER, `Request created: ${request.id} [status: ${request.status}]`, {
        id: request.id,
        service_query: request.service_query,
        max_price_nano: request.max_price_nano,
        max_price_ton: nanoToTon(request.max_price_nano),
        status: request.status,
    });

    // ─────────────────────────────────────────────────────────
    // Stage 2: DataAgent submits an offer
    // ─────────────────────────────────────────────────────────
    log(2, AMBER, "DataAgent submits an offer (1.5 TON — under BuyerAgent ceiling)");
    const offer = await tak.submitOffer({
        request_id: request.id,
        provider_agent_id: data.id,
        price_nano: 1_500_000_000,        // 1.5 TON in nanoTON
        terms: "JSON delivery. SLA: <10s post-execution. Normalized columns + anomaly flags.",
    });
    log(2, AMBER, `Offer submitted: ${offer.id} [status: ${offer.status}]`, {
        id: offer.id,
        price_nano: offer.price_nano,
        price_ton: nanoToTon(offer.price_nano),
        terms: offer.terms,
        status: offer.status,
    });

    // ─────────────────────────────────────────────────────────
    // Stage 3: BuyerAgent accepts the offer
    // ─────────────────────────────────────────────────────────
    log(3, GREEN, `BuyerAgent accepts offer ${offer.id}`);
    const accepted = await tak.acceptOffer(offer.id);
    log(3, GREEN, `Offer accepted. Auto-rejected ${accepted.other_offers_auto_rejected} competing offers.`, {
        id: accepted.id,
        status: accepted.status,
        other_offers_auto_rejected: accepted.other_offers_auto_rejected,
    });

    // ─────────────────────────────────────────────────────────
    // Stage 4: Deal created
    // ─────────────────────────────────────────────────────────
    log(4, GREEN, "Creating deal from accepted offer…");
    const deal = await tak.createDeal({
        request_id: request.id,
        offer_id: offer.id,
    });
    log(4, GREEN, `Deal created: ${deal.id} [status: ${deal.status}]`, {
        id: deal.id,
        payer: deal.payer_agent_id,
        payee: deal.payee_agent_id,
        amount_nano: deal.amount_nano,
        amount_ton: nanoToTon(deal.amount_nano),
        status: deal.status,
        created_at: deal.created_at,
    });

    console.log(`\n  ${AMBER}★ SECURITY GATE: deal is 'awaiting_approval'`);
    console.log(`  Execution cannot proceed without explicit approval.${RESET}`);

    // ─────────────────────────────────────────────────────────
    // Stage 5: Approve the deal
    // ─────────────────────────────────────────────────────────
    log(5, GREEN, `Approving deal ${deal.id}…`);
    const approved = await tak.approveDeal(deal.id);
    log(5, GREEN, `Deal approved. [status: ${approved.status}]`, {
        id: approved.id,
        status: approved.status,
        approved_at: approved.approved_at,
    });

    // ─────────────────────────────────────────────────────────
    // Stage 6: Execute via MockMCPAdapter
    // ─────────────────────────────────────────────────────────
    log(6, TEAL, `Executing deal ${deal.id} via MockMCPAdapter…`);
    const executed = await tak.executeDeal(deal.id);
    log(6, TEAL, `Deal executed! [status: ${executed.status}]`, {
        id: executed.id,
        status: executed.status,
        adapter: executed.adapter,
        execution_receipt: executed.execution_receipt,
        executed_at: executed.executed_at,
    });

    // ─────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────
    console.log(`
${TEAL}${BOLD}╔══════════════════════════════════════════════════════════╗
║  FLOW COMPLETE                                           ║
╠══════════════════════════════════════════════════════════╣
║  Deal ID       : ${executed.id.padEnd(40)} ║
║  Payer         : ${buyer.name.padEnd(40)} ║
║  Payee         : ${data.name.padEnd(40)} ║
║  Amount        : ${nanoToTon(executed.amount_nano).padEnd(40)} ║
║  Receipt       : ${(executed.execution_receipt || "").padEnd(40)} ║
║  Executed at   : ${(executed.executed_at || "").padEnd(40)} ║
╠══════════════════════════════════════════════════════════╣
║  TAK never held funds.                                   ║
║  Execution was performed by: ${(executed.adapter || "").padEnd(28)} ║
╚══════════════════════════════════════════════════════════╝${RESET}
`);
}

runFullFlow().catch(err => {
    console.error("\x1b[31mFlow failed:", err.message, "\x1b[0m");
    if (err.body) console.error("Detail:", JSON.stringify(err.body, null, 2));
    process.exit(1);
});
