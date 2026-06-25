import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { SUPER_ADMIN_EMAIL } from "@/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.email !== SUPER_ADMIN_EMAIL) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
      redirect("/dashboard");
    }
  }

  return <>{children}</>;
}
