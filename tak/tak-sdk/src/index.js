"use strict";
/**
 * TAK SDK — JavaScript Client
 * ─────────────────────────────────────────────────────────────────────────────
 * TAK is a developer coordination toolkit.
 * Integrate TAK into your agent app to standardize negotiation + deal execution.
 * TAK never holds funds — execution is delegated to MCP.
 *
 * UI = demo   |   API/SDK = product
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   const TAK = require("tak-sdk");
 *   const tak = new TAK({ baseUrl: "http://localhost:3000" });
 *
 *   const agent = await tak.createAgent({ name: "MyAgent", capabilities: ["buy"] });
 *   const services = await tak.listServices();
 *   const request = await tak.createRequest({ ... });
 *   ...
 */

class TAKError extends Error {
    constructor(message, status, body) {
        super(message);
        this.name = "TAKError";
        this.status = status;
        this.body = body;
    }
}

class TAK {
    /**
     * @param {Object} config
     * @param {string} config.baseUrl  - TAK server base URL (default: http://localhost:3000)
     */
    constructor({ baseUrl = "http://localhost:3000" } = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    // ── Internal fetch wrapper ──────────────────────────────────
    async _request(method, path, body = null, idempotencyKey = null) {
        const url = `${this.baseUrl}${path}`;
        const options = {
            method,
            headers: { 
                "Content-Type": "application/json",
            },
        };
        
        // Add idempotency key header if provided
        if (idempotencyKey) {
            options.headers["Idempotency-Key"] = idempotencyKey;
        }
        
        if (body !== null) options.body = JSON.stringify(body);

        let res;
        try {
            res = await fetch(url, options);
        } catch (err) {
            throw new TAKError(`Network error: ${err.message}`, 0, null);
        }

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }

        if (!res.ok) {
            throw new TAKError(
                data?.error || `HTTP ${res.status}`,
                res.status,
                data
            );
        }
        return data;
    }

    // ════════════════════════════════════════════════════════════
    //  AGENTS
    // ════════════════════════════════════════════════════════════

    /**
     * Register a new agent in the TAK registry.
     * @param {{ name: string, description?: string, capabilities?: string[], endpoint_url?: string }} params
     */
    createAgent(params) {
        return this._request("POST", "/api/agents", params);
    }

    /** List all registered agents. */
    listAgents() {
        return this._request("GET", "/api/agents");
    }

    /** Get a single agent by ID. */
    getAgent(id) {
        return this._request("GET", `/api/agents/${id}`);
    }

    /** Update an agent's fields. */
    updateAgent(id, params) {
        return this._request("PUT", `/api/agents/${id}`, params);
    }

    /** Delete an agent by ID. */
    deleteAgent(id) {
        return this._request("DELETE", `/api/agents/${id}`);
    }

    // ════════════════════════════════════════════════════════════
    //  SERVICES
    // ════════════════════════════════════════════════════════════

    /**
     * Publish a service to the TAK catalogue.
     * @param {{ agent_id: string, service_name: string, description?: string, base_price_nano: number, unit?: string }} params
     * @note base_price_nano must be an integer (nanoTON). No floats.
     */
    publishService(params) {
        return this._request("POST", "/api/services", params);
    }

    /** List all published services. */
    listServices() {
        return this._request("GET", "/api/services");
    }

    /** Get a single service by ID. */
    getService(id) {
        return this._request("GET", `/api/services/${id}`);
    }

    /** Update a service. */
    updateService(id, params) {
        return this._request("PUT", `/api/services/${id}`, params);
    }

    /** Remove a service from the catalogue. */
    deleteService(id) {
        return this._request("DELETE", `/api/services/${id}`);
    }

    // ════════════════════════════════════════════════════════════
    //  REQUESTS
    // ════════════════════════════════════════════════════════════

    /**
     * Create a service request.
     * @param {{ requester_agent_id: string, service_query: string, max_price_nano: number }} params
     * @note max_price_nano is an integer ceiling (nanoTON). Offers above this are rejected.
     */
    createRequest(params) {
        return this._request("POST", "/api/requests", params);
    }

    /** List all requests. */
    listRequests() {
        return this._request("GET", "/api/requests");
    }

    /** Get a single request by ID. */
    getRequest(id) {
        return this._request("GET", `/api/requests/${id}`);
    }

    /** Update a request (e.g. cancel it: status: "cancelled"). */
    updateRequest(id, params) {
        return this._request("PUT", `/api/requests/${id}`, params);
    }

    /** Delete a request. */
    deleteRequest(id) {
        return this._request("DELETE", `/api/requests/${id}`);
    }

    // ════════════════════════════════════════════════════════════
    //  OFFERS
    // ════════════════════════════════════════════════════════════

    /**
     * Submit an offer against an open request.
     * @param {{ request_id: string, provider_agent_id: string, price_nano: number, terms?: string }} params
     * @note price_nano must not exceed the request's max_price_nano.
     */
    submitOffer(params) {
        return this._request("POST", "/api/offers", params);
    }

    /** List all offers. */
    listOffers() {
        return this._request("GET", "/api/offers");
    }

    /** Get a single offer by ID. */
    getOffer(id) {
        return this._request("GET", `/api/offers/${id}`);
    }

    /**
     * Accept an offer. TAK will auto-reject all competing offers on the same request.
     * @param {string} offerId
     */
    acceptOffer(offerId) {
        return this._request("PUT", `/api/offers/${offerId}`, { status: "accepted" });
    }

    /** Reject an offer. */
    rejectOffer(offerId) {
        return this._request("PUT", `/api/offers/${offerId}`, { status: "rejected" });
    }

    /** Delete an offer. */
    deleteOffer(id) {
        return this._request("DELETE", `/api/offers/${id}`);
    }

    // ════════════════════════════════════════════════════════════
    //  DEALS
    // ════════════════════════════════════════════════════════════

    /**
     * Create a deal from an accepted offer.
     * @param {{ request_id: string, offer_id: string }} params
     * Status starts as "awaiting_approval".
     */
    createDeal(params) {
        return this._request("POST", "/api/deals", params);
    }

    /** List all deals. */
    listDeals() {
        return this._request("GET", "/api/deals");
    }

    /** Get a single deal by ID. */
    getDeal(id) {
        return this._request("GET", `/api/deals/${id}`);
    }

    /**
     * Approve a deal.
     * Moves status: awaiting_approval → approved
     * Required before execution.
     */
    approveDeal(dealId) {
        return this._request("POST", `/api/deals/${dealId}/approve`);
    }

    /**
     * Execute a deal via the configured MCPAdapter.
     * Moves status: approved → executed
     * TAK never holds funds — execution is delegated to MCPAdapter.
     * @returns {{ execution_receipt, executed_at, adapter, status }}
     */
    executeDeal(dealId) {
        return this._request("POST", `/api/deals/${dealId}/execute`);
    }

    /** Cancel a deal (only from awaiting_approval). */
    cancelDeal(dealId) {
        return this._request("PUT", `/api/deals/${dealId}`, { status: "cancelled" });
    }

    // ════════════════════════════════════════════════════════════
    //  MESSAGES
    // ════════════════════════════════════════════════════════════

    /**
     * Send a message between agents.
     * @param {{ from_agent_id: string, to_agent_id: string, message: string }} params
     */
    sendMessage(params) {
        return this._request("POST", "/api/messages", params);
    }

    /** List all messages. */
    listMessages() {
        return this._request("GET", "/api/messages");
    }

    /** Get a single message by ID. */
    getMessage(id) {
        return this._request("GET", `/api/messages/${id}`);
    }

    /** Delete a message. */
    deleteMessage(id) {
        return this._request("DELETE", `/api/messages/${id}`);
    }
}

module.exports = TAK;
module.exports.TAKError = TAKError;
