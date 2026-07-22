"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardList,
  CreditCard,
  History,
  Mail,
  MapPin,
  MessageSquareWarning,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Ticket,
  UserRound,
} from "lucide-react";
import { cn, formatCurrency, statusTone } from "@/lib/utils";

type TimelineEvent = {
  event: string;
  at: string;
  by: string;
  note: string;
};

type BookingHistory = {
  id: string;
  bookingId: string;
  serviceCategory: string;
  serviceName: string;
  dateTimeBooked: string;
  scheduledDateTime: string;
  jobStartTime: string;
  jobCompletionTime: string;
  bookingStatus: string;
  assignedPartnerName: string;
  assignedPartnerMobileNumber: string;
  customerAddress: string;
  customerNotes: string;
  finalServiceCost: number;
  paymentStatus: string;
  timeline: TimelineEvent[];
};

type UserDetails = {
  user: {
    id: string;
    fullName: string;
    mobileNumber: string;
    email: string;
    profilePhoto: string;
    address: string;
    city: string;
    savedAddresses: { id: string; label: string; address: string; city: string; isDefault: boolean }[];
    currentLocation: { lat: number; lng: number };
    registrationDateTime: string;
    lastLoginTime: string;
    phoneVerified: boolean;
    phoneVerifiedAt: string;
    bookingRiskStatus: string;
    fakeBookingWarningCount: number;
    accountStatus: string;
    rawAccountStatus: string;
    deviceInformation: string;
    rawDeviceInformation: Record<string, unknown>;
    registrationHistory: { source: string; provider: string; registeredAt: string; ip: string; userAgent: string }[];
    loginHistory: { loggedInAt: string; ip: string; userAgent: string; deviceInfo: Record<string, unknown> }[];
    adminNotes: { id: string; note: string; addedBy: string; addedAt: string }[];
    rawProfile: Record<string, unknown>;
  } | null;
  bookingHistory: BookingHistory[];
  complaintHistory: Record<string, string | number | boolean | null | undefined>[];
  supportTicketHistory: {
    id: string;
    ticketId: string;
    ticketCategory: string;
    priority: string;
    status: string;
    createdDateTime: string;
    lastUpdated: string;
  }[];
  paymentHistory: {
    id: string;
    bookingId: string;
    amount: number;
    currency: string;
    status: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    createdAt: string;
  }[];
};

const emptyDetails: UserDetails = {
  user: null,
  bookingHistory: [],
  complaintHistory: [],
  supportTicketHistory: [],
  paymentHistory: [],
};

function formatDateTime(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function Badge({ value }: { value: string }) {
  const tone = statusTone(value || "pending");
  return (
    <span
      className={cn(
        "inline-flex rounded-xl px-3 py-1 text-xs font-black capitalize",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-sky-50 text-sky-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
      )}
    >
      {value || "Pending"}
    </span>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#f4dce4] bg-white p-6 shadow-[0_18px_45px_rgba(101,20,47,.08)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff0f4] text-[#f32368]">
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
      <p className="text-xs font-black uppercase text-[#8c7a82]">{label}</p>
      <div className="mt-2 break-words text-sm font-bold text-[#2a1420]">{value || "Not recorded"}</div>
    </div>
  );
}

async function fetchUser(userId: string): Promise<UserDetails> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { cache: "no-store" });
  if (!res.ok) return emptyDetails;
  return res.json();
}

export function UserDetailsPage({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data = emptyDetails, isFetching } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchUser(userId),
  });
  const user = data.user;
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const selectedBooking = useMemo(
    () => data.bookingHistory.find((booking) => booking.id === selectedBookingId) || data.bookingHistory[0],
    [data.bookingHistory, selectedBookingId],
  );
  const activeStatus = accountStatus || user?.rawAccountStatus || "active";

  async function saveAdminState() {
    await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountStatus: activeStatus, adminNote }),
    });
    setAdminNote("");
    await queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
    await queryClient.invalidateQueries({ queryKey: ["users-control-center"] });
  }

  if (!user) {
    return (
      <div className="rounded-[28px] border border-[#f4dce4] bg-white p-10 text-center font-bold text-[#756a70]">
        User record was not returned by the live backend.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link href="/users" className="inline-flex items-center gap-2 text-sm font-black text-[#f32368]">
            <ArrowLeft size={17} />
            Users
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.fullName} className="h-18 w-18 rounded-[24px] object-cover" />
            ) : (
              <div className="grid h-18 w-18 place-items-center rounded-[24px] bg-[#fff0f4] text-xl font-black text-[#f32368]">{initials(user.fullName)}</div>
            )}
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{user.fullName || "ApnaServo Customer"}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-[#756a70]">
                <span className="inline-flex items-center gap-2"><Phone size={16} />{user.mobileNumber || "No mobile"}</span>
                <span className="inline-flex items-center gap-2"><Mail size={16} />{user.email || "No email"}</span>
                <Badge value={user.accountStatus} />
              </div>
            </div>
          </div>
        </div>
        <span className="rounded-2xl bg-[#fff0f4] px-4 py-2 text-sm font-black text-[#f32368]">{isFetching ? "Refreshing" : "Live backend record"}</span>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Panel title="Complete Profile" icon={UserRound}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Mobile number" value={user.mobileNumber} />
            <Field label="Email" value={user.email || "Not available"} />
            <Field label="Primary address" value={user.address} />
            <Field label="City" value={user.city} />
            <Field label="Registration date & time" value={formatDateTime(user.registrationDateTime)} />
            <Field label="Last login time" value={formatDateTime(user.lastLoginTime)} />
            <Field label="Phone verified" value={user.phoneVerified ? `Yes, ${formatDateTime(user.phoneVerifiedAt)}` : "No"} />
            <Field label="Booking risk" value={`${user.bookingRiskStatus || "unknown"} (${user.fakeBookingWarningCount || 0} warnings)`} />
            <Field label="Current location" value={`${user.currentLocation.lat}, ${user.currentLocation.lng}`} />
            <Field label="Device information" value={user.deviceInformation || JSON.stringify(user.rawDeviceInformation || {})} />
          </div>
        </Panel>

        <Panel title="Account Status & Notes" icon={ShieldCheck}>
          <div className="grid gap-3">
            <select className="h-12 rounded-2xl border border-[#ecd3dc] bg-white px-4 text-sm font-bold outline-none focus:border-[#f32368]" value={activeStatus} onChange={(event) => setAccountStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
            </select>
            <textarea className="min-h-28 rounded-2xl border border-[#ecd3dc] bg-white p-4 text-sm outline-none focus:border-[#f32368]" placeholder="Admin note" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} />
            <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f32368] px-5 text-sm font-black text-white" onClick={saveAdminState}>
              <Save size={17} />
              Save
            </button>
            <div className="space-y-3">
              {user.adminNotes.length === 0 ? (
                <p className="text-sm font-semibold text-[#756a70]">No admin notes.</p>
              ) : (
                user.adminNotes.map((note) => (
                  <div key={note.id} className="rounded-2xl bg-[#fffafa] p-4">
                    <p className="text-sm font-bold text-[#2a1420]">{note.note}</p>
                    <p className="mt-2 text-xs font-semibold text-[#8c7a82]">{note.addedBy} | {formatDateTime(note.addedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="Saved Addresses" icon={MapPin}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {user.savedAddresses.length === 0 ? (
            <p className="text-sm font-semibold text-[#756a70]">No saved addresses.</p>
          ) : (
            user.savedAddresses.map((address) => (
              <div key={address.id} className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
                <p className="text-sm font-black text-[#2a1420]">{address.label}{address.isDefault ? " - Default" : ""}</p>
                <p className="mt-2 text-sm text-[#756a70]">{address.address}</p>
                <p className="mt-1 text-xs font-bold text-[#8c7a82]">{address.city}</p>
              </div>
            ))
          )}
        </div>
      </Panel>

      <Panel title="Booking History" icon={ClipboardList}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-[#fff6f8] text-[#756a70]">
              <tr>
                {["Booking ID", "Service Category", "Service Name", "Date & Time Booked", "Scheduled Date & Time", "Job Start Time", "Job Completion Time", "Booking Status", "Partner Name", "Partner Mobile", "Customer Address", "Customer Notes", "Final Cost", "Payment Status"].map((head) => (
                  <th key={head} className="px-4 py-3 font-black">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.bookingHistory.length === 0 && (
                <tr><td colSpan={14} className="px-4 py-8 text-center font-bold text-[#756a70]">No bookings recorded.</td></tr>
              )}
              {data.bookingHistory.map((booking) => (
                <tr key={booking.id} className={cn("border-b border-[#f4dce4] last:border-0 hover:bg-[#fffafa]", selectedBooking?.id === booking.id && "bg-[#fff0f4]")} onClick={() => setSelectedBookingId(booking.id)}>
                  <td className="px-4 py-3 font-black"><Link href={`/bookings/${booking.id}`} className="text-[#0b6df6] hover:underline">{booking.bookingId}</Link></td>
                  <td className="px-4 py-3 capitalize">{booking.serviceCategory}</td>
                  <td className="px-4 py-3">{booking.serviceName}</td>
                  <td className="px-4 py-3">{formatDateTime(booking.dateTimeBooked)}</td>
                  <td className="px-4 py-3">{booking.scheduledDateTime || "Not recorded"}</td>
                  <td className="px-4 py-3">{formatDateTime(booking.jobStartTime)}</td>
                  <td className="px-4 py-3">{formatDateTime(booking.jobCompletionTime)}</td>
                  <td className="px-4 py-3"><Badge value={booking.bookingStatus.replace(/_/g, " ")} /></td>
                  <td className="px-4 py-3">{booking.assignedPartnerName || "Unassigned"}</td>
                  <td className="px-4 py-3">{booking.assignedPartnerMobileNumber || "Not recorded"}</td>
                  <td className="max-w-[280px] px-4 py-3">{booking.customerAddress}</td>
                  <td className="max-w-[280px] px-4 py-3">{booking.customerNotes || "None"}</td>
                  <td className="px-4 py-3 font-black">{formatCurrency(booking.finalServiceCost || 0)}</td>
                  <td className="px-4 py-3"><Badge value={booking.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedBooking && (
          <div className="mt-6 rounded-3xl border border-[#f4dce4] bg-[#fffafa] p-5">
            <h3 className="text-base font-black">Booking Timeline: {selectedBooking.bookingId}</h3>
            <div className="mt-4 space-y-3">
              {selectedBooking.timeline.length === 0 ? (
                <p className="text-sm font-semibold text-[#756a70]">No timeline events recorded.</p>
              ) : (
                selectedBooking.timeline.map((event, index) => (
                  <div key={`${event.event}-${event.at}-${index}`} className="grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[190px_180px_1fr]">
                    <p className="text-sm font-black text-[#2a1420]">{formatDateTime(event.at)}</p>
                    <p className="text-sm font-bold capitalize text-[#f32368]">{event.event}</p>
                    <p className="text-sm text-[#756a70]">{event.by}{event.note ? ` | ${event.note}` : ""}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Panel>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Complaint History" icon={MessageSquareWarning}>
          <div className="space-y-3">
            {data.complaintHistory.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No complaints recorded.</p> : data.complaintHistory.map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black capitalize text-[#2a1420]">{String(item.type || "complaint").replace(/_/g, " ")}</p>
                  <Badge value={String(item.status || "open").replace(/_/g, " ")} />
                </div>
                <p className="mt-2 text-sm text-[#756a70]">{String(item.reason || item.details || item.message || item.note || "No details recorded")}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Support Ticket History" icon={Ticket}>
          <div className="space-y-3">
            {data.supportTicketHistory.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No support tickets recorded.</p> : data.supportTicketHistory.map((ticket) => (
              <Link href={`/users/support/${ticket.id}`} key={ticket.id} className="block rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4 hover:bg-[#fff0f4]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-[#2a1420]">{ticket.ticketId}</p>
                  <Badge value={ticket.status.replace(/_/g, " ")} />
                </div>
                <p className="mt-2 text-sm capitalize text-[#756a70]">{ticket.ticketCategory} | {ticket.priority}</p>
                <p className="mt-1 text-xs font-semibold text-[#8c7a82]">{formatDateTime(ticket.createdDateTime)}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Payment History" icon={CreditCard}>
          <div className="space-y-3">
            {data.paymentHistory.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No payments recorded.</p> : data.paymentHistory.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black">{formatCurrency(payment.amount || 0)}</p>
                  <Badge value={payment.status} />
                </div>
                <p className="mt-2 text-sm text-[#756a70]">Booking {payment.bookingId}</p>
                <p className="mt-1 text-xs font-semibold text-[#8c7a82]">{payment.razorpayPaymentId || payment.razorpayOrderId || "Gateway reference not recorded"}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Registration & Login History" icon={History}>
          <div className="grid gap-4">
            <div>
              <h3 className="mb-3 text-sm font-black text-[#2a1420]">Registration history</h3>
              {user.registrationHistory.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No registration history.</p> : user.registrationHistory.map((entry, index) => (
                <p key={`${entry.registeredAt}-${index}`} className="mb-2 rounded-2xl bg-[#fffafa] p-3 text-sm text-[#756a70]">{entry.source} | {entry.provider} | {formatDateTime(entry.registeredAt)}</p>
              ))}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-black text-[#2a1420]">Login history</h3>
              {user.loginHistory.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No login history.</p> : user.loginHistory.slice().reverse().map((entry, index) => (
                <p key={`${entry.loggedInAt}-${index}`} className="mb-2 rounded-2xl bg-[#fffafa] p-3 text-sm text-[#756a70]">{formatDateTime(entry.loggedInAt)} | {entry.userAgent || "No user agent"}</p>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="Device & Raw Profile" icon={Smartphone}>
        <pre className="max-h-[360px] overflow-auto rounded-2xl bg-[#181018] p-4 text-xs leading-6 text-white">
          {JSON.stringify({ deviceInfo: user.rawDeviceInformation, profile: user.rawProfile }, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
