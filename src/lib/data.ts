import { fetchBackendJson } from "./backend";
export { resourceConfig } from "./resource-config";

export async function getOverview() {
  return fetchBackendJson("/api/admin/dashboard");
}

export async function getResourceRows(resource: string) {
  return fetchBackendJson<{ resource: string; rows: Record<string, unknown>[]; metrics?: Record<string, unknown> }>(`/api/admin/${resource}`);
}
