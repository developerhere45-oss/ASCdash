import { BookingTimelinePage } from "@/components/users/booking-timeline-page";

export default async function BookingTimelineRoute({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <BookingTimelinePage bookingId={bookingId} />;
}
