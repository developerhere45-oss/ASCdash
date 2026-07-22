import { NotificationsPage } from "@/components/notifications/notifications-page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm font-semibold text-[#667085]">Loading notifications...</div>}>
      <NotificationsPage />
    </Suspense>
  );
}
