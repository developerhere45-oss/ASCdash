"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Building2, CalendarDays, CheckCircle2, ClipboardList, Clock3,
  IndianRupee, LogOut, MapPin, RefreshCw, Sparkles, UserRound, Users, Wifi,
} from "lucide-react";
import { CompanyBrand } from "@/components/company/company-brand";
import { companyBackendUrl, companyFirebaseAuth } from "@/lib/company-firebase";

type LiveBooking = Record<string, unknown>;
type PartnerProfile = Record<string, unknown>;

function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}
function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}
function date(value: unknown) {
  if (!value) return "Schedule pending";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}
function cleanStatus(value: unknown) { return text(value, "pending").replace(/_/g, " "); }

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [bookings, setBookings] = useState<LiveBooking[]>([]);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadLiveData = useCallback(async (user: User, silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [profileResponse, bookingsResponse] = await Promise.all([
        fetch(`${companyBackendUrl}/api/partners/me`, { headers, cache: "no-store" }),
        fetch(`${companyBackendUrl}/api/bookings/partner`, { headers, cache: "no-store" }),
      ]);
      const profilePayload = await profileResponse.json().catch(() => ({}));
      const bookingsPayload = await bookingsResponse.json().catch(() => ({}));
      if (!profileResponse.ok) throw new Error(profilePayload.message || "Company profile unavailable.");
      setPartner(profilePayload.partner || profilePayload);
      setBookings(bookingsResponse.ok ? (Array.isArray(bookingsPayload.bookings) ? bookingsPayload.bookings : Array.isArray(bookingsPayload) ? bookingsPayload : []) : []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live company data could not be loaded.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setRegistered(new URLSearchParams(window.location.search).get("registered") === "1");
    return onAuthStateChanged(companyFirebaseAuth(), (user) => {
      if (!user) { router.replace("/company/login"); return; }
      setFirebaseUser(user); void loadLiveData(user);
    });
  }, [loadLiveData, router]);

  useEffect(() => {
    if (!firebaseUser) return;
    const timer = window.setInterval(() => void loadLiveData(firebaseUser, true), 20_000);
    return () => window.clearInterval(timer);
  }, [firebaseUser, loadLiveData]);

  const business = (partner?.laundryBusiness || {}) as Record<string, unknown>;
  const staff = Array.isArray(business.staffMembers) ? business.staffMembers as Record<string, unknown>[] : [];
  const metrics = useMemo(() => {
    const active = bookings.filter((item) => !["completed", "cancelled"].includes(String(item.status || "").toLowerCase())).length;
    const completed = bookings.filter((item) => String(item.status || "").toLowerCase() === "completed").length;
    const unassigned = bookings.filter((item) => {
      const assignment = (item.laundryAssignment || {}) as Record<string, unknown>;
      return !assignment.staffSequence && !["completed", "cancelled"].includes(String(item.status || "").toLowerCase());
    }).length;
    const earnings = bookings.filter((item) => String(item.status || "").toLowerCase() === "completed").reduce((sum, item) => sum + Number(item.finalAmount || item.price || 0), 0);
    return { active, completed, unassigned, earnings };
  }, [bookings]);

  return (
    <main className="company-auth-page company-owner-page">
      <CompanyBrand />
      <div className="company-owner-shell">
        {registered ? <div className="company-success"><CheckCircle2 />Registration submitted successfully. Admin verification is now pending.</div> : null}
        <section className="company-owner-hero">
          <div className="company-owner-avatar"><Building2 /></div>
          <div className="company-owner-heading">
            <span className="company-owner-kicker"><Sparkles size={13} /> Company workspace</span>
            <h1>{text(business.shopName, "Your Company")}</h1>
            <p><MapPin size={15} />{text(business.shopLocation || partner?.serviceArea, "Company address not added")}</p>
          </div>
          <div className="company-owner-actions">
            <span className={`company-live-badge ${partner?.isOnline ? "online" : ""}`}><Wifi size={14} />{partner?.isOnline ? "Online" : "Offline"}</span>
            <button onClick={() => firebaseUser && loadLiveData(firebaseUser)} disabled={refreshing}><RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />Refresh</button>
            <button className="logout" onClick={async () => { await signOut(companyFirebaseAuth()); router.replace("/company/login"); }}><LogOut size={16} />Logout</button>
          </div>
        </section>

        {error ? <div className="company-live-error">{error}</div> : null}
        <section className="company-owner-metrics">
          <OwnerMetric icon={<ClipboardList />} label="Active Orders" value={metrics.active} tone="blue" />
          <OwnerMetric icon={<Clock3 />} label="Awaiting Assignment" value={metrics.unassigned} tone="amber" />
          <OwnerMetric icon={<CheckCircle2 />} label="Completed" value={metrics.completed} tone="green" />
          <OwnerMetric icon={<IndianRupee />} label="Completed Value" value={money(metrics.earnings)} tone="rose" />
        </section>

        <section className="company-owner-grid">
          <div className="company-owner-card company-orders-card">
            <div className="company-card-heading"><div><h2>Recent Orders</h2><p>Only real bookings received from customers</p></div><span>{bookings.length} total</span></div>
            {loading ? <OwnerLoading /> : bookings.length === 0 ? (
              <OwnerEmpty icon={<ClipboardList />} title="No bookings yet" note="New customer bookings will appear here automatically. No sample or default orders are displayed." />
            ) : <div className="company-orders-list">{bookings.slice(0, 8).map((booking) => {
              const assignment = (booking.laundryAssignment || {}) as Record<string, unknown>;
              return <div className="company-order-row" key={text(booking._id || booking.bookingId || booking.bookingCode)}>
                <div className="company-order-symbol"><ClipboardList /></div>
                <div className="company-order-main"><b>{text(booking.serviceName || booking.serviceCategory, "Service")}</b><span>{text(booking.bookingCode || booking._id)}</span></div>
                <div className="company-order-time"><CalendarDays size={14} />{date(booking.createdAt || booking.slot)}</div>
                <div className="company-order-staff"><UserRound size={14} />{text(assignment.staffName, "Not assigned")}</div>
                <span className={`company-order-status status-${String(booking.status || "pending").toLowerCase()}`}>{cleanStatus(booking.status)}</span>
                <ArrowRight size={17} className="company-order-arrow" />
              </div>;
            })}</div>}
          </div>

          <div className="company-owner-card company-staff-card">
            <div className="company-card-heading"><div><h2>Your Staff</h2><p>Live team availability</p></div><span>{staff.length}</span></div>
            {loading ? <OwnerLoading /> : staff.length === 0 ? (
              <OwnerEmpty icon={<Users />} title="No staff added" note="Add staff from the Partner App using their verified phone number or email." />
            ) : <div className="company-staff-list">{staff.map((member, index) => <div key={text(member.sequence, String(index))} className="company-staff-row"><div>{text(member.name, "Staff").split(" ").map((word) => word[0]).join("").slice(0,2)}</div><span><b>{text(member.name, "Staff member")}</b><small>{text(member.role, "Laundry Staff")}</small></span><em className={member.isOnline ? "online" : ""}>{member.isOnline ? "Online" : "Offline"}</em></div>)}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function OwnerMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return <div className="company-owner-metric"><span className={tone}>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>;
}
function OwnerEmpty({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return <div className="company-owner-empty"><span>{icon}</span><h3>{title}</h3><p>{note}</p></div>;
}
function OwnerLoading() {
  return <div className="company-owner-loading"><i /><i /><i /></div>;
}
