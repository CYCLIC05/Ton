"use strict";
/**
 * TAK — API Server entry point
 *
 * TAK is a developer coordination toolkit.
 * Integrate TAK into your agent app to standardize negotiation + deal execution.
 * TAK never holds funds — execution is delegated to MCP.
 *
 * UI = demo  |  API/SDK = product
 */
const express = require("express");
const cors = require("cors");

const { seed } = require("./seed");
const MockMCPAdapter = require("./adapters/MockMCPAdapter");

// ── Route modules ─────────────────────────────────────────────
const agentsRouter = require("./routes/agents");
const servicesRouter = require("./routes/services");
const requestsRouter = require("./routes/requests");
const offersRouter = require("./routes/offers");
const dealsRouter = require("./routes/deals");
const messagesRouter = require("./routes/messages");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// ── Idempotency middleware ────────────────────────────────
// Store idempotency keys in memory (in production, use Redis)
const idempotencyStore = new Map();
app.use((req, res, next) => {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
        const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotency_key;
        if (idempotencyKey) {
            const cached = idempotencyStore.get(idempotencyKey);
            if (cached) {
                res.status(cached.status).json(cached.data);
                return;
            }
            // Wrap res.json to cache responses
            const originalJson = res.json;
            res.json = function (data) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    idempotencyStore.set(idempotencyKey, { status: res.statusCode, data });
                    // Clear after 24 hours
                    setTimeout(() => idempotencyStore.delete(idempotencyKey), 86400000);
                }
                return originalJson.call(this, data);
            };
        }
    }
    next();
});

// ── Schema version validation ─────────────────────────────
// ── Inject MCP Adapter ────────────────────────────────────────
// To use a real TON MCP adapter:
//   const TonMCPAdapter = require("./adapters/TonMCPAdapter");
//   app.set("mcpAdapter", new TonMCPAdapter({ rpcUrl: process.env.TON_RPC }));
app.set("mcpAdapter", new MockMCPAdapter());

// ── Routes ────────────────────────────────────────────────────
app.use("/api/agents", agentsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/offers", offersRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/messages", messagesRouter);

// ── Health / info endpoint ────────────────────────────────────
app.get("/", (req, res) => {
    res.json({
        name: "TAK — TON Agent Kit",
        version: "0.1.0",
        schema_version: "tak/0.1",
        description: "TAK is a developer coordination toolkit. API/SDK = product. UI = demo.",
        positioning: "TAK never holds funds. Execution is delegated to MCPAdapter.",
        features: {
            coordination: "off-chain agent negotiation",
            deals: "immutable deal snapshots with approval gates",
            execution: "delegated to MCP adapters (no fund handling)",
            pricing: "all amounts in nanoTON (integers only)",
        },
        endpoints: {
            agents: "/api/agents",
            services: "/api/services",
            requests: "/api/requests",
            offers: "/api/offers",
            deals: "/api/deals",
            messages: "/api/messages",
        },
        deal_state_machine: "awaiting_approval → approved → executed | failed | cancelled",
        mcp_adapter: app.get("mcpAdapter").constructor.name,
        api_features: {
            idempotency_keys: "supported (via idempotency-key header or req.body.idempotency_key)",
            schema_versioning: "tak/0.1",
            pricing_unit: "nanoTON (1 TON = 1,000,000,000 nanoTON)",
        },
    });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("[TAK Error]", err);
    res.status(500).json({ error: "Internal server error", detail: err.message });
});

// ── Boot ──────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  TAK — TON Agent Kit · API Server                ║
║  http://localhost:${PORT}                             ║
║                                                  ║
║  TAK is a developer coordination toolkit.        ║
║  API/SDK = product   |   UI = demo               ║
║  TAK never holds funds.                          ║
╚══════════════════════════════════════════════════╝
  `);
    seed();
});

module.exports = app;
