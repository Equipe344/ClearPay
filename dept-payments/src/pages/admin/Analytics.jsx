import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { getAnalyticsSummary, askAnalyticsQuestion } from "../../api/students";
import { CURRENT_SESSION } from "../../constants";

function DonutChart({ paid, unpaid }) {
  const total = paid + unpaid || 1;
  const paidPct = Math.round((paid / total) * 100);
  const gradient = `conic-gradient(var(--paid) 0% ${paidPct}%, var(--pending) ${paidPct}% 100%)`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        role="img"
        aria-label={`${paidPct}% of students have paid`}
      >
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: "50%",
            background: "var(--paper-raised)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 600 }}>{paidPct}%</div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>paid</div>
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--paid)", display: "inline-block" }} />
          <span>Paid — {paid} student{paid === 1 ? "" : "s"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--pending)", display: "inline-block" }} />
          <span>Unpaid — {unpaid} student{unpaid === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

function AskAIModal({ context, onClose }) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [asking, setAsking] = useState(false);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setThread((t) => [...t, { role: "question", text: q }]);
    setQuestion("");
    setAsking(true);
    try {
      const answer = await askAnalyticsQuestion(q, context);
      setThread((t) => [...t, { role: "answer", text: answer }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ask about this session</h3>
          <button onClick={onClose}>×</button>
        </div>

        <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 16 }}>
          {thread.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              Try "how much is outstanding?" or "how many students have paid?"
            </p>
          )}
          {thread.map((m, i) => (
            <div
              key={i}
              className={m.role === "question" ? "banner info" : "ledger-card"}
              style={{ marginBottom: 10, padding: "10px 14px" }}
            >
              {m.text}
            </div>
          ))}
          {asking && <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Thinking…</p>}
        </div>

        <form onSubmit={handleAsk} style={{ display: "flex", gap: 8 }}>
          <input
            style={{
              flex: 1,
              padding: "11px 12px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--paper)",
              color: "var(--ink)",
            }}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
          />
          <button className="btn" type="submit" disabled={asking}>Ask</button>
        </form>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);

  useEffect(() => {
    getAnalyticsSummary().then((s) => {
      setSummary(s);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppShell><p>Loading analytics…</p></AppShell>;

  return (
    <AppShell>
      <div className="topline" style={{ marginBottom: 4 }}>
        <h1>Analytics</h1>
        <span className="chip chip-outline">Session {CURRENT_SESSION}</span>
      </div>
      <p style={{ color: "var(--muted)" }}>How dues collection is going for the current session.</p>

      <div className="ledger-card" style={{ padding: 28, marginBottom: 24 }}>
        <DonutChart paid={summary.paid} unpaid={summary.unpaid} />
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="label">Total collected</div>
          <div className="value paid">₦{summary.total_collected.toLocaleString()}</div>
        </div>
        <div className="tile">
          <div className="label">Total outstanding</div>
          <div className="value pending">₦{summary.total_outstanding.toLocaleString()}</div>
        </div>
      </div>

      <button className="btn btn-outline" onClick={() => setShowAsk(true)}>
        Ask a question
      </button>

      {showAsk && <AskAIModal context={summary} onClose={() => setShowAsk(false)} />}
    </AppShell>
  );
}
