import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSavedQuestions } from "@/actions/questions";
import { getTechnologies } from "@/actions/technologies";
import SavedDashboard from "./SavedDashboard";

export const metadata = {
  title: "Saved Questions — InterviewVault AI",
  description: "All your bookmarked interview questions in one place.",
};

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [saved, technologies] = await Promise.all([
    getSavedQuestions(),
    getTechnologies(),
  ]);

  return (
    <div className="container py-8">
      <SavedDashboard
        initialSaved={saved as any}
        technologies={technologies as any}
      />
    </div>
  );
}
