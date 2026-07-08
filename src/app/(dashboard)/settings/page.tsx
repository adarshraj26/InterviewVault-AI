import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";
import { backfillGoogleImageUrl } from "@/actions/backfill-avatar";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Backfill googleImageUrl for existing Google users (idempotent — safe every load)
  await backfillGoogleImageUrl();

  // Load user details including all avatar fields (after potential backfill)
  const dbUser = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      name:             true,
      email:            true,
      image:            true,
      profileImageUrl:  true,
      googleImageUrl:   true,
      selectedAvatarId: true,
      avatarType:       true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  return (
    <div className="container py-8">
      <SettingsForm
        user={{
          ...dbUser,
          avatarType: dbUser.avatarType as string | null,
        }}
      />
    </div>
  );
}
