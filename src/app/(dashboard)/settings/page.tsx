import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Load user details
  const dbUser = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      image: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  return (
    <div className="container py-8">
      <SettingsForm 
        user={dbUser} 
      />
    </div>
  );
}
