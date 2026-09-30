import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { listContributions, getContributionSummary, getContributionPayments, markOfflinePayment } from "../../api/contributions";
import { getErrorMessage } from "../../api/client";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "success", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

function OfflineForm({ contributionId, onRecorded }) {
  const [matric, setMatric] = useState("");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await markOfflinePayment(contributionId, { matric_number: matric, receipt_reference: receipt });
      setMatric("");
      setReceipt("");
      onRecorded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
      <div className="field" style={{ margin: 0, flex: "1 1 180px" }}>
        <label>Matric number</label>
        <input required value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="CSC/2021/045" />
      </div>
      <div className="field" style={{ margin: 0, flex: "1 1 180px" }}>
        <label>Receipt reference</label>
        <input required value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Teller slip or receipt no." />
      </div>
      <button className="btn btn-sm" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Mark as paid (offline)"}
      </button>
      {error && <div className="banner error" style={{ flexBasis: "100%" }}>{error}</div>}
    </form>
  );
}

export default function Overview() {
  const [contributions, setContributions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listContributions().then((rows) => {
      setContributions(rows);
      setSelectedId(rows[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  async function loadRows(id) {
    setRowsLoading(true);
    const [s, r] = await Promise.all([getContributionSummary(id), getContributionPayments(id)]);
    setSummary(s);
    setRows(r);
    setRowsLoading(false);
  }

  useEffect(() => {
    if (selectedId != null) loadRows(selectedId);
  }, [selectedId]);

  const filtered = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.student.toLowerCase().includes(q) || r.matric_number.toLowerCase().includes(q));
    }
    if (filter === "success") out = out.filter((r) => r.status === "success");
    if (filter === "unpaid") out = out.filter((r) => r.status !== "success");
    return out;
  }, [rows, search, filter]);

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  const selected = contributions.find((c) => c.id === selectedId);

  return (
    <AppShell>
      <div className="topline" style={{ marginBottom: 4 }}>
        <h1>Admin Dashboard</h1>
      </div>
      <p style={{ color: "var(--muted)" }}>Pick a contribution to see who's paid and who hasn't.</p>

      <div className="field" style={{ maxWidth: 420, marginBottom: 20 }}>
        <label>Contribution</label>
        <select value={selectedId ?? ""} onChange={(e) => setSelectedId(Number(e.target.value))}>
          {contributions.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {selected && summary && (
        <div className="tiles">
          <div className="tile">
            <div className="label">Total expected</div>
            <div className="value">₦{Number(summary.total_expected).toLocaleString()}</div>
          </div>
          <div className="tile">
            <div className="label">Total collected</div>
            <div className="value paid">₦{Number(summary.total_collected).toLocaleString()}</div>
          </div>
          <div className="tile">
            <div className="label">Outstanding</div>
            <div className="value pending">{summary.outstanding_count}</div>
          </div>
        </div>
      )}

      {selectedId != null && <OfflineForm contributionId={selectedId} onRecorded={() => loadRows(selectedId)} />}

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <input
          style={{
            flex: "1 1 240px",
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "var(--paper-raised)",
          }}
          placeholder="Search by name or matric number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? "active" : ""} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rowsLoading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="ledger-card">
          <div className="empty-state">
            <h3>No matches</h3>
            <p>Try a different name, matric number, or filter.</p>
          </div>
        </div>
      ) : (
        <div className="ledger-card" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Matric No.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.matric_number}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/admin/students/${encodeURIComponent(r.matric_number)}?contribution=${selectedId}`)}
                >
                  <td>{r.student}</td>
                  <td className="ref-code">{r.matric_number}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
