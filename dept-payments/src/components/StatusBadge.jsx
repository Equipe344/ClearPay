// Real backend statuses are only success | pending | failed — there is no
// "verified" or "rejected". "unpaid" is a frontend-only label for a
// contribution or roster row with no payment at all yet (has_paid: false).
const LABELS = {
  success: "Paid",
  pending: "Processing",
  failed: "Failed",
  unpaid: "Unpaid",
};

const CLASS_MAP = {
  success: "paid",
  pending: "pending",
  failed: "rejected",
  unpaid: "pending",
};

export default function StatusBadge({ status }) {
  return <span className={`status status-${CLASS_MAP[status] || status}`}>{LABELS[status] || status}</span>;
}
