import { notFound, redirect } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { resourceConfig } from "@/lib/resource-config";
import { ServiceWorkPage } from "@/components/service-work-page";

export default async function ResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (resource === "complaints" || resource === "support-tickets") redirect("/users/support");
  if (resource === "reports") return <ServiceWorkPage />;
  if (!resourceConfig[resource]) notFound();
  return <ModulePage resource={resource} />;
}
