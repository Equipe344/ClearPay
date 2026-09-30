import { useState } from "react";
import AppShell from "../../components/AppShell";
import { importRoster } from "../../api/auth";
import { getErrorMessage } from "../../api/client";

export default function RosterImport() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const res = await importRoster(file);
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell>
      <h1>Import roster</h1>
      <p style={{ color: "var(--muted)" }}>
        Upload a CSV of <code>matric_number, full_name, department, level</code> to bulk-add students. Students
        already on the roster are skipped, not duplicated.
      </p>

      <div className="ledger-card" style={{ maxWidth: 480, padding: 24 }}>
        {error && <div className="banner error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>CSV file</label>
            <input type="file" accept=".csv" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn btn-block" type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading…" : "Import"}
          </button>
        </form>
      </div>

      {result && (
        <div className="ledger-card" style={{ maxWidth: 480, padding: 24, marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Import complete</h3>
          <div className="tiles" style={{ marginBottom: result.errors?.length ? 20 : 0 }}>
            <div className="tile">
              <div className="label">Created</div>
              <div className="value paid">{result.created}</div>
            </div>
            <div className="tile">
              <div className="label">Skipped (already existed)</div>
              <div className="value">{result.skipped}</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <>
              <strong>Rows with problems</strong>
              <table className="data" style={{ marginTop: 8 }}>
                <thead><tr><th>Row</th><th>Issue</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}><td>{e.row}</td><td>{e.message}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
