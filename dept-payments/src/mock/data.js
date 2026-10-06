// In-memory mock database. Resets on page reload.
// Shapes here mirror the real API_CONTRACT.md response shapes exactly, so
// components never need two code paths for mock vs real data.

export const mockDepartments = [
  { id: 1, name: "Computer Science", faculty: "Physical Sciences" },
  { id: 2, name: "Mathematics", faculty: "Physical Sciences" },
  { id: 3, name: "Physics", faculty: "Physical Sciences" },
];

export const mockUsers = [
  {
    id: 1,
    username: "amina-csc-2021-041",
    password: "password123",
    email: "amina.bello@student.edu.ng",
    matric_number: "CSC/2021/041",
    department: "Computer Science",
    department_id: 1,
    level: "300",
    role: "student",
    phone_number: "",
    full_name: "Amina Bello",
  },
  {
    id: 2,
    username: "femi-admin",
    password: "adminpass",
    email: "femi.ade@dept.edu.ng",
    matric_number: "ADMIN/001",
    department: "Computer Science",
    department_id: 1,
    level: null,
    role: "admin",
    phone_number: "",
    full_name: "Mr. Femi Ade",
  },
  {
    id: 3,
    username: "tobi-csc-2021-012",
    password: "password123",
    email: "tobi.adekunle@student.edu.ng",
    matric_number: "CSC/2021/012",
    department: "Computer Science",
    department_id: 1,
    level: "300",
    role: "class_rep",
    phone_number: "",
    full_name: "Tobiloba Adekunle",
  },
];

// NOTE: `category`, `available_sizes` and `available_colors` are NOT part
// of the documented backend contract (FRONTEND_INTEGRATION_GUIDE.md section
// 5) — the real Contribution model there is just title/description/amount/
// deadline/is_mandatory/target_level. These three fields are restored here
// as frontend-only extras so merch sizing keeps working against mock data;
// sending them to the real API will simply be ignored (or rejected, if the
// backend validates unknown fields) until the backend adds equivalent
// columns. Swap this note out once that's confirmed.
export const mockContributions = [
  {
    id: 5,
    title: "Departmental Shirt 2026",
    description: "Set-branded polo. Pick a size and color when you pay.",
    amount: "3500.00",
    deadline: "2026-09-30T23:59:00Z",
    is_mandatory: true,
    target_level: null,
    has_paid: false,
    category: "merchandise",
    available_sizes: ["S", "M", "L", "XL", "XXL"],
    available_colors: ["Green", "White", "Black"],
  },
  {
    id: 6,
    title: "Departmental Excursion — Lagos Tech Tour",
    description: "Covers transport, feeding, and entry fees for the 2-day excursion.",
    amount: "15000.00",
    deadline: "2026-10-15T23:59:00Z",
    is_mandatory: false,
    target_level: null,
    has_paid: true,
    category: "general",
  },
  {
    id: 7,
    title: "Final Year Project Fund",
    description: "Pooled fund for shared project equipment and supervisor honorarium.",
    amount: "8000.00",
    deadline: "2026-11-01T23:59:00Z",
    is_mandatory: true,
    target_level: "400",
    has_paid: false,
    category: "general",
  },
];

export const mockPayments = [
  {
    id: 41,
    reference: "PSK-2026-0091",
    contribution: "Departmental Excursion — Lagos Tech Tour",
    contribution_id: 6,
    student_matric: "CSC/2021/041",
    amount: "15000.00",
    status: "success",
    verified_at: "2026-08-13T09:00:00Z",
    created_at: "2026-08-12T10:22:00Z",
    method: "online",
    refund_status: "none",
  },
  {
    id: 42,
    reference: "PSK-2026-0104",
    contribution: "Departmental Shirt 2026",
    contribution_id: 5,
    student_matric: "CSC/2021/041",
    amount: "3000.00",
    status: "failed",
    verified_at: "2026-09-01T14:10:00Z",
    created_at: "2026-09-01T14:05:00Z",
    method: "online",
    refund_status: "pending_review",
  },
];

// GET /payments/unverified/ rows — mismatched-amount payments awaiting a
// refund decision in the Django admin. Read-only for the frontend.
export const mockUnverifiedPayments = [
  {
    id: 42,
    reference: "PSK-2026-0104",
    student_matric: "CSC/2021/041",
    student_name: "Amina Bello",
    contribution_title: "Departmental Shirt 2026",
    expected_amount: "3500.00",
    amount_received: "3000.00",
    mismatch_detail: "Received ₦3,000.00, expected ₦3,500.00",
    refund_status: "pending_review",
    created_at: "2026-09-01T14:10:00Z",
  },
];

export const mockNotifications = [
  {
    id: 1,
    notification_type: "payment_success",
    message: "Your payment for Departmental Excursion — Lagos Tech Tour was confirmed.",
    contribution: 6,
    contribution_title: "Departmental Excursion — Lagos Tech Tour",
    is_read: false,
    created_at: "2026-08-13T09:00:00Z",
  },
];
