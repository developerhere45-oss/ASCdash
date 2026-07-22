import { UserDetailsPage } from "@/components/users/user-details-page";

export default async function UserDetailsRoute({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <UserDetailsPage userId={userId} />;
}
