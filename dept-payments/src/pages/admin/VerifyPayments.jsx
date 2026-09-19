import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { listPayments, verifyPayment } from "../../api/payments";
import { listContributions } from "../../api/contributions";
import { mockUsers } from "../../mock/data";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

function ProofLightbox({ src, name, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: "1rem" }}>{name || "Proof of payment"}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <img src={src} alt={name || "Proof of payment"} style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid var(--line)" }} />
        <a href={src} target="_blank" rel="noreferrer" className="btn btn-outline btn-block" style={{ marginTop: 16 }}>
          Open in new tab
        </a>
      </div>
    </div>
  );
}

export default function VerifyPayments() {
  const [tab, setTab] = useState("pending");
  const [payments, setPayments] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);

  async function refresh() {
    const [p, c] = await Promise.all([listPayments(), listContributions()]);
    setPayments(p);
    setContributions(c);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleAction(paymentId, status) {
    setBusyId(paymentId);
    try {
      await verifyPayment(paymentId, { status });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const filtered = payments.filter((p) => p.status === tab);

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  return (
    <AppShell>
      <h1>Verify payments</h1>
      <p style={{ color: "var(--muted)" }}>Confirm bank transfer, POS, and cash payments against proofs students uploaded.</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label} {t.key === "pending" && filtered.length > 0 && tab === "pending" ? `(${filtered.length})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>Nothing here</h3>
            <p>No {tab} payments right now.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card">
          {filtered.map((p) => {
            const c = contributions.find((c) => c.id === p.contribution_id);
            const student = mockUsers.find((u) => u.id === p.student_id);
            return (
              <div className="stub-row" key={p.id}>
                {p.proof_url ? (
                  <button
                    onClick={() => setPreview(p)}
                    style={{
                      padding: 0,
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      cursor: "pointer",
                      background: "var(--paper)",
                    }}
                    title="View proof"
                  >
                    <img src={p.proof_url} alt="Proof thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: "var(--radius)",
                      border: "1px dashed var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted)",
                      fontSize: "0.65rem",
                      textAlign: "center",
                    }}
                  >
                    No proof
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <strong>{c?.title || "Contribution"}</strong>
                  <div className="ref-code">
                    {p.reference} · {student?.full_name || `Student #${p.student_id}`} · ₦{Number(p.amount).toLocaleString()} ·{" "}
                    {p.channel.replace("_", " ")}
                  </div>
                  {p.proof_url && (
                    <button className="btn-ghost btn-sm" style={{ padding: "2px 0" }} onClick={() => setPreview(p)}>
                      View proof{p.proof_name ? ` — ${p.proof_name}` : ""} →
                    </button>
                  )}
                  {p.note && <div className="ref-code">Note: {p.note}</div>}
                </div>

                {tab === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-sm"
                      disabled={busyId === p.id}
                      onClick={() => handleAction(p.id, "verified")}
                    >
                      Verify
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      disabled={busyId === p.id}
                      onClick={() => handleAction(p.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <ProofLightbox src={preview.proof_url} name={preview.proof_name} onClose={() => setPreview(null)} />
      )}
    </AppShell>
  );
}
