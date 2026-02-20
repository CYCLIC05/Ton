"use strict";
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

// ── GET /api/agents ──────────────────────────────────────────
router.get("/", (req, res) => {
    const agents = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all();
    agents.forEach(a => { a.capabilities = JSON.parse(a.capabilities); });
    res.json({ agents, total: agents.length });
});

// ── GET /api/agents/:id ──────────────────────────────────────
router.get("/:id", (req, res) => {
    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    agent.capabilities = JSON.parse(agent.capabilities);
    res.json(agent);
});

// ── POST /api/agents ─────────────────────────────────────────
router.post("/", (req, res) => {
    const { name, description, capabilities = [], endpoint_url, status = "active" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const id = `ag_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    try {
        db.prepare(
            "INSERT INTO agents (id, name, description, capabilities, endpoint_url, status) VALUES (?,?,?,?,?,?)"
        ).run(id, name, description || null, JSON.stringify(capabilities), endpoint_url || null, status);

        const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
        agent.capabilities = JSON.parse(agent.capabilities);
        res.status(201).json(agent);
    } catch (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "Agent name already exists" });
        throw err;
    }
});

// ── PUT /api/agents/:id ──────────────────────────────────────
router.put("/:id", (req, res) => {
    const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const { name, description, capabilities, endpoint_url, status } = req.body;
    db.prepare(
        `UPDATE agents SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      capabilities = COALESCE(?, capabilities),
      endpoint_url = COALESCE(?, endpoint_url),
      status = COALESCE(?, status)
    WHERE id = ?`
    ).run(
        name || null,
        description || null,
        capabilities ? JSON.stringify(capabilities) : null,
        endpoint_url || null,
        status || null,
        req.params.id
    );

    const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.params.id);
    updated.capabilities = JSON.parse(updated.capabilities);
    res.json(updated);
});

// ── DELETE /api/agents/:id ───────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db.prepare("DELETE FROM agents WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Agent not found" });
    res.json({ deleted: req.params.id });
});

module.exports = router;
