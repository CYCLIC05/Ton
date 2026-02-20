# TAK — TON Agent Kit v0.1

**Developer Infrastructure for Agent Coordination on TON**

---

## What is TAK?

TAK is a **developer infrastructure product** — not a consumer app.

**TAK solves a real infrastructure problem:**

Without TAK, developers must build custom negotiation, pricing, and deal logic for every agent interaction.

With TAK, agents coordinate using one standardized workflow.

### Core Architecture

```
TAK (off-chain coordination)
    ↓
MCP Adapter (execution layer)
    ↓
TON Blockchain (settlement)
```

**Key Message:**

> **TAK coordinates. TON MCP executes. TAK never holds funds.**

---

## The Real Product

```
API/SDK = Product
UI = Demo
```

The real value is in:

1. **REST API** — 6 endpoints for agent coordination
2. **JavaScript SDK** — `tak-sdk` npm package
3. **MCP Adapter Architecture** — Pluggable execution layer

The web interface is purely demonstrative. It shows what's possible but isn't the product itself.

---

## Use Case

**Machine-to-Machine Service Marketplace**

Autonomous agents buying data, APIs, and services from each other — without custom negotiation logic.

Example flow:

- BuyerAgent requests market data (max 2 TON)
- DataAgent submits offer (1.5 TON)
- BuyerAgent accepts
- Deal created (immutable snapshot)
- User approves (explicit gate)
- MCP adapter executes
- Receipt returned

---

## Features

### Coordination Layer

- **Service Discovery** — Agents find what's available
- **Pricing Negotiation** — Agents agree on price
- **Deal Creation** — Immutable snapshots with approval gates
- **State Machine** — Enforced deal lifecycle:
  ```
  awaiting_approval → approved → executed | failed | cancelled
  ```

### Developer-First

- **REST API** with idempotency keys and schema versioning
- **JavaScript SDK** — Simple, type-safe client
- **MCP Adapters** — Pluggable execution (MockMCP for demo, TonMCP for production)
- **API Documentation** — Complete reference guide
- **Execution Logs** — Real-time visibility into MCP calls

### Security Signals

1. **Immutable Deal Snapshots** — Parameters locked after creation
2. **Explicit Approval Step** — No implicit progression
3. **TAK Never Holds Funds** — 100% delegated to MCP adapters
4. **State Machine Enforcement** — Invalid transitions rejected
5. **Execution Receipts** — Proof stored on deal record

---

## Resources in TAK

All resources are immutable once created:

### Agents

Autonomous entities that request or provide services.

```json
{
  "id": "ag_abc123def456",
  "name": "BuyerAgent",
  "capabilities": ["request_service", "negotiate"],
  "status": "active"
}
```

### Services

Offerings by agents with a base price in nanoTON.

```json
{
  "id": "svc_abc123def456",
  "agent_id": "ag_data_001",
  "service_name": "market_data",
  "base_price_nano": 1500000000
}
```

### Requests

One agent asks for a service within a maximum price.

```json
{
  "id": "req_abc123def456",
  "requester_agent_id": "ag_buyer_001",
  "service_query": "market_data Q4",
  "max_price_nano": 2000000000,
  "status": "open"
}
```

### Offers

One agent responds to a request with a price and terms.

```json
{
  "id": "off_abc123def456",
  "request_id": "req_001",
  "provider_agent_id": "ag_data_001",
  "price_nano": 1500000000,
  "status": "pending"
}
```

### Deals

Created from accepted offers. Immutable, requires approval before execution.

```json
{
  "id": "deal_abc123def456",
  "request_id": "req_001",
  "offer_id": "off_001",
  "payer_agent_id": "ag_buyer_001",
  "payee_agent_id": "ag_data_001",
  "amount_nano": 1500000000,
  "status": "awaiting_approval",
  "execution_receipt": null
}
```

### Messages

Inter-agent communication for custom workflows.

```json
{
  "id": "msg_abc123def456",
  "from_agent_id": "ag_buyer_001",
  "to_agent_id": "ag_data_001",
  "message": "Can you deliver by EOD?"
}
```

---

## Pricing

**All prices are integers in nanoTON:**

```
1 TON = 1,000,000,000 nanoTON
```

Never use floats. Always work with nanotens.

Example:

```json
{
  "max_price_nano": 2000000000, // 2 TON
  "price_nano": 1500000000 // 1.5 TON
}
```

---

## Getting Started

### 1. Install SDK

```bash
npm install tak-sdk
```

### 2. Connect to Server

```javascript
const TAK = require("tak-sdk");
const tak = new TAK({
  baseUrl: "http://localhost:3000",
});
```

### 3. Full Workflow

```javascript
// Register agents
const buyer = await tak.createAgent({
  name: "BuyerAgent",
  capabilities: ["request"],
});

const seller = await tak.createAgent({
  name: "DataAgent",
  capabilities: ["offer"],
});

// Create request
const req = await tak.createRequest({
  requester_agent_id: buyer.id,
  service_query: "market_data",
  max_price_nano: 2000000000,
});

// Submit offer
const offer = await tak.submitOffer({
  request_id: req.id,
  provider_agent_id: seller.id,
  price_nano: 1500000000,
  terms: "JSON delivery, <10s",
});

// Accept offer
await tak.acceptOffer(offer.id);

// Create deal
const deal = await tak.createDeal({
  request_id: req.id,
  offer_id: offer.id,
});

// Approve deal (explicit gate)
await tak.approveDeal(deal.id);

// Execute deal (delegated to MCP)
const executed = await tak.executeDeal(deal.id);

console.log("Receipt:", executed.execution_receipt);
```

### 4. REST API

All endpoints use `schema_version` and `idempotency_key`:

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "requester_agent_id": "ag_buyer_001",
    "service_query": "market_data",
    "max_price_nano": 2000000000,
    "schema_version": "tak/0.1",
    "idempotency_key": "demo_req_12345"
  }'
```

---

## MCP Adapters

### MockMCPAdapter (Demo)

Default for development. Returns fake receipts.

```javascript
const MockMCPAdapter = require("./adapters/MockMCPAdapter");
const adapter = new MockMCPAdapter();
// → "mcp_receipt_8f3a2c1e9b7d4a2e"
```

### TonMCPAdapter (Production)

Real TON blockchain execution. Requires RPC endpoint.

```javascript
const TonMCPAdapter = require("./adapters/TonMCPAdapter");
const adapter = new TonMCPAdapter({
  rpcUrl: "https://toncenter.com/api/v2/jsonRPC",
});
```

Supports:

- TON transfers
- Jetton transfers
- NFT operations

---

## Project Structure

```
tak/
├── tak-sdk/              # JavaScript SDK
│   └── src/index.js      # TAK client class
├── tak-server/           # Node.js backend
│   ├── src/
│   │   ├── index.js      # Express server
│   │   ├── db.js         # SQLite schema & connection
│   │   ├── seed.js       # Demo data seeder
│   │   ├── adapters/
│   │   │   ├── MCPAdapter.js
│   │   │   ├── MockMCPAdapter.js
│   │   │   └── MCPAdapter.js (base)
│   │   └── routes/
│   │       ├── agents.js
│   │       ├── services.js
│   │       ├── requests.js
│   │       ├── offers.js
│   │       ├── deals.js
│   │       └── messages.js
│   └── package.json
├── tak-demo.jsx          # React demo UI
├── docs/
│   ├── api-guide.md      # Complete API reference
│   └── api-reference.md  # Quick reference
└── examples/
    ├── demo_flow_runner.js
    └── example_node_client.js
```

---

## Running TAK Locally

### Start Backend

```bash
cd tak/tak-server
npm install
npm start
```

Server runs on `http://localhost:3000`

### Run Demo Flow

```bash
node examples/demo_flow_runner.js
```

This runs the full 6-stage coordination flow:

1. Create request (BuyerAgent)
2. Submit offer (DataAgent)
3. Accept offer
4. Create deal
5. Approve deal
6. Execute deal (MockMCP)

### Open Web UI

If React is set up:

```bash
npm run dev
```

Navigate to the demo URL. It shows real-time execution of the coordination flow.

---

## API Endpoints

### Agents

```
POST /api/agents           # Register
GET  /api/agents           # List
GET  /api/agents/{id}      # Get
PUT  /api/agents/{id}      # Update
DELETE /api/agents/{id}    # Delete
```

### Services

```
POST /api/services
GET  /api/services
GET  /api/services/{id}
PUT  /api/services/{id}
DELETE /api/services/{id}
```

### Requests

```
POST /api/requests
GET  /api/requests
GET  /api/requests/{id}
PUT  /api/requests/{id}
DELETE /api/requests/{id}
```

### Offers

```
POST /api/offers
GET  /api/offers
GET  /api/offers/{id}
PUT  /api/offers/{id}       # Accept/reject
DELETE /api/offers/{id}
```

### Deals

```
POST /api/deals                        # Create
GET  /api/deals
GET  /api/deals/{id}
POST /api/deals/{id}/approve           # Approval gate
POST /api/deals/{id}/execute           # MCP execution
PUT  /api/deals/{id}                   # Cancel
DELETE /api/deals/{id}
```

### Messages

```
POST /api/messages
GET  /api/messages
GET  /api/messages/{id}
DELETE /api/messages/{id}
```

---

## State Machine

Deals follow a strict state machine:

```
awaiting_approval ──────→ approved ──────→ executed
                              ↓
                            failed (on MCP error)

awaiting_approval ──────→ cancelled (optional)
```

**Valid Transitions:**

- ✅ `awaiting_approval` → `approved` (via `/approve`)
- ✅ `awaiting_approval` → `cancelled` (via PUT)
- ✅ `approved` → `executed` (via `/execute`)
- ✅ `approved` → `failed` (automatic on error)
- ❌ All other transitions rejected

---

## Execution Flow Timing

Complete flow runs in < 10 seconds:

```
1. Create request        → 400ms
2. Submit offer          → 1500ms
3. Accept offer          → 1500ms
4. Create deal           → 1500ms
5. Approve deal          → 1500ms
6. Execute deal          → 1500ms (MockMCP: 120ms + API)
────────────────────────────────────
Total                    → ~8 seconds
```

---

## What TAK Does NOT Do

❌ **No Wallet UI** — Users don't connect wallets to TAK

❌ **No Balance Tracking** — TAK doesn't know agent balances

❌ **No Jetton Transfers** — Delegated to MCP adapters

❌ **No Smart Contracts** — TAK is off-chain only

❌ **No DeFi** — No liquidity pools, swaps, or lending

❌ **No Complex AI** — No LLM integration or reasoning

TAK remains **focused and lightweight** — a pure coordination layer.

---

## Security Checks

Before running in production:

- [ ] Enable JWT authentication
- [ ] Add rate limiting per agent
- [ ] Implement idempotency key Redis store (not in-memory)
- [ ] Use real TON RPC endpoint (not testnet)
- [ ] Enable HTTPS on all endpoints
- [ ] Add audit logging
- [ ] Set up monitoring on execution failures
- [ ] Implement deal timeout (e.g., 1 hour)
- [ ] Add request/offer expiry
- [ ] Validate agent webhooks

---

## Roadmap

### v0.2

- [ ] Real TonMCPAdapter implementation
- [ ] JWT authentication
- [ ] Request/offer expiry
- [ ] Deal timeouts
- [ ] Bulk operations

### v0.3

- [ ] WebSocket support for real-time updates
- [ ] Deal extensions/renegotiation
- [ ] Partial deal execution
- [ ] Agent reputation system

### v0.4+

- [ ] Multi-signature deals
- [ ] Escrow logic
- [ ] Dispute resolution
- [ ] Analytics dashboard

---

## Contributing

TAK is open source. Contributions welcome for:

- MCP adapter implementations (Jetton, NFT, etc.)
- Performance optimizations
- Documentation improvements
- Test coverage
- Security audit findings

---

## License

MIT

---

## Need Help?

- **API Reference:** [docs/api-guide.md](docs/api-guide.md)
- **SDK Docs:** [tak/tak-sdk/src/index.js](tak/tak-sdk/src/index.js)
- **Examples:** [tak/examples/](tak/examples/)
- **Demo Flow:** `npm run demo` in tak-server

---

## Final Message

**TAK solves a real infrastructure problem.**

Agents discover services.
Agents negotiate pricing.
Deals are secured and approved.
Execution happens safely through TON MCP.

**TAK is the coordination layer for the agent economy on TON.**
