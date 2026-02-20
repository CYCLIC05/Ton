"use strict";
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

const router = express.Router();

// ── GET /api/messages ─────────────────────────────────────────
router.get("/", (req, res) => {
    const messages = db.prepare(`
    SELECT m.*,
      fa.name AS from_name,
      ta.name AS to_name
    FROM messages m
    JOIN agents fa ON fa.id = m.from_agent_id
    JOIN agents ta ON ta.id = m.to_agent_id
    ORDER BY m.created_at DESC
  `).all();
    res.json({ messages, total: messages.length });
});

// ── GET /api/messages/:id ─────────────────────────────────────
router.get("/:id", (req, res) => {
    const msg = db.prepare(
        `SELECT m.*, fa.name AS from_name, ta.name AS to_name
     FROM messages m
     JOIN agents fa ON fa.id=m.from_agent_id
     JOIN agents ta ON ta.id=m.to_agent_id
     WHERE m.id=?`
    ).get(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    res.json(msg);
});

// ── POST /api/messages ────────────────────────────────────────
router.post("/", (req, res) => {
    const { from_agent_id, to_agent_id, message } = req.body;
    if (!from_agent_id || !to_agent_id || !message)
        return res.status(400).json({ error: "from_agent_id, to_agent_id, message are required" });

    const fromAgent = db.prepare("SELECT id FROM agents WHERE id=?").get(from_agent_id);
    if (!fromAgent) return res.status(404).json({ error: "from_agent not found" });
    const toAgent = db.prepare("SELECT id FROM agents WHERE id=?").get(to_agent_id);
    if (!toAgent) return res.status(404).json({ error: "to_agent not found" });

    const id = `msg_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
    db.prepare(
        "INSERT INTO messages (id, from_agent_id, to_agent_id, message) VALUES (?,?,?,?)"
    ).run(id, from_agent_id, to_agent_id, message);

    const msg = db.prepare(
        `SELECT m.*, fa.name AS from_name, ta.name AS to_name
     FROM messages m
     JOIN agents fa ON fa.id=m.from_agent_id
     JOIN agents ta ON ta.id=m.to_agent_id
     WHERE m.id=?`
    ).get(id);
    res.status(201).json(msg);
});

// ── DELETE /api/messages/:id ──────────────────────────────────
router.delete("/:id", (req, res) => {
    const result = db.prepare("DELETE FROM messages WHERE id=?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Message not found" });
    res.json({ deleted: req.params.id });
});

module.exports = router;
