import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { listContributions, createContribution, updateContribution, setContributionOpen } from "../../api/contributions";
import { listDepartments } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../api/client";

const emptyForm = {
  title: "",
  description: "",
  amount: "",
  deadline: "",
  is_mandatory: false,
  target_level: "",
  department_id: "",
  category: "general",
  available_sizes: "",
  available_colors: "",
};

// Deadlines are stored UTC and a date-only value becomes the *start* of its
// last day, so a bare date input is turned into an end-of-day local
// datetime before it's sent.
function toEndOfDayIso(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T23:59:00`);
  return d.toISOString();
}

// Date inputs carry a local YYYY-MM-DD; backend rows hold full ISO UTC.
function toDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ManageContributions() {
  const { user } = useAuth();
  // A system admin with no department must pick one when creating a fee; a
  // class rep's own department is applied server-side. `department` (the name)
  // is the field /auth/me/ reliably returns, so it's what we branch on — the
  // old `department_id` check was always true because that field used to be
  // write-only and never appeared in the response.
  const adminHasNoDept = !user?.department;
  const [contributions, setContributions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setContributions(await listContributions());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // Only a system admin without a department needs the selector; a class
    // rep's own department is implicit and applied server-side.
    if (adminHasNoDept) listDepartments().then(setDepartments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  // Editing a fee: PATCH. Closing a fee: DELETE-like close — the row survives,
  // only new payments stop. Reopen with the same control.
  function openEdit(c) {
    setForm({
      title: c.title || "",
      description: c.description || "",
      amount: c.amount || "",
      deadline: toDateInput(c.deadline),
      is_mandatory: !!c.is_mandatory,
      target_level: c.target_level || "",
      department_id: "",
      category: c.category || "general",
      available_sizes: (c.available_sizes || []).join(", "),
      available_colors: (c.available_colors || []).join(", "),
    });
    setEditingId(c.id);
    setError("");
    setShowForm(true);
  }

  async function toggleClosed(c) {
    setError("");
    try {
      await setContributionOpen(c.id, c.is_closed); // closed -> reopen, open -> close
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        amount: form.amount,
        deadline: toEndOfDayIso(form.deadline),
        is_mandatory: form.is_mandatory,
        target_level: form.target_level || null,
        category: form.category,
      };
      if (form.category === "merchandise") {
        payload.available_sizes = form.available_sizes.split(",").map((s) => s.trim()).filter(Boolean);
        payload.available_colors = form.available_colors.split(",").map((c) => c.trim()).filter(Boolean);
      }
      if (adminHasNoDept && form.department_id) {
        payload.department_id = Number(form.department_id);
      }
      if (editingId != null) {
        await updateContribution(editingId, payload);
      } else {
        await createContribution(payload);
      }
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
        <h1>Contributions</h1>
        <button className="btn" onClick={openCreate}>+ New contribution</button>
      </div>
      <p style={{ color: "var(--muted)" }}>Create dues, event fees, or merchandise runs for students to pay into.</p>

      {error && !showForm && <div className="banner error">{error}</div>}

      {adminHasNoDept && departments.length === 0 && (
        <div className="banner info">
          No departments exist yet, so contributions can't be created.{" "}
          <Link to="/admin/departments"><strong>Create a department →</strong></Link>
        </div>
      )}

      <div className="ledger-card">
        {contributions.map((c) => (
          <div className="stub-row" key={c.id}>
            <div style={{ flex: 1 }}>
              <strong>{c.title}</strong>{" "}
              {c.is_closed && <span className="status status-rejected">Closed</span>}
              <div className="ref-code">
                ₦{Number(c.amount).toLocaleString()} · due {new Date(c.deadline).toLocaleString()} ·{" "}
                {c.is_mandatory ? "mandatory" : "optional"}
                {c.target_level ? ` · ${c.target_level} level` : ""}
                {c.category === "merchandise" ? ` · merch (${(c.available_sizes || []).join("/")})` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
              <button className="btn-ghost btn-sm" onClick={() => toggleClosed(c)}>
                {c.is_closed ? "Reopen" : "Close"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId != null ? "Edit contribution" : "New contribution"}</h3>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>
            {error && <div className="banner error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
              <div className="field">
                <label>Target level (optional — leave blank for everyone)</label>
                <select value={form.target_level} onChange={(e) => setForm({ ...form, target_level: e.target.value })}>
                  <option value="">Everyone</option>
                  {["100", "200", "300", "400", "500"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="general">General (dues, event fee, project fund…)</option>
                  <option value="merchandise">Merchandise (needs size/color)</option>
                </select>
              </div>
              {form.category === "merchandise" && (
                <>
                  <div className="field">
                    <label>Available sizes (comma-separated)</label>
                    <input
                      value={form.available_sizes}
                      onChange={(e) => setForm({ ...form, available_sizes: e.target.value })}
                      placeholder="S, M, L, XL, XXL"
                    />
                  </div>
                  <div className="field">
                    <label>Available colors (comma-separated)</label>
                    <input
                      value={form.available_colors}
                      onChange={(e) => setForm({ ...form, available_colors: e.target.value })}
                      placeholder="Green, White, Black"
                    />
                  </div>
                </>
              )}
              {adminHasNoDept && (
                <div className="field">
                  <label>Department</label>
                  {departments.length === 0 ? (
                    <div className="banner info" style={{ margin: 0 }}>
                      No departments yet.{" "}
                      <Link to="/admin/departments"><strong>Create one →</strong></Link>
                    </div>
                  ) : (
                    <select
                      required
                      value={form.department_id}
                      onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="mandatory"
                  style={{ width: "auto" }}
                  checked={form.is_mandatory}
                  onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
                />
                <label htmlFor="mandatory" style={{ margin: 0 }}>Mandatory for all students</label>
              </div>
              <button
                className="btn btn-block"
                type="submit"
                disabled={saving || (adminHasNoDept && departments.length === 0)}
              >
                {saving ? "Saving…" : editingId != null ? "Save changes" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
