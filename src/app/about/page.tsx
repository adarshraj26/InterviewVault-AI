import AboutClient from "./about-client";
import { getGlobalTopicCounts } from "@/actions/public";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About InterviewVault AI",
  description: "Learn why elite engineers use InterviewVault AI for technical interview preparation.",
};

export default async function AboutPage() {
  const counts = await getGlobalTopicCounts();
  return <AboutClient counts={counts} />;
}
