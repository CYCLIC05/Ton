# TAK Quick Reference Guide

## Positioning

| Aspect      | What TAK Is                 | What TAK Isn't           |
| ----------- | --------------------------- | ------------------------ |
| **Product** | REST API, SDK, MCP Adapters | Consumer app, wallet     |
| **Layer**   | Off-chain coordination      | On-chain settlement      |
| **Focus**   | Agent negotiation & deals   | Fund custody, DeFi       |
| **Scope**   | Standardized workflow       | Custom logic per project |

## Core Message

```
TAK coordinates.
TON MCP executes.
TAK never holds funds.

API/SDK = Product
UI = Demo
```

---

## API Cheat Sheet

### Endpoints (6 Resources)

```
POST   /api/agents              (register)
GET    /api/agents              (list)
GET    /api/agents/{id}         (get)
PUT    /api/agents/{id}         (update)
DELETE /api/agents/{id}         (delete)

POST   /api/requests            (create request)
GET    /api/requests            (list)
GET    /api/requests/{id}       (get)
PUT    /api/requests/{id}       (update)

POST   /api/offers              (submit offer)
GET    /api/offers              (list)
GET    /api/offers/{id}         (get)
PUT    /api/offers/{id}         (accept/reject)

POST   /api/deals               (create deal)
GET    /api/deals               (list)
GET    /api/deals/{id}          (get)
POST   /api/deals/{id}/approve  (security gate)
POST   /api/deals/{id}/execute  (MCP execution)
PUT    /api/deals/{id}          (cancel)

POST   /api/services            (publish)
GET    /api/services            (list)
GET    /api/services/{id}       (get)
PUT    /api/services/{id}       (update)

POST   /api/messages            (send)
GET    /api/messages            (list)
GET    /api/messages/{id}       (get)
```

### Deal State Machine

```
awaiting_approval  ─→  approved  ─→  executed
       ↓                    ↓
    cancelled            failed
```

### Request Format

Every POST/PUT includes:

```json
{
  "schema_version": "tak/0.1",
  "idempotency_key": "unique_id",
  ...fields...
}
```

### Pricing

```
1 TON = 1,000,000,000 nanoTON

max_price_nano: 2000000000    // = 2 TON
price_nano: 1500000000        // = 1.5 TON

✅ Always integers
❌ Never floats
```

---

## SDK Quick-Start

### Install

```bash
npm install tak-sdk
```

### Initialize

```javascript
const TAK = require("tak-sdk");
const tak = new TAK({
  baseUrl: "http://localhost:3000",
});
```

### Full Flow

```javascript
// Register agents
const buyer = await tak.createAgent({ name: "BuyerAgent" });
const seller = await tak.createAgent({ name: "DataAgent" });

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
  terms: "JSON delivery",
});

// Accept offer
await tak.acceptOffer(offer.id);

// Create deal
const deal = await tak.createDeal({
  request_id: req.id,
  offer_id: offer.id,
});

// Approve deal (explicit security gate)
await tak.approveDeal(deal.id);

// Execute deal (delegate to MCP)
const result = await tak.executeDeal(deal.id);
console.log(result.execution_receipt);
```

---

## File Structure

```
tak/
├── README.md                          ← Start here
├── docs/
│   ├── PRODUCT_DEFINITION.md          ← Business positioning
│   ├── api-guide.md                   ← Complete API reference
│   ├── TECHNICAL_SPEC.md              ← Architecture & deployment
│   └── api-reference.md               ← Quick reference
├── examples/
│   ├── quickstart.js                  ← Full flow example
│   ├── demo_flow_runner.js            ← Demo runner
│   └── example_node_client.js         ← SDK usage
├── tak-sdk/
│   └── src/index.js                   ← SDK implementation
├── tak-server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js                   ← Express server
│   │   ├── db.js                      ← Database schema
│   │   ├── seed.js                    ← Sample data
│   │   ├── adapters/
│   │   │   └── MockMCPAdapter.js      ← Demo adapter
│   │   └── routes/
│   │       ├── agents.js
│   │       ├── services.js
│   │       ├── requests.js
│   │       ├── offers.js
│   │       ├── deals.js
│   │       └── messages.js
│   └── tak.db                         ← SQLite database
└── tak-demo.jsx                       ← React demo UI
```

---

## Getting Started (3 Steps)

### 1. Start Server

```bash
cd tak/tak-server
npm install
npm start

# Server runs on http://localhost:3000
```

### 2. Run Example

```bash
# In another terminal
node tak/examples/quickstart.js
```

### 3. Explore API

```bash
# List agents
curl http://localhost:3000/api/agents

# View API info
curl http://localhost:3000
```

---

## Security Signals

1. **Immutable Deal Snapshot**

   ```
   Once created, deal parameters cannot change
   ```

2. **Explicit Approval Step**

   ```
   POST /api/deals/{id}/approve  ← Required before execution
   POST /api/deals/{id}/execute  ← Only after approval
   ```

3. **State Machine Enforcement**

   ```
   Invalid transitions are rejected with 409 Conflict
   Only valid path: awaiting_approval → approved → executed
   ```

4. **TAK Never Holds Funds**
   ```
   All execution delegated to MCP adapters
   TAK is coordination only
   ```

---

## Common Tasks

### Create a Request

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "requester_agent_id": "ag_001",
    "service_query": "market_data",
    "max_price_nano": 2000000000,
    "schema_version": "tak/0.1",
    "idempotency_key": "req_12345"
  }'
```

### Submit an Offer

```bash
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_001",
    "provider_agent_id": "ag_seller_001",
    "price_nano": 1500000000,
    "terms": "JSON delivery, <10s",
    "schema_version": "tak/0.1",
    "idempotency_key": "off_12345"
  }'
```

### Accept Offer

```bash
curl -X PUT http://localhost:3000/api/offers/off_001 \
  -H "Content-Type: application/json" \
  -d '{"status": "accepted"}'
```

### Create Deal

```bash
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_001",
    "offer_id": "off_001",
    "schema_version": "tak/0.1",
    "idempotency_key": "deal_12345"
  }'
```

### Approve Deal

```bash
curl -X POST http://localhost:3000/api/deals/deal_001/approve
```

### Execute Deal

```bash
curl -X POST http://localhost:3000/api/deals/deal_001/execute
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` — Success
- `201 Created` — Resource created
- `400 Bad Request` — Validation error
- `404 Not Found` — Resource not found
- `409 Conflict` — State machine violation
- `500 Internal Server Error` — MCP adapter failure

### Example Error Response

```json
{
  "error": "Offer price exceeds request ceiling",
  "detail": "Offer 2500000000 exceeds ceiling 2000000000"
}
```

---

## Adapters

### Current (MockMCPAdapter)

```
✓ Active by default
✓ Good for demo & testing
✓ Returns fake receipts (instant)
✓ No blockchain interaction
```

### Future (TonMCPAdapter)

```
○ Coming soon
○ Real TON RPC endpoint
○ Blockchain settlements
○ Jetton & NFT support
```

---

## What's Core vs Optional

### Core (v0.1)

- ✅ Agent registration
- ✅ Request/offer negotiation
- ✅ Deal creation & approval
- ✅ State machine enforcement
- ✅ MCP adapter delegation

### Optional (v0.2+)

- ○ JWT authentication
- ○ Request/offer expiry
- ○ Deal timeouts
- ○ Bulk operations
- ○ WebSocket support
- ○ Advanced monitoring

---

## Deployment Checklist

For production deployment:

- [ ] Enable HTTPS on all endpoints
- [ ] Add JWT authentication
- [ ] Implement rate limiting (per agent)
- [ ] Use Redis for idempotency (not in-memory)
- [ ] Use PostgreSQL (not SQLite)
- [ ] Set up database backups
- [ ] Configure MonitoringAlerting
- [ ] Test disaster recovery
- [ ] Set up staging environment
- [ ] Document runbooks

---

## Common Questions

**Q: Does TAK handle money?**
A: No. TAK never holds funds. All execution delegated to MCP adapters.

**Q: Can I customize the deal flow?**
A: The core flow is fixed (request → offer → accept → deal → approve → execute). Messages can carry custom data.

**Q: What if execution fails?**
A: Deal status becomes `failed`. Can inspect the error and retry by calling `/execute` again (idempotency key ensures safety).

**Q: Can deals be modified after creation?**
A: No. Deal parameters are immutable by design.

**Q: How do I integrate with my agent system?**
A: Use the JavaScript SDK or call REST API directly. Both work with any framework.

**Q: What's the difference between requests, offers, and deals?**
A: Request = "I want X", Offer = "I'll do X for Y", Deal = "We agreed on X for Y".

**Q: Can I cancel a deal?**
A: Yes, but only from `awaiting_approval` state. Once approved, it proceeds to execution.

---

## Resources

- **Full README:** [README.md](README.md)
- **API Guide:** [docs/api-guide.md](docs/api-guide.md)
- **Product Definition:** [docs/PRODUCT_DEFINITION.md](docs/PRODUCT_DEFINITION.md)
- **Technical Spec:** [docs/TECHNICAL_SPEC.md](docs/TECHNICAL_SPEC.md)
- **Code Examples:** [examples/](examples/)

---

## Support

For issues or questions:

1. Check [docs/api-guide.md](docs/api-guide.md)
2. Review [examples/](examples/)
3. Check server logs: `npm start`
4. Test with curl: `curl http://localhost:3000`

---

**Latest Update:** January 2024  
**Version:** 0.1.0  
**Status:** MVP / Early Access
