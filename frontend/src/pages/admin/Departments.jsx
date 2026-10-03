import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { listDepartments, createDepartment } from "../../api/auth";
import { getErrorMessage } from "../../api/client";

const emptyForm = { name: "", faculty: "" };

// Admin-only screen. Departments are the parent of every contribution and every
// roster row, so a deploy with none is unusable: admins can't create fees and
// students can't register. This is the in-app way to create them.
export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setDepartments(await listDepartments());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createDepartment({
        name: form.name.trim(),
        faculty: form.faculty.trim(),
      });
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  return (
    <AppShell>
      <div className="topline" style={{ marginBottom: 8 }}>
        <h1>Departments</h1>
        <button className="btn" onClick={openCreate}>+ New department</button>
      </div>
      <p style={{ color: "var(--muted)" }}>
        Every contribution and roster belongs to a department. Students choose
        from this list when they register, so create the ones your school uses.
      </p>

      {error && !showForm && <div className="banner error">{error}</div>}

      {departments.length === 0 ? (
        <div className="banner info">
          No departments yet. Create the first one so students can register and
          you can start creating contributions.
        </div>
      ) : (
        <div className="ledger-card">
          {departments.map((d) => (
            <div className="stub-row" key={d.id}>
              <div style={{ flex: 1 }}>
                <strong>{d.name}</strong>
                <div className="ref-code">{d.faculty}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New department</h3>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
              <div className="field">
                <label>Faculty</label>
                <input
                  required
                  value={form.faculty}
                  onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                  placeholder="Physical Sciences"
                />
              </div>
              <button className="btn btn-block" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
