"use strict";
/**
 * TAK — Database layer (SQLite via better-sqlite3)
 * All prices stored as INTEGER nanoTON. No floats anywhere.
 */
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "tak.db");

const db = new Database(DB_PATH);

// Enable WAL for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─────────────────────────────────────────────────────────────
//  Schema
// ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    description  TEXT,
    capabilities TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as text
    endpoint_url TEXT,
    status       TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id               TEXT PRIMARY KEY,
    agent_id         TEXT NOT NULL REFERENCES agents(id),
    service_name     TEXT NOT NULL,
    description      TEXT,
    base_price_nano  INTEGER NOT NULL,          -- nanoTON, always integer
    unit             TEXT NOT NULL DEFAULT 'per request',
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requests (
    id                   TEXT PRIMARY KEY,
    requester_agent_id   TEXT NOT NULL REFERENCES agents(id),
    service_query        TEXT NOT NULL,
    max_price_nano       INTEGER NOT NULL,       -- nanoTON ceiling
    status               TEXT NOT NULL DEFAULT 'open'
                           CHECK(status IN ('open','closed','cancelled')),
    created_at           TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS offers (
    id                  TEXT PRIMARY KEY,
    request_id          TEXT NOT NULL REFERENCES requests(id),
    provider_agent_id   TEXT NOT NULL REFERENCES agents(id),
    price_nano          INTEGER NOT NULL,        -- nanoTON, must be <= max
    terms               TEXT,
    status              TEXT NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','accepted','rejected')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id                TEXT PRIMARY KEY,
    request_id        TEXT NOT NULL REFERENCES requests(id),
    offer_id          TEXT NOT NULL REFERENCES offers(id),
    payer_agent_id    TEXT NOT NULL REFERENCES agents(id),
    payee_agent_id    TEXT NOT NULL REFERENCES agents(id),
    amount_nano       INTEGER NOT NULL,          -- copied from offer.price_nano
    status            TEXT NOT NULL DEFAULT 'awaiting_approval'
                        CHECK(status IN ('awaiting_approval','approved','executed','failed','cancelled')),
    execution_receipt TEXT,
    executed_at       TEXT,
    approved_at       TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id             TEXT PRIMARY KEY,
    from_agent_id  TEXT NOT NULL REFERENCES agents(id),
    to_agent_id    TEXT NOT NULL REFERENCES agents(id),
    message        TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
