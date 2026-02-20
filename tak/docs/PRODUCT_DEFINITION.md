# TAK v0.1 — Product Definition & Positioning

## Executive Summary

**TAK (TON Agent Kit)** is a **developer infrastructure product** for coordinating autonomousagents on TON.

TAK enables **distributed agent-to-agent negotiation, deal creation, and execution** without requiring each developer to build custom coordination logic.

**Core Value:**

> Standardize how autonomous agents discover, negotiate, and execute service agreements.

---

## Product-Market Fit

### The Problem

**Without TAK:**

Developers building agent systems must implement negotiation logic from scratch:

- Custom request/offer workflows
- Custom pricing logic
- Custom deal lifecycle management
- Custom approval workflows
- Custom MCP integration
- Custom logging & monitoring

This is repeated across every agent project.

**With TAK:**

Agents use a standardized coordination API:

```javascript
await tak.createRequest({ ... });      // Discover service
await tak.submitOffer({ ... });        // Negotiate price
await tak.acceptOffer(offerId);        // Agree terms
await tak.createDeal({ ... });         // Lock agreement
await tak.approveDeal(dealId);         // Security gate
await tak.executeDeal(dealId);         // Delegate to MCP
```

**Result:** Agents coordinate using one proven workflow instead of 100 custom variations.

### Market Positioning

**Who:** Developers building autonomous agents on TON

**Where:** Agent coordination layer (off-chain)

**When:** Before MCP execution (on-chain)

**How:** REST API + JavaScript SDK + Pluggable MCP adapters

**Why:**

- Reduces development time (weeks → hours)
- Standardizes agent interactions
- Enables interoperability
- Provides audit trail & security gates

### Use Case

**Machine-to-Machine Service Marketplace**

_Example Flow:_

```
BuyerAgent (Data Analysis)
    │
    ├─→ POST /api/requests
    │   "I need market_data, max 2 TON"
    │
    ├─← DataAgent responds
    │   "I offer market_data for 1.5 TON"
    │
    ├─→ PUT /api/offers/{id} (status: accepted)
    │   "Buyer accepts the offer"
    │
    ├─→ POST /api/deals
    │   "Deal created (awaiting_approval)"
    │
    ├─→ POST /api/deals/{id}/approve
    │   "Buyer approves execution"
    │
    ├─→ POST /api/deals/{id}/execute
    │   "TAK delegates to TON MCP"
    │
    └─→ MCP Adapter
        "Blockchain settlement"
```

**Complete workflow in < 10 seconds.**

---

## Core Positioning

### The Real Product

```
API/SDK = Product       ← The real shipping thing
UI = Demo               ← Shows what's possible
```

**The Real Product:**

1. **REST API** — 6 endpoints, complete coordination workflow
2. **JavaScript SDK** — Simple, type-safe client (`npm install tak-sdk`)
3. **MCP Adapter Architecture** — Pluggable execution layer

**The Demo:**

- Web UI showing live deal execution
- Quickstart examples with copy-paste code
- Real-time logging of API calls
- Architecture visualization

The demo is **not the product**. The demo shows developers **what's possible with the API**.

### Three Key Messages

#### 1. Coordination Philosophy

> **TAK coordinates. TON MCP executes. TAK never holds funds.**

- TAK = Off-chain agent negotiation and agreement
- MCP = On-chain settlement and execution
- Clean separation of concerns

#### 2. Developer Focus

> **API/SDK = Product. UI = Demo.**

- The value is in the API, not the widget
- Real developers use the SDK and REST API
- The UI is just visualization for demos and presentations

#### 3. Deal Security

> **Deal parameters cannot be modified after creation.**

- Immutable snapshots
- Explicit approval gates (no implicit progression)
- TAK never holds funds
- State machine enforced

---

## Feature Set

### Core Resources

**6 resource types with full CRUD operations:**

1. **Agents** — Autonomous entities that coordinate
2. **Services** — Offerings with prices
3. **Requests** — Agents ask for services
4. **Offers** — Agents respond with prices
5. **Deals** — Immutable agreements (require approval)
6. **Messages** — Inter-agent communication

### Deal Lifecycle

```
REQUEST
  ↓
  ↓ (Agent responds)
  ↓
OFFER
  ↓ (Buyer decides)
  ↓
ACCEPTED
  ↓
DEAL (awaiting_approval)
  ↓ (Explicit approval step)
  ↓
APPROVED
  ↓ (Delegate to MCP)
  ↓
EXECUTED (or FAILED)
```

### Security Model

**4 Security Gates:**

1. **Immutable Deal Snapshot**
   - Parameters locked at creation
   - Contains: payers, payees, amount, timestamp
   - Cannot be modified

2. **Explicit Approval Step**
   - Separate endpoint: `POST /api/deals/{id}/approve`
   - No implicit progression
   - Prevents accidental execution
   - Approval timestamp recorded

3. **State Machine Enforcement**
   - Only valid transitions allowed
   - 409 Conflict on invalid move
   - Single path to execution

4. **TAK Never Holds Funds**
   - Execution delegated to MCP adapters
   - TAK is coordination only
   - No escrow or custody logic

### Developer Features

**Pricing:**

- All amounts in nanoTON (integers only)
- 1 TON = 1,000,000,000 nanoTON
- No floating point ever

**Idempotency:**

- Per-request idempotency keys
- 24-hour caching
- Safe retries without duplication

**Schema Versioning:**

- `schema_version: "tak/0.1"`
- Enables future API evolution
- Breaking changes in new versions

**Execution Logging:**

- Real-time API call tracking
- MCP adapter visibility
- Receipt storage on deal records

---

## Not Included (By Design)

TAK is intentionally **not**:

❌ **Wallet Management**

- Users don't connect wallets
- No authentication in MVP
- No user identity management

❌ **Fund Custody**

- TAK never holds funds
- No escrow logic
- No transaction reversal

❌ **Balance Tracking**

- TAK doesn't know agent balances
- No credit limits
- No pre-approval checks

❌ **Smart Contracts**

- TAK is off-chain only
- No blockchain code
- No contract deployment

❌ **DeFi Primitives**

- No liquidity pools
- No decentralized exchange
- No lending/borrowing

❌ **Complex AI**

- No LLM integration
- No reasoning logic
- No negotiation bot

❌ **Blockchain Transactions**

- All execution delegated to MCP
- TAK never broadcasts transactions
- No gas estimation

This **intentional focus** is TAK's strength. It does one thing well.

---

## Technical Positioning

### What Makes TAK Unique

**1. Immutable Deal Snapshots**

Most coordination systems don't lock deal parameters. TAK does:

```json
{
  "id": "deal_001",
  "payer": "ag_buyer_001",
  "payee": "ag_data_001",
  "amount_nano": 1500000000,
  "status": "awaiting_approval"
  // ↑ Cannot change these ever
}
```

**2. Explicit Approval Gates**

No auto-execution. Every deal requires explicit approval:

```javascript
await tak.approveDeal(dealId); // Must call this
await tak.executeDeal(dealId); // Only then execute
```

Not:

```javascript
await tak.createDeal({ ... }); // Auto-executes
```

**3. Pluggable MCP Adapters**

Switch execution backends without changing coordination logic:

```javascript
// Development (demo)
app.set("mcpAdapter", new MockMCPAdapter());

// Production (real TON)
app.set("mcpAdapter", new TonMCPAdapter({ rpcUrl: "..." }));

// Custom (other blockchains)
app.set("mcpAdapter", new CustomAdapter());
```

**4. State Machine Enforcement**

Invalid transitions rejected immediately:

```
❌ Can't jump from awaiting_approval → executed
✅ Must go: awaiting_approval → approved → executed
```

### Architecture

```
Agent Apps
    ↓
    ├─→ REST API
    └─→ SDK
    ↓
TAK Server
    ↓
    ├─→ Agents DB
    ├─→ Requests DB
    ├─→ Offers DB
    ├─→ Deals DB
    ↓
MCP Adapter ← Pluggable
    ↓
Blockchain ← (or other)
```

---

## Go-to-Market Strategy

### Phase 1: Developer Awareness

**Target:** Developers building agent systems on TON

**Channels:**

- TON developer community
- Agent framework creators
- Hackathons focused on agents

**Content:**

- "How to build agent coordination" tutorial
- API reference guide
- Quickstart examples
- Architecture diagrams

### Phase 2: Integration

**Early Adopters:**

- 5-10 agent projects
- 20-30 agents deployed
- 50+ deals created per week

**Metrics:**

- SDK downloads
- API call volume
- Deal execution success rate
- Agent on/off-boarding rate

### Phase 3: Ecosystem Growth

**Plugins:**

- Community MCP adapters (Jetton, NFT)
- Integration with agent frameworks
- Monitoring dashboards
- Webhook infrastructure

---

## Metrics & Success Criteria

### Product Health (MVP → v0.1)

**API Stability:**

- 99.5% uptime
- <100ms p95 latency
- Zero data loss incidents

**Developer Adoption:**

- 100+ SDK downloads/month
- 1,000+ API calls/day
- 10+ active agents

**Deal Execution:**

- 95%+ success rate
- <10 second average time
- <2% failure rate

### Business Metrics (v0.2+)

**Revenue (if paid):**

- Per-deal: $0.01-0.10
- Per-API-call: $0.0001
- Per-deployment: $100/month

**Scale:**

- 10+ projects integrating
- 100+ agents active
- 10,000+ deals/month

---

## Competitive Landscape

### What Exists Today

**No direct competitors** for agent coordination on TON.

**Adjacent Products:**

- General APIs (Stripe, Twilio) — Handle different domain
- DEXs (Jupiter, Serum) — Handle tokens, not agents
- Agent frameworks (AutoGPT, LangChain) — Handle AI, not coordination

**TAK's Uniqueness:**

- Only purpose-built agent coordination system
- Only with immutable deal snapshots
- Only with explicit approval gates
- Only pluggable MCP adapter architecture

### Potential Competitors (Future)

**If TAK succeeds:**

- Other L1s may build similar systems (Solana, Arbitrum)
- Agent framework integrations (Langchain, AutoGPT)
- Custodian platforms (centralized versions)

**TAK's Defenses:**

- Community adoption & lock-in
- Open architecture (easy integration)
- Developer-first positioning
- Simple but powerful model

---

## Pricing Strategy (v0.2+)

### Option 1: Free (Community-Driven)

**Free indefinitely**

- All API calls free
- Open source SDK
- Community support

**Monetization:**

- Paid support contracts
- Commercial consulting
- Adapter development services

### Option 2: Freemium

**Free Tier:**

- 1,000 deals/month
- 100k API calls/month
- Community support

**Pro Tier ($100/month):**

- Unlimited deals
- Unlimited API calls
- Priority support
- Custom adapters

**Enterprise Tier (Custom):**

- Self-hosted option
- SLA guarantees
- Dedicated support

### Option 3: Pure Freemium

**Free:**

- All features free
- Community support

**Premium ($50/month):**

- Advanced monitoring
- Custom adapters
- Integration assistance
- Webhook infrastructure

---

## Long-term Vision

### Where TAK Fits in the Agent Economy

```
Year 1 (v0.1): Build coordination layer
  → 10 projects, 50 agents, 10k deals

Year 2 (v1.0): Establish standard
  → 50 projects, 500 agents, 100k deals

Year 3 (v2.0): Ecosystem platform
  → Custom adapters, monitoring, reputation
  → 200 projects, 2k agents, 1M+ deals
```

### The Agent Economy

In 2-3 years:

- Thousands of autonomous agents on TON
- Agents buying/selling services from each other
- Billions of TON flowing through coordination layer
- TAK as the standard coordination protocol

**TAK's Role:**

- Enables this economy to exist
- Provides the standardized workflow
- Ensures security & auditability
- Scales horizontally

---

## Conclusion

**TAK solves a real infrastructure problem.**

Without TAK: Developers reinvent the same coordination logic 100 times

With TAK: Agents coordinate using one proven standard

**The Elevator Pitch:**

> TAK is the coordination layer for the autonomous agent economy on TON.
> Agents discover services, negotiate pricing, create secure deals, and execute safely.
> Developers use the REST API or JavaScript SDK to build agent systems that coordinate
> automatically. All execution is delegated to TON MCP — TAK never touches funds.

**The Product:**

- REST API with security gates & state machine enforcement
- JavaScript SDK for easy integration
- Pluggable MCP adapter architecture
- Open, simple, focused

**The Message:**

- TAK coordinates. TON MCP executes. TAK never holds funds.
- API/SDK = Product. UI = Demo.
- Deal parameters cannot change after creation.

**The Future:**
TAK becomes the standard that makes autonomous agent systems possible on TON.
