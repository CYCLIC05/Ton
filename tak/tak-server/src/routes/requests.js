"use strict";
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

// ── GET /api/requests ─────────────────────────────────────────
router.get("/", (req, res) => {
    const requests = db.prepare(`
    SELECT r.*, a.name AS requester_name
    FROM requests r
    JOIN agents a ON a.id = r.requester_agent_id
    ORDER BY r.created_at DESC
  `).all();
    res.json({ requests, total: requests.length });
});

// ── GET /api/requests/:id ─────────────────────────────────────
router.get("/:id", (req, res) => {
    const request = db.prepare(
        "SELECT r.*, a.name AS requester_name FROM requests r JOIN agents a ON a.id=r.requester_agent_id WHERE r.id=?"
    ).get(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json(request);
});

// ── POST /api/requests ────────────────────────────────────────
router.post("/", (req, res) => {
    const { requester_agent_id, service_query, max_price_nano } = req.body;
    if (!requester_agent_id || !service_query || max_price_nano === undefined)
        return res.status(400).json({ error: "requester_agent_id, service_query, max_price_nano are required" });
    if (!Number.isInteger(max_price_nano) || max_price_nano <= 0)
        return res.status(400).json({ error: "max_price_nano must be a positive integer (nanoTON)" });

    const agent = db.prepare("SELECT id FROM agents WHERE id=?").get(requester_agent_id);
    if (!agent) return res.status(404).json({ error: "Requester agent not found" });

    const id = `req_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    db.prepare(
        "INSERT INTO requests (id, requester_agent_id, service_query, max_price_nano) VALUES (?,?,?,?)"
    ).run(id, requester_agent_id, service_query, max_price_nano);

    const request = db.prepare(
        "SELECT r.*, a.name AS requester_name FROM requests r JOIN agents a ON a.id=r.requester_agent_id WHERE r.id=?"
    ).get(id);
    res.status(201).json(request);
});

// ── PUT /api/requests/:id ─────────────────────────────────────
router.put("/:id", (req, res) => {
    const request = db.prepare("SELECT * FROM requests WHERE id=?").get(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const { service_query, max_price_nano, status } = req.body;
    const validStatuses = ["open", "closed", "cancelled"];
    if (status && !validStatuses.includes(status))
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });

    db.prepare(
        `UPDATE requests SET
      service_query = COALESCE(?, service_query),
      max_price_nano = COALESCE(?, max_price_nano),
      status = COALESCE(?, status)
    WHERE id = ?`
    ).run(service_query || null, max_price_nano ?? null, status || null, req.params.id);

    const updated = db.prepare(
        "SELECT r.*, a.name AS requester_name FROM requests r JOIN agents a ON a.id=r.requester_agent_id WHERE r.id=?"
    ).get(req.params.id);
    res.json(updated);
});

// ── DELETE /api/requests/:id ──────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db.prepare("DELETE FROM requests WHERE id=?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Request not found" });
    res.json({ deleted: req.params.id });
});

module.exports = router;
