import { SupportTicketPage } from "@/components/users/support-ticket-page";

export default async function SupportTicketRoute({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  return <SupportTicketPage ticketId={ticketId} />;
}
