"use strict";
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

// ── GET /api/offers ───────────────────────────────────────────
router.get("/", (req, res) => {
    const offers = db.prepare(`
    SELECT o.*, a.name AS provider_name
    FROM offers o
    JOIN agents a ON a.id = o.provider_agent_id
    ORDER BY o.created_at DESC
  `).all();
    res.json({ offers, total: offers.length });
});

// ── GET /api/offers/:id ───────────────────────────────────────
router.get("/:id", (req, res) => {
    const offer = db.prepare(
        "SELECT o.*, a.name AS provider_name FROM offers o JOIN agents a ON a.id=o.provider_agent_id WHERE o.id=?"
    ).get(req.params.id);
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    res.json(offer);
});

// ── POST /api/offers ──────────────────────────────────────────
router.post("/", (req, res) => {
    const { request_id, provider_agent_id, price_nano, terms } = req.body;
    if (!request_id || !provider_agent_id || price_nano === undefined)
        return res.status(400).json({ error: "request_id, provider_agent_id, price_nano are required" });
    if (!Number.isInteger(price_nano) || price_nano <= 0)
        return res.status(400).json({ error: "price_nano must be a positive integer (nanoTON)" });

    const request = db.prepare("SELECT * FROM requests WHERE id=?").get(request_id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "open")
        return res.status(409).json({ error: `Cannot offer on a ${request.status} request` });
    if (price_nano > request.max_price_nano)
        return res.status(409).json({
            error: `Offer price ${price_nano} exceeds request ceiling ${request.max_price_nano}`
        });

    const agent = db.prepare("SELECT id FROM agents WHERE id=?").get(provider_agent_id);
    if (!agent) return res.status(404).json({ error: "Provider agent not found" });

    const id = `off_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    db.prepare(
        "INSERT INTO offers (id, request_id, provider_agent_id, price_nano, terms) VALUES (?,?,?,?,?)"
    ).run(id, request_id, provider_agent_id, price_nano, terms || null);

    const offer = db.prepare(
        "SELECT o.*, a.name AS provider_name FROM offers o JOIN agents a ON a.id=o.provider_agent_id WHERE o.id=?"
    ).get(id);
    res.status(201).json(offer);
});

// ── PUT /api/offers/:id ── (accept / reject manually, or update terms)
router.put("/:id", (req, res) => {
    const offer = db.prepare("SELECT * FROM offers WHERE id=?").get(req.params.id);
    if (!offer) return res.status(404).json({ error: "Offer not found" });

    const { status, terms, price_nano } = req.body;

    // Accepting an offer triggers auto-reject of all competing offers on same request
    if (status === "accepted") {
        if (offer.status !== "pending")
            return res.status(409).json({ error: `Offer is already ${offer.status}` });

        const acceptTxn = db.transaction(() => {
            db.prepare("UPDATE offers SET status='accepted' WHERE id=?").run(offer.id);
            // Auto-reject all other pending offers on same request
            db.prepare(
                "UPDATE offers SET status='rejected' WHERE request_id=? AND id != ? AND status='pending'"
            ).run(offer.request_id, offer.id);
            // Close the request
            db.prepare("UPDATE requests SET status='closed' WHERE id=?").run(offer.request_id);
        });
        acceptTxn();

        const updated = db.prepare(
            "SELECT o.*, a.name AS provider_name FROM offers o JOIN agents a ON a.id=o.provider_agent_id WHERE o.id=?"
        ).get(req.params.id);
        const rejected = db.prepare(
            "SELECT COUNT(*) AS count FROM offers WHERE request_id=? AND status='rejected'"
        ).get(offer.request_id);
        return res.json({
            ...updated,
            other_offers_auto_rejected: rejected.count,
        });
    }

    if (status === "rejected") {
        db.prepare("UPDATE offers SET status='rejected' WHERE id=?").run(offer.id);
        return res.json(db.prepare("SELECT * FROM offers WHERE id=?").get(req.params.id));
    }

    // General update (terms, price while still pending)
    if (offer.status !== "pending")
        return res.status(409).json({ error: "Cannot modify a non-pending offer" });

    if (price_nano !== undefined && (!Number.isInteger(price_nano) || price_nano <= 0))
        return res.status(400).json({ error: "price_nano must be a positive integer" });

    db.prepare(
        `UPDATE offers SET
      terms = COALESCE(?, terms),
      price_nano = COALESCE(?, price_nano)
    WHERE id = ?`
    ).run(terms || null, price_nano ?? null, req.params.id);

    const updated = db.prepare(
        "SELECT o.*, a.name AS provider_name FROM offers o JOIN agents a ON a.id=o.provider_agent_id WHERE o.id=?"
    ).get(req.params.id);
    res.json(updated);
});

// ── DELETE /api/offers/:id ────────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db.prepare("DELETE FROM offers WHERE id=?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Offer not found" });
    res.json({ deleted: req.params.id });
});

module.exports = router;
