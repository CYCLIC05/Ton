"use strict";
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

// ── GET /api/services ─────────────────────────────────────────
router.get("/", (req, res) => {
    const services = db.prepare(`
    SELECT s.*, a.name AS agent_name
    FROM services s
    JOIN agents a ON a.id = s.agent_id
    ORDER BY s.created_at DESC
  `).all();
    res.json({ services, total: services.length });
});

// ── GET /api/services/:id ──────────────────────────────────────
router.get("/:id", (req, res) => {
    const svc = db.prepare(
        "SELECT s.*, a.name AS agent_name FROM services s JOIN agents a ON a.id=s.agent_id WHERE s.id=?"
    ).get(req.params.id);
    if (!svc) return res.status(404).json({ error: "Service not found" });
    res.json(svc);
});

// ── POST /api/services ────────────────────────────────────────
router.post("/", (req, res) => {
    const { agent_id, service_name, description, base_price_nano, unit = "per request" } = req.body;
    if (!agent_id || !service_name || base_price_nano === undefined)
        return res.status(400).json({ error: "agent_id, service_name, base_price_nano are required" });
    if (!Number.isInteger(base_price_nano) || base_price_nano < 0)
        return res.status(400).json({ error: "base_price_nano must be a non-negative integer (nanoTON)" });

    const agent = db.prepare("SELECT id FROM agents WHERE id=?").get(agent_id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const id = `svc_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    db.prepare(
        "INSERT INTO services (id, agent_id, service_name, description, base_price_nano, unit) VALUES (?,?,?,?,?,?)"
    ).run(id, agent_id, service_name, description || null, base_price_nano, unit);

    const svc = db.prepare(
        "SELECT s.*, a.name AS agent_name FROM services s JOIN agents a ON a.id=s.agent_id WHERE s.id=?"
    ).get(id);
    res.status(201).json(svc);
});

// ── PUT /api/services/:id ─────────────────────────────────────
router.put("/:id", (req, res) => {
    const svc = db.prepare("SELECT * FROM services WHERE id=?").get(req.params.id);
    if (!svc) return res.status(404).json({ error: "Service not found" });

    const { service_name, description, base_price_nano, unit } = req.body;
    if (base_price_nano !== undefined && (!Number.isInteger(base_price_nano) || base_price_nano < 0))
        return res.status(400).json({ error: "base_price_nano must be a non-negative integer" });

    db.prepare(
        `UPDATE services SET
      service_name = COALESCE(?, service_name),
      description = COALESCE(?, description),
      base_price_nano = COALESCE(?, base_price_nano),
      unit = COALESCE(?, unit)
    WHERE id = ?`
    ).run(service_name || null, description || null, base_price_nano ?? null, unit || null, req.params.id);

    const updated = db.prepare(
        "SELECT s.*, a.name AS agent_name FROM services s JOIN agents a ON a.id=s.agent_id WHERE s.id=?"
    ).get(req.params.id);
    res.json(updated);
});

// ── DELETE /api/services/:id ──────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db.prepare("DELETE FROM services WHERE id=?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Service not found" });
    res.json({ deleted: req.params.id });
});

module.exports = router;
