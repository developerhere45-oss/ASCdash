"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ImagePlus,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TargetType = "ALL_USERS" | "ALL_PARTNERS" | "SPECIFIC_USER" | "SPECIFIC_PARTNER";
type ActionType = "NONE" | "OPEN_HOME" | "OPEN_NOTIFICATIONS" | "OPEN_SERVICE" | "OPEN_BOOKING" | "OPEN_OFFERS" | "OPEN_PARTNER_HOME" | "OPEN_PARTNER_BOOKING";
type ScheduleMode = "now" | "later";

type Recipient = {
  id: string;
  type: "user" | "partner";
  name: string;
  phone: string;
  email: string;
  code: string;
  status: string;
};

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
  targetType: TargetType;
  status: string;
  sentBy: string;
  sentByEmail: string;
  sentAt: string;
  scheduleAt: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  invalidTokenCount: number;
  actionType: ActionType;
  actionId: string;
  errorMessages: { code: string; message: string }[];
  createdAt: string;
};

type HistoryPayload = {
  metrics: {
    totalNotifications: number;
    sentToday: number;
    scheduled: number;
    failed: number;
  };
  notifications: NotificationRecord[];
};

const defaultHistory: HistoryPayload = {
  metrics: { totalNotifications: 0, sentToday: 0, scheduled: 0, failed: 0 },
  notifications: [],
};

const targetOptions: { value: TargetType; label: string }[] = [
  { value: "ALL_USERS", label: "All Users" },
  { value: "ALL_PARTNERS", label: "All Partners" },
  { value: "SPECIFIC_USER", label: "Specific User" },
  { value: "SPECIFIC_PARTNER", label: "Specific Partner" },
];

const actionOptions: { value: ActionType; label: string }[] = [
  { value: "NONE", label: "No Action" },
  { value: "OPEN_HOME", label: "User App Home" },
  { value: "OPEN_PARTNER_HOME", label: "Partner App Home" },
  { value: "OPEN_SERVICE", label: "Service Details" },
  { value: "OPEN_BOOKING", label: "Booking Details" },
  { value: "OPEN_PARTNER_BOOKING", label: "Partner Booking Details" },
  { value: "OPEN_OFFERS", label: "Offers Page" },
  { value: "OPEN_NOTIFICATIONS", label: "Notifications Page" },
];

function statusTone(status: string) {
  const clean = status.toLowerCase();
  if (clean.includes("sent")) return "bg-[#e8f8ef] text-[#079455]";
  if (clean.includes("schedule") || clean.includes("sending")) return "bg-[#fff4df] text-[#c26a00]";
  if (clean.includes("fail") || clean.includes("cancel")) return "bg-[#ffebef] text-[#d92d4b]";
  return "bg-[#eef2f6] text-[#475467]";
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function targetLabel(value: TargetType) {
  return targetOptions.find((option) => option.value === value)?.label || value;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with ${response.status}`);
  }
  return response.json();
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Bell; tone: string }) {
  return (
    <div className="admin-card p-5">
      <div className="flex items-center gap-4">
        <div className={cn("metric-icon", tone)}><Icon size={24} /></div>
        <div>
          <p className="text-sm font-semibold text-[#475467]">{label}</p>
          <p className="mt-1 text-2xl font-black">{new Intl.NumberFormat("en-IN").format(value || 0)}</p>
          <p className="mt-2 text-xs font-bold text-[#079455]">Live backend</p>
        </div>
      </div>
    </div>
  );
}

function AndroidPreview({ title, message, imageUrl }: { title: string; message: string; imageUrl: string }) {
  return (
    <div className="rounded-[28px] border border-[#d8dee8] bg-[#111827] p-4 shadow-lg">
      <div className="rounded-[22px] bg-[#f8fafc] p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[#0b6df6]">
            <Bell size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#667085]">ApnaServo</p>
            <p className="mt-1 text-sm font-black text-[#111827]">{title || "Notification title"}</p>
            <p className="mt-1 text-sm font-medium text-[#475467]">{message || "Notification message preview will appear here."}</p>
            {imageUrl && <img src={imageUrl} alt="" className="mt-3 max-h-32 w-full rounded-lg object-cover" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillPartnerId = searchParams.get("partnerId") || "";
  const prefillUserId = searchParams.get("userId") || "";
  const initialTargetType: TargetType = prefillPartnerId ? "SPECIFIC_PARTNER" : prefillUserId ? "SPECIFIC_USER" : "ALL_USERS";
  const initialRecipientQuery = prefillPartnerId || prefillUserId;
  const [targetType, setTargetType] = useState<TargetType>(initialTargetType);
  const previousTargetType = useRef<TargetType>(initialTargetType);
  const [recipientQuery, setRecipientQuery] = useState(initialRecipientQuery);
  const [recipientResults, setRecipientResults] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [actionType, setActionType] = useState<ActionType>("NONE");
  const [actionId, setActionId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [details, setDetails] = useState<NotificationRecord | null>(null);
  const [formError, setFormError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const history = useQuery({
    queryKey: ["admin-notifications-history"],
    queryFn: () => jsonFetch<HistoryPayload>("/api/admin/notifications/history"),
    refetchInterval: 15000,
  });
  const data = history.data || defaultHistory;

  const specificTarget = targetType === "SPECIFIC_USER" || targetType === "SPECIFIC_PARTNER";
  const actionNeedsId = actionType === "OPEN_SERVICE" || actionType === "OPEN_BOOKING" || actionType === "OPEN_PARTNER_BOOKING";

  useEffect(() => {
    if (previousTargetType.current === targetType) return;
    previousTargetType.current = targetType;
    setSelectedRecipient(null);
    setRecipientQuery("");
    setRecipientResults([]);
  }, [targetType]);

  useEffect(() => {
    const prefillId = prefillPartnerId || prefillUserId;
    if (!prefillId || selectedRecipient || recipientResults.length === 0) return;
    const match = recipientResults.find((recipient) => recipient.id === prefillId);
    if (!match) return;
    setSelectedRecipient(match);
    setRecipientQuery(`${match.name}${match.phone ? ` - ${match.phone}` : ""}`);
    if (!title) setTitle("Message from ApnaServo");
  }, [prefillPartnerId, prefillUserId, recipientResults, selectedRecipient, title]);

  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      if (specificTarget) {
        if (selectedRecipient) {
          setRecipientCount(1);
          return;
        }
        if (recipientQuery.trim().length < 2) {
          setRecipientCount(0);
          return;
        }
        try {
          const result = await jsonFetch<{ count: number; results: Recipient[] }>(
            `/api/admin/notifications/search-recipients?targetType=${targetType}&q=${encodeURIComponent(recipientQuery.trim())}`
          );
          if (!cancelled) setRecipientCount(result.results?.length || result.count || 0);
        } catch {
          if (!cancelled) setRecipientCount(null);
        }
        return;
      }
      try {
        const result = await jsonFetch<{ count: number }>(`/api/admin/notifications/search-recipients?targetType=${targetType}&countOnly=true`);
        if (!cancelled) setRecipientCount(result.count);
      } catch {
        if (!cancelled) setRecipientCount(null);
      }
    }
    loadCount();
    return () => { cancelled = true; };
  }, [recipientQuery, specificTarget, selectedRecipient, targetType]);

  useEffect(() => {
    if (!specificTarget || recipientQuery.trim().length < 2) {
      setRecipientResults([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const result = await jsonFetch<{ results: Recipient[] }>(
          `/api/admin/notifications/search-recipients?targetType=${targetType}&q=${encodeURIComponent(recipientQuery)}`
        );
        setRecipientResults(result.results || []);
      } catch {
        setRecipientResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [recipientQuery, specificTarget, targetType]);

  const payload = useMemo(() => ({
    targetType,
    recipientId: selectedRecipient?.id || "",
    recipientQuery: recipientQuery.trim(),
    title: title.trim(),
    message: message.trim(),
    imageUrl: imageUrl.trim(),
    actionType,
    actionId: actionNeedsId ? actionId.trim() : "",
    ...(scheduleMode === "later" && scheduleAt ? { scheduleAt: new Date(scheduleAt).toISOString() } : {}),
    idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  }), [actionId, actionNeedsId, actionType, imageUrl, message, recipientQuery, scheduleAt, scheduleMode, selectedRecipient?.id, targetType, title]);

  const sendMutation = useMutation({
    mutationFn: () => jsonFetch<{ notification: NotificationRecord }>(
      scheduleMode === "later" ? "/api/admin/notifications/schedule" : "/api/admin/notifications/send",
      { method: "POST", body: JSON.stringify(payload), headers: { "Idempotency-Key": payload.idempotencyKey } }
    ),
    onSuccess: () => {
      setConfirmOpen(false);
      setTitle("");
      setMessage("");
      setImageUrl("");
      setActionType("NONE");
      setActionId("");
      setScheduleMode("now");
      setScheduleAt("");
      setSelectedRecipient(null);
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-resource"] });
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Notification failed"),
  });

  function validateAndConfirm() {
    setFormError("");
    if (!title.trim() || title.length > 100) return setFormError("Title is required and must be 100 characters or less.");
    if (!message.trim() || message.length > 500) return setFormError("Message is required and must be 500 characters or less.");
    if (specificTarget && !selectedRecipient && recipientQuery.trim().length < 2) return setFormError("Enter mobile number, name, email, or select a specific recipient first.");
    if (actionNeedsId && !actionId.trim()) return setFormError("Service/booking action requires an ID.");
    if (scheduleMode === "later" && !scheduleAt) return setFormError("Select schedule date and time.");
    setConfirmOpen(true);
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploadMessage("Uploading image...");
    const form = new FormData();
    form.append("image", file);
    try {
      const result = await jsonFetch<{ imageUrl: string; storageProvider?: string }>("/api/admin/notifications/upload-image", { method: "POST", body: form });
      setImageUrl(result.imageUrl);
      setUploadMessage(result.storageProvider === "mongodb" ? "Image uploaded to backend storage" : "Image uploaded");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Image upload failed");
    }
  }

  async function resend(id: string) {
    await jsonFetch(`/api/admin/notifications/${encodeURIComponent(id)}/resend`, { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
  }

  async function deleteScheduled(id: string) {
    await jsonFetch(`/api/admin/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
  }

  async function cancelScheduled(id: string) {
    await jsonFetch(`/api/admin/notifications/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-[28px] font-black text-[#111827]">Notifications</h1>
          <p className="mt-1 text-sm font-medium text-[#667085]">Dashboard &gt; Notifications - Firebase FCM connected</p>
        </div>
        <button onClick={() => history.refetch()} className="flex h-11 items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-bold">
          <RefreshCw size={17} className={cn(history.isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {history.isError && <div className="admin-card mb-5 border-[#ffd3dc] bg-[#fff7f9] p-4 text-sm font-bold text-[#d92d4b]">Live backend unavailable. No default notification data is shown.</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Notifications" value={data.metrics.totalNotifications} icon={Megaphone} tone="bg-[#eef5ff] text-[#0b6df6]" />
        <MetricCard label="Sent Today" value={data.metrics.sentToday} icon={CheckCircle2} tone="bg-[#e8f8ef] text-[#079455]" />
        <MetricCard label="Scheduled" value={data.metrics.scheduled} icon={CalendarClock} tone="bg-[#fff4df] text-[#c26a00]" />
        <MetricCard label="Failed" value={data.metrics.failed} icon={XCircle} tone="bg-[#ffebef] text-[#d92d4b]" />
      </section>

      <section className="mt-5 grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="admin-card min-w-0 p-5">
          <h2 className="text-lg font-black">Send Notification</h2>
          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2 [&>*]:min-w-0 [&_input]:min-w-0 [&_input]:max-w-full [&_select]:min-w-0 [&_select]:max-w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full">
            <label className="grid gap-2 text-sm font-bold text-[#344054]">
              Send To
              <select value={targetType} onChange={(event) => setTargetType(event.target.value as TargetType)} className="h-11 rounded-lg border border-[#e6eaf2] bg-white px-3 outline-none">
                {targetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            {specificTarget && (
              <div className="relative grid gap-2 text-sm font-bold text-[#344054]">
                Search Recipient
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" size={16} />
                  <input value={recipientQuery} onChange={(event) => setRecipientQuery(event.target.value)} className="h-11 w-full rounded-lg border border-[#e6eaf2] bg-white px-9 outline-none" placeholder="Name, mobile, email, ID" />
                </div>
                {recipientResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[74px] z-20 max-h-64 overflow-y-auto rounded-lg border border-[#e6eaf2] bg-white shadow-xl">
                    {recipientResults.map((recipient) => (
                      <button key={recipient.id} type="button" onClick={() => { setSelectedRecipient(recipient); setRecipientQuery(`${recipient.name} ${recipient.phone}`.trim()); setRecipientResults([]); }} className="block w-full border-b border-[#edf0f6] px-3 py-3 text-left last:border-0 hover:bg-[#f5f9ff]">
                        <p className="text-sm font-black text-[#111827]">{recipient.name || recipient.id}</p>
                        <p className="text-xs font-semibold text-[#667085]">{recipient.phone || recipient.email || recipient.code || recipient.id}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="grid gap-2 text-sm font-bold text-[#344054]">
              Notification Title ({title.length}/100)
              <input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] px-3 outline-none" placeholder="Short title" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#344054]">
              Open Page / Action
              <select value={actionType} onChange={(event) => setActionType(event.target.value as ActionType)} className="h-11 rounded-lg border border-[#e6eaf2] bg-white px-3 outline-none">
                {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#344054] lg:col-span-2">
              Notification Message ({message.length}/500)
              <textarea value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} className="min-h-28 rounded-lg border border-[#e6eaf2] px-3 py-3 outline-none" placeholder="Write the notification message" />
            </label>

            <label className="grid gap-2 text-sm font-bold text-[#344054]">
              Banner Image URL
              <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] px-3 outline-none" placeholder="https://..." />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#344054]">
              Upload Banner Image
              <span className="flex h-11 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-[#e6eaf2] px-3 text-[#667085]">
                <ImagePlus size={17} />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(event.target.files?.[0])} className="min-w-0 flex-1 text-xs" />
              </span>
              {uploadMessage && <span className="text-xs font-semibold text-[#667085]">{uploadMessage}</span>}
            </label>

            {actionNeedsId && (
              <label className="grid gap-2 text-sm font-bold text-[#344054]">
                Related Service ID / Booking ID
                <input value={actionId} onChange={(event) => setActionId(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] px-3 outline-none" placeholder="serviceId or bookingId" />
              </label>
            )}

            <label className="grid gap-2 text-sm font-bold text-[#344054]">
              Schedule
              <select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as ScheduleMode)} className="h-11 rounded-lg border border-[#e6eaf2] bg-white px-3 outline-none">
                <option value="now">Send Now</option>
                <option value="later">Schedule for Later</option>
              </select>
            </label>
            {scheduleMode === "later" && (
              <label className="grid gap-2 text-sm font-bold text-[#344054]">
                Date & Time
                <input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="h-11 rounded-lg border border-[#e6eaf2] px-3 outline-none" />
              </label>
            )}
          </div>

          {formError && <p className="mt-4 rounded-lg bg-[#fff7f9] px-3 py-2 text-sm font-bold text-[#d92d4b]">{formError}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={validateAndConfirm} disabled={sendMutation.isPending} className="flex h-11 items-center gap-2 rounded-lg bg-[#0b6df6] px-5 text-sm font-black text-white disabled:opacity-60">
              <Send size={17} />
              {scheduleMode === "later" ? "Schedule" : "Send Now"}
            </button>
            <span className="text-sm font-bold text-[#667085]">
              Recipients: {recipientCount === null ? "calculating" : new Intl.NumberFormat("en-IN").format(recipientCount)}
            </span>
          </div>
        </div>

        <div className="admin-card min-w-0 p-5">
          <h2 className="text-lg font-black">Preview</h2>
          <div className="mt-5"><AndroidPreview title={title} message={message} imageUrl={imageUrl} /></div>
          <div className="mt-5 rounded-lg bg-[#f8fafc] p-4 text-sm font-semibold text-[#475467]">
            <p>Target: <span className="font-black text-[#111827]">{targetLabel(targetType)}</span></p>
            <p className="mt-2">Action: <span className="font-black text-[#111827]">{actionType}</span></p>
            <p className="mt-2">Schedule: <span className="font-black text-[#111827]">{scheduleMode === "later" ? (scheduleAt ? formatDate(new Date(scheduleAt).toISOString()) : "Not selected") : "Send now"}</span></p>
          </div>
        </div>
      </section>

      <section className="admin-card mt-5 overflow-hidden">
        <div className="border-b border-[#edf0f6] px-5 py-4">
          <h2 className="text-lg font-black">Recent Notifications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs text-[#667085]">
              <tr>
                <th className="px-5 py-4 font-bold">Title</th>
                <th className="px-5 py-4 font-bold">Sent To</th>
                <th className="px-5 py-4 font-bold">Recipients</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold">Sent By</th>
                <th className="px-5 py-4 font-bold">Sent At</th>
                <th className="px-5 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.notifications.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm font-semibold text-[#667085]">No live notification history found.</td></tr>
              ) : data.notifications.map((item) => (
                <tr key={item.id} className="border-t border-[#edf0f6]">
                  <td className="max-w-[280px] px-5 py-3 font-bold text-[#111827]">{item.title}</td>
                  <td className="px-5 py-3 font-semibold text-[#475467]">{targetLabel(item.targetType)}</td>
                  <td className="px-5 py-3 font-semibold text-[#475467]">{item.recipientCount} / {item.successCount} sent</td>
                  <td className="px-5 py-3"><span className={cn("status-pill", statusTone(item.status))}>{item.status.replace("_", " ")}</span></td>
                  <td className="px-5 py-3 font-semibold text-[#475467]">{item.sentByEmail || item.sentBy || "Admin"}</td>
                  <td className="px-5 py-3 font-semibold text-[#475467]">{formatDate(item.sentAt || item.scheduleAt || item.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setDetails(item)} className="rounded-lg border border-[#e6eaf2] px-3 py-2 text-xs font-black text-[#0b6df6]">View</button>
                      <button onClick={() => resend(item.id)} className="rounded-lg border border-[#e6eaf2] px-3 py-2 text-xs font-black text-[#079455]">Resend</button>
                      {item.status === "scheduled" && (
                        <button onClick={() => cancelScheduled(item.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffd9a8] text-[#c26a00]" aria-label="Cancel scheduled notification"><XCircle size={15} /></button>
                      )}
                      {["scheduled", "draft", "cancelled"].includes(item.status) && (
                        <button onClick={() => deleteScheduled(item.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#ffd3dc] text-[#d92d4b]" aria-label="Delete scheduled notification"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/45 p-4">
          <div className="w-full max-w-[520px] rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-black text-[#111827]">Confirm Notification</h2>
            <p className="mt-3 text-sm font-semibold text-[#475467]">
              This notification will be sent to {recipientCount === null ? "the selected" : new Intl.NumberFormat("en-IN").format(recipientCount)} recipients. Are you sure?
            </p>
            <div className="mt-5 rounded-lg bg-[#f8fafc] p-4">
              <p className="font-black">{title}</p>
              <p className="mt-1 text-sm text-[#475467]">{message}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} className="h-11 rounded-lg border border-[#e6eaf2] px-5 text-sm font-black">Cancel</button>
              <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} className="h-11 rounded-lg bg-[#0b6df6] px-5 text-sm font-black text-white disabled:opacity-60">
                {sendMutation.isPending ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {details && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/45 p-4">
          <div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#111827]">{details.title}</h2>
                <p className="mt-1 text-sm font-semibold text-[#667085]">{targetLabel(details.targetType)} - {details.status}</p>
              </div>
              <button onClick={() => setDetails(null)} className="rounded-lg border border-[#e6eaf2] px-3 py-2 text-xs font-black">Close</button>
            </div>
            <p className="mt-5 text-sm font-medium text-[#475467]">{details.message}</p>
            {details.imageUrl && <img src={details.imageUrl} alt="" className="mt-4 max-h-56 w-full rounded-lg object-cover" />}
            <div className="mt-5 grid gap-3 text-sm font-semibold text-[#475467] md:grid-cols-2">
              <p>Recipients: <span className="font-black text-[#111827]">{details.recipientCount}</span></p>
              <p>Success: <span className="font-black text-[#079455]">{details.successCount}</span></p>
              <p>Failed: <span className="font-black text-[#d92d4b]">{details.failureCount}</span></p>
              <p>Invalid Tokens: <span className="font-black text-[#d92d4b]">{details.invalidTokenCount}</span></p>
              <p>Action: <span className="font-black text-[#111827]">{details.actionType}</span></p>
              <p>Action ID: <span className="font-black text-[#111827]">{details.actionId || "-"}</span></p>
            </div>
            {details.errorMessages?.length > 0 && (
              <div className="mt-5 rounded-lg bg-[#fff7f9] p-4">
                <p className="text-sm font-black text-[#d92d4b]">Delivery Errors</p>
                {details.errorMessages.map((error, index) => (
                  <p key={`${error.code}-${index}`} className="mt-2 text-xs font-semibold text-[#7a2e3a]">{error.code}: {error.message}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
