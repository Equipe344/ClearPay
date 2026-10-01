import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { verifyPayment } from "../api/payments";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!reference) {
      setError("No payment reference was provided.");
      return;
    }

    // Payment status comes only from this verify response — never from the
    // URL. The webhook can lag, so a "pending" result is retried a few
    // times before giving up.
    async function check(currentAttempt) {
      try {
        const { payment: p } = await verifyPayment(reference);
        if (cancelled.current) return;
        setPayment(p);
        if (p.status === "pending" && currentAttempt < MAX_RETRIES) {
          setTimeout(() => {
            if (!cancelled.current) {
              setAttempt(currentAttempt + 1);
              check(currentAttempt + 1);
            }
          }, RETRY_DELAY_MS);
        }
      } catch (err) {
        if (!cancelled.current) setError(err.response?.data?.message || "Could not verify this payment.");
      }
    }
    check(0);

    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <AppShell>
      <h1>Payment result</h1>

      {error && <div className="banner error">{error}</div>}

      {!error && !payment && <p>Checking your payment…</p>}

      {payment && (
        <div className="ledger-card" style={{ padding: 24, maxWidth: 480 }}>
          <p className="ref-code" style={{ marginBottom: 4 }}>{reference}</p>
          <div style={{ marginBottom: 12 }}>
            <StatusBadge status={payment.status} />
          </div>

          {payment.status === "success" && <p>Your payment was confirmed.</p>}

          {payment.status === "pending" && attempt >= MAX_RETRIES && (
            <p>Still processing, check your history in a minute.</p>
          )}
          {payment.status === "pending" && attempt < MAX_RETRIES && <p>Still confirming with the payment provider…</p>}

          {payment.status === "failed" && payment.refund_status === "pending_review" && (
            <p>We received a different amount than expected. The department will review and refund it.</p>
          )}
          {payment.status === "failed" && payment.refund_status !== "pending_review" && (
            <p>This payment didn't go through. You can try again from the Contributions page.</p>
          )}

          <Link className="btn btn-outline" style={{ marginTop: 12 }} to="/history">
            View payment history
          </Link>
        </div>
      )}
    </AppShell>
  );
}
