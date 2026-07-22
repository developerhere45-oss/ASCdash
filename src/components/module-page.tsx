"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Clipboard,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  Headphones,
  IndianRupee,
  LogOut,
  MapPin,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceConfig } from "@/lib/resource-config";
import { cn } from "@/lib/utils";

type ResourceRow = Record<string, unknown> & { id?: string };
type ResourcePayload = {
  resource: string;
  rows: ResourceRow[];
  metrics?: Record<string, unknown>;
};
type PartnerDocument = {
  id: string;
  documentType: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageProvider: string;
  validationStatus: string;
  validationReasons: string[];
  uploadedAt: string;
};
type PartnerProfilePayload = {
  partner: Record<string, unknown>;
  documents: PartnerDocument[];
  supportTickets: ResourceRow[];
  bookingHistory: ResourceRow[];
  reviewHistory: ResourceRow[];
  activityHistory: ResourceRow[];
  staffActivity?: Array<{
    staff: ResourceRow;
    metrics: { totalAssigned: number; activeOrders: number; completedOrders: number };
    assignedOrders: ResourceRow[];
    activityHistory: ResourceRow[];
  }>;
};
type PartnerDetailTab = "Overview" | "Staff" | "Documents" | "History" | "Activity";

const metricIcons = [Users, CheckCircle2, Clock3, XCircle, CalendarCheck, IndianRupee, WalletCards, AlertTriangle, Star];
const metricTones = [
  "bg-[#eef5ff] text-[#0b6df6]",
  "bg-[#e8f8ef] text-[#079455]",
  "bg-[#fff4df] text-[#f59e0b]",
  "bg-[#ffebef] text-[#d92d4b]",
  "bg-[#f3eaff] text-[#8b5cf6]",
  "bg-[#e6fffb] text-[#0e9384]",
];

async function fetchResource(resource: string): Promise<ResourcePayload> {
  const response = await fetch(`/api/admin/${encodeURIComponent(resource)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Live backend unavailable");
  return response.json();
}

async function runAdminAction(action: string, targetId: string) {
  const response = await fetch("/api/admin/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, targetId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.message === "string" ? payload.message : "Action failed");
  }
  return response.json();
}

function adminActionMessage(action: string, result?: { reapproved?: boolean }) {
  if (action === "approve-technician") return result?.reapproved ? "Partner approved again and notified." : "Partner approved and notified.";
  if (action === "reject-technician") return "Partner denied and notified.";
  if (action === "suspend-technician" || action === "block-technician") return "Partner blocked.";
  if (action === "delete-partner") return "Partner deleted from active admin records.";
  if (action === "delete-device") return "Device deleted and notifications disabled for that device.";
  return "Action completed.";
}

function partnerApprovalState(partner: ResourceRow) {
  const verification = asText(partner.currentVerificationStatus || partner.approval).toLowerCase();
  const kyc = asText(partner.kycStatus || partner.kyc).toLowerCase();
  const account = asText(partner.accountStatus || partner.status).toLowerCase();
  const trust = asText(partner.trustStatus || partner.trust).toLowerCase();
  return {
    approved: verification === "approved" || (kyc === "verified" && trust === "trusted" && account === "active"),
    rejected: verification === "rejected" || verification === "denied" || kyc === "rejected",
    blocked: verification === "blocked" || account === "blocked" || account === "suspended" || trust === "suspended",
  };
}

async function fetchPartnerProfile(partnerId: string): Promise<PartnerProfilePayload> {
  const response = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Partner profile unavailable");
  return response.json();
}

async function updatePartnerDocument(partnerId: string, documentId: string, validationStatus: "accepted" | "rejected" | "review") {
  const response = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}/documents/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ validationStatus }),
  });
  if (!response.ok) throw new Error("Document update failed");
  return response.json();
}

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  const text = String(value);
  // Defence in depth: encrypted database payloads must never be rendered in
  // the admin UI even if an older backend response is briefly cached.
  if (text.startsWith("enc:v1:")) return "Protected data unavailable";
  return text;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function titleFromKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatNumber(value: unknown) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(number);
}

function formatMoney(value: unknown) {
  return `Rs ${new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)))}`;
}

function formatValue(key: string, value: unknown) {
  const lower = key.toLowerCase();
  if (lower.includes("date") || lower.endsWith("at") || lower.includes("time")) return formatDate(value);
  if (lower.includes("amount") || lower.includes("revenue") || lower.includes("payment") || lower.includes("earning") || lower.includes("cost")) return formatMoney(value);
  if (typeof value === "number") return formatNumber(value);
  return asText(value);
}

function statusStyle(value: string) {
  const clean = value.toLowerCase();
  if (clean.includes("active") || clean.includes("paid") || clean.includes("verified") || clean.includes("completed") || clean.includes("resolved") || clean.includes("success")) return "bg-[#e8f8ef] text-[#079455]";
  if (clean.includes("pending") || clean.includes("waiting") || clean.includes("progress") || clean.includes("medium") || clean.includes("due") || clean.includes("created")) return "bg-[#fff4df] text-[#c26a00]";
  if (clean.includes("blocked") || clean.includes("denied") || clean.includes("rejected") || clean.includes("open") || clean.includes("high") || clean.includes("cancel") || clean.includes("failed")) return "bg-[#ffebef] text-[#d92d4b]";
  return "bg-[#eef2f6] text-[#475467]";
}

function Status({ value }: { value: string }) {
  return <span className={cn("status-pill", statusStyle(value))}>{value || "-"}</span>;
}

function initials(value: unknown) {
  const words = asText(value).replace("-", "ApnaServo").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "AS";
}

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    aadhaar_front: "Aadhaar Card Front",
    aadhaar_back: "Aadhaar Card Back",
    pan_card: "PAN Card",
    selfie_photo: "Selfie / Face Photo",
    profile_photo: "Profile Photo",
    id_proof: "Identity Proof",
    address_proof: "Address Proof",
    experience_certificate: "Experience Certificate",
    skill_certificate: "Skill Certificate",
    training_certificate: "Training Certificate",
    government_license: "Government License",
    trade_license: "Trade License",
    other_supporting_document: "Supporting Document",
    laundry_shop_license: "Laundry Shop License",
    laundry_staff_identity: "Laundry Staff ID Proof",
  };
  const laundryStaffMatch = type.match(/^laundry_staff_(\d+)_identity$/);
  if (laundryStaffMatch) return `Laundry Staff ${laundryStaffMatch[1]} ID Proof`;
  return labels[type] || titleFromKey(type || "Document");
}

function normalizedStatus(row: ResourceRow) {
  return asText(row.accountStatus || row.status || row.approval).toLowerCase();
}

function filterRowsByMetric(resource: string, rows: ResourceRow[], metric: string) {
  if (!metric) return rows;

  if (resource === "partners") {
    return rows.filter((row) => {
      const status = normalizedStatus(row);
      const approval = asText(row.approval || row.currentVerificationStatus).toLowerCase();
      const kyc = asText(row.kyc || row.kycStatus).toLowerCase();
      const trust = asText(row.trust || row.trustStatus).toLowerCase();
      const deleted = status === "deleted";
      if (metric === "totalPartners") return !deleted;
      if (metric === "activePartners") return !deleted && status === "active" && trust !== "suspended";
      if (metric === "pendingApproval") return !deleted && ["missing", "submitted", "pending_review"].includes(kyc);
      if (metric === "blockedOrSuspended") return !deleted && (approval === "blocked" || status === "blocked" || status === "suspended" || trust === "suspended");
      if (metric === "deletedPartners") return deleted;
      return !deleted;
    });
  }

  if (resource === "partner-approvals") {
    return rows.filter((row) => {
      const kyc = asText(row.kyc || row.kycStatus).toLowerCase();
      if (metric === "pendingApproval") return ["missing", "submitted", "pending_review"].includes(kyc);
      if (metric === "submitted") return kyc === "submitted";
      if (metric === "pendingReview") return kyc === "pending_review";
      if (metric === "rejected") return kyc === "rejected";
      if (metric === "verified") return kyc === "verified";
      return true;
    });
  }

  if (resource === "bookings") {
    return rows.filter((row) => {
      const status = normalizedStatus(row);
      if (metric === "completed" || metric === "totalRevenue" || metric === "avgOrderValue") return status === "completed";
      if (metric === "pending") return ["pending", "sent_to_partner", "amount_pending", "searching"].includes(status);
      if (metric === "cancelled") return ["cancelled", "canceled"].includes(status);
      return true;
    });
  }

  if (resource === "devices") {
    if (metric === "userDevices") return rows.filter((row) => asText(row.ownerType).toLowerCase() === "user");
    if (metric === "partnerDevices") return rows.filter((row) => asText(row.ownerType).toLowerCase() === "partner");
    if (metric === "activeDevices") return rows.filter((row) => row.active === true || normalizedStatus(row) === "active");
  }

  if (resource === "users" && metric === "activeUsers") {
    return rows.filter((row) => normalizedStatus(row) === "active");
  }

  if (resource === "payments") {
    if (metric === "pendingPayments" || metric === "overduePayments") {
      return rows.filter((row) => ["created", "pending", "failed", "overdue"].includes(normalizedStatus(row)));
    }
    if (["totalPlatformRevenue", "totalPartnerEarnings", "totalCollection"].includes(metric)) {
      return rows.filter((row) => ["paid", "success", "completed"].includes(normalizedStatus(row)));
    }
  }

  return rows;
}

function assetUrl(...values: unknown[]) {
  for (const value of values) {
    const text = asText(value).trim();
    if (text && text !== "-" && (/^https?:\/\//i.test(text) || /^data:image\//i.test(text))) return text;
  }
  return "";
}

function isImageDocument(document: PartnerDocument) {
  return Boolean(document.url) && (
    document.mimeType?.startsWith("image/")
    || document.url.startsWith("data:image/")
    || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(document.url)
  );
}

function documentFileName(document: PartnerDocument) {
  const extension = document.mimeType?.includes("png") ? ".png" : document.mimeType?.includes("jpeg") || document.mimeType?.includes("jpg") ? ".jpg" : "";
  const base = document.originalName || documentLabel(document.documentType).replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "partner-document";
  return /\.[a-z0-9]{2,6}$/i.test(base) ? base : `${base}${extension}`;
}

async function downloadPartnerDocument(document: PartnerDocument) {
  if (!document.url) return;
  const name = documentFileName(document);
  try {
    const response = await fetch(document.url);
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = name;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(document.url, "_blank", "noopener,noreferrer");
  }
}

function serviceTone(service: unknown) {
  const value = asText(service).toLowerCase();
  if (value.includes("plumb")) return "bg-[#fff0f4] text-[#f32368]";
  if (value.includes("electric")) return "bg-[#fff8e6] text-[#c26a00]";
  if (value.includes("clean")) return "bg-[#e8f8ef] text-[#079455]";
  return "bg-[#eef5ff] text-[#0b6df6]";
}

function shortDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function shortTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function copyText(value: unknown) {
  const text = asText(value);
  if (text === "-") return;
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

function columnsFor(resource: string, rows: ResourceRow[]) {
  const known: Record<string, string[]> = {
    bookings: ["bookingCode", "userName", "userMobile", "serviceName", "partnerName", "bookingDateTime", "scheduledDateTime", "status", "finalServiceCost", "paymentStatus"],
    partners: ["code", "name", "phone", "services", "city", "online", "totalBookings", "rating", "kyc", "trust", "status"],
    devices: ["ownerType", "ownerName", "mobileNumber", "platform", "appType", "deviceId", "status", "lastUpdatedAt"],
    "partner-approvals": ["code", "name", "phone", "services", "city", "approval", "kyc", "trust", "joinedAt"],
    payments: ["bookingCode", "userName", "partnerName", "amount", "currency", "status", "razorpayPaymentId", "createdAt"],
    reports: ["reportType", "currentValue"],
  };
  if (known[resource]) return known[resource];
  const first = rows[0] || {};
  return Object.keys(first).filter((key) => key !== "id").slice(0, 10);
}

function PageHeader({ resource, isFetching, onRefresh, onExport }: { resource: string; isFetching: boolean; onRefresh: () => void; onExport: () => void }) {
  const config = resourceConfig[resource] || resourceConfig.bookings;
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <h1 className="text-[28px] font-black text-[#111827]">{config.title}</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">{config.subtitle} - live backend data only</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onRefresh} className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold">
          <RefreshCw size={17} className={cn(isFetching && "animate-spin")} />
          Refresh
        </button>
        <button onClick={onExport} className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold">
          <Download size={17} />
          Export
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, index, active, onClick }: { label: string; value: unknown; index: number; active: boolean; onClick: () => void }) {
  const Icon = metricIcons[index % metricIcons.length];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "admin-card group min-h-[148px] w-full p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#a8c7ff] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6df6]",
        active && "border-[#0b6df6] bg-[#f7faff] shadow-[0_0_0_2px_rgba(11,109,246,0.10)]",
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("metric-icon", metricTones[index % metricTones.length])}><Icon size={25} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#475467]">{titleFromKey(label)}</p>
          <p className="mt-1 text-2xl font-black">{formatValue(label, value)}</p>
          <p className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-[#079455]">
            <span>Live database</span>
            <ArrowRight size={14} className="text-[#0b6df6] transition-transform group-hover:translate-x-0.5" />
          </p>
        </div>
      </div>
    </button>
  );
}

function BookingOperationsTable({ rows }: { rows: ResourceRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => asText(value).toLowerCase().includes(needle)));
  }, [rows, search]);
  const visible = filtered.slice(0, 10);

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf0f6] px-5 py-5">
        <div>
          <h2 className="text-xl font-black text-[#111827]">Bookings List</h2>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Manage and track all customer bookings in real time</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-[360px] max-w-full rounded-lg border border-[#e6eaf2] bg-white px-10 text-sm font-semibold outline-none" placeholder="Search live records..." />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-[#bfd5ff] bg-white px-4 text-sm font-black text-[#0b6df6]"><Filter size={16} />Filter</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1220px] text-left text-sm">
          <thead className="bg-[#fbfcff] text-xs text-[#667085]">
            <tr>
              {["Booking Code", "User Name", "User Mobile", "Service Name", "Partner Name", "Booking Date Time", "Scheduled Date Time", "Status", "Final Service Cost", "Payment Status", "Action"].map((head) => (
                <th key={head} className="px-5 py-4 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={11} className="px-5 py-14 text-center text-sm font-semibold text-[#667085]">No live bookings found.</td></tr>
            ) : visible.map((row) => (
              <tr key={asText(row.id || row.bookingCode)} className="border-t border-[#edf0f6] odd:bg-[#f8fbff] hover:bg-[#f4f8ff]">
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#111827]">{asText(row.bookingCode)}</p>
                  <button onClick={() => copyText(row.bookingCode)} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#0b6df6]"><Copy size={13} />Copy</button>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="font-black text-[#111827]">{asText(row.userName)}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#667085]"><UserRound size={13} />Customer</p>
                </td>
                <td className="px-5 py-4 align-top font-bold text-[#263149]">{asText(row.userMobile)}</td>
                <td className="px-5 py-4 align-top">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-9 w-9 place-items-center rounded-lg", serviceTone(row.serviceName || row.serviceCategory))}><Wrench size={17} /></span>
                    <div>
                      <p className="font-black text-[#263149]">{asText(row.serviceName)}</p>
                      {row.serviceCategory ? <p className="text-xs font-semibold text-[#667085]">{asText(row.serviceCategory)}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top font-bold text-[#263149]">{asText(row.partnerName)}</td>
                <td className="px-5 py-4 align-top">
                  <p className="inline-flex items-center gap-2 font-black text-[#263149]"><CalendarDays size={15} className="text-[#0b6df6]" />{shortDate(row.bookingDateTime)}</p>
                  <p className="mt-1 text-xs font-semibold text-[#263149]">{shortTime(row.bookingDateTime)}</p>
                </td>
                <td className="px-5 py-4 align-top">
                  <p className="inline-flex items-center gap-2 font-black text-[#263149]"><Clock3 size={15} className="text-[#8b5cf6]" />{asText(row.scheduledDateTime)}</p>
                </td>
                <td className="px-5 py-4 align-top"><Status value={asText(row.status)} /></td>
                <td className="px-5 py-4 align-top font-black text-[#111827]">{formatMoney(row.finalServiceCost)}</td>
                <td className="px-5 py-4 align-top"><Status value={asText(row.paymentStatus)} /></td>
                <td className="px-5 py-4 align-top">
                  <Link href={`/bookings/${encodeURIComponent(asText(row.id))}`} className="grid h-9 w-12 place-items-center rounded-lg border border-[#e6eaf2] bg-white text-[#0b6df6]"><Eye size={16} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f6] px-5 py-4 text-sm font-semibold text-[#667085]">
        <span>Showing {visible.length ? `1 to ${visible.length}` : "0"} of {filtered.length} bookings</span>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((page) => <button key={page} className={cn("h-9 w-9 rounded-lg border border-[#e6eaf2] font-black", page === 1 ? "bg-[#0b6df6] text-white" : "bg-white text-[#263149]")}>{page}</button>)}
          <span className="px-2">...</span>
          <button className="h-9 w-9 rounded-lg border border-[#e6eaf2] bg-white font-black text-[#263149]">{Math.max(Math.ceil(filtered.length / 10), 1)}</button>
        </div>
      </div>
    </div>
  );
}

function DataTable({
  resource,
  rows,
  selectedId,
  onSelect,
  onAdminAction,
  pendingAction,
}: {
  resource: string;
  rows: ResourceRow[];
  selectedId: string;
  onSelect: (row: ResourceRow) => void;
  onAdminAction: (action: string, targetId: string) => void;
  pendingAction?: string;
}) {
  const [search, setSearch] = useState("");
  const columns = columnsFor(resource, rows);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row).some((value) => asText(value).toLowerCase().includes(needle)));
  }, [rows, search]);

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f6] px-5 py-4">
        <h2 className="text-lg font-black">{resourceConfig[resource]?.title || "Records"} List</h2>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-[320px] rounded-lg border border-[#e6eaf2] bg-white px-10 text-sm outline-none" placeholder="Search live records..." />
          </div>
          <button className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] px-4 text-sm font-bold"><Filter size={16} />Filter</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs text-[#667085]">
            <tr>
              {columns.map((header) => <th key={header} className="px-5 py-4 font-bold">{titleFromKey(header)}</th>)}
              <th className="px-5 py-4 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-5 py-12 text-center text-sm font-semibold text-[#667085]">No live records found.</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id || JSON.stringify(row)} onClick={() => onSelect(row)} className={cn("cursor-pointer border-t border-[#edf0f6] hover:bg-[#f8fbff]", selectedId && row.id === selectedId && "bg-[#f5f9ff]")}>
                {columns.map((column) => {
                  const value = formatValue(column, row[column]);
                  const statusLike = ["status", "paymentStatus", "kyc", "trust", "priority", "approval"].includes(column);
                  return (
                    <td key={column} className="whitespace-pre-line px-5 py-3 font-medium text-[#263149]">
                      {statusLike ? <Status value={value} /> : value}
                    </td>
                  );
                })}
                <td className="px-5 py-3">
                  {resource === "partner-approvals" && row.id ? (
                    <div className="flex min-w-[240px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        disabled={pendingAction === `${row.id}:approve-technician`}
                        className="flex h-9 items-center gap-1 rounded-lg bg-[#079455] px-3 text-xs font-black text-white disabled:opacity-60"
                        onClick={() => onAdminAction("approve-technician", String(row.id))}
                      >
                        <CheckCircle2 size={14} />
                        {partnerApprovalState(row).rejected ? "Approve Again" : "Approve"}
                      </button>
                      {!partnerApprovalState(row).rejected && (
                        <button
                          disabled={pendingAction === `${row.id}:reject-technician`}
                          className="flex h-9 items-center gap-1 rounded-lg border border-[#ffd3dc] bg-white px-3 text-xs font-black text-[#d92d4b] disabled:opacity-60"
                          onClick={() => onAdminAction("reject-technician", String(row.id))}
                        >
                          <XCircle size={14} />
                          Deny
                        </button>
                      )}
                      <button
                        disabled={pendingAction === `${row.id}:delete-partner`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Delete partner"
                        onClick={() => {
                          if (window.confirm("Delete this partner from active admin records? This will disable partner login notifications and receiving bookings.")) {
                            onAdminAction("delete-partner", String(row.id));
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : resource === "partners" && row.id ? (
                    <div className="flex min-w-[150px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button className="grid h-9 w-10 place-items-center rounded-lg border border-[#e6eaf2]" onClick={() => onSelect(row)} aria-label="View partner"><Eye size={16} /></button>
                      <button
                        disabled={pendingAction === `${row.id}:block-technician`}
                        className="grid h-9 w-10 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Block partner"
                        onClick={() => {
                          if (window.confirm("Block this partner from receiving bookings?")) {
                            onAdminAction("block-technician", String(row.id));
                          }
                        }}
                      >
                        <XCircle size={15} />
                      </button>
                      <button
                        disabled={pendingAction === `${row.id}:delete-partner`}
                        className="grid h-9 w-10 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Delete partner"
                        onClick={() => {
                          if (window.confirm("Delete this partner from active admin records? Active bookings must be completed or reassigned first.")) {
                            onAdminAction("delete-partner", String(row.id));
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : resource === "devices" && row.id ? (
                    <div className="flex min-w-[100px] gap-2" onClick={(event) => event.stopPropagation()}>
                      <button className="grid h-9 w-10 place-items-center rounded-lg border border-[#e6eaf2]" onClick={() => onSelect(row)} aria-label="View device"><Eye size={16} /></button>
                      <button
                        disabled={pendingAction === `${row.id}:delete-device`}
                        className="grid h-9 w-10 place-items-center rounded-lg border border-[#ffd3dc] bg-white text-[#d92d4b] disabled:opacity-60"
                        aria-label="Delete device"
                        onClick={() => {
                          if (window.confirm("Delete this device token? Push notifications will stop for this device.")) {
                            onAdminAction("delete-device", String(row.id));
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : resource === "bookings" && row.id ? (
                    <Link href={`/bookings/${encodeURIComponent(String(row.id))}`} className="grid h-9 w-12 place-items-center rounded-lg border border-[#e6eaf2]" onClick={(event) => event.stopPropagation()}><Eye size={16} /></Link>
                  ) : (
                    <button className="grid h-9 w-12 place-items-center rounded-lg border border-[#e6eaf2]" onClick={(event) => { event.stopPropagation(); onSelect(row); }}><Eye size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#edf0f6] px-5 py-4 text-sm font-medium text-[#667085]">
        <span>Showing {filtered.length} of {rows.length} live records</span>
      </div>
    </div>
  );
}

function PartnerDetailPanel({
  row,
  onAdminAction,
  pendingAction,
}: {
  row: ResourceRow;
  onAdminAction: (action: string, targetId: string) => void;
  pendingAction?: string;
}) {
  const partnerId = String(row.id || "");
  const [activePartnerTab, setActivePartnerTab] = useState<PartnerDetailTab>("Overview");
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-partner-profile", partnerId],
    queryFn: () => fetchPartnerProfile(partnerId),
    enabled: Boolean(partnerId),
    refetchInterval: 30_000,
  });
  const documentMutation = useMutation({
    mutationFn: ({ documentId, validationStatus }: { documentId: string; validationStatus: "accepted" | "rejected" | "review" }) =>
      updatePartnerDocument(partnerId, documentId, validationStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-profile", partnerId] });
    },
  });

  const partner = data?.partner || row;
  const laundryBusiness = asRecord(partner.laundryBusiness);
  const laundryStaffMembers = (Array.isArray(partner.laundryStaffMembers)
    ? partner.laundryStaffMembers
    : Array.isArray(laundryBusiness.staffMembers) ? laundryBusiness.staffMembers : [])
    .map(asRecord);
  const isLaundryPartner = asText(partner.businessType).toLowerCase() === "laundry"
    || asText(partner.professionServiceCategory).toLowerCase().includes("laundry")
    || laundryStaffMembers.length > 0;
  const staffActivity = data?.staffActivity || [];
  const approvalState = partnerApprovalState(partner);
  const docs = data?.documents || [];
  const legacyLaundryStaffDocuments = docs.filter((document) => document.documentType === "laundry_staff_identity");
  const laundryDocumentForStaff = (staff: Record<string, unknown>, index: number) => {
    const documentType = asText(staff.documentType).toLowerCase();
    return docs.find((document) => document.documentType.toLowerCase() === documentType)
      || legacyLaundryStaffDocuments[index];
  };
  const laundryDocuments = docs.filter((document) => document.documentType.toLowerCase().startsWith("laundry_"));
  const laundryShopLicense = docs.find((document) => document.documentType.toLowerCase() === "laundry_shop_license");
  const laundryVerificationRows: Array<[string, unknown]> = [
    ["Shop Name", partner.laundryShopName || laundryBusiness.shopName],
    ["Shop License Number", partner.laundryShopLicenseNumber || laundryBusiness.shopLicenseNumber],
    ["Shop Location", partner.laundryShopLocation || laundryBusiness.shopLocation],
    ["Owner Name", partner.laundryOwnerName || laundryBusiness.ownerName],
    ["Owner Phone", partner.laundryOwnerPhone || laundryBusiness.ownerPhone],
    ["Staff Members", laundryStaffMembers.length],
    ["Verification Status", partner.businessVerificationStatus],
  ];
  const laundryStaffRows = laundryStaffMembers.map((staff, index) => ({
    staff,
    proof: laundryDocumentForStaff(staff, index),
    sequence: asText(staff.sequence) === "-" ? index + 1 : asText(staff.sequence),
  }));
  const profilePhoto = assetUrl(partner.profilePhoto, partner.photoUrl, partner.selfieUrl, row.profilePhoto);
  const hasUploadedProfileDocument = docs.some((document) => {
    const type = String(document.documentType || "").toLowerCase();
    return type === "profile_photo" || type === "selfie_photo" || (profilePhoto && document.url === profilePhoto);
  });
  const verifiedDocumentCount = docs.filter((document) => document.validationStatus === "accepted").length + (profilePhoto ? 1 : 0);
  const profileDocument = profilePhoto && !hasUploadedProfileDocument ? [{
    id: "profile-photo",
    documentType: "profile_photo",
    originalName: "Profile Photo",
    mimeType: "image/jpeg",
    sizeBytes: 0,
    url: profilePhoto,
    storageProvider: "profile",
    validationStatus: asText(partner.currentVerificationStatus) === "Approved" ? "accepted" : "review",
    validationReasons: [],
    uploadedAt: asText(partner.registrationDate),
  } satisfies PartnerDocument] : [];
  const visibleDocs = [...profileDocument, ...docs];
  const detailRows: Array<[string, unknown]> = [
    ["Full Name", partner.fullName || partner.name],
    ["Mobile Number", partner.mobileNumber || partner.phone],
    ["Email", partner.email],
    ["Date Of Birth", partner.dateOfBirth],
    ["Gender", partner.gender],
    ["Complete Residential Address", partner.completeResidentialAddress || partner.residentialAddress],
    ["City", partner.city],
    ["State", partner.state],
    ["PIN Code", partner.pinCode],
    ["Emergency Contact Number", partner.emergencyContactNumber],
    ["Profession Service Category", partner.professionServiceCategory],
    ["Years Of Experience", partner.yearsOfExperience],
    ["Working Areas", partner.workingAreas],
    ["Service Area", partner.serviceArea],
    ["Languages Known", partner.languagesKnown],
    ...(isLaundryPartner ? [
      ["Business Type", partner.businessType || "Laundry"],
      ["Business Verification Status", partner.businessVerificationStatus],
      ["Laundry Shop Name", partner.laundryShopName || laundryBusiness.shopName],
      ["Shop License Number", partner.laundryShopLicenseNumber || laundryBusiness.shopLicenseNumber],
      ["Laundry Shop Location", partner.laundryShopLocation || laundryBusiness.shopLocation],
      ["Laundry Owner Name", partner.laundryOwnerName || laundryBusiness.ownerName],
      ["Laundry Owner Phone", partner.laundryOwnerPhone || laundryBusiness.ownerPhone],
      ["Laundry Staff Members", laundryStaffMembers.length],
    ] as Array<[string, unknown]> : []),
    ["Registration Date", partner.registrationDate],
    ["Current Verification Status", partner.currentVerificationStatus],
    ["Last Approved At", partner.approvedAt],
    ["Last Rejected At", partner.rejectedAt],
    ["Rejection Reason", partner.rejectionReason],
    ["Kyc Status", partner.kycStatus],
    ["Trust Status", partner.trustStatus],
    ["Account Status", partner.accountStatus],
    ["Average Rating", Number(partner.rating || 0) > 0 ? `${Number(partner.rating).toFixed(1)} / 5` : "No ratings yet"],
    ["Customer Reviews", Number(partner.ratingCount || 0)],
  ];

  return (
    <div className="space-y-4">
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
          <button type="button" onClick={() => window.history.back()} className="text-xs font-black text-[#667085]">Back to Partners</button>
          <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e6eaf2] text-[#667085]"><MoreVertical size={16} /></button>
        </div>
        <div className="bg-gradient-to-r from-[#eefbf4] to-[#f8fffb] p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#dff8ea] text-lg font-black text-[#079455] shadow-sm">
                <span>{initials(partner.fullName || partner.name)}</span>
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Partner profile"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.remove();
                    }}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-[#111827]">Partner Verification</h2>
                <p className="mt-1 text-xs font-bold text-[#667085]">{asText(partner.partnerCode || row.code)} <Status value={asText(partner.currentVerificationStatus || row.approval)} /></p>
                <p className="mt-1 text-xs font-semibold text-[#667085]">Registration Date: {formatDate(partner.registrationDate || row.joinedAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!approvalState.approved && (
                <button disabled={pendingAction === `${partnerId}:approve-technician`} onClick={() => onAdminAction("approve-technician", partnerId)} className="flex h-10 items-center gap-2 rounded-lg bg-[#079455] px-4 text-xs font-black text-white disabled:opacity-60"><CheckCircle2 size={15} />{approvalState.rejected ? "Approve Again" : approvalState.blocked ? "Restore & Approve" : "Approve Partner"}</button>
              )}
              {!approvalState.approved && !approvalState.rejected && !approvalState.blocked && (
                <button disabled={pendingAction === `${partnerId}:reject-technician`} onClick={() => onAdminAction("reject-technician", partnerId)} className="flex h-10 items-center gap-2 rounded-lg border border-[#ffd3dc] bg-white px-4 text-xs font-black text-[#d92d4b] disabled:opacity-60"><XCircle size={15} />Reject Partner</button>
              )}
              {approvalState.approved && (
                <button
                  disabled={pendingAction === `${partnerId}:block-technician`}
                  onClick={() => {
                    if (window.confirm("Block this partner from receiving bookings?")) {
                      onAdminAction("block-technician", partnerId);
                    }
                  }}
                  className="flex h-10 items-center gap-2 rounded-lg border border-[#ffd3dc] bg-white px-4 text-xs font-black text-[#d92d4b] disabled:opacity-60"
                >
                  <XCircle size={15} />Block
                </button>
              )}
              <button
                disabled={pendingAction === `${partnerId}:delete-partner`}
                onClick={() => {
                  if (window.confirm("Delete this partner from active admin records? Active bookings must be completed or reassigned first.")) {
                    onAdminAction("delete-partner", partnerId);
                  }
                }}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#d92d4b] px-4 text-xs font-black text-white disabled:opacity-60"
              >
                <Trash2 size={15} />Delete
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-b border-[#edf0f6] px-4 py-3 text-xs font-black">
          {(isLaundryPartner
            ? (["Overview", "Staff", "Documents", "History", "Activity"] as PartnerDetailTab[])
            : (["Overview", "Documents", "History", "Activity"] as PartnerDetailTab[])
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActivePartnerTab(tab)}
              className={cn("rounded-lg px-3 py-2 transition", activePartnerTab === tab ? "bg-[#eef5ff] text-[#0b6df6]" : "text-[#667085] hover:bg-[#f8fbff]")}
            >
              {tab}
            </button>
          ))}
        </div>

        {isError && <div className="m-4 rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">Full live profile unavailable.</div>}
        {isLoading && <div className="m-4 rounded-lg bg-[#f8fbff] p-3 text-xs font-bold text-[#667085]">Loading complete profile...</div>}

        <div className="grid gap-4 p-4 xl:grid-cols-[1fr_320px]">
          <section className={cn("rounded-lg border border-[#edf0f6]", activePartnerTab !== "Overview" && "hidden")}>
            <div className="flex items-center gap-2 border-b border-[#edf0f6] px-4 py-3">
              <UserRound size={16} className="text-[#079455]" />
              <h3 className="text-sm font-black">Partner Details</h3>
            </div>
            <div className="divide-y divide-[#edf0f6] text-sm">
              {detailRows.map(([label, value]) => (
                <div key={String(label)} className="grid grid-cols-[155px_1fr] gap-3 px-4 py-3">
                  <span className="font-semibold text-[#667085]">{label}</span>
                  <span className="break-words font-black text-[#111827]">{formatValue(String(label), value)}</span>
                </div>
              ))}
            </div>
            {isLaundryPartner ? (
              <div className="border-t border-[#edf0f6] bg-[#fffafa] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <WalletCards size={16} className="text-[#d92d4b]" />
                    <div>
                      <h4 className="text-sm font-black text-[#111827]">Laundry Business Verification</h4>
                      <p className="mt-0.5 text-xs font-semibold text-[#667085]">Shop, owner, staff and submitted proof from Partner App.</p>
                    </div>
                  </div>
                  <Status value={asText(partner.businessVerificationStatus || "pending_review")} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {laundryVerificationRows.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-[#ffe3e9] bg-white p-3">
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#d92d4b]">{label}</p>
                      <p className="mt-1 break-words text-sm font-black text-[#111827]">{formatValue(label, value)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-[#ffe3e9] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-[#111827]">Laundry Shop License</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{laundryShopLicense?.originalName || "No license document uploaded yet"}</p>
                    </div>
                    {laundryShopLicense?.url ? (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => window.open(laundryShopLicense.url, "_blank", "noopener,noreferrer")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e6eaf2] px-3 text-xs font-black text-[#0b6df6]"><Eye size={13} />View</button>
                        <button type="button" onClick={() => downloadPartnerDocument(laundryShopLicense)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d7f2e2] px-3 text-xs font-black text-[#079455]"><Download size={13} />Download</button>
                      </div>
                    ) : <Status value="Not Uploaded" />}
                  </div>
                </div>
              </div>
            ) : null}
            {laundryStaffRows.length > 0 ? (
              <div className="border-t border-[#edf0f6] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users size={16} className="text-[#d92d4b]" />
                  <h4 className="text-sm font-black text-[#111827]">Laundry Staff Verification</h4>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[#edf0f6]">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#f8fbff] text-[#667085]">
                      <tr><th className="px-3 py-2">Staff</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">ID Type</th><th className="px-3 py-2">ID Number</th><th className="px-3 py-2">Proof</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf0f6]">
                      {laundryStaffRows.map(({ staff, proof, sequence }, index) => {
                        return (
                          <tr key={`${asText(staff.sequence)}-${index}`}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fff0f4] text-xs font-black text-[#d92d4b]">
                                  {assetUrl(staff.photoUrl) ? <img src={assetUrl(staff.photoUrl)} alt="Staff" className="absolute inset-0 h-full w-full object-cover" /> : sequence}
                                </div>
                                <span className="font-black text-[#111827]">{asText(staff.name)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-semibold text-[#475467]">{asText(staff.phone)}</td>
                            <td className="px-3 py-2 font-semibold text-[#475467]">{asText(staff.role)}</td>
                            <td className="px-3 py-2"><Status value={asText(staff.verificationStatus)} /></td>
                            <td className="px-3 py-2 font-semibold text-[#475467]">{asText(staff.idType)}</td>
                            <td className="px-3 py-2 font-semibold text-[#475467]">{asText(staff.idNumber)}</td>
                            <td className="px-3 py-2">
                              {proof?.url ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => window.open(proof.url, "_blank", "noopener,noreferrer")}
                                    className="inline-flex items-center gap-1 font-black text-[#0b6df6] hover:underline"
                                  >
                                    <Eye size={13} />View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadPartnerDocument(proof)}
                                    className="inline-flex items-center gap-1 font-black text-[#d92d4b] hover:underline"
                                  >
                                    <Download size={13} />Download
                                  </button>
                                </div>
                              ) : (
                                <span className="font-semibold text-[#98a2b3]">Upload pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          {activePartnerTab === "Staff" && (
            <section className="space-y-4 xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#edf0f6] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0f4] text-[#d92d4b]"><Users size={19} /></span>
                  <div><h3 className="text-base font-black text-[#111827]">Laundry Staff & Live Activity</h3><p className="mt-0.5 text-xs font-semibold text-[#667085]">Identity, verification, availability, assigned orders and route updates.</p></div>
                </div>
                <span className="rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-black text-[#0b6df6]">{laundryStaffMembers.length} staff members</span>
              </div>
              {laundryStaffMembers.length === 0 ? (
                <div className="grid min-h-[260px] place-items-center rounded-lg border border-[#edf0f6] bg-[#fbfcff] p-8 text-center"><div><Users className="mx-auto text-[#98a2b3]" size={42} /><p className="mt-4 text-sm font-black text-[#344054]">No staff registered</p><p className="mt-1 text-xs font-semibold text-[#667085]">Staff added by this laundry owner will appear here.</p></div></div>
              ) : laundryStaffMembers.map((staff, index) => {
                const record = staffActivity.find((item) => Number(item.staff.sequence) === Number(staff.sequence || index + 1));
                const metrics = record?.metrics || { totalAssigned: 0, activeOrders: 0, completedOrders: 0 };
                const staffDetails: Array<[string, unknown]> = [
                  ["Staff Sequence", staff.sequence || index + 1], ["Full Name", staff.name], ["Mobile Number", staff.phone],
                  ["Role", staff.role], ["Verification Status", staff.verificationStatus], ["Online Status", staff.isOnline ? "Online" : "Offline"],
                  ["Last Login", staff.lastLoginAt], ["ID Type", staff.idType], ["ID Number", staff.idNumber],
                  ["Document Title", staff.documentTitle], ["Firebase UID", staff.firebaseUid],
                ];
                return (
                  <article key={`${asText(staff.sequence)}-${index}`} className="overflow-hidden rounded-xl border border-[#e6eaf2] bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f6] bg-[#fbfcff] p-4">
                      <div className="flex items-center gap-3"><div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fff0f4] font-black text-[#d92d4b]">{assetUrl(staff.photoUrl) ? <img src={assetUrl(staff.photoUrl)} alt="Staff" className="absolute inset-0 h-full w-full object-cover" /> : initials(staff.name)}</div><div><h4 className="text-sm font-black text-[#111827]">{asText(staff.name)}</h4><p className="mt-0.5 text-xs font-semibold text-[#667085]">{asText(staff.role)} · Staff #{asText(staff.sequence || index + 1)}</p></div></div>
                      <div className="flex gap-2"><Status value={asText(staff.verificationStatus)} /><Status value={staff.isOnline ? "Online" : "Offline"} /></div>
                    </div>
                    <div className="grid gap-4 p-4 xl:grid-cols-[0.85fr_1.15fr]">
                      <div><div className="grid gap-2 sm:grid-cols-2">{staffDetails.map(([label, value]) => <div key={label} className="rounded-lg border border-[#edf0f6] p-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#667085]">{label}</p><p className="mt-1 break-all text-xs font-black text-[#111827]">{label.includes("Login") ? formatDate(value) : formatValue(label, value)}</p></div>)}</div></div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">{[["Assigned", metrics.totalAssigned], ["Active", metrics.activeOrders], ["Completed", metrics.completedOrders]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-[#f8fbff] p-3 text-center"><p className="text-lg font-black text-[#111827]">{value}</p><p className="text-[10px] font-black uppercase text-[#667085]">{label}</p></div>)}</div>
                        <div className="rounded-lg border border-[#edf0f6]"><p className="border-b border-[#edf0f6] px-3 py-2 text-xs font-black">Assigned Orders</p><div className="max-h-52 divide-y divide-[#edf0f6] overflow-y-auto">{(record?.assignedOrders || []).length === 0 ? <p className="p-3 text-xs font-semibold text-[#667085]">No orders assigned yet.</p> : record?.assignedOrders.map((order) => <Link key={asText(order.id)} href={`/bookings/${encodeURIComponent(asText(order.id))}`} className="flex items-center justify-between gap-3 p-3 hover:bg-[#f8fbff]"><div><p className="text-xs font-black text-[#0b6df6]">{asText(order.bookingCode || order.id)}</p><p className="mt-1 text-[11px] font-semibold text-[#667085]">{asText(order.serviceName || order.serviceCategory)} · {asText(order.customerName || "Customer")}</p></div><div className="text-right"><Status value={asText(order.status)} /><p className="mt-1 text-[10px] font-bold text-[#98a2b3]">{formatDate(order.assignedAt || order.createdAt)}</p></div></Link>)}</div></div>
                        <div className="rounded-lg border border-[#edf0f6]"><p className="border-b border-[#edf0f6] px-3 py-2 text-xs font-black">Recent Staff Activity</p><div className="max-h-48 space-y-2 overflow-y-auto p-3">{(record?.activityHistory || []).length === 0 ? <p className="text-xs font-semibold text-[#667085]">No activity recorded yet.</p> : record?.activityHistory.map((activity) => <div key={asText(activity.id)} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#079455]" /><div><p className="text-xs font-black text-[#111827]">{asText(activity.title)}</p><p className="text-[11px] font-semibold text-[#667085]">{asText(activity.description)}</p><p className="text-[10px] font-bold text-[#98a2b3]">{formatDate(activity.createdAt)}</p></div></div>)}</div></div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <section className={cn("rounded-lg border border-[#edf0f6]", activePartnerTab !== "Documents" && "hidden", activePartnerTab === "Documents" && "xl:col-span-2")}>
            <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#079455]" />
                <h3 className="text-sm font-black">Uploaded Documents</h3>
              </div>
              <span className="rounded-full bg-[#e8f8ef] px-2 py-1 text-xs font-black text-[#079455]">{visibleDocs.length}</span>
            </div>
            <div className="max-h-[620px] space-y-3 overflow-y-auto p-4">
              {isLaundryPartner ? (
                <div className="rounded-xl border border-[#ffd3dc] bg-[#fff7f9] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-[#111827]">Laundry Submitted Details & Proofs</h4>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">All laundry shop and staff verification data sent from the Partner App.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#d92d4b]">{laundryDocuments.length} laundry documents</span>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-[#ffe3e9] bg-white p-3">
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#d92d4b]">Shop License</p>
                      <p className="mt-1 text-sm font-black text-[#111827]">{asText(partner.laundryShopName || laundryBusiness.shopName)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{asText(partner.laundryShopLicenseNumber || laundryBusiness.shopLicenseNumber)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{asText(partner.laundryShopLocation || laundryBusiness.shopLocation)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {laundryShopLicense?.url ? (
                          <>
                            <button type="button" onClick={() => window.open(laundryShopLicense.url, "_blank", "noopener,noreferrer")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e6eaf2] px-3 text-xs font-black text-[#0b6df6]"><Eye size={13} />View License</button>
                            <button type="button" onClick={() => downloadPartnerDocument(laundryShopLicense)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d7f2e2] px-3 text-xs font-black text-[#079455]"><Download size={13} />Download</button>
                          </>
                        ) : <Status value="Document Optional / Not Uploaded" />}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#ffe3e9] bg-white p-3">
                      <p className="text-[11px] font-black uppercase tracking-wide text-[#d92d4b]">Owner</p>
                      <p className="mt-1 text-sm font-black text-[#111827]">{asText(partner.laundryOwnerName || laundryBusiness.ownerName)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{asText(partner.laundryOwnerPhone || laundryBusiness.ownerPhone)}</p>
                      <p className="mt-3 rounded-lg bg-[#f8fbff] p-2 text-xs font-bold text-[#667085]">Business verification: {asText(partner.businessVerificationStatus)}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {laundryStaffRows.length === 0 ? (
                      <p className="rounded-lg bg-white p-3 text-xs font-bold text-[#667085]">No laundry staff submitted yet.</p>
                    ) : laundryStaffRows.map(({ staff, proof, sequence }, index) => (
                      <div key={`laundry-document-staff-${sequence}-${index}`} className="grid gap-3 rounded-lg border border-[#ffe3e9] bg-white p-3 md:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#111827]">{sequence}. {asText(staff.name)}</p>
                          <p className="mt-1 text-xs font-semibold text-[#667085]">{asText(staff.role)} - {asText(staff.phone)}</p>
                          <p className="mt-1 text-xs font-semibold text-[#667085]">ID: {asText(staff.idType)} {asText(staff.idNumber)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Status value={asText(staff.verificationStatus)} />
                            <Status value={proof?.validationStatus ? asText(proof.validationStatus) : "Proof Not Uploaded"} />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          {proof?.url ? (
                            <>
                              <button type="button" onClick={() => window.open(proof.url, "_blank", "noopener,noreferrer")} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e6eaf2] px-3 text-xs font-black text-[#0b6df6]"><Eye size={13} />View</button>
                              <button type="button" onClick={() => downloadPartnerDocument(proof)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d7f2e2] px-3 text-xs font-black text-[#079455]"><Download size={13} />Download</button>
                            </>
                          ) : <span className="rounded-lg bg-[#f8fbff] px-3 py-2 text-xs font-black text-[#667085]">No file attached</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {visibleDocs.length === 0 ? (
                <p className="rounded-lg bg-[#fff7f9] p-3 text-xs font-bold text-[#d92d4b]">No profile photo or documents uploaded yet.</p>
              ) : visibleDocs.map((document) => (
                <div key={document.id} className="grid gap-3 rounded-xl border border-[#edf0f6] bg-white p-3 shadow-sm md:grid-cols-[120px_1fr_auto]">
                  <button
                    type="button"
                    disabled={!document.url}
                    onClick={() => document.url && window.open(document.url, "_blank", "noopener,noreferrer")}
                    className="grid h-24 w-full place-items-center overflow-hidden rounded-lg bg-[#f8fbff] disabled:cursor-not-allowed md:w-[120px]"
                    aria-label={`View ${documentLabel(document.documentType)}`}
                  >
                    {isImageDocument(document) ? (
                      <img
                        src={document.url}
                        alt={documentLabel(document.documentType)}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : <FileText size={26} className="text-[#667085]" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-[#111827]">{documentLabel(document.documentType)}</p>
                      <Status value={document.validationStatus === "accepted" ? "Verified" : document.validationStatus} />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#667085]">{document.originalName || "Uploaded file"} · {document.mimeType || "image"} · {document.sizeBytes ? `${formatNumber(document.sizeBytes)} bytes` : "size not recorded"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#98a2b3]">Uploaded: {formatDate(document.uploadedAt)}</p>
                    {document.validationReasons?.length ? (
                      <p className="mt-2 rounded-lg bg-[#fff7f9] p-2 text-xs font-bold text-[#d92d4b]">{document.validationReasons.join(", ")}</p>
                    ) : null}
                    {!document.url ? <p className="mt-2 rounded-lg bg-[#fff7f9] p-2 text-xs font-bold text-[#d92d4b]">Missing file URL from backend.</p> : null}
                    {document.id !== "profile-photo" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={documentMutation.isPending}
                          onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "accepted" })}
                          className="rounded-md bg-[#e8f8ef] px-3 py-1.5 text-[11px] font-black text-[#079455] disabled:opacity-60"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={documentMutation.isPending}
                          onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "review" })}
                          className="rounded-md bg-[#fff4df] px-3 py-1.5 text-[11px] font-black text-[#c26a00] disabled:opacity-60"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          disabled={documentMutation.isPending}
                          onClick={() => documentMutation.mutate({ documentId: document.id, validationStatus: "rejected" })}
                          className="rounded-md bg-[#fff0f4] px-3 py-1.5 text-[11px] font-black text-[#d92d4b] disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:flex-col md:items-end">
                    <button
                      type="button"
                      disabled={!document.url}
                      onClick={() => document.url && window.open(document.url, "_blank", "noopener,noreferrer")}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e6eaf2] px-3 text-xs font-black text-[#0b6df6] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Eye size={15} />View
                    </button>
                    <button
                      type="button"
                      disabled={!document.url}
                      onClick={() => downloadPartnerDocument(document)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d7f2e2] px-3 text-xs font-black text-[#079455] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download size={15} />Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={cn("rounded-lg border border-[#edf0f6] p-4", activePartnerTab !== "Overview" && "hidden")}>
            <div className="flex items-center gap-2"><UserRound size={16} className="text-[#079455]" /><h3 className="text-sm font-black">About Partner</h3></div>
            <p className="mt-3 rounded-lg bg-[#f8fbff] p-3 text-sm font-semibold text-[#475467]">
              {asText(partner.fullName || row.name)} is registered for {formatValue("services", partner.professionServiceCategory || row.services)} with {formatValue("yearsOfExperience", partner.yearsOfExperience || 0)} years of experience.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-[#edf0f6] p-3"><Clock3 size={15} className="mb-2 text-[#667085]" /><b>{asText(partner.yearsOfExperience || 0)}</b><br />Years Exp.</div>
              <div className="rounded-lg border border-[#edf0f6] p-3"><Wrench size={15} className="mb-2 text-[#667085]" /><b>{formatValue("services", partner.professionServiceCategory || row.services)}</b><br />Specialization</div>
              <div className="rounded-lg border border-[#edf0f6] p-3"><MapPin size={15} className="mb-2 text-[#667085]" /><b>{asText(partner.city || row.city)}</b><br />Service Area</div>
            </div>
          </section>

          <section className={cn("grid gap-4 xl:grid-cols-1", activePartnerTab !== "Overview" && "hidden")}>
            <div className="rounded-lg border border-[#edf0f6] p-4">
              <h3 className="text-sm font-black">Verification Notes</h3>
              <p className="mt-3 rounded-lg bg-[#effbf4] p-3 text-xs font-bold text-[#079455]">All documents and profile photo are fetched from the live backend. Verified documents: {verifiedDocumentCount}.</p>
            </div>
            <div className="rounded-lg border border-[#edf0f6] p-4">
              <h3 className="text-sm font-black">Quick Actions</h3>
              <Link href={`/notifications?target=partner&partnerId=${encodeURIComponent(partnerId)}`} className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#edf0f6] px-3 py-3 text-xs font-black hover:bg-[#f8fbff]"><span className="inline-flex items-center gap-2"><MessageSquare size={15} />Send Message</span><span>&gt;</span></Link>
              <Link href={`/partners/${encodeURIComponent(partnerId)}`} className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#edf0f6] px-3 py-3 text-xs font-black hover:bg-[#f8fbff]"><span className="inline-flex items-center gap-2"><UserRound size={15} />View Partner Profile</span><span>&gt;</span></Link>
            </div>
          </section>
          {activePartnerTab === "History" && (
            <section className="grid gap-5 xl:col-span-2 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="overflow-hidden rounded-lg border border-[#e6eaf2] bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#edf0f6] px-5 py-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef5ff] text-[#0b6df6]"><CalendarDays size={18} /></span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">Booking History</h3>
                    <p className="mt-0.5 text-xs font-semibold text-[#667085]">All bookings assigned to this partner</p>
                  </div>
                </div>
                <div className="max-h-[560px] overflow-auto p-4">
                  {(data?.bookingHistory || []).length === 0 ? (
                    <div className="grid min-h-[260px] place-items-center rounded-lg bg-[#f8fbff] p-8 text-center">
                      <div><ClipboardList className="mx-auto text-[#98a2b3]" size={42} /><p className="mt-4 text-sm font-black text-[#344054]">No booking history found</p><p className="mt-1 text-xs font-semibold text-[#667085]">Assigned bookings will appear here.</p></div>
                    </div>
                  ) : (
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-[#f8fbff] text-[#667085]">
                        <tr>
                          {['Booking ID', 'Service', 'Customer', 'Date & Time', 'Amount', 'Status'].map((heading) => <th key={heading} className="px-3 py-3 font-black">{heading}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.bookingHistory || []).map((booking) => (
                          <tr key={String(booking.id)} className="border-t border-[#edf0f6] hover:bg-[#fbfdff]">
                            <td className="px-3 py-4"><Link href={`/bookings/${encodeURIComponent(asText(booking.id))}`} className="font-black text-[#0b6df6] hover:underline">{asText(booking.bookingCode || booking.id)}</Link></td>
                            <td className="px-3 py-4"><span className="inline-flex items-center gap-2 font-bold text-[#263149]"><Wrench size={14} className="text-[#667085]" />{asText(booking.serviceName || booking.serviceCategory || booking.service)}</span></td>
                            <td className="px-3 py-4 font-semibold text-[#344054]">{asText(booking.customerName || booking.customer || booking.userName)}</td>
                            <td className="px-3 py-4 font-semibold text-[#344054]"><span className="block">{shortDate(booking.createdAt || booking.bookingDateTime)}</span><span className="mt-1 block text-[#667085]">{shortTime(booking.createdAt || booking.bookingDateTime)}</span></td>
                            <td className="px-3 py-4 font-black text-[#111827]">{formatMoney(booking.finalAmount || booking.finalServiceCost || booking.amount)}</td>
                            <td className="px-3 py-4"><Status value={asText(booking.status || booking.bookingStatus)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <Link href="/bookings" className="flex items-center gap-2 border-t border-[#edf0f6] px-5 py-4 text-xs font-black text-[#0b6df6] hover:bg-[#f8fbff]">View all bookings <ArrowRight size={14} /></Link>
              </div>
              <div className="overflow-hidden rounded-lg border border-[#e6eaf2] bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#edf0f6] px-5 py-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef5ff] text-[#0b6df6]"><Headphones size={18} /></span>
                  <div>
                    <h3 className="text-base font-black text-[#111827]">Support Ticket History</h3>
                    <p className="mt-0.5 text-xs font-semibold text-[#667085]">Complaints and support requests</p>
                  </div>
                </div>
                <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">
                  {(data?.supportTickets || []).length === 0 ? (
                    <div className="grid min-h-[360px] place-items-center rounded-lg bg-[#fbfcff] p-8 text-center">
                      <div>
                        <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#f0f3f9] text-[#98a2b3]"><ClipboardList size={42} /></span>
                        <p className="mt-5 text-base font-black text-[#111827]">No support tickets found</p>
                        <p className="mx-auto mt-2 max-w-[230px] text-sm font-semibold leading-6 text-[#667085]">Tickets will appear here when this partner raises a request.</p>
                      </div>
                    </div>
                  ) : (data?.supportTickets || []).map((ticket) => (
                    <Link href={`/users/support/${encodeURIComponent(asText(ticket.id))}`} key={String(ticket.id)} className="block rounded-lg border border-[#edf0f6] p-4 transition hover:border-[#bfd5ff] hover:bg-[#f8fbff]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-[#111827]">{asText(ticket.title || ticket.category)}</p>
                        <Status value={asText(ticket.status)} />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{asText(ticket.message || ticket.body)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{formatDate(ticket.createdAt)}</p>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-[#e6eaf2] bg-white shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-3 border-b border-[#edf0f6] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff8e2] text-[#e69d12]"><Star size={18} /></span>
                    <div>
                      <h3 className="text-base font-black text-[#111827]">Customer Rating History</h3>
                      <p className="mt-0.5 text-xs font-semibold text-[#667085]">Live ratings submitted after completed bookings</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#fff8e2] px-3 py-1 text-xs font-black text-[#b66b00]">
                    {Number(partner.ratingCount || 0) > 0 ? `${Number(partner.rating || 0).toFixed(1)} / 5 - ${Number(partner.ratingCount)} reviews` : "No ratings"}
                  </span>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {(data?.reviewHistory || []).length === 0 ? (
                    <div className="rounded-lg bg-[#fbfcff] p-5 text-sm font-bold text-[#667085] md:col-span-2 xl:col-span-3">Customer ratings will appear here after payment verification and service completion.</div>
                  ) : (data?.reviewHistory || []).map((review) => (
                    <div key={String(review.id)} className="rounded-lg border border-[#edf0f6] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/bookings/${encodeURIComponent(asText(review.bookingId))}`} className="text-xs font-black text-[#0b6df6] hover:underline">{asText(review.bookingCode || review.bookingId)}</Link>
                        <span className="flex text-[#e69d12]">
                          {[0, 1, 2, 3, 4].map((index) => <Star key={index} size={14} fill={index < Number(review.rating || 0) ? "currentColor" : "none"} />)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-black text-[#111827]">{asText(review.customerName || "Customer")}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{asText(review.comment || "Rating submitted without a written comment.")}</p>
                      <p className="mt-2 text-[11px] font-bold text-[#98a2b3]">{formatDate(review.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          {activePartnerTab === "Activity" && (
            <section className="rounded-lg border border-[#edf0f6] p-4 xl:col-span-2">
              <h3 className="text-sm font-black">Activity Timeline</h3>
              <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">
                {(data?.activityHistory || []).length === 0 ? (
                  <p className="rounded-lg bg-[#f8fbff] p-3 text-xs font-bold text-[#667085]">No activity available yet.</p>
                ) : (data?.activityHistory || []).map((activity) => (
                  <div key={String(activity.id)} className="flex gap-3 rounded-lg border border-[#edf0f6] p-3">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#079455]" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#111827]">{asText(activity.title || activity.type)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#667085]">{asText(activity.description || activity.message)}</p>
                      <p className="mt-1 text-xs font-bold text-[#98a2b3]">{formatDate(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  resource,
  row,
  onAdminAction,
  pendingAction,
}: {
  resource: string;
  row: ResourceRow | null;
  onAdminAction: (action: string, targetId: string) => void;
  pendingAction?: string;
}) {
  if (!row) {
    return (
      <div className="admin-card p-5">
        <h2 className="text-lg font-black">Selected Record</h2>
        <p className="mt-5 text-sm font-semibold text-[#667085]">Select a live row to inspect details.</p>
      </div>
    );
  }

  if ((resource === "partners" || resource === "partner-approvals") && row.id) {
    return <PartnerDetailPanel row={row} onAdminAction={onAdminAction} pendingAction={pendingAction} />;
  }

  return (
    <div className="admin-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-black">Selected Record</h2>
        {row.status ? <Status value={asText(row.status)} /> : null}
      </div>
      <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1 text-sm">
        {Object.entries(row).map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-4 border-b border-[#edf0f6] pb-3 last:border-0">
            <span className="font-semibold text-[#667085]">{titleFromKey(label)}</span>
            <span className="break-words font-bold text-[#111827]">{formatValue(label, value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StandalonePartnerProfile({ partnerId }: { partnerId: string }) {
  const [actionMessage, setActionMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["admin-partner-profile-shell", partnerId],
    queryFn: () => fetchPartnerProfile(partnerId),
    enabled: Boolean(partnerId),
  });
  const row = useMemo<ResourceRow>(() => {
    const partner = profileQuery.data?.partner || {};
    return {
      ...partner,
      id: partnerId,
      name: partner.fullName || partner.name || "Partner",
      services: partner.professionServiceCategory || partner.services,
      city: partner.city || partner.serviceArea,
      status: partner.verificationStatus || partner.accountStatus,
    };
  }, [partnerId, profileQuery.data]);
  const actionMutation = useMutation({
    mutationFn: ({ action, targetId }: { action: string; targetId: string }) => runAdminAction(action, targetId),
    onMutate: ({ action, targetId }) => {
      setPendingAction(`${targetId}:${action}`);
      setActionMessage("");
    },
    onSuccess: async (result, variables) => {
      setActionMessage(adminActionMessage(variables.action, result));
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-profile", partnerId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-partner-profile-shell", partnerId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", "partners"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", "partner-approvals"] });
    },
    onError: (error) => {
      setActionMessage(error instanceof Error ? error.message : "Action failed");
    },
    onSettled: () => setPendingAction(""),
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <Link href="/partners" className="text-xs font-black text-[#0b6df6]">&lt; Back to Partners</Link>
          <h1 className="mt-3 text-[28px] font-black text-[#111827]">Partner Verification</h1>
          <p className="mt-1 text-sm font-semibold text-[#667085]">Live partner profile, documents, actions and verification state.</p>
        </div>
        <button onClick={() => profileQuery.refetch()} className="flex h-10 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-black text-[#17233c]">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {profileQuery.isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Partner profile unavailable from live backend.</div>}
      {actionMessage && (
        <div className={cn("admin-card mb-5 p-4 text-sm font-bold", actionMessage.includes("failed") || actionMessage.includes("unavailable") ? "border-[#ffd3dc] bg-[#fff7f9] text-[#d92d4b]" : "border-[#c7f0d8] bg-[#f3fff7] text-[#079455]")}>
          {actionMessage}
        </div>
      )}
      {profileQuery.isLoading ? (
        <div className="admin-card p-8 text-sm font-bold text-[#667085]">Loading complete partner profile...</div>
      ) : (
        <PartnerDetailPanel
          row={row}
          onAdminAction={(action, targetId) => actionMutation.mutate({ action, targetId })}
          pendingAction={pendingAction}
        />
      )}
    </div>
  );
}

function exportRows(resource: string, rows: ResourceRow[]) {
  const columns = columnsFor(resource, rows);
  const csv = [
    columns.map(titleFromKey).join(","),
    ...rows.map((row) => columns.map((column) => `"${asText(row[column]).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${resource}-live-export.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-black text-[#111827]">Settings</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">No default settings are displayed until a live settings backend endpoint is connected.</p>
      </div>
      <div className="admin-card p-8">
        <div className="flex items-center gap-3">
          <Settings className="text-[#0b6df6]" size={24} />
          <div>
            <h2 className="text-lg font-black">Live Settings Required</h2>
            <p className="mt-1 text-sm font-semibold text-[#667085]">This panel is intentionally empty instead of showing fake/default configuration values.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoutPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-black text-[#111827]">Logout</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">Dashboard &gt; Logout</p>
      </div>
      <div className="grid min-h-[620px] place-items-center">
        <div className="admin-card w-full max-w-[560px] p-10 text-center">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#eef5ff] text-[#0b6df6]"><LogOut size={54} /></div>
          <h2 className="mt-7 text-3xl font-black">Ready to Logout?</h2>
          <p className="mt-4 text-[#667085]">Password/login is disabled for this local build as requested.</p>
          <Link href="/dashboard" className="mt-8 grid h-12 w-full place-items-center rounded-lg bg-[#0b6df6] text-sm font-black text-white">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

export function ModulePage({ resource }: { resource: string }) {
  const [selected, setSelected] = useState<ResourceRow | null>(null);
  const [metricFilter, setMetricFilter] = useState(resource === "partners" ? "totalPartners" : "");
  const [actionMessage, setActionMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-resource", resource],
    queryFn: () => fetchResource(resource),
    refetchInterval: 30_000,
    enabled: resource !== "settings" && resource !== "logout",
  });
  const actionMutation = useMutation({
    mutationFn: ({ action, targetId }: { action: string; targetId: string }) => runAdminAction(action, targetId),
    onMutate: ({ action, targetId }) => {
      setPendingAction(`${targetId}:${action}`);
      setActionMessage("");
    },
    onSuccess: async (result, variables) => {
      setActionMessage(adminActionMessage(variables.action, result));
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-resource", resource] });
    },
    onError: (error) => {
      setActionMessage(error instanceof Error ? error.message : "Action failed");
    },
    onSettled: () => setPendingAction(""),
  });

  useEffect(() => {
    setMetricFilter(resource === "partners" ? "totalPartners" : "");
    setSelected(null);
  }, [resource]);

  if (resource === "settings") return <SettingsPage />;
  if (resource === "logout") return <LogoutPage />;

  const rows = data?.rows || [];
  const visibleRows = filterRowsByMetric(resource, rows, metricFilter);
  const usesStandalonePartnerProfile = resource === "partners" || resource === "partner-approvals";
  const selectedRow = selected && visibleRows.some((row) => row.id === selected.id) ? selected : usesStandalonePartnerProfile ? null : visibleRows[0] || null;
  const metrics = Object.entries(data?.metrics || {});

  const handleMetricClick = (label: string) => {
    if (resource === "partners" && label === "totalBookings") {
      router.push("/bookings");
      return;
    }
    const defaultMetric = resource === "partners" ? "totalPartners" : "";
    setMetricFilter((current) => current === label ? defaultMetric : label);
    setSelected(null);
  };

  const handleRowSelect = (row: ResourceRow) => {
    if (usesStandalonePartnerProfile && row.id) {
      router.push(`/partners/${encodeURIComponent(String(row.id))}`);
      return;
    }
    setSelected(row);
  };

  return (
    <div>
      <PageHeader resource={resource} isFetching={isFetching} onRefresh={() => refetch()} onExport={() => exportRows(resource, rows)} />
      {isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Live backend unavailable. No default records are being shown.</div>}
      {actionMessage && (
        <div className={cn("admin-card mb-5 p-4 text-sm font-bold", actionMessage.includes("failed") || actionMessage.includes("unavailable") ? "border-[#ffd3dc] bg-[#fff7f9] text-[#d92d4b]" : "border-[#c7f0d8] bg-[#f3fff7] text-[#079455]")}>
          {actionMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.length === 0 ? (
          <div className="admin-card p-5 text-sm font-semibold text-[#667085]">No live metrics returned.</div>
        ) : metrics.map(([label, value], index) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            index={index}
            active={metricFilter === label}
            onClick={() => handleMetricClick(label)}
          />
        ))}
      </section>

      {resource === "bookings" ? (
        <section className="mt-5">
          <BookingOperationsTable rows={visibleRows} />
        </section>
      ) : (
        <section className={cn("mt-5 gap-5", usesStandalonePartnerProfile ? "block" : "grid 2xl:grid-cols-[1fr_430px]")}>
          <DataTable
            resource={resource}
            rows={visibleRows}
            selectedId={asText(selectedRow?.id)}
            onSelect={handleRowSelect}
            onAdminAction={(action, targetId) => actionMutation.mutate({ action, targetId })}
            pendingAction={pendingAction}
          />
          {!usesStandalonePartnerProfile && (
            <DetailPanel
              resource={resource}
              row={selectedRow}
              onAdminAction={(action, targetId) => actionMutation.mutate({ action, targetId })}
              pendingAction={pendingAction}
            />
          )}
        </section>
      )}
    </div>
  );
}
