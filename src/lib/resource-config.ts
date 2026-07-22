export const resourceConfig: Record<string, { title: string; subtitle: string; permission: string; action: string }> = {
  bookings: {
    title: "Bookings",
    subtitle: "Dashboard > Bookings",
    permission: "bookings:read",
    action: "Export",
  },
  partners: {
    title: "Partners",
    subtitle: "Dashboard > Partners",
    permission: "technicians:manage",
    action: "Export",
  },
  devices: {
    title: "Devices",
    subtitle: "Dashboard > Devices",
    permission: "technicians:manage",
    action: "Export",
  },
  "partner-approvals": {
    title: "Partner Approvals",
    subtitle: "Dashboard > Partner Approvals",
    permission: "technicians:manage",
    action: "Review Requests",
  },
  payments: {
    title: "Payments & Finance",
    subtitle: "Dashboard > Payments & Finance",
    permission: "analytics:read",
    action: "Export",
  },
  complaints: {
    title: "Complaints",
    subtitle: "Dashboard > Complaints",
    permission: "complaints:manage",
    action: "Export",
  },
  "support-tickets": {
    title: "Support Tickets",
    subtitle: "Dashboard > Support Tickets",
    permission: "complaints:manage",
    action: "Export",
  },
  notifications: {
    title: "Notifications",
    subtitle: "Dashboard > Notifications",
    permission: "bookings:manage",
    action: "Send Notification",
  },
  reports: {
    title: "Reports",
    subtitle: "Dashboard > Reports",
    permission: "analytics:read",
    action: "Export Report",
  },
  settings: {
    title: "Settings",
    subtitle: "Dashboard > Settings",
    permission: "analytics:read",
    action: "Save Changes",
  },
  logout: {
    title: "Logout",
    subtitle: "Dashboard > Logout",
    permission: "analytics:read",
    action: "Logout",
  },
};
