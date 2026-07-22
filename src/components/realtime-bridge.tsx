"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

type LiveState = {
  connected: boolean;
  backendUrl: string;
  lastEvent: string;
  eventCount: number;
  notifications: { id: string; title: string; detail: string; receivedAt: string }[];
  setConnected: (connected: boolean) => void;
  setBackendUrl: (backendUrl: string) => void;
  pushEvent: (eventName: string, payload?: Record<string, unknown>) => void;
  clearNotifications: () => void;
};

export const useLiveAdmin = create<LiveState>((set) => ({
  connected: false,
  backendUrl: "",
  lastEvent: "Waiting for backend",
  eventCount: 0,
  notifications: [],
  setConnected: (connected) => set({ connected }),
  setBackendUrl: (backendUrl) => set({ backendUrl }),
  pushEvent: (eventName, payload = {}) =>
    set((state) => ({
      lastEvent: eventLabel(eventName),
      eventCount: state.eventCount + 1,
      notifications: [
        {
          id: `${Date.now()}-${state.eventCount}`,
          title: eventLabel(eventName),
          detail: eventDetail(eventName, payload),
          receivedAt: new Date().toISOString(),
        },
        ...state.notifications,
      ].slice(0, 12),
    })),
  clearNotifications: () => set({ eventCount: 0, notifications: [] }),
}));

function eventLabel(eventName: string) {
  const labels: Record<string, string> = {
    "user:registered": "New user registered",
    "user:updated": "User account updated",
    "booking:new_request": "New booking created",
    "booking:accepted": "Partner assigned",
    "booking:rejected": "Booking rejected",
    "booking:status_update": "Booking status updated",
    "booking:quote_sent": "Partner sent final amount",
    "booking:quote_countered": "Customer sent counter offer",
    "booking:quote_expired": "Final amount approval expired",
    "booking:payment_accepted": "Customer accepted amount",
    "booking:completed": "Booking completed",
    "booking:cancelled": "Booking cancelled",
    "booking:disputed": "Booking disputed",
    "booking:customer_no_response": "Customer no-response reported",
    "booking:technician_sos": "Technician SOS raised",
    "booking:proof_photo_uploaded": "Job proof photo uploaded",
    "booking:revisit_requested": "Warranty revisit requested",
    "booking:call_log": "Partner call activity",
    "payment:created": "Payment order created",
    "payment:confirmed": "Payment confirmed",
    "complaint:submitted": "New complaint submitted",
    "complaint:updated": "Complaint updated",
    "support:ticket_created": "New support ticket",
    "support:ticket_updated": "Support ticket updated",
    "partner:registered": "New partner registered",
    "partner:updated": "Partner profile updated",
    "review:created": "New partner rating submitted",
    "notification:created": "Notification created",
    "notification:scheduled": "Notification scheduled",
    "notification:sent": "Notification sent",
    "notification:deleted": "Notification deleted",
  };
  return labels[eventName] || eventName;
}

function eventDetail(eventName: string, payload: Record<string, unknown>) {
  if (eventName.startsWith("booking:")) return String(payload.bookingCode || payload.bookingId || "Booking event received");
  if (eventName.startsWith("payment:")) return String(payload.bookingCode || payload.paymentId || payload.status || "Payment event received");
  if (eventName.startsWith("support:")) return String(payload.ticketId || payload.status || "Support ticket event received");
  if (eventName.startsWith("notification:")) return String(payload.title || payload.notificationId || payload.status || "Notification event received");
  if (eventName.startsWith("complaint:")) return String(payload.bookingCode || payload.reason || "Complaint event received");
  if (eventName.startsWith("user:")) return String(payload.name || payload.phone || payload.userId || "User event received");
  if (eventName.startsWith("review:")) return String(payload.bookingCode || payload.partnerId || "Partner rating received");
  return "Live backend event received";
}

const adminEvents = [
  "user:registered",
  "user:updated",
  "booking:new_request",
  "booking:accepted",
  "booking:rejected",
  "booking:status_update",
  "booking:quote_sent",
  "booking:quote_countered",
  "booking:quote_expired",
  "booking:payment_accepted",
  "booking:completed",
  "booking:cancelled",
  "booking:disputed",
  "booking:customer_no_response",
  "booking:technician_sos",
  "booking:proof_photo_uploaded",
  "booking:revisit_requested",
  "booking:call_log",
  "payment:created",
  "payment:confirmed",
  "complaint:submitted",
  "complaint:updated",
  "support:ticket_created",
  "support:ticket_updated",
  "partner:registered",
  "partner:updated",
  "review:created",
  "notification:created",
  "notification:scheduled",
  "notification:sent",
  "notification:deleted",
  "partner:online",
  "partner:offline",
  "partner:location_update",
];

export function RealtimeBridge() {
  const queryClient = useQueryClient();
  const setConnected = useLiveAdmin((state) => state.setConnected);
  const setBackendUrl = useLiveAdmin((state) => state.setBackendUrl);
  const pushEvent = useLiveAdmin((state) => state.pushEvent);

  useEffect(() => {
    let socket: Socket | null = null;
    let closed = false;
    let reconnectTimer: number | null = null;
    let healthTimer: number | null = null;

    function scheduleReconnect(delayMs = 8000) {
      if (closed || reconnectTimer) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (!closed && !socket?.connected) connect();
      }, delayMs);
    }

    async function connect() {
      try {
        await fetch("/api/admin/backend-health", { cache: "no-store" }).catch(() => null);
        const response = await fetch("/api/admin/realtime-token", { cache: "no-store" });
        if (!response.ok) {
          pushEvent("Realtime token unavailable");
          scheduleReconnect();
          return;
        }
        const config = (await response.json()) as { backendUrl: string; token: string };
        if (closed) return;

        setBackendUrl(config.backendUrl);
        socket = io(config.backendUrl, {
          transports: ["polling", "websocket"],
          auth: {
            role: "admin",
            adminToken: config.token,
          },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1200,
        });

        socket.on("connect", () => {
          setConnected(true);
          pushEvent("Connected to live backend");
        });

        socket.on("disconnect", () => {
          setConnected(false);
          pushEvent("Backend disconnected");
          scheduleReconnect();
        });

        socket.on("connect_error", (error) => {
          setConnected(false);
          pushEvent(`Realtime connection failed: ${error.message || "unknown error"}`);
          scheduleReconnect();
        });

        for (const eventName of adminEvents) {
          socket.on(eventName, (payload = {}) => {
            pushEvent(eventName, payload as Record<string, unknown>);
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["admin-resource"] });
            queryClient.invalidateQueries({ queryKey: ["admin-partner-profile"] });
            queryClient.invalidateQueries({ queryKey: ["admin-partner-profile-shell"] });
            queryClient.invalidateQueries({ queryKey: ["users-control-center"] });
            queryClient.invalidateQueries({ queryKey: ["admin-user"] });
            queryClient.invalidateQueries({ queryKey: ["support-ticket"] });
            queryClient.invalidateQueries({ queryKey: ["booking-timeline"] });
            queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
          });
        }
      } catch {
        setConnected(false);
        pushEvent("Realtime connection failed");
        scheduleReconnect();
      }
    }

    connect();
    healthTimer = window.setInterval(() => {
      fetch("/api/admin/backend-health", { cache: "no-store" }).catch(() => null);
    }, 60_000);

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (healthTimer) window.clearInterval(healthTimer);
      socket?.disconnect();
    };
  }, [pushEvent, queryClient, setBackendUrl, setConnected]);

  return null;
}

export function LiveStatusPill() {
  const connected = useLiveAdmin((state) => state.connected);
  const lastEvent = useLiveAdmin((state) => state.lastEvent);
  const eventCount = useLiveAdmin((state) => state.eventCount);

  return (
    <div className="hidden items-center gap-2 rounded-2xl border border-[#ecd3dc] bg-white px-4 py-2 text-xs font-bold text-[#5f555b] shadow-sm lg:flex">
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.14)]" : "bg-rose-500"}`} />
      <span>{connected ? "Live backend" : "Backend offline"}</span>
      <span className="text-[#a09198]">|</span>
      <span>{lastEvent}</span>
      {eventCount > 0 && <span className="rounded-full bg-[#fff0f4] px-2 py-0.5 text-[#f32368]">{eventCount}</span>}
    </div>
  );
}
