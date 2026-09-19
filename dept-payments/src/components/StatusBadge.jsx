const LABELS = {
  verified: "Paid",
  pending: "Pending review",
  rejected: "Rejected",
  unpaid: "Unpaid",
};

// "unpaid" (never submitted) is visually distinct from "rejected" (submitted
// then declined) but both read as "not yet resolved," so they share the
// amber/pending badge color while keeping their own label.
const CLASS_MAP = {
  verified: "paid",
  pending: "pending",
  rejected: "rejected",
  unpaid: "pending",
};

export default function StatusBadge({ status }) {
  return <span className={`status status-${CLASS_MAP[status] || status}`}>{LABELS[status] || status}</span>;
}
