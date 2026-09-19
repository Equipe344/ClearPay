import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import PaymentModal from "../components/PaymentModal";
import { useAuth } from "../context/AuthContext";
import { listContributions } from "../api/contributions";
import { listPayments } from "../api/payments";

const CATEGORY_LABEL = {
  dues: "Dues",
  excursion: "Excursion",
  merchandise: "Merchandise",
  project: "Project",
  event: "Event",
  association: "Association fee",
};

export default function Contributions() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [active, setActive] = useState(null);
  const [banner, setBanner] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [c, p] = await Promise.all([listContributions(), listPayments({ studentId: user.id })]);
    setContributions(c);
    setPayments(p);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function statusFor(contributionId) {
    const relevant = payments
      .filter((p) => p.contribution_id === contributionId)
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return relevant[0]?.status || null;
  }

  function handleSubmitted(record) {
    setPayments((prev) => [record, ...prev]);
    setActive(null);
    setBanner(
      record.status === "verified"
        ? `Payment confirmed — reference ${record.reference}.`
        : `Payment submitted for review — reference ${record.reference}. You'll see it move to "Paid" once an admin verifies it.`
    );
    setTimeout(() => setBanner(""), 6000);
  }

  if (loading) return <AppShell><p>Loading contributions…</p></AppShell>;

  return (
    <AppShell>
      <h1>Contributions</h1>
      <p style={{ color: "var(--muted)" }}>Everything currently open for your set/level.</p>

      {banner && <div className="banner success">{banner}</div>}

      <div className="ledger-card">
        {contributions.map((c) => {
          const status = statusFor(c.id);
          return (
            <div className="stub-row" key={c.id}>
              <div style={{ flex: 1 }}>
                <strong>{c.title}</strong>{" "}
                {c.mandatory && <span className="ref-code">· mandatory</span>}
                <div className="ref-code">
                  {CATEGORY_LABEL[c.category] || c.category} · ₦{Number(c.amount).toLocaleString()} · due {c.deadline}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--muted)" }}>{c.description}</p>
              </div>
              <div style={{ textAlign: "right", minWidth: 130 }}>
                {status ? (
                  <StatusBadge status={status} />
                ) : (
                  <button className="btn btn-sm" onClick={() => setActive(c)}>
                    Pay
                  </button>
                )}
                {status === "rejected" && (
                  <div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setActive(c)}>
                      Resubmit
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <PaymentModal
          contribution={active}
          studentId={user.id}
          onClose={() => setActive(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </AppShell>
  );
}
