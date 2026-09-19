import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { listStudents, getAnalyticsSummary } from "../../api/students";
import { CURRENT_SESSION } from "../../constants";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

export default function AdminDashboard() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listStudents({ search, status: filter }).then((rows) => {
      setStudents(rows);
      setLoading(false);
    });
  }, [search, filter]);

  // Fetched once (independent of search/filter) so the tiles don't bounce
  // around as the table above them is narrowed down.
  const [stats, setStats] = useState(null);
  useEffect(() => {
    getAnalyticsSummary().then(setStats);
  }, []);

  return (
    <AppShell>
      <div className="topline" style={{ marginBottom: 4 }}>
        <h1>Admin Dashboard</h1>
        <span className="chip chip-outline">Session {CURRENT_SESSION}</span>
      </div>
      <p style={{ color: "var(--muted)" }}>Departmental dues status for every student this session.</p>

      <div className="tiles">
        <div className="tile">
          <div className="label">Total students</div>
          <div className="value">{stats ? stats.total_students : "—"}</div>
        </div>
        <div className="tile">
          <div className="label">Paid</div>
          <div className="value paid">{stats ? stats.paid : "—"}</div>
        </div>
        <div className="tile">
          <div className="label">Unpaid</div>
          <div className="value pending">{stats ? stats.unpaid : "—"}</div>
        </div>
        <div className="tile">
          <div className="label">Total collected</div>
          <div className="value paid">{stats ? `₦${stats.total_collected.toLocaleString()}` : "—"}</div>
        </div>
      </div>

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

      {loading ? (
        <p>Loading…</p>
      ) : students.length === 0 ? (
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
              {students.map((s) => (
                <tr
                  key={s.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/admin/students/${s.id}`)}
                >
                  <td>{s.full_name}</td>
                  <td className="ref-code">{s.matric_no}</td>
                  <td>
                    <StatusBadge status={s.current_status === "paid" ? "verified" : "unpaid"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
