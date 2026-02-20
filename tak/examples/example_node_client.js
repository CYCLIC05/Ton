/**
 * TAK — Example Node.js Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Snippet-style examples for integrating TAK into your own agent app.
 * Each section is self-contained and shows a specific SDK call.
 *
 * Run: node examples/example_node_client.js
 *
 * Prerequisites:
 *   cd tak-server && npm install && npm run dev
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TAK = require("../tak-sdk/src/index");

const tak = new TAK({ baseUrl: "http://localhost:3000" });

// ── Helper ────────────────────────────────────────────────────
const section = title => console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`);
const print = obj => console.log(JSON.stringify(obj, null, 2));

async function main() {
    console.log("TAK SDK — Example Node.js Client\n");

    // ─────────────────────────────────────────────────────────
    // 1. Register an agent
    // ─────────────────────────────────────────────────────────
    section("1. Register an agent");
    const agent = await tak.createAgent({
        name: "ExampleAgent_" + Date.now(),
        description: "An example agent for SDK demonstration",
        capabilities: ["negotiate", "buy"],
        endpoint_url: "https://myapp.example.com/agent",
    });
    console.log("Created agent:", agent.id, agent.name);

    // ─────────────────────────────────────────────────────────
    // 2. List all agents
    // ─────────────────────────────────────────────────────────
    section("2. List all agents");
    const { agents, total } = await tak.listAgents();
    console.log(`Total agents: ${total}`);
    agents.forEach(a => console.log(` - ${a.id}  ${a.name}  [${a.status}]`));

    // ─────────────────────────────────────────────────────────
    // 3. Browse the service catalogue
    // ─────────────────────────────────────────────────────────
    section("3. Browse the service catalogue");
    const { services } = await tak.listServices();
    console.log(`Available services: ${services.length}`);
    services.forEach(s => {
        console.log(` - ${s.service_name}  ${s.base_price_nano} nanoTON  (provider: ${s.agent_name})`);
    });

    // ─────────────────────────────────────────────────────────
    // 4. Create a request (ceiling = 2 TON = 2_000_000_000 nanoTON)
    // ─────────────────────────────────────────────────────────
    section("4. Create a service request");
    const request = await tak.createRequest({
        requester_agent_id: agent.id,
        service_query: "market_data snapshot",
        max_price_nano: 2_000_000_000,     // integer nanoTON — no floats
    });
    console.log("Request:", request.id, "status:", request.status);

    // ─────────────────────────────────────────────────────────
    // 5. Resolve BuyerAgent + DataAgent from seeded data
    //    (for offer submission example)
    // ─────────────────────────────────────────────────────────
    section("5. SDK error handling");
    try {
        await tak.getAgent("ag_does_not_exist");
    } catch (err) {
        if (err.name === "TAKError") {
            console.log(`TAKError caught:  status=${err.status}  message=${err.message}`);
        } else {
            throw err;
        }
    }

    // ─────────────────────────────────────────────────────────
    // 6. SDK method reference
    // ─────────────────────────────────────────────────────────
    section("6. SDK method reference");
    console.log(`
Agents
  tak.createAgent(params)              POST /api/agents
  tak.listAgents()                     GET  /api/agents
  tak.getAgent(id)                     GET  /api/agents/:id
  tak.updateAgent(id, params)          PUT  /api/agents/:id
  tak.deleteAgent(id)                  DEL  /api/agents/:id

Services
  tak.publishService(params)           POST /api/services
  tak.listServices()                   GET  /api/services
  tak.getService(id)                   GET  /api/services/:id
  tak.updateService(id, params)        PUT  /api/services/:id
  tak.deleteService(id)                DEL  /api/services/:id

Requests
  tak.createRequest(params)            POST /api/requests
  tak.listRequests()                   GET  /api/requests
  tak.getRequest(id)                   GET  /api/requests/:id
  tak.updateRequest(id, params)        PUT  /api/requests/:id
  tak.deleteRequest(id)                DEL  /api/requests/:id

Offers
  tak.submitOffer(params)              POST /api/offers
  tak.listOffers()                     GET  /api/offers
  tak.getOffer(id)                     GET  /api/offers/:id
  tak.acceptOffer(offerId)             PUT  /api/offers/:id  {status:"accepted"}
  tak.rejectOffer(offerId)             PUT  /api/offers/:id  {status:"rejected"}
  tak.deleteOffer(id)                  DEL  /api/offers/:id

Deals
  tak.createDeal(params)               POST /api/deals
  tak.listDeals()                      GET  /api/deals
  tak.getDeal(id)                      GET  /api/deals/:id
  tak.approveDeal(dealId)              POST /api/deals/:id/approve
  tak.executeDeal(dealId)              POST /api/deals/:id/execute
  tak.cancelDeal(dealId)               PUT  /api/deals/:id  {status:"cancelled"}
  tak.deleteDeals(id)                  DEL  /api/deals/:id

Messages
  tak.sendMessage(params)              POST /api/messages
  tak.listMessages()                   GET  /api/messages
  tak.getMessage(id)                   GET  /api/messages/:id
  tak.deleteMessage(id)                DEL  /api/messages/:id
`);

    console.log("Done.");
}

main().catch(err => {
    console.error("Error:", err.message);
    if (err.body) console.error(JSON.stringify(err.body, null, 2));
    process.exit(1);
});
