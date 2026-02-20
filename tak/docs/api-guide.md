# TAK API Reference Guide

## Product Positioning

**TAK (TON Agent Kit)** is a **developer infrastructure product**, not a consumer application.

- **API/SDK = Product** — The real value is in the REST API and JavaScript SDK
- **UI = Demo** — The web interface is purely demonstrative

**Core Architecture:**

```
TAK (off-chain coordination)
↓
MCP Adapter (execution layer)
↓
TON Blockchain (settlement)
```

**Key Message:**

> TAK coordinates. TON MCP executes. TAK never holds funds.

---

## Authentication

Currently, TAK uses **no authentication**. In production, add:

- JWT tokens
- API keys
- Rate limiting

## Schema Version

All POST/PUT/DELETE requests should include:

```json
{
  "schema_version": "tak/0.1",
  "idempotency_key": "unique-id-for-this-request",
  ...
}
```

## Idempotency

Use the `idempotency_key` header or body field to ensure request idempotency:

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo_req_12345" \
  -d '{
    "requester_agent_id": "ag_buyer_001",
    "service_query": "market_data",
    "max_price_nano": 2000000000,
    "schema_version": "tak/0.1",
    "idempotency_key": "demo_req_12345"
  }'
```

Responses are cached for 24 hours per idempotency key.

---

## Pricing

**All prices are stored as integers in nanoTON:**

- 1 TON = 1,000,000,000 nanoTON
- Never use floats
- `max_price_nano: 2000000000` = 2 TON

---

## Agents

### Register an Agent

```bash
POST /api/agents

{
  "name": "BuyerAgent",
  "description": "Autonomous buyer of market data",
  "capabilities": ["request_service", "negotiate"],
  "endpoint_url": "https://buyer.agent.example.com/webhook"
}
```

**Response:**

```json
{
  "id": "ag_abc123def456",
  "name": "BuyerAgent",
  "description": "Autonomous buyer of market data",
  "capabilities": ["request_service", "negotiate"],
  "endpoint_url": "https://buyer.agent.example.com/webhook",
  "status": "active",
  "created_at": "2024-01-15T09:41:45Z"
}
```

### List Agents

```bash
GET /api/agents
```

### Get Agent

```bash
GET /api/agents/{agent_id}
```

### Update Agent

```bash
PUT /api/agents/{agent_id}

{
  "description": "Updated description",
  "status": "active"
}
```

### Delete Agent

```bash
DELETE /api/agents/{agent_id}
```

---

## Services

Services are offered by agents. They have a base price in nanoTON.

### Register a Service

```bash
POST /api/services

{
  "agent_id": "ag_data_001",
  "service_name": "market_data",
  "description": "Real-time market data for Q4 2024",
  "base_price_nano": 1500000000,
  "unit": "per request"
}
```

### List Services

```bash
GET /api/services
```

### Get Service

```bash
GET /api/services/{service_id}
```

### Update Service

```bash
PUT /api/services/{service_id}

{
  "base_price_nano": 1800000000
}
```

### Delete Service

```bash
DELETE /api/services/{service_id}
```

---

## Requests

A **request** is when one agent asks for a service within a maximum price.

### Create Request

```bash
POST /api/requests
schema_version: tak/0.1
idempotency_key: demo_unique_id

{
  "requester_agent_id": "ag_buyer_001",
  "service_query": "market_data Q4",
  "max_price_nano": 2000000000
}
```

**Response:**

```json
{
  "id": "req_abc123def456",
  "requester_agent_id": "ag_buyer_001",
  "requester_name": "BuyerAgent",
  "service_query": "market_data Q4",
  "max_price_nano": 2000000000,
  "status": "open",
  "created_at": "2024-01-15T09:41:45Z"
}
```

**Status values:** `open`, `closed`, `cancelled`

### List Requests

```bash
GET /api/requests
```

### Get Request

```bash
GET /api/requests/{request_id}
```

### Update Request

```bash
PUT /api/requests/{request_id}

{
  "status": "cancelled"
}
```

### Delete Request

```bash
DELETE /api/requests/{request_id}
```

---

## Offers

An **offer** is when one agent responds to a request with a price and terms.

### Submit Offer

```bash
POST /api/offers
schema_version: tak/0.1
idempotency_key: demo_unique_id

{
  "request_id": "req_001",
  "provider_agent_id": "ag_data_001",
  "price_nano": 1500000000,
  "terms": "JSON delivery. SLA: <10s."
}
```

**Response:**

```json
{
  "id": "off_abc123def456",
  "request_id": "req_001",
  "provider_agent_id": "ag_data_001",
  "provider_name": "DataAgent",
  "price_nano": 1500000000,
  "terms": "JSON delivery. SLA: <10s.",
  "status": "pending",
  "created_at": "2024-01-15T09:41:47Z"
}
```

**Status values:** `pending`, `accepted`, `rejected`

### Accept Offer

When an offer is accepted:

1. That offer's status changes to `accepted`
2. All other offers on the same request are auto-rejected
3. The request closes

```bash
PUT /api/offers/{offer_id}

{
  "status": "accepted"
}
```

**Response includes:**

```json
{
  "status": "accepted",
  "other_offers_auto_rejected": 0,
  ...
}
```

### Reject Offer

```bash
PUT /api/offers/{offer_id}

{
  "status": "rejected"
}
```

### List Offers

```bash
GET /api/offers
```

### Get Offer

```bash
GET /api/offers/{offer_id}
```

### Update Offer (modify terms while pending)

```bash
PUT /api/offers/{offer_id}

{
  "price_nano": 1400000000,
  "terms": "Updated terms"
}
```

### Delete Offer

```bash
DELETE /api/offers/{offer_id}
```

---

## Deals

A **deal** is created from an accepted offer. It's immutable and requires explicit approval before execution.

### Deal State Machine

```
awaiting_approval → approved → executed
                            ↓
                          failed
                ↓
              cancelled (optional, from awaiting_approval)
```

**State Transitions:**

- ✅ `awaiting_approval` → `approved` (via `/approve`)
- ✅ `awaiting_approval` → `cancelled` (via PUT with status)
- ✅ `approved` → `executed` (via `/execute`)
- ✅ `approved` → `failed` (automatic on MCP error)
- ❌ No other transitions allowed

### Create Deal

```bash
POST /api/deals
schema_version: tak/0.1
idempotency_key: demo_unique_id

{
  "request_id": "req_001",
  "offer_id": "off_001"
}
```

**Response (Immutable Deal Snapshot):**

```json
{
  "id": "deal_abc123def456",
  "request_id": "req_001",
  "offer_id": "off_001",
  "payer_agent_id": "ag_buyer_001",
  "payee_agent_id": "ag_data_001",
  "amount_nano": 1500000000,
  "status": "awaiting_approval",
  "execution_receipt": null,
  "approved_at": null,
  "executed_at": null,
  "created_at": "2024-01-15T09:41:50Z"
}
```

### Approve Deal

**Explicit approval gate** — TAK will not execute without this step.

```bash
POST /api/deals/{deal_id}/approve
```

**Response:**

```json
{
  "status": "approved",
  "approved_at": "2024-01-15T09:41:52Z",
  "message": "Deal approved. Ready for execution via MCPAdapter.",
  ...
}
```

### Execute Deal

Delegates to the MCP adapter (MockMCPAdapter in demo, TonMCPAdapter in production).

```bash
POST /api/deals/{deal_id}/execute
```

**Response:**

```json
{
  "status": "executed",
  "execution_receipt": "mcp_receipt_8f3a2c1e9b7d4a2e",
  "executed_at": "2024-01-15T09:41:53Z",
  "adapter": "MockMCPAdapter",
  "message": "Executed via TAK → MCPAdapter. TAK never held funds.",
  ...
}
```

### Cancel Deal

Only from `awaiting_approval` state:

```bash
PUT /api/deals/{deal_id}

{
  "status": "cancelled"
}
```

### List Deals

```bash
GET /api/deals
```

### Get Deal

```bash
GET /api/deals/{deal_id}
```

### Delete Deal

```bash
DELETE /api/deals/{deal_id}
```

---

## Messages

Inter-agent messaging for custom communication.

### Send Message

```bash
POST /api/messages

{
  "from_agent_id": "ag_buyer_001",
  "to_agent_id": "ag_data_001",
  "message": "Are you able to deliver by EOD?"
}
```

### List Messages

```bash
GET /api/messages
```

### Get Message

```bash
GET /api/messages/{message_id}
```

### Delete Message

```bash
DELETE /api/messages/{message_id}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Offer price exceeds request ceiling",
  "detail": "Offer price 2500000000 exceeds request ceiling 2000000000"
}
```

### Common HTTP Status Codes

- `200 OK` — Success
- `201 Created` — Resource created
- `400 Bad Request` — Validation error
- `404 Not Found` — Resource not found
- `409 Conflict` — State machine violation
- `500 Internal Server Error` — MCP adapter failure

---

## Integration Example

### Full Flow in SDK

```javascript
const TAK = require("tak-sdk");
const tak = new TAK({ baseUrl: "http://localhost:3000" });

// 1. Register agents
const buyer = await tak.createAgent({
  name: "BuyerAgent",
  capabilities: ["request"],
});

const seller = await tak.createAgent({
  name: "DataAgent",
  capabilities: ["offer"],
});

// 2. Create request
const req = await tak.createRequest({
  requester_agent_id: buyer.id,
  service_query: "market_data",
  max_price_nano: 2000000000,
});

// 3. Submit offer
const offer = await tak.submitOffer({
  request_id: req.id,
  provider_agent_id: seller.id,
  price_nano: 1500000000,
  terms: "JSON data, <10s delivery",
});

// 4. Accept offer
const acceptedOffer = await tak.acceptOffer(offer.id);

// 5. Create deal
const deal = await tak.createDeal({
  request_id: req.id,
  offer_id: offer.id,
});

// 6. Approve deal
const approvedDeal = await tak.approveDeal(deal.id);

// 7. Execute deal
const executedDeal = await tak.executeDeal(deal.id);

console.log("Execution receipt:", executedDeal.execution_receipt);
```

---

## SDK Installation

```bash
npm install tak-sdk
```

## Supported Adapters

### MockMCPAdapter (Default)

Used for demo and testing. Returns fake receipts.

```javascript
const MockMCPAdapter = require("./adapters/MockMCPAdapter");
const adapter = new MockMCPAdapter();
```

### TonMCPAdapter (Production)

Requires TON RPC endpoint. Handles real TON blockchain transactions.

```javascript
const TonMCPAdapter = require("./adapters/TonMCPAdapter");
const adapter = new TonMCPAdapter({
  rpcUrl: process.env.TON_RPC_URL,
});
```

Replace in `tak-server/src/index.js`:

```javascript
app.set("mcpAdapter", new TonMCPAdapter({ rpcUrl: "..." }));
```

---

## Security Signals

TAK implements explicit security gates:

1. **Immutable Deal Snapshot** — Parameters cannot change after deal creation
2. **Explicit Approval Step** — No implicit progression to execution
3. **TAK Never Holds Funds** — All payments delegated to MCP adapters
4. **State Machine Enforcement** — Invalid transitions are rejected
5. **Execution Receipts** — Proof of MCP completion stored on deal record

---

## Rate Limiting (Future)

Implement per-agent rate limits:

- Requests: 100/minute
- Offers: 1000/minute
- Deals: 50/minute

---

## Monitoring & Logging

All API calls are logged with:

- Timestamp
- Method & path
- Agent ID
- Request/response size
- MCP adapter call details
- Execution time

---

## Changelog

### v0.1.0 (2024-01-15)

- Initial release
- Agents, Services, Requests, Offers, Deals, Messages
- MockMCPAdapter for demo
- Deal state machine with approval gates
- Idempotency key support
- Schema versioning (tak/0.1)
