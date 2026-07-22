"use client";

import Image from "next/image";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Building2, CalendarDays, Check, ChevronDown, Clock3, Download, Eye,
  IndianRupee, LayoutDashboard, LogOut, MapPin, Menu, MoreVertical, Phone,
  ReceiptIndianRupee, RefreshCw, Settings, Star, UserRound, Users, X,
} from "lucide-react";
import { companyBackendUrl, companyFirebaseAuth } from "@/lib/company-firebase";

type Row = Record<string, unknown>;
const idOf = (row: Row) => String(row._id || row.bookingId || row.id || row.bookingCode || "");
const value = (input: unknown, fallback = "—") => input === null || input === undefined || input === "" ? fallback : String(input);
const statusLabel = (input: unknown) => value(input, "pending").replace(/_/g, " ");
const rupees = (input: unknown) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(input || 0));
function readableDate(input: unknown) { if (!input) return "Schedule pending"; const parsed = new Date(String(input)); return Number.isNaN(parsed.getTime()) ? String(input) : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsed); }
function initials(input: unknown) { return value(input, "AS").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<Row | null>(null);
  const [bookings, setBookings] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [incoming, setIncoming] = useState<Row | null>(null);
  const [assigning, setAssigning] = useState<Row | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const initializedIds = useRef(false);
  const knownIds = useRef(new Set<string>());

  const loadData = useCallback(async (firebaseUser: User, silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const token = await firebaseUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [profileResponse, bookingResponse] = await Promise.all([
        fetch(`${companyBackendUrl}/api/partners/me`, { headers, cache: "no-store" }),
        fetch(`${companyBackendUrl}/api/bookings/partner`, { headers, cache: "no-store" }),
      ]);
      const profilePayload = await profileResponse.json().catch(() => ({}));
      const bookingPayload = await bookingResponse.json().catch(() => ({}));
      if (!profileResponse.ok) throw new Error(profilePayload.message || "Company profile unavailable.");
      const nextPartner = (profilePayload.partner || profilePayload) as Row;
      const approved = nextPartner.businessVerificationStatus === "approved" && nextPartner.kycStatus === "verified" && nextPartner.isVerified === true && nextPartner.trustStatus === "trusted" && nextPartner.accountStatus !== "blocked" && nextPartner.accountStatus !== "suspended";
      if (!approved) {
        router.replace("/company/verification");
        return;
      }
      const nextBookings: Row[] = bookingResponse.ok ? (Array.isArray(bookingPayload.bookings) ? bookingPayload.bookings : Array.isArray(bookingPayload) ? bookingPayload : []) : [];
      setPartner(nextPartner);
      setBookings(nextBookings);
      if (initializedIds.current) {
        const fresh = nextBookings.find((booking) => idOf(booking) && !knownIds.current.has(idOf(booking)));
        if (fresh) setIncoming(fresh);
      }
      knownIds.current = new Set(nextBookings.map(idOf).filter(Boolean));
      initializedIds.current = true;
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Live data unavailable."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useEffect(() => onAuthStateChanged(companyFirebaseAuth(), (current) => {
    if (!current) { router.replace("/company/login"); return; }
    setUser(current); void loadData(current);
  }), [loadData, router]);
  useEffect(() => { if (!user) return; const timer = window.setInterval(() => void loadData(user, true), 15_000); return () => window.clearInterval(timer); }, [loadData, user]);

  const business = (partner?.laundryBusiness || {}) as Row;
  const staff = Array.isArray(business.staffMembers) ? business.staffMembers as Row[] : [];
  const companyName = value(business.shopName, "Your Company");
  const metrics = useMemo(() => ({
    total: bookings.length,
    completed: bookings.filter((item) => String(item.status).toLowerCase() === "completed").length,
    pending: bookings.filter((item) => ["pending", "sent_to_partner", "accepted"].includes(String(item.status).toLowerCase())).length,
    cancelled: bookings.filter((item) => String(item.status).toLowerCase() === "cancelled").length,
    earnings: bookings.filter((item) => String(item.status).toLowerCase() === "completed").reduce((sum, item) => sum + Number(item.finalAmount || item.price || 0), 0),
  }), [bookings]);

  async function assignStaff() {
    if (!user || !assigning || !selectedStaff) return;
    const response = await fetch(`${companyBackendUrl}/api/partners/laundry/bookings/${encodeURIComponent(idOf(assigning))}/assign-staff`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ staffSequence: Number(selectedStaff) }),
    });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setError(payload.message || "Staff assignment failed."); return; }
    setAssigning(null); setIncoming(null); setSelectedStaff(""); await loadData(user);
  }
  function downloadReport() {
    const lines = [["Booking ID", "Customer", "Service", "Date", "Amount", "Status", "Assigned Staff"], ...bookings.map((booking) => {
      const assignment = (booking.laundryAssignment || {}) as Row;
      return [value(booking.bookingCode || idOf(booking)), value(booking.userName || (booking.userSnapshot as Row)?.name), value(booking.serviceName || booking.serviceCategory), readableDate(booking.createdAt), String(Number(booking.finalAmount || booking.price || 0)), statusLabel(booking.status), value(assignment.staffName, "")];
    })];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = "apnaservo-company-bookings.csv"; anchor.click(); URL.revokeObjectURL(anchor.href);
  }

  return <main className="company-command-page">
    <aside className={`company-command-sidebar ${mobileMenu ? "open" : ""}`}>
      <div className="company-command-logo"><Image src="/apna-servo-wordmark.png" width={170} height={55} alt="ApnaServo" /><small>Home Services At Your Doorstep</small></div>
      <nav><SidebarItem active icon={<LayoutDashboard />} label="Dashboard" /><SidebarItem icon={<CalendarDays />} label="Bookings" /><SidebarItem icon={<Users />} label="Staff" /><SidebarItem icon={<IndianRupee />} label="Earnings" /><SidebarItem icon={<Star />} label="Reviews" /><SidebarItem icon={<ReceiptIndianRupee />} label="Reports" /><SidebarItem icon={<Settings />} label="Settings" /></nav>
      <button className="company-sidebar-logout" onClick={async () => { await signOut(companyFirebaseAuth()); router.replace("/company/login"); }}><LogOut />Sign Out</button>
    </aside>
    {mobileMenu ? <button className="company-menu-backdrop" aria-label="Close menu" onClick={() => setMobileMenu(false)} /> : null}
    <div className="company-command-main">
      <header className="company-command-header"><button className="company-mobile-menu" onClick={() => setMobileMenu(true)}><Menu /></button><div><h1>Company Dashboard</h1><p>Welcome back, {companyName}</p></div><div className="company-header-tools"><button className="company-notification-button"><Bell /><span>{bookings.filter((b) => String(b.status).toLowerCase() === "pending").length}</span></button><button className="company-download" onClick={downloadReport}><Download />Download Report</button><button className="company-account-button">{companyName}<ChevronDown /><i>{initials(companyName)}</i></button></div></header>
      <div className="company-command-content">
        {error ? <div className="company-live-error">{error}</div> : null}
        <section className="company-reference-metrics"><RefMetric icon={<CalendarDays />} label="Total Bookings" value={metrics.total} note="All time bookings" tone="pink" /><RefMetric icon={<Check />} label="Completed" value={metrics.completed} note="All completed" tone="green" /><RefMetric icon={<Clock3 />} label="Pending" value={metrics.pending} note="Awaiting action" tone="orange" /><RefMetric icon={<X />} label="Cancelled" value={metrics.cancelled} note="All cancelled" tone="red" /><RefMetric icon={<IndianRupee />} label="Total Earnings" value={rupees(metrics.earnings)} note="Completed bookings" tone="earning" /></section>
        <section className="company-reference-grid">
          <div className="company-reference-panel company-bookings-panel"><div className="company-reference-title"><span><CalendarDays /></span><h2>Upcoming Bookings</h2><button onClick={() => user && loadData(user)}><RefreshCw className={refreshing ? "animate-spin" : ""} />Refresh</button></div>
            <div className="company-booking-table-wrap"><table className="company-booking-table"><thead><tr><th>Booking ID</th><th>Customer</th><th>Service</th><th>Date & Time</th><th>Amount</th><th>Status</th><th>Assigned Staff</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={8}><div className="company-table-loading">Loading live bookings...</div></td></tr> : bookings.length === 0 ? <tr><td colSpan={8}><TableEmpty /></td></tr> : bookings.slice(0, 10).map((booking) => <BookingRow key={idOf(booking)} booking={booking} onAssign={() => { setAssigning(booking); setSelectedStaff(""); }} />)}</tbody></table></div>
            {bookings.length > 0 ? <div className="company-view-all">View all bookings <span>→</span></div> : null}
          </div>
          <div className="company-reference-panel company-activity-panel"><div className="company-reference-title"><h2>Staff &amp; Activity</h2><button className="company-add-staff">+ Add New Staff</button></div>{staff.length === 0 ? <div className="company-staff-empty"><Users /><b>No staff added</b><p>Add staff through the Partner App using verified phone or email.</p></div> : <div className="company-reference-staff">{staff.map((member, index) => <div className="company-reference-staff-row" key={value(member.sequence, String(index))}><i>{initials(member.name)}</i><span><b>{value(member.name, "Staff member")}</b><small>{value(member.role, "Laundry Staff")}</small><small>{value(member.email || member.phone, "Contact not added")}</small></span><em className={member.isOnline ? "available" : ""}>{member.isOnline ? "Available" : "Offline"}</em><strong>{bookings.filter((booking) => Number(((booking.laundryAssignment || {}) as Row).staffSequence) === Number(member.sequence)).length}</strong><MoreVertical /></div>)}</div>}</div>
        </section>
      </div>
    </div>
    {incoming ? <IncomingModal booking={incoming} onClose={() => setIncoming(null)} onAssign={() => { setAssigning(incoming); setSelectedStaff(""); }} /> : null}
    {assigning ? <AssignModal booking={assigning} staff={staff} selected={selectedStaff} onSelected={setSelectedStaff} onClose={() => setAssigning(null)} onSubmit={assignStaff} /> : null}
  </main>;
}

function SidebarItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) { return <button className={active ? "active" : ""}>{icon}{label}</button>; }
function RefMetric({ icon, label, value: metricValue, note, tone }: { icon: React.ReactNode; label: string; value: string | number; note: string; tone: string }) { return <div className={`company-ref-metric ${tone}`}><span>{icon}</span><div><small>{label}</small><b>{metricValue}</b><em>{note}</em></div><i /></div>; }
function BookingRow({ booking, onAssign }: { booking: Row; onAssign: () => void }) { const snapshot = (booking.userSnapshot || {}) as Row; const assignment = (booking.laundryAssignment || {}) as Row; return <tr><td><b className="booking-code">{value(booking.bookingCode || idOf(booking))}</b></td><td><div className="company-customer-cell"><i>{initials(booking.userName || snapshot.name)}</i><span><b>{value(booking.userName || snapshot.name, "Customer")}</b><small>{value(booking.userPhone || snapshot.phone, "")}</small></span></div></td><td>{value(booking.serviceName || booking.serviceCategory)}</td><td>{readableDate(booking.slot || booking.createdAt)}</td><td><b>{rupees(booking.finalAmount || booking.price)}</b></td><td><span className={`company-table-status status-${String(booking.status || "pending").toLowerCase()}`}>{statusLabel(booking.status)}<ChevronDown /></span></td><td>{assignment.staffName ? <span><b>{value(assignment.staffName)}</b><small className="block text-[10px] text-slate-400">Currently Assigned</small></span> : "—"}</td><td><button className={assignment.staffName ? "outline" : ""} onClick={onAssign}>{assignment.staffName ? "Reassign" : "Assign Staff"}</button></td></tr>; }
function TableEmpty() { return <div className="company-table-empty"><CalendarDays /><b>No bookings yet</b><p>Real customer bookings will appear here automatically. No default data is shown.</p></div>; }
function IncomingModal({ booking, onClose, onAssign }: { booking: Row; onClose: () => void; onAssign: () => void }) { const snapshot = (booking.userSnapshot || {}) as Row; return <div className="company-modal-layer"><button className="company-modal-shade" onClick={onClose} aria-label="Close" /><div className="company-incoming-modal"><div className="company-modal-heading"><span><CalendarDays /></span><div><h2>New Booking Received</h2><em>Pending</em></div><button onClick={onClose}><X /></button></div><div className="company-modal-body"><p>Booking ID: <b>{value(booking.bookingCode || idOf(booking))}</b></p><div className="company-modal-customer"><i>{initials(booking.userName || snapshot.name)}</i><span><b>{value(booking.userName || snapshot.name, "Customer")}</b><small>{value(booking.userPhone || snapshot.phone, "Phone protected")}</small></span><button><Phone />Call Customer</button></div><h3>Booking Details</h3><dl><div><dt>Service</dt><dd>{value(booking.serviceName || booking.serviceCategory)}</dd></div><div><dt>Date &amp; Time</dt><dd>{readableDate(booking.slot || booking.createdAt)}</dd></div><div><dt>Address</dt><dd>{value(booking.address)}</dd></div></dl>{booking.issue ? <div className="company-customer-note"><b>Customer Note</b><p>{value(booking.issue)}</p></div> : null}<div className="company-modal-actions"><button onClick={onClose}><Eye />View Booking</button><button className="primary" onClick={onAssign}><UserRound />Assign Staff</button></div></div></div></div>; }
function AssignModal({ booking, staff, selected, onSelected, onClose, onSubmit }: { booking: Row; staff: Row[]; selected: string; onSelected: (value: string) => void; onClose: () => void; onSubmit: () => void }) { return <div className="company-modal-layer top"><button className="company-modal-shade" onClick={onClose} aria-label="Close" /><div className="company-assign-modal"><button className="close" onClick={onClose}><X /></button><span><Users /></span><h2>Assign Staff</h2><p>{value(booking.bookingCode || idOf(booking))} ke liye verified staff choose karein.</p>{staff.length === 0 ? <div className="company-form-error">No staff available. Add staff from the Partner App first.</div> : <select value={selected} onChange={(event) => onSelected(event.target.value)}><option value="">Select staff member</option>{staff.map((member) => <option key={value(member.sequence)} value={value(member.sequence)}>{value(member.name)} — {member.isOnline ? "Available" : "Offline"}</option>)}</select>}<button className="submit" disabled={!selected} onClick={onSubmit}>Confirm Assignment</button></div></div>; }
