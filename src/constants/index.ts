// ═══════════════════════════════════════════════════════════
// InterviewVault AI — Constants
// ═══════════════════════════════════════════════════════════

export const APP_NAME = "InterviewVault AI";
export const APP_DESCRIPTION =
  "AI-powered interview preparation platform. Upload your resume, get personalized questions, and master your interviews.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ── Navigation ──────────────────────────────────────────────
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Technologies", href: "/technologies", icon: "Code2" },
  { label: "Mock Interview", href: "/mock-interview", icon: "Mic" },
  { label: "Revision", href: "/revision", icon: "RotateCcw" },
  { label: "Community", href: "/community", icon: "Users" },
  { label: "Notes", href: "/notes", icon: "StickyNote" },
  { label: "Analytics", href: "/analytics", icon: "BarChart3" },
] as const;

// ── Difficulty Levels ───────────────────────────────────────
export const DIFFICULTY_LEVELS = [
  { value: "EASY", label: "Easy", color: "text-green-500", bg: "bg-green-500/10" },
  { value: "MEDIUM", label: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { value: "HARD", label: "Hard", color: "text-red-500", bg: "bg-red-500/10" },
] as const;

// ── Interview Frequency ────────────────────────────────────
export const INTERVIEW_FREQUENCIES = [
  { value: "RARE", label: "Rare", color: "text-slate-400" },
  { value: "COMMON", label: "Common", color: "text-blue-500" },
  { value: "VERY_COMMON", label: "Very Common", color: "text-purple-500" },
] as const;

// ── Tags ────────────────────────────────────────────────────
export const QUESTION_TAGS = [
  { value: "BEGINNER", label: "Beginner", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { value: "INTERMEDIATE", label: "Intermediate", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  { value: "ADVANCED", label: "Advanced", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { value: "FREQUENTLY_ASKED", label: "Frequently Asked", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
] as const;

// ── Revision Status ─────────────────────────────────────────
export const REVISION_STATUSES = [
  { value: "NOT_STARTED", label: "Not Started", color: "text-slate-400", bg: "bg-slate-400/10" },
  { value: "LEARNING", label: "Learning", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "REVISED_ONCE", label: "Revised Once", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { value: "MASTERED", label: "Mastered", color: "text-green-500", bg: "bg-green-500/10" },
] as const;

// ── Technology Icons Mapping ────────────────────────────────
export const TECH_ICONS: Record<string, string> = {
  javascript: "🟨",
  typescript: "🔷",
  "react": "⚛️",
  "react.js": "⚛️",
  "reactjs": "⚛️",
  "next.js": "▲",
  "nextjs": "▲",
  "node.js": "🟢",
  "nodejs": "🟢",
  "express.js": "🚂",
  "expressjs": "🚂",
  python: "🐍",
  java: "☕",
  "c++": "🔵",
  "c#": "💜",
  go: "🐹",
  rust: "🦀",
  mongodb: "🍃",
  mysql: "🐬",
  postgresql: "🐘",
  redis: "🔴",
  docker: "🐳",
  kubernetes: "☸️",
  aws: "☁️",
  git: "🔀",
  html: "🌐",
  css: "🎨",
  "tailwind css": "💨",
  vue: "💚",
  angular: "🅰️",
  svelte: "🔥",
  graphql: "◈",
  sql: "📊",
  "system design": "🏗️",
};

// ── Plan Features (All Free) ────────────────────────────────
export const FREE_FEATURES = [
  "Unlimited Technology Workspaces",
  "Unlimited Questions",
  "AI Question Generation",
  "Unlimited Mock Interviews",
  "Full Community Access",
  "Resume Gap Analysis",
  "Personalized Learning Roadmap",
  "Advanced Analytics & Insights",
  "Spaced Repetition System",
  "Notes & Cheat Sheets",
] as const;

// ── Landing Page Features ───────────────────────────────────
export const FEATURES = [
  {
    title: "AI Resume Parser",
    description: "Upload your resume and our AI instantly extracts skills, technologies, and frameworks to build your personalized workspace.",
    icon: "FileSearch",
  },
  {
    title: "Smart Question Bank",
    description: "Curated interview questions organized by technology, difficulty, and frequency. Add your own or let AI generate them.",
    icon: "Brain",
  },
  {
    title: "Mock Interviews",
    description: "Practice with AI-powered mock interviews. Get scored on accuracy, completeness, and communication.",
    icon: "Mic",
  },
  {
    title: "Spaced Repetition",
    description: "Never forget what you've learned. Our smart revision system schedules reviews at optimal intervals.",
    icon: "RotateCcw",
  },
  {
    title: "Learning Roadmap",
    description: "AI generates a personalized learning path based on your skills and target roles.",
    icon: "Map",
  },
  {
    title: "Community Library",
    description: "Share questions with the community. Like, bookmark, and save the best ones to your vault.",
    icon: "Users",
  },
] as const;
