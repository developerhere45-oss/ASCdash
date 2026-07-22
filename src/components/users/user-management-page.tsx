"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  Filter,
  ListFilter,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  profilePhoto: string;
  registrationDateTime: string;
  lastLoginTime: string;
  accountStatus: string;
  rawAccountStatus: string;
  totalBookings: number;
  totalComplaintsRaised: number;
  currentLocation: { lat: number; lng: number };
  savedAddresses: { id: string; label: string; address: string; city: string; isDefault: boolean }[];
  savedAddressText: string;
  deviceInformation: string;
};

type SupportTicketRow = {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  mobileNumber: string;
  ticketCategory: string;
  priority: string;
  status: string;
  createdDateTime: string;
  lastUpdated: string;
  complaint: string;
};

type ControlCenterData = {
  analytics: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    openComplaints: number;
    resolvedComplaints: number;
  };
  users: UserRow[];
  supportTickets: SupportTicketRow[];
};

type Filters = {
  search: string;
  name: string;
  mobile: string;
  bookingId: string;
  ticketId: string;
  serviceType: string;
  bookingStatus: string;
  complaintStatus: string;
  registrationDate: string;
};

const emptyFilters: Filters = {
  search: "",
  name: "",
  mobile: "",
  bookingId: "",
  ticketId: "",
  serviceType: "",
  bookingStatus: "",
  complaintStatus: "",
  registrationDate: "",
};

const emptyData: ControlCenterData = {
  analytics: {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    openComplaints: 0,
    resolvedComplaints: 0,
  },
  users: [],
  supportTickets: [],
};

function formatDateTime(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
}

function statusClass(value: string) {
  const status = value.toLowerCase();
  if (["active", "completed", "resolved", "paid", "closed"].some((item) => status.includes(item))) return "bg-[#e8f8ef] text-[#079455]";
  if (["blocked", "cancelled", "urgent", "high"].some((item) => status.includes(item))) return "bg-[#ffebef] text-[#d92d4b]";
  if (["suspended", "open", "pending", "progress", "assigned", "medium", "reopened", "escalated"].some((item) => status.includes(item))) return "bg-[#fff4df] text-[#c26a00]";
  return "bg-[#eef2f6] text-[#475467]";
}

function Status({ value }: { value: string }) {
  return <span className={cn("status-pill capitalize", statusClass(value || "unknown"))}>{(value || "Unknown").replace(/_/g, " ")}</span>;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="admin-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("metric-icon shrink-0", tone)}><Icon size={23} /></div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#667085]">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#111827]">{value.toLocaleString("en-IN")}</p>
        </div>
      </div>
    </div>
  );
}

async function fetchControlCenter(filters: Filters): Promise<ControlCenterData> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  const response = await fetch(`/api/admin/users/control-center?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Live backend unavailable");
  return response.json();
}

function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f6] px-5 py-4 text-sm font-medium text-[#667085]">
      <span>{total ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total}` : "No records"}</span>
      <div className="flex gap-2">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e6eaf2] disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="grid h-9 min-w-9 place-items-center rounded-lg border border-[#0b6df6] px-3 font-black text-[#0b6df6]">{page} / {pages}</span>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e6eaf2] disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function UserManagementPage({ initialTab = "users" }: { initialTab?: "users" | "support" }) {
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [usersPage, setUsersPage] = useState(1);
  const [ticketsPage, setTicketsPage] = useState(1);
  const pageSize = 10;
  const { data = emptyData, isFetching, isError, refetch } = useQuery({
    queryKey: ["users-control-center", filters],
    queryFn: () => fetchControlCenter(filters),
    refetchInterval: 30_000,
  });

  const users = useMemo(
    () => data.users.slice((usersPage - 1) * pageSize, usersPage * pageSize),
    [data.users, usersPage],
  );
  const tickets = useMemo(
    () => data.supportTickets.slice((ticketsPage - 1) * pageSize, ticketsPage * pageSize),
    [data.supportTickets, ticketsPage],
  );
  const analytics = data.analytics;
  const metrics = [
    ["Total Users", analytics.totalUsers, Users, "bg-[#eef5ff] text-[#0b6df6]"],
    ["Active Users", analytics.activeUsers, UserCheck, "bg-[#e8f8ef] text-[#079455]"],
    ["New Users Today", analytics.newUsersToday, UserPlus, "bg-[#fff4df] text-[#f59e0b]"],
    ["Total Bookings", analytics.totalBookings, CalendarCheck, "bg-[#f3eaff] text-[#8b5cf6]"],
    ["Completed Bookings", analytics.completedBookings, CheckCircle2, "bg-[#e8f8ef] text-[#079455]"],
    ["Cancelled Bookings", analytics.cancelledBookings, XCircle, "bg-[#ffebef] text-[#d92d4b]"],
    ["Open Complaints", analytics.openComplaints, CircleAlert, "bg-[#fff4df] text-[#f59e0b]"],
    ["Resolved Complaints", analytics.resolvedComplaints, Activity, "bg-[#e6fffb] text-[#0e9384]"],
  ] as const;

  function applyFilters() {
    setFilters(draftFilters);
    setUsersPage(1);
    setTicketsPage(1);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setUsersPage(1);
    setTicketsPage(1);
  }

  const inputClass = "h-10 min-w-0 rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm outline-none focus:border-[#0b6df6]";

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-[28px] font-black text-[#111827]">Users</h1>
          <p className="mt-1 text-sm font-medium text-[#667085]">Complete customer activity and support control center</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("status-pill", isError ? "bg-[#ffebef] text-[#d92d4b]" : "bg-[#e8f8ef] text-[#079455]")}>
            {isError ? "Backend unavailable" : isFetching ? "Refreshing live data" : "Live data connected"}
          </span>
          <button type="button" onClick={() => refetch()} className="grid h-10 w-10 place-items-center rounded-lg border border-[#e6eaf2] bg-white" title="Refresh data">
            <RefreshCw size={17} className={cn(isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {metrics.map(([label, value, icon, tone]) => <MetricCard key={label} label={label} value={value} icon={icon} tone={tone} />)}
      </section>

      <section className="admin-card mt-5 overflow-hidden">
        <div className="flex gap-1 border-b border-[#edf0f6] px-5 pt-3">
          <Link href="/users" className={cn("flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-black", initialTab === "users" ? "border-[#0b6df6] text-[#0b6df6]" : "border-transparent text-[#667085]")}>
            <Users size={17} />Users Directory
          </Link>
          <Link href="/users/support" className={cn("flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-black", initialTab === "support" ? "border-[#0b6df6] text-[#0b6df6]" : "border-transparent text-[#667085]")}>
            <Ticket size={17} />Support & Complaints
          </Link>
        </div>

        <form
          className="border-b border-[#edf0f6] bg-[#fbfcfe] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#344054]"><ListFilter size={17} />Advanced Search & Filters</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={16} />
              <input className={cn(inputClass, "w-full pl-9")} placeholder="Name, mobile, booking ID or ticket ID" value={draftFilters.search} onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })} />
            </label>
            <input className={inputClass} placeholder="Full name" value={draftFilters.name} onChange={(event) => setDraftFilters({ ...draftFilters, name: event.target.value })} />
            <input className={inputClass} placeholder="Mobile number" value={draftFilters.mobile} onChange={(event) => setDraftFilters({ ...draftFilters, mobile: event.target.value })} />
            <input className={inputClass} placeholder="Booking ID" value={draftFilters.bookingId} onChange={(event) => setDraftFilters({ ...draftFilters, bookingId: event.target.value })} />
            <input className={inputClass} placeholder="Ticket ID" value={draftFilters.ticketId} onChange={(event) => setDraftFilters({ ...draftFilters, ticketId: event.target.value })} />
            <input className={inputClass} placeholder="Service type" value={draftFilters.serviceType} onChange={(event) => setDraftFilters({ ...draftFilters, serviceType: event.target.value })} />
            <select className={inputClass} value={draftFilters.bookingStatus} onChange={(event) => setDraftFilters({ ...draftFilters, bookingStatus: event.target.value })}>
              <option value="">All booking statuses</option>
              {["pending", "sent_to_partner", "accepted", "on_the_way", "arrived", "started", "amount_pending", "completed", "cancelled", "disputed"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
            </select>
            <select className={inputClass} value={draftFilters.complaintStatus} onChange={(event) => setDraftFilters({ ...draftFilters, complaintStatus: event.target.value })}>
              <option value="">All complaint statuses</option>
              {["open", "assigned", "in_progress", "waiting_on_customer", "resolved", "reopened", "escalated", "closed"].map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
            </select>
            <input aria-label="Registration date" type="date" className={inputClass} value={draftFilters.registrationDate} onChange={(event) => setDraftFilters({ ...draftFilters, registrationDate: event.target.value })} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className="flex h-10 items-center gap-2 rounded-lg bg-[#0b6df6] px-4 text-sm font-black text-white"><Filter size={16} />Apply filters</button>
            <button type="button" onClick={resetFilters} className="h-10 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-black text-[#475467]">Reset</button>
          </div>
        </form>

        {initialTab === "users" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1900px] text-left text-sm">
                <thead className="bg-white text-xs text-[#667085]">
                  <tr>
                    {["User", "Mobile Number", "Email", "Registration Date & Time", "Last Login Time", "Account Status", "Total Bookings", "Complaints", "Current Location / Saved Addresses", "Device Information", "Action"].map((header) => <th key={header} className="px-4 py-4 font-bold">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && <tr><td colSpan={11} className="px-5 py-12 text-center font-semibold text-[#667085]">No users match the current filters.</td></tr>}
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-[#edf0f6] align-top hover:bg-[#f8fbff]">
                      <td className="px-4 py-4">
                        <Link href={`/users/${user.id}`} className="flex items-center gap-3">
                          {user.profilePhoto ? <img src={user.profilePhoto} alt={user.fullName} className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-[#eef5ff] text-xs font-black text-[#0b6df6]">{initials(user.fullName)}</span>}
                          <span className="font-black text-[#111827]">{user.fullName || "ApnaServo Customer"}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 font-semibold">{user.mobileNumber || "Not available"}</td>
                      <td className="px-4 py-4">{user.email || "Not available"}</td>
                      <td className="px-4 py-4">{formatDateTime(user.registrationDateTime)}</td>
                      <td className="px-4 py-4">{formatDateTime(user.lastLoginTime)}</td>
                      <td className="px-4 py-4"><Status value={user.accountStatus} /></td>
                      <td className="px-4 py-4 font-black">{user.totalBookings}</td>
                      <td className="px-4 py-4 font-black">{user.totalComplaintsRaised}</td>
                      <td className="max-w-[360px] px-4 py-4">
                        <p className="flex items-start gap-2 font-semibold"><MapPin size={16} className="mt-0.5 shrink-0 text-[#0b6df6]" />{user.savedAddressText || "No saved address"}</p>
                        <p className="mt-1 text-xs text-[#667085]">{user.currentLocation.lat || 0}, {user.currentLocation.lng || 0}</p>
                      </td>
                      <td className="max-w-[260px] px-4 py-4 text-[#475467]">{user.deviceInformation || "Not available"}</td>
                      <td className="px-4 py-4"><Link href={`/users/${user.id}`} className="grid h-9 w-10 place-items-center rounded-lg border border-[#e6eaf2] bg-white text-[#0b6df6]" title="Open complete profile"><Eye size={16} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={usersPage} total={data.users.length} pageSize={pageSize} onPage={setUsersPage} />
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-white text-xs text-[#667085]">
                  <tr>
                    {["Ticket ID", "User Name", "Mobile Number", "Ticket Category", "Priority", "Status", "Created Date & Time", "Last Updated", "Action"].map((header) => <th key={header} className="px-5 py-4 font-bold">{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center font-semibold text-[#667085]">No support tickets match the current filters.</td></tr>}
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-[#edf0f6] hover:bg-[#f8fbff]">
                      <td className="px-5 py-4"><Link className="font-black text-[#0b6df6]" href={`/users/support/${ticket.id}`}>{ticket.ticketId}</Link></td>
                      <td className="px-5 py-4 font-black">{ticket.userName || "Unknown user"}</td>
                      <td className="px-5 py-4 font-semibold">{ticket.mobileNumber || "Not available"}</td>
                      <td className="px-5 py-4 capitalize">{ticket.ticketCategory}</td>
                      <td className="px-5 py-4"><Status value={ticket.priority} /></td>
                      <td className="px-5 py-4"><Status value={ticket.status} /></td>
                      <td className="px-5 py-4">{formatDateTime(ticket.createdDateTime)}</td>
                      <td className="px-5 py-4">{formatDateTime(ticket.lastUpdated)}</td>
                      <td className="px-5 py-4"><Link href={`/users/support/${ticket.id}`} className="grid h-9 w-10 place-items-center rounded-lg border border-[#e6eaf2] bg-white text-[#0b6df6]" title="Open ticket"><Eye size={16} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={ticketsPage} total={data.supportTickets.length} pageSize={pageSize} onPage={setTicketsPage} />
          </>
        )}
      </section>
    </div>
  );
}
