"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  MessageSquareText,
  Phone,
  UserRound,
  Wrench,
} from "lucide-react";
import { cn, formatCurrency, statusTone } from "@/lib/utils";

type TimelineEvent = { event: string; at: string; by: string; note: string };
type BookingDetails = {
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

function formatDateTime(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Badge({ value }: { value: string }) {
  const tone = statusTone(value || "pending");
  return (
    <span className={cn(
      "status-pill capitalize",
      tone === "success" && "bg-[#e8f8ef] text-[#079455]",
      tone === "danger" && "bg-[#ffebef] text-[#d92d4b]",
      tone === "info" && "bg-[#eef5ff] text-[#0b6df6]",
      tone === "warning" && "bg-[#fff4df] text-[#c26a00]",
    )}>{(value || "pending").replace(/_/g, " ")}</span>
  );
}

async function fetchBooking(bookingId: string): Promise<{ booking: BookingDetails | null }> {
  const response = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}/timeline`, { cache: "no-store" });
  if (!response.ok) throw new Error("Booking timeline unavailable");
  return response.json();
}

export function BookingTimelinePage({ bookingId }: { bookingId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking-timeline", bookingId],
    queryFn: () => fetchBooking(bookingId),
    refetchInterval: 30_000,
  });
  const booking = data?.booking;

  if (isLoading) return <div className="admin-card p-10 text-center font-bold text-[#667085]">Loading booking timeline...</div>;
  if (isError || !booking) return <div className="admin-card p-10 text-center font-bold text-[#d92d4b]">Booking timeline was not returned by the live backend.</div>;

  const details = [
    ["Service Category", booking.serviceCategory, Wrench],
    ["Service Name", booking.serviceName, Wrench],
    ["Booked At", formatDateTime(booking.dateTimeBooked), CalendarClock],
    ["Scheduled At", booking.scheduledDateTime || "Not recorded", CalendarClock],
    ["Job Start", formatDateTime(booking.jobStartTime), Clock3],
    ["Job Completion", formatDateTime(booking.jobCompletionTime), CheckCircle2],
    ["Partner", booking.assignedPartnerName || "Unassigned", UserRound],
    ["Partner Mobile", booking.assignedPartnerMobileNumber || "Not recorded", Phone],
    ["Customer Address", booking.customerAddress || "Not recorded", MapPin],
    ["Customer Notes", booking.customerNotes || "None", MessageSquareText],
    ["Final Service Cost", formatCurrency(booking.finalServiceCost || 0), CreditCard],
    ["Payment Status", booking.paymentStatus || "pending", CreditCard],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/users" className="inline-flex items-center gap-2 text-sm font-black text-[#0b6df6]"><ArrowLeft size={17} />Back to Users</Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-[#111827]">{booking.bookingId}</h1>
          <Badge value={booking.bookingStatus} />
        </div>
        <p className="mt-1 text-sm font-medium text-[#667085]">Complete chronological booking activity</p>
      </div>

      <section className="admin-card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {details.map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-[#edf0f6] bg-[#fbfcfe] p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#667085]"><Icon size={15} className="text-[#0b6df6]" />{label}</div>
            <div className="mt-2 break-words text-sm font-bold text-[#111827]">{value}</div>
          </div>
        ))}
      </section>

      <section className="admin-card p-5">
        <h2 className="text-lg font-black text-[#111827]">Booking Timeline</h2>
        <div className="mt-6">
          {booking.timeline.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-[#667085]">No timeline events recorded.</p>
          ) : booking.timeline.map((event, index) => (
            <div key={`${event.event}-${event.at}-${index}`} className="relative grid gap-3 pb-7 pl-9 md:grid-cols-[190px_180px_1fr]">
              {index < booking.timeline.length - 1 && <span className="absolute left-[11px] top-5 h-full w-px bg-[#dbe7fb]" />}
              <span className="absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#0b6df6] text-white"><CheckCircle2 size={14} /></span>
              <p className="text-sm font-black text-[#111827]">{formatDateTime(event.at)}</p>
              <p className="text-sm font-black capitalize text-[#0b6df6]">{event.event.replace(/_/g, " ")}</p>
              <div>
                <p className="text-sm font-semibold text-[#475467]">{event.by || "system"}</p>
                {event.note && <p className="mt-1 text-sm text-[#667085]">{event.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
