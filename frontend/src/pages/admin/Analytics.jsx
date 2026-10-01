import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { listContributions, getContributionSummary, getContributionPayments } from "../../api/contributions";

// There's no /admin/analytics/ endpoint on the backend. Everything here is
// computed in the browser from GET /contributions/:id/summary/ and
// GET /contributions/:id/payments/ for whichever contribution is selected.

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

function answerFromAggregates(question, { summary, paid, unpaid, total }) {
  const q = question.toLowerCase();
  if (q.includes("outstanding") || q.includes("owe")) {
    return `₦${Number(summary.total_expected - summary.total_collected).toLocaleString()} is still outstanding for this contribution (${unpaid} student${unpaid === 1 ? "" : "s"} unpaid).`;
  }
  if (q.includes("collect")) {
    return `₦${Number(summary.total_collected).toLocaleString()} has been collected so far.`;
  }
  if (q.includes("unpaid") || q.includes("not paid") || q.includes("haven't")) {
    return `${unpaid} out of ${total} students haven't paid this contribution yet.`;
  }
  if (q.includes("paid") || q.includes("how many")) {
    return `${paid} out of ${total} students have paid — that's ${total ? Math.round((paid / total) * 100) : 0}%.`;
  }
  return `I can answer questions about paid/unpaid counts and amounts for this contribution. Try asking "how much is outstanding?" or "how many students have paid?"`;
}

function AskModal({ context, onClose }) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);

  function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    const answer = answerFromAggregates(question, context);
    setThread((t) => [...t, { role: "question", text: question }, { role: "answer", text: answer }]);
    setQuestion("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ask about this contribution</h3>
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
          <button className="btn" type="submit">Ask</button>
        </form>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [contributions, setContributions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);

  useEffect(() => {
    listContributions().then((cs) => {
      setContributions(cs);
      setSelectedId(cs[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    Promise.all([getContributionSummary(selectedId), getContributionPayments(selectedId)]).then(([s, r]) => {
      setSummary(s);
      setRows(r);
    });
  }, [selectedId]);

  if (loading) return <AppShell><p>Loading analytics…</p></AppShell>;

  const paid = rows.filter((r) => r.status === "success").length;
  const unpaid = rows.length - paid;

  return (
    <AppShell>
      <div className="topline" style={{ marginBottom: 4 }}>
        <h1>Analytics</h1>
      </div>
      <p style={{ color: "var(--muted)" }}>How collection is going for a contribution.</p>

      <div className="field" style={{ maxWidth: 420, marginBottom: 20 }}>
        <label>Contribution</label>
        <select value={selectedId ?? ""} onChange={(e) => setSelectedId(Number(e.target.value))}>
          {contributions.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {summary && (
        <>
          <div className="ledger-card" style={{ padding: 28, marginBottom: 24 }}>
            <DonutChart paid={paid} unpaid={unpaid} />
          </div>

          <div className="tiles">
            <div className="tile">
              <div className="label">Total collected</div>
              <div className="value paid">₦{Number(summary.total_collected).toLocaleString()}</div>
            </div>
            <div className="tile">
              <div className="label">Total outstanding</div>
              <div className="value pending">₦{Number(summary.total_expected - summary.total_collected).toLocaleString()}</div>
            </div>
          </div>

          <button className="btn btn-outline" onClick={() => setShowAsk(true)}>
            Ask a question
          </button>
        </>
      )}

      {showAsk && (
        <AskModal
          context={{ summary, paid, unpaid, total: rows.length }}
          onClose={() => setShowAsk(false)}
        />
      )}
    </AppShell>
  );
}
