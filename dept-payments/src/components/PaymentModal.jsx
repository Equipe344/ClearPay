import { useState } from "react";
import { submitPayment } from "../api/payments";

const CHANNELS = [
  { value: "online_gateway", label: "Pay online now (card/transfer via gateway)" },
  { value: "bank_transfer", label: "I already paid by bank transfer" },
  { value: "pos", label: "I already paid by POS" },
  { value: "cash", label: "I already paid in cash to a class rep" },
];

export default function PaymentModal({ contribution, studentId, onClose, onSubmitted }) {
  const [channel, setChannel] = useState("online_gateway");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requiresProof = channel !== "online_gateway";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (requiresProof && !proofFile) {
      setError("Please attach a screenshot or photo of your payment proof.");
      return;
    }
    setSubmitting(true);
    try {
      const record = await submitPayment({
        contributionId: contribution.id,
        studentId,
        amount: contribution.amount,
        channel,
        note,
        proofFile,
      });
      onSubmitted(record);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Could not submit payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pay: {contribution.title}</h3>
          <button onClick={onClose} aria-label="Close">×</button>
        </div>

        <p style={{ color: "var(--muted)", marginTop: -8 }}>
          Amount due: <strong style={{ color: "var(--ink)" }}>₦{Number(contribution.amount).toLocaleString()}</strong>
        </p>

        {error && <div className="banner error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>How are you paying?</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {channel === "online_gateway" && (
              <div className="hint">
                Marked verified automatically once the gateway (e.g. Paystack) confirms the charge.
              </div>
            )}
            {requiresProof && (
              <div className="hint">Manually reviewed by an admin — usually within a day or two.</div>
            )}
          </div>

          {requiresProof && (
            <div className="field">
              <label>Proof of payment</label>
              <label className={`file-drop ${proofFile ? "has-file" : ""}`}>
                {proofFile ? proofFile.name : "Click to attach a screenshot or photo (JPG, PNG, or PDF)"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setProofFile(e.target.files[0])}
                />
              </label>
            </div>
          )}

          <div className="field">
            <label>Note {contribution.category === "merchandise" ? "(e.g. size)" : "(optional)"}</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the admin should know" />
          </div>

          <button className="btn btn-block" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : channel === "online_gateway" ? "Proceed to pay" : "Submit for verification"}
          </button>
        </form>
      </div>
    </div>
  );
}
