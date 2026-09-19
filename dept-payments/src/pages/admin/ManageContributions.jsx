import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { listContributions, createContribution, updateContribution, deleteContribution } from "../../api/contributions";

const emptyForm = {
  title: "",
  category: "dues",
  amount: "",
  deadline: "",
  description: "",
  mandatory: false,
};

export default function ManageContributions() {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function refresh() {
    setContributions(await listContributions());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(c) {
    setForm({ title: c.title, category: c.category, amount: c.amount, deadline: c.deadline, description: c.description, mandatory: c.mandatory });
    setEditingId(c.id);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await updateContribution(editingId, form);
      } else {
        await createContribution(form);
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not save.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Close this contribution? Students will no longer be able to pay toward it.")) return;
    await deleteContribution(id);
    await refresh();
  }

  if (loading) return <AppShell><p>Loading…</p></AppShell>;

  return (
    <AppShell>
      <div className="topline" style={{ marginBottom: 8 }}>
        <h1>Contributions</h1>
        <button className="btn" onClick={openCreate}>+ New contribution</button>
      </div>
      <p style={{ color: "var(--muted)" }}>Create dues, event fees, or merchandise runs for students to pay into.</p>

      <div className="ledger-card">
        {contributions.map((c) => (
          <div className="stub-row" key={c.id}>
            <div>
              <strong>{c.title}</strong>
              <div className="ref-code">₦{Number(c.amount).toLocaleString()} · due {c.deadline} · {c.mandatory ? "mandatory" : "optional"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
              <button className="btn-ghost btn-sm" onClick={() => handleDelete(c.id)}>Close</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? "Edit contribution" : "New contribution"}</h3>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="dues">Dues</option>
                  <option value="event">Event</option>
                  <option value="excursion">Excursion</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="project">Project</option>
                  <option value="association">Association fee</option>
                </select>
              </div>
              <div className="field">
                <label>Amount (₦)</label>
                <input required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="field">
                <label>Deadline</label>
                <input required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="mandatory"
                  style={{ width: "auto" }}
                  checked={form.mandatory}
                  onChange={(e) => setForm({ ...form, mandatory: e.target.checked })}
                />
                <label htmlFor="mandatory" style={{ margin: 0 }}>Mandatory for all students</label>
              </div>
              <button className="btn btn-block" type="submit">{editingId ? "Save changes" : "Create"}</button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
