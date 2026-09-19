// In-memory mock database. Resets on page reload.
// Shapes here mirror what the Django models / DRF serializers should return.
import { CURRENT_SESSION } from "../constants";

export const mockUsers = [
  {
    id: 1,
    matric_no: "CSC/2021/041",
    full_name: "Amina Bello",
    email: "amina.bello@student.edu.ng",
    level: "300",
    role: "student",
    password: "password123",
  },
  {
    id: 2,
    matric_no: "ADMIN/001",
    full_name: "Mr. Femi Ade",
    email: "femi.ade@dept.edu.ng",
    level: null,
    role: "admin",
    password: "adminpass",
  },
];

export const mockContributions = [
  {
    id: 101,
    title: "2nd Semester Departmental Dues",
    category: "dues",
    amount: 5000,
    deadline: "2026-10-15",
    description: "Mandatory dues covering handouts, exam materials, and departmental welfare.",
    mandatory: true,
    created_at: "2026-08-20",
    session: CURRENT_SESSION,
  },
  {
    id: 102,
    title: "Departmental Excursion — Lagos Tech Tour",
    category: "excursion",
    amount: 15000,
    deadline: "2026-09-30",
    description: "Covers transport, feeding, and entry fees for the 2-day excursion.",
    mandatory: false,
    created_at: "2026-08-10",
    session: CURRENT_SESSION,
  },
  {
    id: 103,
    title: "Departmental Shirt (2026 set)",
    category: "merchandise",
    amount: 4500,
    deadline: "2026-09-20",
    description: "Set-branded polo, sizes S–XXL. Select size at payment.",
    mandatory: false,
    created_at: "2026-08-05",
    session: CURRENT_SESSION,
  },
  {
    id: 104,
    title: "Final Year Project Fund",
    category: "project",
    amount: 8000,
    deadline: "2026-11-01",
    description: "Pooled fund for shared project equipment and supervisor honorarium.",
    mandatory: true,
    created_at: "2026-08-01",
    session: CURRENT_SESSION,
  },
];

// A stand-in "uploaded receipt" for the one pre-seeded pending payment, so
// the admin verification screen has something real to render on first load
// (a fresh payment submitted during the session gets an actual preview of
// whatever file the student picked — see submitPayment in api/payments.js).
const demoReceiptSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480">
  <rect width="360" height="480" fill="#fdfdfb"/>
  <rect x="16" y="16" width="328" height="448" fill="#ffffff" stroke="#dbe8de"/>
  <text x="180" y="56" text-anchor="middle" font-family="monospace" font-size="16" font-weight="700" fill="#123524">POS TRANSACTION SLIP</text>
  <line x1="32" y1="72" x2="328" y2="72" stroke="#dbe8de"/>
  <text x="32" y="104" font-family="monospace" font-size="13" fill="#2f5c44">MERCHANT: DEPT STORE</text>
  <text x="32" y="128" font-family="monospace" font-size="13" fill="#2f5c44">DATE: 01-SEP-2026 14:05</text>
  <text x="32" y="152" font-family="monospace" font-size="13" fill="#2f5c44">CARD: **** **** **** 4471</text>
  <text x="32" y="176" font-family="monospace" font-size="13" fill="#2f5c44">REF: 000104 5567</text>
  <line x1="32" y1="196" x2="328" y2="196" stroke="#dbe8de" stroke-dasharray="4 4"/>
  <text x="32" y="228" font-family="monospace" font-size="14" fill="#123524">AMOUNT:</text>
  <text x="328" y="228" text-anchor="end" font-family="monospace" font-size="18" font-weight="700" fill="#123524">NGN 4,500.00</text>
  <line x1="32" y1="248" x2="328" y2="248" stroke="#dbe8de" stroke-dasharray="4 4"/>
  <text x="180" y="290" text-anchor="middle" font-family="monospace" font-size="15" font-weight="700" fill="#2e7d5b">APPROVED</text>
  <text x="180" y="440" text-anchor="middle" font-family="monospace" font-size="10" fill="#5f7267">Departmental shirt — size L</text>
</svg>`.trim();
const demoReceiptDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(demoReceiptSvg)}`;

export const mockPayments = [
  {
    id: "PMT-2026-0091",
    contribution_id: 102,
    student_id: 1,
    amount: 15000,
    channel: "bank_transfer",
    status: "verified",
    proof_url: null,
    proof_name: null,
    reference: "PMT-2026-0091",
    submitted_at: "2026-08-12T10:22:00Z",
    verified_at: "2026-08-13T09:00:00Z",
    verified_by: "Mr. Seun Osuporu",
    note: "",
  },
  {
    id: "PMT-2026-0104",
    contribution_id: 103,
    student_id: 1,
    amount: 4500,
    channel: "pos",
    status: "pending",
    proof_url: demoReceiptDataUrl,
    proof_name: "receipt-0104.jpg",
    reference: "PMT-2026-0104",
    submitted_at: "2026-09-01T14:05:00Z",
    verified_at: null,
    verified_by: null,
    note: "Size: L",
  },
];
