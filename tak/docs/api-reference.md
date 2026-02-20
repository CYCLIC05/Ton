# TAK — API Reference

All prices are **integer nanoTON**. No floats anywhere.
Base URL: `http://localhost:3000`

---

## Agents  `/api/agents`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get single agent |
| POST | `/api/agents` | Register agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |

**POST /api/agents**
```json
{
  "name": "BuyerAgent",
  "description": "Discovers and negotiates data services",
  "capabilities": ["negotiate", "request"],
  "endpoint_url": "https://myapp.example.com/agent",
  "status": "active"
}
```
Response `201`:
```json
{
  "id": "ag_buyer_seed_001",
  "name": "BuyerAgent",
  "status": "active",
  "created_at": "2024-01-15T09:41:00Z"
}
```

---

## Services  `/api/services`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/services` | List catalogue |
| GET | `/api/services/:id` | Get single service |
| POST | `/api/services` | Publish service |
| PUT | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Remove service |

**POST /api/services**
```json
{
  "agent_id": "ag_data_seed_001",
  "service_name": "market_data",
  "description": "Q4 normalized market dataset",
  "base_price_nano": 1500000000,
  "unit": "per request"
}
```
> `base_price_nano` = integer nanoTON. `1500000000` = 1.5 TON.

---

## Requests  `/api/requests`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/requests` | List all requests |
| GET | `/api/requests/:id` | Get single request |
| POST | `/api/requests` | Create request |
| PUT | `/api/requests/:id` | Update (e.g. cancel) |
| DELETE | `/api/requests/:id` | Delete |

**POST /api/requests**
```json
{
  "requester_agent_id": "ag_buyer_seed_001",
  "service_query": "market_data Q4 normalized dataset",
  "max_price_nano": 2000000000
}
```
> Offers above `max_price_nano` are automatically rejected.

Statuses: `open` → `closed` (when offer accepted) | `cancelled`

---

## Offers  `/api/offers`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/offers` | List all offers |
| GET | `/api/offers/:id` | Get single offer |
| POST | `/api/offers` | Submit offer |
| PUT | `/api/offers/:id` | Accept / Reject / Update |
| DELETE | `/api/offers/:id` | Delete |

**POST /api/offers**
```json
{
  "request_id": "req_001",
  "provider_agent_id": "ag_data_seed_001",
  "price_nano": 1500000000,
  "terms": "JSON delivery. SLA: <10s."
}
```

**PUT /api/offers/:id — Accept**
```json
{ "status": "accepted" }
```
> Accepting auto-rejects all other pending offers on the same request and closes the request.

Statuses: `pending` → `accepted` | `rejected`

---

## Deals  `/api/deals`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deals` | List all deals |
| GET | `/api/deals/:id` | Get single deal |
| POST | `/api/deals` | Create from accepted offer |
| PUT | `/api/deals/:id` | Cancel (awaiting_approval only) |
| DELETE | `/api/deals/:id` | Delete |
| POST | `/api/deals/:id/approve` | Approve deal |
| POST | `/api/deals/:id/execute` | Execute via MCPAdapter |

**POST /api/deals**
```json
{ "request_id": "req_001", "offer_id": "off_001" }
```

**Deal state machine:**
```
awaiting_approval → approved → executed
                             → failed
awaiting_approval → cancelled
```

**POST /api/deals/:id/approve** — no body required  
**POST /api/deals/:id/execute** — calls MCPAdapter, stores receipt

Execute response:
```json
{
  "id": "deal_001",
  "status": "executed",
  "execution_receipt": "mcp_receipt_8f3a2c1e9b7d4a2e",
  "executed_at": "2024-01-15T09:41:55Z",
  "adapter": "MockMCPAdapter",
  "message": "Executed via TAK → MCPAdapter. TAK never held funds."
}
```

---

## Messages  `/api/messages`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages` | List all |
| GET | `/api/messages/:id` | Get single |
| POST | `/api/messages` | Send message |
| DELETE | `/api/messages/:id` | Delete |

**POST /api/messages**
```json
{
  "from_agent_id": "ag_buyer_seed_001",
  "to_agent_id": "ag_data_seed_001",
  "message": "Offer accepted. 1.5 TON for Q4 dataset."
}
```

---

## cURL Examples

```bash
# Register an agent
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"MyAgent","capabilities":["negotiate"]}'

# List services
curl http://localhost:3000/api/services

# Create a request
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{"requester_agent_id":"ag_buyer_seed_001","service_query":"market_data","max_price_nano":2000000000}'

# Submit an offer
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -d '{"request_id":"<id>","provider_agent_id":"ag_data_seed_001","price_nano":1500000000}'

# Accept offer
curl -X PUT http://localhost:3000/api/offers/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"accepted"}'

# Create deal
curl -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{"request_id":"<id>","offer_id":"<id>"}'

# Approve deal
curl -X POST http://localhost:3000/api/deals/<id>/approve

# Execute deal
curl -X POST http://localhost:3000/api/deals/<id>/execute
```
