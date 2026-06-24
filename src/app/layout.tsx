import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "InterviewVault AI — AI-Powered Interview Preparation",
    template: "%s | InterviewVault AI",
  },
  description:
    "Upload your resume, get personalized interview questions, and master your interviews with AI-powered mock interviews, spaced repetition, and smart analytics.",
  keywords: [
    "interview preparation",
    "coding interview",
    "tech interview",
    "AI interview coach",
    "resume parser",
    "mock interview",
    "spaced repetition",
  ],
  authors: [{ name: "InterviewVault AI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "InterviewVault AI",
    title: "InterviewVault AI — AI-Powered Interview Preparation",
    description:
      "Upload your resume, get personalized interview questions, and ace your tech interviews.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
