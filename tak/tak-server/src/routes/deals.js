"use strict";
/**
 * TAK — Deals router
 *
 * State machine:
 *   awaiting_approval → approved → executed
 *   approved          → failed
 *   awaiting_approval → cancelled
 *
 * TAK never holds funds. Execution is delegated to the injected MCPAdapter.
 */
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

// ── GET /api/deals ────────────────────────────────────────────
router.get("/", (req, res) => {
    const deals = db.prepare("SELECT * FROM deals ORDER BY created_at DESC").all();
    res.json({ deals, total: deals.length });
});

// ── GET /api/deals/:id ────────────────────────────────────────
router.get("/:id", (req, res) => {
    const deal = db.prepare("SELECT * FROM deals WHERE id=?").get(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
});

// ── POST /api/deals ── (create from accepted offer) ───────────
router.post("/", (req, res) => {
    const { request_id, offer_id } = req.body;
    if (!request_id || !offer_id)
        return res.status(400).json({ error: "request_id and offer_id are required" });

    const offer = db.prepare("SELECT * FROM offers WHERE id=?").get(offer_id);
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    if (offer.status !== "accepted")
        return res.status(409).json({ error: "Only accepted offers can be used to create a deal" });
    if (offer.request_id !== request_id)
        return res.status(409).json({ error: "Offer does not belong to the given request" });

    const request = db.prepare("SELECT * FROM requests WHERE id=?").get(request_id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Ensure a deal doesn't already exist for this offer
    const existing = db.prepare("SELECT id FROM deals WHERE offer_id=?").get(offer_id);
    if (existing) return res.status(409).json({ error: "A deal for this offer already exists", deal_id: existing.id });

    const id = `deal_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    db.prepare(
        `INSERT INTO deals
      (id, request_id, offer_id, payer_agent_id, payee_agent_id, amount_nano)
     VALUES (?,?,?,?,?,?)`
    ).run(id, request_id, offer_id, request.requester_agent_id, offer.provider_agent_id, offer.price_nano);

    const deal = db.prepare("SELECT * FROM deals WHERE id=?").get(id);
    res.status(201).json(deal);
});

// ── POST /api/deals/:id/approve ───────────────────────────────
router.post("/:id/approve", (req, res) => {
    const deal = db.prepare("SELECT * FROM deals WHERE id=?").get(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    if (deal.status !== "awaiting_approval")
        return res.status(409).json({
            error: `Cannot approve deal with status '${deal.status}'. Must be 'awaiting_approval'.`,
            current_status: deal.status,
        });

    const now = new Date().toISOString();
    db.prepare(
        "UPDATE deals SET status='approved', approved_at=? WHERE id=?"
    ).run(now, deal.id);

    const updated = db.prepare("SELECT * FROM deals WHERE id=?").get(deal.id);
    res.json({
        ...updated,
        message: "Deal approved. Ready for execution via MCPAdapter.",
    });
});

// ── POST /api/deals/:id/execute ───────────────────────────────
router.post("/:id/execute", async (req, res) => {
    const deal = db.prepare("SELECT * FROM deals WHERE id=?").get(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    if (deal.status !== "approved")
        return res.status(409).json({
            error: `Cannot execute deal with status '${deal.status}'. Must be 'approved'.`,
            current_status: deal.status,
        });

    const adapter = req.app.get("mcpAdapter");

    try {
        const receipt = await adapter.execute_payment(deal);
        const now = new Date().toISOString();

        db.prepare(
            "UPDATE deals SET status='executed', execution_receipt=?, executed_at=? WHERE id=?"
        ).run(receipt, now, deal.id);

        const updated = db.prepare("SELECT * FROM deals WHERE id=?").get(deal.id);
        res.json({
            ...updated,
            adapter: adapter.constructor.name,
            message: "Executed via TAK → MCPAdapter. TAK never held funds.",
        });
    } catch (err) {
        db.prepare("UPDATE deals SET status='failed' WHERE id=?").run(deal.id);
        res.status(500).json({
            error: "MCP execution failed",
            detail: err.message,
            deal_status: "failed",
        });
    }
});

// ── PUT /api/deals/:id ── (cancel only, from awaiting_approval)
router.put("/:id", (req, res) => {
    const deal = db.prepare("SELECT * FROM deals WHERE id=?").get(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const { status } = req.body;
    if (status !== "cancelled")
        return res.status(400).json({ error: "Only 'cancelled' status is allowed via PUT" });
    if (deal.status !== "awaiting_approval")
        return res.status(409).json({ error: `Cannot cancel deal with status '${deal.status}'` });

    db.prepare("UPDATE deals SET status='cancelled' WHERE id=?").run(deal.id);
    res.json(db.prepare("SELECT * FROM deals WHERE id=?").get(deal.id));
});

// ── DELETE /api/deals/:id ──────────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db.prepare("DELETE FROM deals WHERE id=?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Deal not found" });
    res.json({ deleted: req.params.id });
});

module.exports = router;
