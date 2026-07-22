"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  CalendarCheck,
  ChevronDown,
  CircleHelp,
  FileText,
  Headphones,
  Home,
  LogOut,
  Menu,
  Megaphone,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Ticket,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Providers } from "@/app/providers";
import { LiveStatusPill, RealtimeBridge, useLiveAdmin } from "@/components/realtime-bridge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/users", label: "Users", icon: Users },
  { href: "/users/support", label: "Support & Complaints", icon: Ticket, child: true },
  { href: "/notifications", label: "Notifications", icon: Megaphone },
  { href: "/devices", label: "Devices", icon: Smartphone },
  { href: "/partners", label: "Partners", icon: UserCheck },
  { href: "/partner-approvals", label: "Partner Approvals", icon: ShieldCheck, badge: "8" },
  { href: "/payments", label: "Payments & Finance", icon: WalletCards },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/logout", label: "Logout", icon: LogOut },
];

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="flex h-[88px] items-center border-b border-[#edf0f6] px-7">
      <img src="/apna-servo-wordmark.png" alt="ApnaServo" className="h-10 w-[156px] object-contain object-left" />
    </Link>
  );
}

function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-dvh w-[232px] border-r border-[#edf0f6] bg-white",
        mobile ? "z-50 xl:hidden" : "z-30 hidden xl:block",
      )}
    >
      <Logo onClick={onNavigate} />
      {mobile && (
        <button
          type="button"
          onClick={onNavigate}
          className="absolute right-3 top-6 grid h-9 w-9 place-items-center rounded-lg text-[#475467]"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      )}
      <nav className="space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-12 items-center gap-3 rounded-lg px-3 text-[14px] font-semibold text-[#263149] transition hover:bg-[#eef5ff] hover:text-[#0b6df6]",
                item.child && "ml-5 h-10 text-[13px]",
                active && "bg-[#eaf2ff] text-[#0b6df6]",
              )}
            >
              <Icon size={18} />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0b6df6] px-1.5 text-[11px] font-black text-white">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-[#edf0f6] bg-white p-4">
        <div className="flex gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#0b6df6]">
            <Headphones size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-[#111827]">Need Help?</p>
            <p className="mt-1 text-xs text-[#667085]">Contact our support team</p>
          </div>
        </div>
        <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#f5f9ff] text-sm font-bold text-[#0b6df6]">
          <CircleHelp size={16} />
          Contact Support
        </button>
      </div>
    </aside>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useLiveAdmin((state) => state.notifications);
  const eventCount = useLiveAdmin((state) => state.eventCount);
  const clearNotifications = useLiveAdmin((state) => state.clearNotifications);

  return (
    <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-[#edf0f6] bg-white/96 px-5 backdrop-blur xl:pl-7">
      <button type="button" onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-lg text-[#111827]" aria-label="Open menu">
        <Menu size={23} />
      </button>
      <div className="flex items-center gap-5">
        <LiveStatusPill />
        <button className="hidden h-12 items-center gap-3 rounded-lg border border-[#e6eaf2] bg-white px-4 text-sm font-semibold text-[#111827] md:flex">
          Live operations
          <CalendarDays size={17} />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-lg text-[#111827]" aria-label="Refresh">
          <RefreshCw size={18} />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative grid h-10 w-10 place-items-center rounded-lg text-[#111827]"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {eventCount > 0 && (
              <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff304f] px-1 text-[10px] font-black text-white">
                {Math.min(eventCount, 99)}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[340px] overflow-hidden rounded-xl border border-[#e6eaf2] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#edf0f6] px-4 py-3">
                <p className="text-sm font-black">Real-time Notifications</p>
                <button type="button" onClick={clearNotifications} className="text-xs font-bold text-[#0b6df6]">Clear</button>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm font-medium text-[#667085]">No new activity.</p>
                ) : notifications.map((notification) => (
                  <div key={notification.id} className="border-b border-[#edf0f6] px-4 py-3 last:border-0">
                    <p className="text-sm font-bold text-[#111827]">{notification.title}</p>
                    <p className="mt-1 text-xs text-[#667085]">{notification.detail}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#98a2b3]">
                      {new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(new Date(notification.receivedAt))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#eef5ff] text-sm font-black text-[#0b6df6]">AD</div>
          <div className="hidden md:block">
            <p className="text-sm font-black text-[#111827]">Admin</p>
            <p className="text-xs font-medium text-[#667085]">Super Admin</p>
          </div>
          <ChevronDown size={16} className="text-[#667085]" />
        </div>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Providers>
      <RealtimeBridge />
      <div className="min-h-dvh bg-[#f8fafc] text-[#111827]">
        <Sidebar />
        {mobileMenuOpen && (
          <>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-[#111827]/35 xl:hidden"
              aria-label="Close menu"
            />
            <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
          </>
        )}
        <div className="xl:pl-[232px]">
          <Topbar onMenu={() => setMobileMenuOpen(true)} />
          <main className="px-5 py-6 xl:px-7">{children}</main>
          <footer className="flex justify-between px-7 pb-7 pt-2 text-xs text-[#667085]">
            <span>(c) 2024 ApnaServo. All rights reserved.</span>
            <span>Version 1.0.0</span>
          </footer>
        </div>
      </div>
    </Providers>
  );
}
