import { useState } from "react";
import { initiatePayment, submitPayment } from "../api/payments";
import { getErrorMessage, getErrorCode } from "../api/client";

// "online_gateway" goes through the documented, secure Paystack flow:
// POST /payments/initiate/ -> redirect -> /payment/callback verifies the
// real status. The other three are self-reported with a proof upload and
// land as "pending" for manual review — see the note on submitPayment in
// api/payments.js: that path isn't in the documented backend contract yet,
// so it only works in mock mode until the backend adds it.
const CHANNELS = [
  { value: "online_gateway", label: "Pay online now (card/transfer via Paystack)" },
  { value: "bank_transfer", label: "I already paid by bank transfer" },
  { value: "pos", label: "I already paid by POS" },
  { value: "cash", label: "I already paid in cash to a class rep" },
];

const ERROR_MESSAGES = {
  already_paid: "You've already paid for this. Refreshing the list…",
  not_found: "This contribution isn't available to you (wrong level, closed, or past deadline).",
  email_required: "Add an email to your profile before paying.",
  gateway_unavailable: "Payment service is busy, try again shortly.",
};

export default function PaymentModal({ contribution, onClose, onAlreadyPaid, onSubmitted }) {
  const isMerch = contribution.category === "merchandise";
  const sizeOptions = contribution.available_sizes || [];
  const colorOptions = contribution.available_colors || [];

  const [channel, setChannel] = useState("online_gateway");
  const [size, setSize] = useState(isMerch ? sizeOptions[0] || "" : "");
  const [color, setColor] = useState(isMerch ? colorOptions[0] || "" : "");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requiresProof = channel !== "online_gateway";

  async function handlePayOnline() {
    try {
      const { checkout_url } = await initiatePayment(contribution.id);
      // Redirect only to the checkout_url the backend returned — never to a
      // URL taken from a query parameter.
      window.location.assign(checkout_url);
    } catch (err) {
      const code = getErrorCode(err);
      if (code === "already_paid" && onAlreadyPaid) {
        setError(ERROR_MESSAGES.already_paid);
        onAlreadyPaid();
        return;
      }
      setError(ERROR_MESSAGES[code] || getErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleSubmitOffline() {
    if (!proofFile) {
      setError("Please attach a screenshot or photo of your payment proof.");
      setSubmitting(false);
      return;
    }
    try {
      const fullNote = isMerch ? `Size: ${size}, Color: ${color}${note ? ` — ${note}` : ""}` : note;
      const record = await submitPayment({
        contributionId: contribution.id,
        channel,
        note: fullNote,
        proofFile,
      });
      onSubmitted?.(record);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    if (channel === "online_gateway") {
      await handlePayOnline();
    } else {
      await handleSubmitOffline();
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
            {channel === "online_gateway" ? (
              <div className="hint">You'll be redirected to Paystack to complete payment.</div>
            ) : (
              <div className="hint">Manually reviewed by an admin — usually within a day or two.</div>
            )}
          </div>

          {isMerch && (
            <div style={{ display: "flex", gap: 12 }}>
              {sizeOptions.length > 0 && (
                <div className="field" style={{ flex: 1 }}>
                  <label>Size</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)}>
                    {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {colorOptions.length > 0 && (
                <div className="field" style={{ flex: 1 }}>
                  <label>Color</label>
                  <select value={color} onChange={(e) => setColor(e.target.value)}>
                    {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

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

          {requiresProof && (
            <div className="field">
              <label>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the reviewer should know" />
            </div>
          )}

          <button className="btn btn-block" type="submit" disabled={submitting}>
            {submitting
              ? channel === "online_gateway" ? "Redirecting to Paystack…" : "Submitting…"
              : channel === "online_gateway" ? "Pay with Paystack" : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}
