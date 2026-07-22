"use client";

import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  ClipboardList,
  IndianRupee,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Analytics = {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalPartners: number;
  activePartners: number;
  pendingPartnerApprovals: number;
  blockedPartners: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  processingBookings: number;
  openComplaints: number;
  resolvedComplaints: number;
  totalRevenue: number;
  totalCollection: number;
  partnerEarnings: number;
  platformCommission: number;
  pendingPaymentAmount: number;
  totalTransactions: number;
};

type Overview = {
  generatedAt: string;
  analytics: Analytics;
  bookingStatusBreakdown: { status: string; value: number }[];
  recentBookings: Record<string, unknown>[];
  recentComplaints: Record<string, unknown>[];
  recentPayments: Record<string, unknown>[];
  recentActivity?: ActivityItem[];
  paymentsSummary: Record<string, number>;
};

type ActivityItem = {
  id: string;
  eventName: string;
  category: string;
  title: string;
  detail: string;
  bookingCode: string;
  ticketId: string;
  complaintId: string;
  status: string;
  amount: number;
  actorRole: string;
  actorName: string;
  createdAt: string;
};

const emptyOverview: Overview = {
  generatedAt: "",
  analytics: {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalPartners: 0,
    activePartners: 0,
    pendingPartnerApprovals: 0,
    blockedPartners: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    processingBookings: 0,
    openComplaints: 0,
    resolvedComplaints: 0,
    totalRevenue: 0,
    totalCollection: 0,
    partnerEarnings: 0,
    platformCommission: 0,
    pendingPaymentAmount: 0,
    totalTransactions: 0,
  },
  bookingStatusBreakdown: [],
  recentBookings: [],
  recentComplaints: [],
  recentPayments: [],
  recentActivity: [],
  paymentsSummary: {},
};

async function fetchOverview(): Promise<Overview> {
  const response = await fetch("/api/admin/overview", { cache: "no-store" });
  if (!response.ok) throw new Error("Live backend unavailable");
  return response.json();
}

async function fetchActivity(): Promise<{ activity: ActivityItem[] }> {
  const response = await fetch("/api/admin/activity?limit=30", { cache: "no-store" });
  if (!response.ok) throw new Error("Live activity unavailable");
  return response.json();
}

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return String(value);
  return String(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function formatMoney(value: number) {
  return `Rs ${new Intl.NumberFormat("en-IN").format(Math.round(Number(value || 0)))}`;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Status({ value }: { value: string }) {
  const clean = value.toLowerCase();
  return (
    <span
      className={cn(
        "status-pill",
        clean.includes("complete") || clean.includes("paid") || clean.includes("resolved") ? "bg-[#e8f8ef] text-[#079455]" : "",
        clean.includes("pending") || clean.includes("progress") || clean.includes("processing") || clean.includes("created") ? "bg-[#fff4df] text-[#c26a00]" : "",
        clean.includes("open") || clean.includes("cancel") || clean.includes("failed") ? "bg-[#ffebef] text-[#d92d4b]" : "",
      )}
    >
      {value || "-"}
    </span>
  );
}

function PageTitle({ isFetching, onRefresh }: { isFetching: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-[28px] font-black text-[#111827]">Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-[#667085]">Live control center connected to ApnaServo backend</p>
      </div>
      <button onClick={onRefresh} className="flex h-10 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold text-[#344054]">
        <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />
        Refresh
      </button>
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Users; tone: string }) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-center gap-4">
        <div className={cn("metric-icon", tone)}>
          <Icon size={28} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#475467]">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          <p className="mt-2 text-xs font-bold text-[#079455]">{note}</p>
        </div>
      </div>
    </div>
  );
}

function MiniTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-[#667085]">
          <tr>{headers.map((header) => <th key={header} className="px-5 py-3 font-bold">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-5 py-10 text-center text-sm font-semibold text-[#667085]">No live records found.</td></tr>
          ) : rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-[#edf0f6]">
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} className="px-5 py-3 font-medium text-[#263149]">
                  {index === row.length - 1 ? <Status value={cell} /> : index === 0 ? <span className="font-black text-[#0b6df6]">{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingOverview({ data }: { data: Overview }) {
  const colors = ["#1fb875", "#f59e0b", "#ef344f", "#2563eb"];
  const total = data.bookingStatusBreakdown.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  let cursor = 0;
  const stops = data.bookingStatusBreakdown.map((entry, index) => {
    const start = total ? (cursor / total) * 100 : 0;
    cursor += entry.value;
    const end = total ? (cursor / total) * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  return (
    <div className="admin-card min-w-0 p-5">
      <h2 className="mb-4 text-lg font-black">Bookings Overview</h2>
      <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
        <div className="relative grid h-[245px] min-w-0 place-items-center">
          <div className="h-[220px] w-[220px] rounded-full" style={{ background: total ? `conic-gradient(${stops.join(", ")})` : "#edf0f6" }}>
            <div className="m-[34px] h-[152px] w-[152px] rounded-full bg-white" />
          </div>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-black">{formatNumber(data.analytics.totalBookings)}</p>
              <p className="text-sm text-[#667085]">Total Bookings</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {data.bookingStatusBreakdown.map((entry, index) => (
            <div key={entry.status} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 font-semibold text-[#344054]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{entry.status}</span>
              <span className="shrink-0 font-bold">{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function activityTone(category: string) {
  if (category === "booking") return "bg-[#eef5ff] text-[#0b6df6]";
  if (category === "payment") return "bg-[#e8f8ef] text-[#079455]";
  if (category === "support" || category === "complaint") return "bg-[#fff4df] text-[#c26a00]";
  if (category === "user") return "bg-[#f3eaff] text-[#7c3aed]";
  return "bg-[#f2f4f7] text-[#475467]";
}

function LiveWorkflowActivity({ fallback = [] }: { fallback?: ActivityItem[] }) {
  const { data, isFetching, isError } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: fetchActivity,
    refetchInterval: 15_000,
  });
  const activity = data?.activity?.length ? data.activity : fallback;

  return (
    <div className="admin-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Activity size={22} className="text-[#0b6df6]" />
          Live Workflow Activity
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-[#667085]">
          <span className={cn("h-2.5 w-2.5 rounded-full", isError ? "bg-[#ef344f]" : "bg-[#12b76a]", isFetching && "animate-pulse")} />
          Real-time backend
        </div>
      </div>
      {isError && <div className="mb-3 rounded-lg border border-[#ffd3dc] bg-[#fff7f9] px-3 py-2 text-xs font-bold text-[#d92d4b]">Live activity endpoint unavailable.</div>}
      <div className="grid gap-3 xl:grid-cols-2">
        {activity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d9e1ee] px-4 py-8 text-center text-sm font-semibold text-[#667085] xl:col-span-2">
            No live workflow events yet.
          </div>
        ) : activity.slice(0, 12).map((entry) => (
          <div key={entry.id} className="rounded-lg border border-[#edf0f6] bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#111827]">{entry.title || entry.eventName}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#667085]">{entry.detail || entry.eventName}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black capitalize", activityTone(entry.category))}>{entry.category || "live"}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#667085]">
              {(entry.bookingCode || entry.ticketId || entry.complaintId) && <span className="rounded-full bg-[#f6f8fb] px-2 py-1">{entry.bookingCode || entry.ticketId || entry.complaintId}</span>}
              {entry.status && <span className="rounded-full bg-[#f6f8fb] px-2 py-1 capitalize">{entry.status.replace(/_/g, " ")}</span>}
              <span className="flex items-center gap-1"><Clock3 size={12} />{formatDate(entry.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardClient() {
  const { data = emptyOverview, isFetching, isError, refetch } = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverview,
    refetchInterval: 30_000,
  });
  const analytics = data.analytics;

  const recentBookings = data.recentBookings.map((row) => [
    asText(row.bookingCode),
    asText(row.userName),
    asText(row.serviceName),
    asText(row.partnerName),
    asText(row.status),
  ]);
  const recentComplaints = data.recentComplaints.map((row) => [
    asText(row.complaintId),
    asText(row.userName),
    asText(row.type),
    asText(row.status),
  ]);
  const recentPayments = data.recentPayments.map((row) => [
    asText(row.partnerName || row.userName || row.bookingCode),
    formatMoney(Number(row.amount || 0)),
    formatDate(row.createdAt),
    asText(row.status),
  ]);

  return (
    <div>
      <PageTitle isFetching={isFetching} onRefresh={() => refetch()} />
      {isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Live backend unavailable. No default dashboard data is being shown.</div>}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <MetricCard label="Total Users" value={formatNumber(analytics.totalUsers)} note={`${formatNumber(analytics.newUsersToday)} new today`} icon={Users} tone="bg-[#eef5ff] text-[#0b6df6]" />
        <MetricCard label="Total Partners" value={formatNumber(analytics.totalPartners)} note={`${formatNumber(analytics.activePartners)} active`} icon={ShieldCheck} tone="bg-[#e8f8ef] text-[#079455]" />
        <MetricCard label="Total Bookings" value={formatNumber(analytics.totalBookings)} note={`${formatNumber(analytics.completedBookings)} completed`} icon={ClipboardList} tone="bg-[#f3eaff] text-[#8b5cf6]" />
        <MetricCard label="Total Revenue" value={formatMoney(analytics.totalRevenue)} note={`${formatMoney(analytics.platformCommission)} commission`} icon={IndianRupee} tone="bg-[#fff4df] text-[#f59e0b]" />
        <MetricCard label="Pending Payments" value={formatMoney(analytics.pendingPaymentAmount)} note={`${formatNumber(analytics.totalTransactions)} transactions`} icon={WalletCards} tone="bg-[#ffebef] text-[#d92d4b]" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.95fr]">
        <BookingOverview data={data} />
        <div className="admin-card p-5">
          <h2 className="mb-4 text-lg font-black">Payments Summary</h2>
          {[
            ["Total Collection", analytics.totalCollection],
            ["Partner Earnings", analytics.partnerEarnings],
            ["Platform Commission", analytics.platformCommission],
            ["Pending Payments", analytics.pendingPaymentAmount],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-[#edf0f6] py-4 last:border-0">
              <span className="font-semibold text-[#475467]">{String(label)}</span>
              <span className="shrink-0 text-right font-black">{formatMoney(Number(value || 0))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <LiveWorkflowActivity fallback={data.recentActivity || []} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <MiniTable title="Recent Bookings" headers={["Booking ID", "User", "Service", "Partner", "Status"]} rows={recentBookings} />
        <MiniTable title="Recent Complaints" headers={["ID", "User", "Type", "Status"]} rows={recentComplaints} />
        <MiniTable title="Recent Payments" headers={["Name", "Amount", "Date", "Status"]} rows={recentPayments} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1fr]">
        <div className="admin-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><ShieldCheck className="text-[#0b6df6]" size={22} />Partner Approval Status</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["Pending Approval", analytics.pendingPartnerApprovals, "bg-[#fff4df] text-[#b54708]"],
              ["Active Partners", analytics.activePartners, "bg-[#e8f8ef] text-[#079455]"],
              ["Blocked Partners", analytics.blockedPartners, "bg-[#ffebef] text-[#d92d4b]"],
            ].map(([label, value, style]) => (
              <div key={String(label)} className={cn("rounded-xl p-4", String(style))}>
                <p className="text-xs font-bold">{String(label)}</p>
                <p className="mt-2 text-2xl font-black">{formatNumber(Number(value || 0))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card p-5">
          <h2 className="text-lg font-black">At a Glance</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {[
              [CheckCircle2, "Active Users", analytics.activeUsers, "text-[#12b76a]"],
              [CalendarCheck, "Pending Bookings", analytics.pendingBookings, "text-[#0b6df6]"],
              [AlertTriangle, "Open Complaints", analytics.openComplaints, "text-[#f59e0b]"],
              [CheckCircle2, "Resolved Complaints", analytics.resolvedComplaints, "text-[#12b76a]"],
            ].map(([Icon, label, value, color]) => {
              const IconComponent = Icon as typeof Users;
              return (
                <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-[#edf0f6] p-3">
                  <IconComponent size={22} className={String(color)} />
                  <div><p className="text-sm font-medium text-[#667085]">{String(label)}</p><p className="text-lg font-black">{formatNumber(Number(value || 0))}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
