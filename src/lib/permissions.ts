export type AdminRole = "SUPER_ADMIN" | "OPERATIONS_MANAGER" | "SUPPORT_EXECUTIVE";

export const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATIONS_MANAGER: "Operations Manager",
  SUPPORT_EXECUTIVE: "Support Executive",
};

export const permissions: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ["*"],
  OPERATIONS_MANAGER: ["bookings:read", "bookings:manage", "technicians:manage", "users:read", "complaints:manage", "services:read", "analytics:read"],
  SUPPORT_EXECUTIVE: ["users:read", "complaints:manage", "bookings:read"],
};

export function can(role: AdminRole, permission: string) {
  return permissions[role]?.includes("*") || permissions[role]?.includes(permission);
}
