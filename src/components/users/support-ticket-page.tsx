"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageCircle,
  MessageSquareReply,
  Paperclip,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  Ticket,
  UserPlus,
} from "lucide-react";
import { cn, statusTone } from "@/lib/utils";

type Attachment = {
  id?: string;
  name?: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
};

type TicketMessage = {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  attachments: Attachment[];
  createdAt: string;
};

type TicketTimeline = {
  event: string;
  by: string;
  note: string;
  at: string;
};

type SupportTicket = {
  id: string;
  ticketId: string;
  userId: string;
  bookingId: string;
  bookingCode: string;
  userName: string;
  mobileNumber: string;
  email: string;
  ticketCategory: string;
  priority: string;
  status: string;
  source: string;
  createdDateTime: string;
  lastUpdated: string;
  complaint: string;
  aiSummary: string;
  conversationHistory: TicketMessage[];
  ticketTimeline: TicketTimeline[];
  adminReplies: TicketMessage[];
  resolutionNotes: string;
  internalNotes: { id: string; note: string; addedBy: string; addedAt: string }[];
  attachments: Attachment[];
  assignedTo: string;
  escalatedTo: string;
};

function formatDateTime(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
      <p className="text-xs font-black uppercase text-[#8c7a82]">{label}</p>
      <div className="mt-2 break-words text-sm font-bold text-[#2a1420]">{value || "Not recorded"}</div>
    </div>
  );
}

async function fetchTicket(ticketId: string): Promise<{ ticket: SupportTicket | null }> {
  const res = await fetch(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`, { cache: "no-store" });
  if (!res.ok) return { ticket: null };
  return res.json();
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return <p className="text-sm font-semibold text-[#756a70]">No attachments.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {attachments.map((attachment, index) => (
        <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-3 hover:bg-[#fff0f4]">
          {attachment.mimeType?.startsWith("image/") ? (
            <img src={attachment.url} alt={attachment.name || "Attachment"} className="mb-3 h-40 w-full rounded-xl object-cover" />
          ) : (
            <div className="mb-3 grid h-24 place-items-center rounded-xl bg-white text-[#f32368]">
              <Paperclip size={26} />
            </div>
          )}
          <p className="text-sm font-black text-[#2a1420]">{attachment.name || `Attachment ${index + 1}`}</p>
          <p className="mt-1 text-xs font-semibold text-[#8c7a82]">{attachment.mimeType || "file"}</p>
        </a>
      ))}
    </div>
  );
}

export function SupportTicketPage({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const { data = { ticket: null }, isFetching } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });
  const ticket = data.ticket;
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");

  async function runAction(payload: Record<string, string>) {
    await fetch(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (payload.internalNote) setInternalNote("");
    if (payload.adminReply) setAdminReply("");
    await queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
    await queryClient.invalidateQueries({ queryKey: ["users-control-center"] });
  }

  if (!ticket) {
    return (
      <div className="rounded-[28px] border border-[#f4dce4] bg-white p-10 text-center font-bold text-[#756a70]">
        Support ticket was not returned by the live backend.
      </div>
    );
  }

  const activeAssignedTo = assignedTo || ticket.assignedTo;
  const activeStatus = status || ticket.status;
  const activeResolutionNotes = resolutionNotes || ticket.resolutionNotes;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link href="/users" className="inline-flex items-center gap-2 text-sm font-black text-[#f32368]">
            <ArrowLeft size={17} />
            Users
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{ticket.ticketId}</h1>
          <div className="mt-3 flex flex-wrap gap-3">
            <Badge value={ticket.status.replace(/_/g, " ")} />
            <span className="rounded-xl bg-[#fff0f4] px-3 py-1 text-xs font-black capitalize text-[#f32368]">{ticket.priority}</span>
            <span className="rounded-xl bg-[#fff0f4] px-3 py-1 text-xs font-black capitalize text-[#f32368]">{ticket.source.replace(/_/g, " ")}</span>
          </div>
        </div>
        <span className="rounded-2xl bg-[#fff0f4] px-4 py-2 text-sm font-black text-[#f32368]">{isFetching ? "Refreshing" : "Live backend ticket"}</span>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <Panel title="Ticket Details" icon={Ticket}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="User name" value={ticket.userName} />
            <Field label="Mobile number" value={ticket.mobileNumber} />
            <Field label="Email" value={ticket.email || "Not available"} />
            <Field label="Ticket category" value={ticket.ticketCategory} />
            <Field label="Created date & time" value={formatDateTime(ticket.createdDateTime)} />
            <Field label="Last updated" value={formatDateTime(ticket.lastUpdated)} />
            <Field label="Booking code" value={ticket.bookingCode || ticket.bookingId} />
            <Field label="Assigned to" value={ticket.assignedTo || "Unassigned"} />
          </div>
          <div className="mt-5 rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
            <p className="text-xs font-black uppercase text-[#8c7a82]">Full customer complaint</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#2a1420]">{ticket.complaint || "No complaint body recorded."}</p>
          </div>
        </Panel>

        <Panel title="Admin Actions" icon={ShieldAlert}>
          <div className="grid gap-3">
            <input className="h-12 rounded-2xl border border-[#ecd3dc] bg-white px-4 text-sm outline-none focus:border-[#f32368]" placeholder="Team member" value={activeAssignedTo} onChange={(event) => setAssignedTo(event.target.value)} />
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#f5bed0] bg-white px-4 text-sm font-black text-[#f32368]" onClick={() => runAction({ assignedTo: activeAssignedTo })}>
              <UserPlus size={16} />
              Assign ticket
            </button>
            <select className="h-12 rounded-2xl border border-[#ecd3dc] bg-white px-4 text-sm font-bold outline-none focus:border-[#f32368]" value={activeStatus} onChange={(event) => setStatus(event.target.value)}>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_on_customer">Waiting on customer</option>
              <option value="resolved">Resolved</option>
              <option value="reopened">Reopened</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
            </select>
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#f5bed0] bg-white px-4 text-sm font-black text-[#f32368]" onClick={() => runAction({ status: activeStatus })}>
              <Save size={16} />
              Change status
            </button>
            <textarea className="min-h-24 rounded-2xl border border-[#ecd3dc] bg-white p-4 text-sm outline-none focus:border-[#f32368]" placeholder="Internal note" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} />
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#f5bed0] bg-white px-4 text-sm font-black text-[#f32368]" onClick={() => runAction({ internalNote })}>
              <FileText size={16} />
              Add internal note
            </button>
            <textarea className="min-h-24 rounded-2xl border border-[#ecd3dc] bg-white p-4 text-sm outline-none focus:border-[#f32368]" placeholder="Resolution notes" value={activeResolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} />
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white" onClick={() => runAction({ action: "mark_resolved", resolutionNotes: activeResolutionNotes })}>
              <CheckCircle2 size={16} />
              Mark resolved
            </button>
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#f5bed0] bg-white px-4 text-sm font-black text-[#f32368]" onClick={() => runAction({ action: "reopen", internalNote })}>
              <RotateCcw size={16} />
              Reopen ticket
            </button>
            <input className="h-12 rounded-2xl border border-[#ecd3dc] bg-white px-4 text-sm outline-none focus:border-[#f32368]" placeholder="Escalate to" value={escalatedTo || ticket.escalatedTo} onChange={(event) => setEscalatedTo(event.target.value)} />
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f32368] px-4 text-sm font-black text-white" onClick={() => runAction({ action: "escalate", escalatedTo: escalatedTo || ticket.escalatedTo || "senior_support", internalNote })}>
              <ShieldAlert size={16} />
              Escalate ticket
            </button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="AI Summary" icon={ClipboardList}>
          <p className="whitespace-pre-wrap text-sm font-semibold text-[#2a1420]">{ticket.aiSummary || "No AI summary recorded."}</p>
        </Panel>

        <Panel title="Admin Replies" icon={MessageSquareReply}>
          <textarea className="min-h-24 w-full rounded-2xl border border-[#ecd3dc] bg-white p-4 text-sm outline-none focus:border-[#f32368]" placeholder="Admin reply" value={adminReply} onChange={(event) => setAdminReply(event.target.value)} />
          <button className="mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#f32368] px-4 text-sm font-black text-white" onClick={() => runAction({ adminReply })}>
            <Send size={16} />
            Send reply
          </button>
          <div className="mt-4 space-y-3">
            {ticket.adminReplies.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No admin replies.</p> : ticket.adminReplies.map((reply) => (
              <div key={reply.id} className="rounded-2xl bg-[#fffafa] p-4">
                <p className="text-sm font-bold text-[#2a1420]">{reply.message}</p>
                <p className="mt-2 text-xs font-semibold text-[#8c7a82]">{reply.senderName} | {formatDateTime(reply.createdAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Conversation History" icon={MessageCircle}>
        <div className="space-y-3">
          {ticket.conversationHistory.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No conversation history.</p> : ticket.conversationHistory.map((message) => (
            <div key={message.id} className="rounded-2xl border border-[#f4dce4] bg-[#fffafa] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black capitalize text-[#2a1420]">{message.senderRole} | {message.senderName || "Unknown"}</p>
                <p className="text-xs font-semibold text-[#8c7a82]">{formatDateTime(message.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#756a70]">{message.message}</p>
              {message.attachments.length > 0 && <div className="mt-3"><AttachmentList attachments={message.attachments} /></div>}
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Ticket Timeline" icon={ClipboardList}>
          <div className="space-y-3">
            {ticket.ticketTimeline.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No timeline events.</p> : ticket.ticketTimeline.map((entry, index) => (
              <div key={`${entry.event}-${entry.at}-${index}`} className="rounded-2xl bg-[#fffafa] p-4">
                <p className="text-sm font-black capitalize text-[#2a1420]">{entry.event.replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm text-[#756a70]">{entry.by}{entry.note ? ` | ${entry.note}` : ""}</p>
                <p className="mt-2 text-xs font-semibold text-[#8c7a82]">{formatDateTime(entry.at)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Internal Notes & Resolution" icon={FileText}>
          <div className="rounded-2xl bg-[#fffafa] p-4">
            <p className="text-xs font-black uppercase text-[#8c7a82]">Resolution notes</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#2a1420]">{ticket.resolutionNotes || "No resolution notes."}</p>
          </div>
          <div className="mt-4 space-y-3">
            {ticket.internalNotes.length === 0 ? <p className="text-sm font-semibold text-[#756a70]">No internal notes.</p> : ticket.internalNotes.map((note) => (
              <div key={note.id} className="rounded-2xl bg-[#fffafa] p-4">
                <p className="text-sm font-bold text-[#2a1420]">{note.note}</p>
                <p className="mt-2 text-xs font-semibold text-[#8c7a82]">{note.addedBy} | {formatDateTime(note.addedAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Attached Files" icon={Paperclip}>
        <AttachmentList attachments={ticket.attachments} />
      </Panel>
    </div>
  );
}
