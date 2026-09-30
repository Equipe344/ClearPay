import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import PaymentModal from "../components/PaymentModal";
import { listContributions } from "../api/contributions";

export default function Contributions() {
  const [contributions, setContributions] = useState([]);
  const [active, setActive] = useState(null);
  const [banner, setBanner] = useState("");
  // Self-reported submissions land as "pending" but the has_paid flag on
  // the contribution itself won't flip until a reviewer confirms it — track
  // locally so the button swaps to a status badge right away.
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setContributions(await listContributions());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <AppShell><p>Loading contributions…</p></AppShell>;

  return (
    <AppShell>
      <h1>Contributions</h1>
      <p style={{ color: "var(--muted)" }}>Everything currently open for your department/level.</p>

      {banner && <div className="banner success">{banner}</div>}

      <div className="ledger-card">
        {contributions.map((c) => {
          const isPending = pendingIds.has(c.id);
          return (
            <div className="stub-row" key={c.id}>
              <div style={{ flex: 1 }}>
                <strong>{c.title}</strong>{" "}
                {c.is_mandatory && <span className="ref-code">· mandatory</span>}
                {c.category === "merchandise" && <span className="ref-code">· merch</span>}
                <div className="ref-code">
                  ₦{Number(c.amount).toLocaleString()} · due {new Date(c.deadline).toLocaleString()}
                  {c.target_level ? ` · ${c.target_level} level` : ""}
                  {c.category === "merchandise" && c.available_sizes?.length
                    ? ` · sizes: ${c.available_sizes.join(", ")}`
                    : ""}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--muted)" }}>{c.description}</p>
              </div>
              <div style={{ textAlign: "right", minWidth: 130 }}>
                {c.has_paid ? (
                  <StatusBadge status="success" />
                ) : isPending ? (
                  <StatusBadge status="pending" />
                ) : (
                  <button className="btn btn-sm" onClick={() => setActive(c)}>
                    Pay
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <PaymentModal
          contribution={active}
          onClose={() => setActive(null)}
          onAlreadyPaid={() => {
            setActive(null);
            setBanner("You've already paid for this. Refreshing the list…");
            refresh();
            setTimeout(() => setBanner(""), 6000);
          }}
          onSubmitted={() => {
            setPendingIds((ids) => new Set(ids).add(active.id));
            setActive(null);
            setBanner("Submitted — an admin will review your proof shortly.");
            setTimeout(() => setBanner(""), 6000);
          }}
        />
      )}
    </AppShell>
  );
}
