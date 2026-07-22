import { StandalonePartnerProfile } from "@/components/module-page";

export default async function PartnerProfilePage({ params }: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = await params;
  return <StandalonePartnerProfile partnerId={partnerId} />;
}
