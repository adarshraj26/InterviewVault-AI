// ═══════════════════════════════════════════════════════════
// InterviewVault AI — Type Definitions
// ═══════════════════════════════════════════════════════════

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type InterviewFrequency = "RARE" | "COMMON" | "VERY_COMMON";
export type RevisionStatus = "NOT_STARTED" | "LEARNING" | "REVISED_ONCE" | "MASTERED";
export type QuestionTag = string;
export type UserRole = "USER" | "ADMIN";
export type NoteType = "INTERVIEW_NOTES" | "CHEAT_SHEET" | "QUICK_REVISION";
export type SubscriptionPlan = "FREE" | "PRO";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: Date;
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  questionsCount: number;
  masteredCount: number;
  userId: string;
  createdAt: Date;
}

export interface Question {
  id: string;
  title: string;
  answer: string | null;
  codeExample: string | null;
  codeLanguage: string | null;
  theoryExample: string | null;
  difficulty: Difficulty;
  interviewFrequency: InterviewFrequency;
  tags: QuestionTag[];
  revisionStatus: RevisionStatus;
  isPublic: boolean;
  technologyId: string;
  technology?: Technology;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockInterviewResult {
  id: string;
  technology: string;
  difficulty: Difficulty;
  totalQuestions: number;
  score: number;
  accuracy: number;
  completeness: number;
  communication: number;
  feedback: string;
  areasOfImprovement: string[];
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  technologyId: string | null;
  technology?: Technology;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalTechnologies: number;
  totalQuestions: number;
  questionsRevised: number;
  upcomingRevisions: number;
  readinessScore: number;
  mockInterviewsTaken: number;
  averageMockScore: number;
}

export interface SkillExtraction {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  other: string[];
}

export interface AIGeneratedQuestion {
  title: string;
  answer: string;
  codeExample?: string;
  codeLanguage?: string;
  difficulty: Difficulty;
  interviewFrequency: InterviewFrequency;
  tags: QuestionTag[];
  followUpQuestions?: string[];
}

export interface GapAnalysis {
  missingConcepts: string[];
  weakTechnologies: string[];
  frequentlyAskedNotCovered: string[];
  recommendations: string[];
}

export interface LearningRoadmap {
  steps: {
    order: number;
    technology: string;
    topics: string[];
    estimatedHours: number;
    resources: string[];
  }[];
}
