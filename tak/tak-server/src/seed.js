"use strict";
/**
 * TAK — Seed script
 * Creates BuyerAgent, DataAgent, and market_data service.
 * Safe to run multiple times (skips existing records).
 */
const db = require("./db");

function seed() {
    console.log("[TAK Seed] Seeding database...");

    // ─── Agents ────────────────────────────────────────────────
    const existingBuyer = db.prepare("SELECT id FROM agents WHERE name='BuyerAgent'").get();
    let buyerId;
    if (existingBuyer) {
        buyerId = existingBuyer.id;
        console.log("[TAK Seed] BuyerAgent already exists:", buyerId);
    } else {
        buyerId = "ag_buyer_seed_001";
        db.prepare(
            "INSERT INTO agents (id, name, description, capabilities, endpoint_url, status) VALUES (?,?,?,?,?,?)"
        ).run(
            buyerId,
            "BuyerAgent",
            "Discovers and negotiates data services from the TAK catalogue",
            JSON.stringify(["negotiate", "request", "evaluate"]),
            "https://agents.tak/buyer",
            "active"
        );
        console.log("[TAK Seed] Created BuyerAgent:", buyerId);
    }

    const existingData = db.prepare("SELECT id FROM agents WHERE name='DataAgent'").get();
    let dataId;
    if (existingData) {
        dataId = existingData.id;
        console.log("[TAK Seed] DataAgent already exists:", dataId);
    } else {
        dataId = "ag_data_seed_001";
        db.prepare(
            "INSERT INTO agents (id, name, description, capabilities, endpoint_url, status) VALUES (?,?,?,?,?,?)"
        ).run(
            dataId,
            "DataAgent",
            "Provides normalized market data packages on request",
            JSON.stringify(["provide_data", "stream", "archive"]),
            "https://agents.tak/data",
            "active"
        );
        console.log("[TAK Seed] Created DataAgent:", dataId);
    }

    // ─── Service ───────────────────────────────────────────────
    const existingService = db.prepare(
        "SELECT id FROM services WHERE service_name='market_data' AND agent_id=?"
    ).get(dataId);

    if (existingService) {
        console.log("[TAK Seed] market_data service already exists:", existingService.id);
    } else {
        const svcId = "svc_market_seed_001";
        db.prepare(
            "INSERT INTO services (id, agent_id, service_name, description, base_price_nano, unit) VALUES (?,?,?,?,?,?)"
        ).run(
            svcId,
            dataId,
            "market_data",
            "Q4 normalized market dataset — JSON, delivered in <10s. Includes anomaly flags.",
            1500000000,   // 1.5 TON in nanoTON — integer, no floats
            "per request"
        );
        console.log("[TAK Seed] Created service market_data at 1,500,000,000 nanoTON (1.5 TON):", svcId);
    }

    console.log("[TAK Seed] Done.");
    return { buyerId, dataId };
}

module.exports = { seed };

// Run directly if invoked as script
if (require.main === module) {
    seed();
    process.exit(0);
}
