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
        Upload a CSV with the header{" "}
        <code>first_name, last_name, matric_number, level, department, email</code> (only <code>first_name</code> and{" "}
        <code>matric_number</code> are required). Students already on the roster are skipped, not duplicated.
        Imported students have no password — they activate their account themselves with the claim code below.
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
          <div className="tiles" style={{ marginBottom: 20 }}>
            <div className="tile">
              <div className="label">Created</div>
              <div className="value paid">{result.created}</div>
            </div>
            <div className="tile">
              <div className="label">Skipped (already existed)</div>
              <div className="value">{result.skipped_existing ?? result.skipped ?? 0}</div>
            </div>
          </div>
          {result.claim_batch_code && (
            <div className="banner success" style={{ marginBottom: 20 }}>
              Claim code for these students: <strong className="ref-code">{result.claim_batch_code}</strong> — share it
              so they can activate their accounts on the "Claim account" page.
            </div>
          )}
          {result.errors?.length > 0 && (
            <>
              <strong>Rows with problems</strong>
              <table className="data" style={{ marginTop: 8 }}>
                <thead><tr><th>Row</th><th>Issue</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td>{e.row}</td>
                      <td>{Array.isArray(e.errors) ? e.errors.join(" ") : e.message || e.errors}</td>
                    </tr>
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
