import { useState, useEffect, useRef } from "react";

/* ─── Colour tokens ─────────────────────────────────────────────────── */
const C = {
  bg: "#07090E",
  s1: "#0B0D16",
  s2: "#0F121C",
  s3: "#141824",
  border: "#1C2235",
  border2: "#232B42",
  teal: "#00D4B8",
  tealDim: "rgba(0,212,184,0.10)",
  green: "#10F07A",
  greenDim: "rgba(16,240,122,0.10)",
  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.10)",
  txt: "#E2ECF8",
  txt2: "#6B7FA0",
  txt3: "#2E3A50",
  purple: "#8B5CF6",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ─── 6 coordination stages ─────────────────────────────────────────── */
const STAGES = [
  {
    id: 1,
    label: "Request",
    color: C.amber,
    group: "pending",
    desc: "BuyerAgent creates a service request for market_data with a 2 TON ceiling.",
    api: "POST /api/requests",
    detail: { requester_agent_id: "ag_buyer_001", service_query: "market_data Q4", max_price_nano: 2000000000 },
  },
  {
    id: 2,
    label: "Offer",
    color: C.amber,
    group: "pending",
    desc: "DataAgent responds with an offer: market_data at 1.5 TON, JSON delivery, SLA < 10s.",
    api: "POST /api/offers",
    detail: { request_id: "req_001", provider_agent_id: "ag_data_001", price_nano: 1500000000, terms: "JSON delivery. SLA: <10s." },
  },
  {
    id: 3,
    label: "Accepted",
    color: C.green,
    group: "accepted",
    desc: "BuyerAgent accepts the offer. All competing offers are auto-rejected by TAK.",
    api: "PUT /api/offers/off_001",
    detail: { status: "accepted" },
  },
  {
    id: 4,
    label: "Deal Created",
    color: C.green,
    group: "deal",
    desc: "TAK creates an immutable deal record. No payment has occurred yet — status: awaiting_approval.",
    api: "POST /api/deals",
    detail: { request_id: "req_001", offer_id: "off_001" },
    isDeal: true,
  },
  {
    id: 5,
    label: "Approved",
    color: C.green,
    group: "approved",
    desc: "Explicit approval gate. Execution cannot proceed without this step.",
    api: "POST /api/deals/deal_001/approve",
    detail: {},
    isApproval: true,
  },
  {
    id: 6,
    label: "Executed",
    color: C.teal,
    group: "executed",
    desc: "MockMCPAdapter.execute_payment(deal) called. Receipt returned and stored on deal record.",
    api: "POST /api/deals/deal_001/execute",
    detail: {},
    isExec: true,
  },
];

const DEAL_SNAPSHOT = {
  deal_id: "deal_001",
  payer: "BuyerAgent (ag_buyer_001)",
  payee: "DataAgent  (ag_data_001)",
  service: "market_data",
  amount_ton: "1.5 TON",
  amount_nano: 1500000000,
  timestamp: "2024-01-15T09:41:45Z",
  status: "awaiting_approval",
};

const RECEIPT_HASH = "mcp_receipt_8f3a2c1e9b7d4a2e";

const API_CALLS = [
  { method: "POST", path: "/api/requests" },
  { method: "POST", path: "/api/offers" },
  { method: "PUT", path: "/api/offers/{id}  — status: accepted" },
  { method: "POST", path: "/api/deals" },
  { method: "POST", path: "/api/deals/{id}/approve" },
  { method: "POST", path: "/api/deals/{id}/execute" },
];

const METHOD_COLOR = { POST: C.teal, PUT: C.amber, GET: C.purple };

/* ─── Small helpers ─────────────────────────────────────────────────── */
function Pill({ label, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 99,
      background: `${color}18`, border: `1px solid ${color}55`,
      color, fontFamily: "monospace", fontSize: 11, fontWeight: 700,
    }}>{label}</span>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button onClick={copy} style={{
      padding: "2px 8px", borderRadius: 5,
      border: `1px solid ${C.border2}`, background: C.s3,
      color: copied ? C.green : C.txt3, fontFamily: "monospace", fontSize: 10,
      cursor: "pointer", flexShrink: 0, transition: "color 0.2s",
    }}>{copied ? "✓" : "copy"}</button>
  );
}

function JsonBlock({ data }) {
  return (
    <pre style={{
      fontFamily: "monospace", fontSize: 11, color: C.teal,
      lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
    }}>{JSON.stringify(data, null, 2)}</pre>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */
export default function App() {
  const [activeStage, setActiveStage] = useState(null); // 1-6
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(null);
  const playRef = useRef(false);

  const done = s => activeStage !== null && activeStage >= s;

  const stageColor = s => {
    if (!done(s)) return C.txt3;
    const stage = STAGES[s - 1];
    return stage.color;
  };

  const runFlow = async () => {
    if (running) return;
    setRunning(true);
    setActiveStage(null);
    playRef.current = true;
    for (let i = 1; i <= 6; i++) {
      if (!playRef.current) break;
      await sleep(i === 1 ? 400 : 1500);
      setActiveStage(i);
    }
    setRunning(false);
  };

  const reset = () => {
    playRef.current = false;
    setRunning(false);
    setActiveStage(null);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => { });
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const currentStage = activeStage ? STAGES[activeStage - 1] : null;
  const isComplete = activeStage === 6;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.txt,
      fontFamily: "monospace", overflowX: "hidden",
    }}>

      {/* ── Global pulse keyframe ─────────────────────────── */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1C2235; border-radius: 2px; }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, background: C.s1,
        padding: "18px 32px", display: "flex", alignItems: "center",
        gap: 20, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.16em", marginBottom: 3 }}>
            DEVELOPER INFRASTRUCTURE · v0.1
          </div>
          <div style={{
            fontFamily: "sans-serif", fontSize: 28, fontWeight: 900,
            color: C.txt, letterSpacing: "-0.5px", lineHeight: 1,
          }}>
            TAK <span style={{ color: C.teal }}>◈</span>
            <span style={{ fontWeight: 400, fontSize: 16, color: C.txt2, marginLeft: 10 }}>
              TON Agent Kit
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.txt3, marginTop: 8, fontFamily: "monospace" }}>
            API/SDK = Product  |  UI = Demo
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Core positioning message */}
        <div style={{
          background: C.s2, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "10px 16px", maxWidth: 480,
        }}>
          <div style={{ fontSize: 9, color: C.teal, letterSpacing: "0.1em", marginBottom: 4, fontWeight: 700 }}>
            CORE ARCHITECTURE
          </div>
          <div style={{ fontSize: 10, color: C.txt2, lineHeight: 1.6 }}>
            <span style={{ color: C.txt }}>TAK coordinates.</span> &nbsp;
            <span style={{ color: C.purple }}>TON MCP executes.</span> &nbsp;
            <span style={{ color: C.amber }}>TAK never holds funds.</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={runFlow}
            disabled={running}
            style={{
              padding: "11px 24px", borderRadius: 9, border: "none",
              background: running ? C.s3 : `linear-gradient(135deg, ${C.teal}, #00A896)`,
              color: running ? C.txt3 : "#000",
              fontFamily: "monospace", fontSize: 13, fontWeight: 700,
              cursor: running ? "not-allowed" : "pointer",
              transition: "all 0.2s", whiteSpace: "nowrap",
              boxShadow: running ? "none" : `0 0 20px ${C.teal}40`,
            }}
          >
            {running
              ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", animation: "spin 0.9s linear infinite" }}>◌</span>
                Running…
              </span>
              : "▶ Run Full Flow"}
          </button>
          {activeStage !== null && !running && (
            <button onClick={reset} style={{
              padding: "11px 14px", borderRadius: 9, border: `1px solid ${C.border2}`,
              background: C.s2, color: C.txt2, fontFamily: "monospace",
              fontSize: 12, cursor: "pointer",
            }}>↺</button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PROBLEM → SOLUTION STRIP
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          flex: 1, padding: "12px 32px", background: "#120A0A",
          borderRight: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 9, color: "#F43F5E", letterSpacing: "0.1em" }}>WITHOUT TAK  </span>
          <span style={{ fontSize: 11, color: C.txt2 }}>
            Developers build custom negotiation, pricing, and deal logic from scratch for every agent interaction.
          </span>
        </div>
        <div style={{ flex: 1, padding: "12px 32px", background: "#080E0D" }}>
          <span style={{ fontSize: 9, color: C.teal, letterSpacing: "0.1em" }}>WITH TAK  </span>
          <span style={{ fontSize: 11, color: C.txt2 }}>
            Agents coordinate using one standard workflow —&nbsp;
            <span style={{ color: C.txt }}>discover → negotiate → agree → execute.</span>
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          HORIZONTAL TIMELINE
      ══════════════════════════════════════════════════════ */}
      <div style={{
        padding: "24px 32px 0", borderBottom: `1px solid ${C.border}`,
        background: C.s1,
      }}>
        <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 16 }}>
          COORDINATION FLOW — 6 STAGES
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
          {STAGES.map((s, i) => {
            const isActive = activeStage === s.id;
            const isDone = done(s.id);
            const isPending = !isDone && !isActive;
            const col = isDone ? s.color : isActive ? s.color : C.txt3;
            const isLast = i === STAGES.length - 1;
            return (
              <div key={s.id} style={{ flex: 1, position: "relative" }}>
                {/* Connector line */}
                {!isLast && (
                  <div style={{
                    position: "absolute", top: 15, left: "50%", width: "100%",
                    height: 2,
                    background: done(s.id + 1)
                      ? `linear-gradient(90deg,${s.color},${STAGES[i + 1].color})`
                      : C.border,
                    transition: "background 0.5s",
                  }} />
                )}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  paddingBottom: 14, position: "relative", zIndex: 1,
                }}>
                  {/* Circle */}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: isDone ? `${s.color}22` : isActive ? `${s.color}15` : C.s3,
                    border: `2px solid ${isDone || isActive ? s.color : C.border2}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: isDone ? s.color : isActive ? s.color : C.txt3,
                    fontWeight: 700, transition: "all 0.4s",
                    boxShadow: isActive ? `0 0 14px ${s.color}60` : "none",
                  }}>
                    {isDone ? "✓" : s.id}
                  </div>
                  {/* Label */}
                  <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: col, transition: "color 0.4s" }}>
                    {s.label}
                  </div>
                  {/* Pill */}
                  <div style={{ marginTop: 4 }}>
                    {isDone || isActive
                      ? <Pill label={s.group === "pending" ? "amber" : s.group === "executed" ? "teal" : "green"} color={s.color} />
                      : <span style={{ fontSize: 9, color: C.txt3 }}>pending</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN BODY — 3 COLUMNS
      ══════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 260px)" }}>

        {/* ── LEFT: Stage detail panels ─────────────────────── */}
        <div style={{
          flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column",
          gap: 16, borderRight: `1px solid ${C.border}`, overflowY: "auto",
        }}>

          {/* No stage yet */}
          {activeStage === null && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16, opacity: 0.5,
            }}>
              <div style={{ fontSize: 36 }}>◈</div>
              <div style={{ fontSize: 13, color: C.txt2 }}>Press ▶ Run Full Flow to begin</div>
            </div>
          )}

          {/* Active stage desc */}
          {currentStage && (
            <div style={{
              background: `${currentStage.color}0C`,
              border: `1px solid ${currentStage.color}30`,
              borderRadius: 12, padding: "14px 16px",
              animation: "fadeIn 0.3s ease",
            }}>
              <div style={{ fontSize: 9, color: currentStage.color, letterSpacing: "0.12em", marginBottom: 6 }}>
                STAGE {currentStage.id} — {currentStage.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: C.txt2, lineHeight: 1.7 }}>
                {currentStage.desc}
              </div>
            </div>
          )}

          {/* API call box */}
          {currentStage && (
            <div style={{
              background: C.s2, border: `1px solid ${C.border}`,
              borderRadius: 12, overflow: "hidden",
              animation: "fadeIn 0.3s ease",
            }}>
              <div style={{
                padding: "8px 14px", borderBottom: `1px solid ${C.border}`,
                background: C.s3, display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: METHOD_COLOR[currentStage.api.split(" ")[0]] || C.teal,
                  background: `${METHOD_COLOR[currentStage.api.split(" ")[0]] || C.teal}18`,
                  padding: "2px 8px", borderRadius: 4,
                  border: `1px solid ${(METHOD_COLOR[currentStage.api.split(" ")[0]] || C.teal)}44`,
                }}>
                  {currentStage.api.split(" ")[0]}
                </span>
                <span style={{ fontSize: 12, color: C.txt }}>
                  {currentStage.api.split(" ").slice(1).join(" ")}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{
                  fontSize: 9, background: `rgba(16,240,122,0.1)`, color: C.green,
                  border: `1px solid rgba(16,240,122,0.25)`, padding: "2px 8px", borderRadius: 4,
                }}>200 OK</span>
              </div>
              <div style={{ padding: 14 }}>
                {Object.keys(currentStage.detail).length > 0
                  ? <JsonBlock data={currentStage.detail} />
                  : <span style={{ fontSize: 11, color: C.txt3 }}>// No body</span>}
              </div>
            </div>
          )}

          {/* STAGE 4 — Deal snapshot card */}
          {done(4) && (
            <div style={{
              background: C.s2, border: `1px solid ${C.green}44`,
              borderRadius: 12, padding: "16px",
              animation: "fadeIn 0.35s ease",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 9, color: C.green, letterSpacing: "0.12em" }}>
                  DEAL SNAPSHOT — IMMUTABLE RECORD
                </div>
                <span style={{
                  fontSize: 9, color: C.green, border: `1px solid ${C.green}44`,
                  borderRadius: 4, padding: "2px 8px", background: `${C.green}10`,
                }}>🔒 sealed</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Deal ID", DEAL_SNAPSHOT.deal_id],
                  ["Payer", "BuyerAgent"],
                  ["Payee", "DataAgent"],
                  ["Service", DEAL_SNAPSHOT.service],
                  ["Amount", DEAL_SNAPSHOT.amount_ton],
                  ["nano", DEAL_SNAPSHOT.amount_nano],
                  ["Timestamp", DEAL_SNAPSHOT.timestamp],
                  ["Status", "awaiting_approval"],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    background: C.s3, borderRadius: 7,
                    padding: "7px 10px", border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: 8, color: C.txt3, marginBottom: 3, letterSpacing: "0.08em" }}>{k}</div>
                    <div style={{ fontSize: 10, color: C.txt, fontFamily: "monospace" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE 5 — Approval gate */}
          {done(5) && (
            <div style={{
              background: `${C.amber}08`,
              border: `2px solid ${C.amber}55`,
              borderRadius: 12, padding: "16px",
              animation: "fadeIn 0.35s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🛡</span>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>
                  EXPLICIT APPROVAL REQUIRED BEFORE EXECUTION
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.txt2, lineHeight: 1.65 }}>
                This is a deliberate security gate. TAK will not forward the deal to the MCP
                execution layer until an approval is recorded.
                No implicit progression — every execution requires acknowledgement.
              </div>
              <div style={{
                marginTop: 12, display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", background: `${C.green}0D`,
                border: `1px solid ${C.green}33`, borderRadius: 8,
              }}>
                <span style={{ fontSize: 12 }}>✓</span>
                <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>
                  deal_001 — approved
                </span>
                <span style={{ fontSize: 10, color: C.txt3, marginLeft: "auto" }}>
                  2024-01-15T09:41:50Z
                </span>
              </div>
            </div>
          )}

          {/* STAGE 6 — Execution receipt */}
          {done(6) && (
            <div style={{
              background: C.tealDim, border: `1px solid ${C.teal}44`,
              borderRadius: 12, padding: "16px",
              animation: "fadeIn 0.35s ease",
            }}>
              <div style={{ fontSize: 9, color: C.teal, letterSpacing: "0.12em", marginBottom: 10 }}>
                EXECUTED VIA TON MCP
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: 13, color: C.teal,
                background: "#020F0D", borderRadius: 8, padding: "10px 14px",
                border: `1px solid ${C.teal}33`, marginBottom: 10,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>{RECEIPT_HASH}</span>
                <CopyBtn text={RECEIPT_HASH} />
              </div>
              <div style={{ fontSize: 10, color: C.txt3, lineHeight: 1.65 }}>
                TAK never holds funds. Execution is performed by TON MCP.
                <br />
                <span style={{ color: C.txt2 }}>
                  → MockMCPAdapter.execute_payment(deal_001)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── CENTRE: Architecture + Agent state ──────────────── */}
        <div style={{
          width: 256, flexShrink: 0, borderRight: `1px solid ${C.border}`,
          padding: "24px 18px", display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Architecture panel */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 12 }}>
              ARCHITECTURE
            </div>
            {[
              { name: "TAK", sub: "off-chain coordination", color: C.teal },
              { arrow: true },
              { name: "TON MCP", sub: "execution layer", color: C.purple },
              { arrow: true },
              { name: "TON Blockchain", sub: "settlement", color: C.amber },
            ].map((item, i) =>
              item.arrow ? (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  height: 20, color: C.txt3, fontSize: 14,
                }}>↓</div>
              ) : (
                <div key={i} style={{
                  background: C.s2, border: `1px solid ${item.color}33`,
                  borderRadius: 9, padding: "10px 12px", marginBottom: 0,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: item.color }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 9, color: C.txt3, marginTop: 2 }}>{item.sub}</div>
                </div>
              )
            )}
            <div style={{
              marginTop: 10, fontSize: 10, color: C.txt3, lineHeight: 1.6,
              borderTop: `1px solid ${C.border}`, paddingTop: 10,
            }}>
              Designed for direct TON smart-contract settlement via MCP.
            </div>
          </div>

          {/* Agent state */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 10 }}>
              LIVE STATE
            </div>
            {[
              { label: "BuyerAgent", val: done(1) ? "active ✓" : "—", col: done(1) ? C.green : C.txt3 },
              { label: "DataAgent", val: done(1) ? "active ✓" : "—", col: done(1) ? C.green : C.txt3 },
              { label: "Service", val: "market_data", col: C.teal },
              { label: "Price", val: "1.5 TON", col: C.txt },
              { label: "Request", val: done(1) ? "open" : "—", col: done(1) ? C.amber : C.txt3 },
              { label: "Offer", val: done(2) ? "pending" : "—", col: done(2) ? C.amber : C.txt3 },
              { label: "Accepted", val: done(3) ? "yes ✓" : "—", col: done(3) ? C.green : C.txt3 },
              { label: "Deal", val: done(4) ? "awaiting" : "—", col: done(4) ? C.amber : C.txt3 },
              { label: "Approved", val: done(5) ? "yes ✓" : "—", col: done(5) ? C.green : C.txt3 },
              { label: "Executed", val: done(6) ? "yes ⚡" : "—", col: done(6) ? C.teal : C.txt3 },
            ].map(item => (
              <div key={item.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0", borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 10, color: C.txt3 }}>{item.label}</span>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: item.col, fontWeight: 600 }}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Developer panel ───────────────────────────── */}
        <div style={{
          width: 300, flexShrink: 0, padding: "24px 18px",
          display: "flex", flexDirection: "column", gap: 16, overflowY: "auto",
        }}>
          {/* Quickstart tab */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 10 }}>
              QUICKSTART — SDK
            </div>
            <div style={{
              background: "#020408", border: `1px solid ${C.border}`,
              borderRadius: 10, overflow: "hidden", fontSize: 9,
            }}>
              <pre style={{
                color: C.teal, fontFamily: "monospace", margin: 0,
                padding: "12px 14px", whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>npm install tak-sdk

const TAK = 
  require("tak-sdk");
const tak = new TAK({
  baseUrl: 
    "http://localhost:3000"
});

// Create request
const req = 
  await tak.createRequest({
    requester_agent_id:
      "ag_001",
    service_query:
      "market_data",
    max_price_nano:
      2000000000
  });</pre>
            </div>
            <div style={{
              marginTop: 10, padding: "8px 12px",
              background: C.s2, border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 10, color: C.txt2, lineHeight: 1.5,
            }}>
              Full SDK docs available at <span style={{ color: C.teal }}>/api</span>
            </div>
          </div>

          {/* API Examples tab */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 10 }}>
              QUICKSTART — REST API
            </div>
            <div style={{
              background: "#020408", border: `1px solid ${C.border}`,
              borderRadius: 10, overflow: "hidden", fontSize: 8,
            }}>
              <pre style={{
                color: C.teal, fontFamily: "monospace", margin: 0,
                padding: "12px 14px", whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>POST /api/requests
Content-Type: application/json
schema_version: "tak/0.1"
idempotency_key: "uuid"

{
  "requester_agent_id":
    "ag_buyer_001",
  "service_query":
    "market_data",
  "max_price_nano":
    2000000000
}</pre>
            </div>
          </div>

          {/* API Calls log */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 10 }}>
              API CALLS — THIS RUN
            </div>
            <div style={{
              background: "#020408", border: `1px solid ${C.border}`,
              borderRadius: 10, overflow: "hidden",
            }}>
              {API_CALLS.map((call, i) => {
                const text = `${call.method} ${call.path}`;
                const lineActive = done(i + 1);
                const col = METHOD_COLOR[call.method] || C.teal;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px",
                    borderBottom: i < API_CALLS.length - 1 ? `1px solid ${C.border}` : "none",
                    opacity: lineActive ? 1 : 0.3,
                    transition: "opacity 0.35s",
                  }}>
                    <span style={{
                      fontSize: 9, color: col, fontWeight: 700,
                      minWidth: 36, fontFamily: "monospace",
                    }}>{call.method}</span>
                    <span style={{ flex: 1, fontSize: 10, color: C.txt2, fontFamily: "monospace" }}>
                      {call.path}
                    </span>
                    <CopyBtn text={text} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adapter selection & status */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 8 }}>
              MCP ADAPTER
            </div>
            <div style={{
              background: "#020408", border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 14px", opacity: 0.7,
            }}>
              <div style={{ fontSize: 11, color: C.amber, fontFamily: "monospace", marginBottom: 6 }}>
                ✓ MockMCPAdapter
              </div>
              <div style={{ fontSize: 10, color: C.txt3, lineHeight: 1.6 }}>
                TON MCP not configured — using mock adapter for demo.
              </div>
              <div style={{ marginTop: 8, fontSize: 9, color: C.txt3, fontStyle: "italic" }}>
                Production: TonMCPAdapter(rpcUrl)
              </div>
            </div>
          </div>

          {/* Adapter execution call */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 8 }}>
              EXECUTION CALL
            </div>
            <div style={{
              background: "#020408", border: `1px solid ${C.teal}30`,
              borderRadius: 10, padding: "12px 14px",
              opacity: done(6) ? 1 : 0.3, transition: "opacity 0.4s",
            }}>
              <div style={{ fontSize: 11, color: C.teal, fontFamily: "monospace", marginBottom: 4 }}>
                MockMCPAdapter
              </div>
              <div style={{ fontSize: 11, color: C.txt2, fontFamily: "monospace", lineHeight: 1.7 }}>
                .execute_payment(deal)<br />
                <span style={{ color: C.txt3 }}>→ </span>
                <span style={{ color: C.green }}>{RECEIPT_HASH}</span>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <CopyBtn text={`MockMCPAdapter.execute_payment(deal) → ${RECEIPT_HASH}`} />
              </div>
            </div>
          </div>

          {/* Security signals summary */}
          <div>
            <div style={{ fontSize: 9, color: C.txt3, letterSpacing: "0.12em", marginBottom: 8 }}>
              SECURITY SIGNALS
            </div>
            {[
              { label: "Immutable deal snapshot", stage: 4, color: C.green },
              { label: "Explicit approval gate", stage: 5, color: C.amber },
              { label: "TAK never holds funds", stage: 6, color: C.teal },
            ].map(sig => (
              <div key={sig.label} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0", borderBottom: `1px solid ${C.border}`,
                opacity: done(sig.stage) ? 1 : 0.3, transition: "opacity 0.35s",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: done(sig.stage) ? sig.color : C.txt3,
                  flexShrink: 0, transition: "background 0.3s",
                }} />
                <span style={{ fontSize: 10, color: done(sig.stage) ? C.txt : C.txt3, transition: "color 0.3s" }}>
                  {sig.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          FINAL MESSAGE (shown after complete)
      ══════════════════════════════════════════════════════ */}
      {isComplete && (
        <div style={{
          margin: "0 32px 32px", borderRadius: 14,
          background: `linear-gradient(135deg, ${C.tealDim}, ${C.greenDim})`,
          border: `1px solid ${C.teal}44`,
          padding: "20px 24px", animation: "fadeIn 0.5s ease",
        }}>
          <div style={{ fontSize: 9, color: C.teal, letterSpacing: "0.14em", marginBottom: 10 }}>
            FLOW COMPLETE ⚡
          </div>
          <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.75, maxWidth: 780 }}>
            TAK provides the coordination layer that TON currently lacks.{" "}
            <span style={{ color: C.teal }}>Agents discover services.</span>{" "}
            <span style={{ color: C.amber }}>Agents negotiate price.</span>{" "}
            <span style={{ color: C.green }}>Agreements are secured.</span>{" "}
            <span style={{ color: C.teal }}>Execution happens safely through TON MCP.</span>
          </div>
        </div>
      )}
    </div>
  );
}
