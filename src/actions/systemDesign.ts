"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Difficulty } from "@prisma/client";
import { generateStructuredOutput, buildSystemDesignEvaluationPrompt } from "@/lib/ai";

const SYSTEM_DESIGN_FALLBACKS: Record<string, Record<string, string[]>> = {
  react: {
    EASY: [
      "Design an Autocomplete/Typeahead Search Widget. Focus on debouncing, client-side caching, keyboard accessibility, and API state handling."
    ],
    MEDIUM: [
      "Design an Infinite Scroll Feed (like Instagram or Pinterest). Detail list virtualization, image lazy-loading, state caching, and responsive grid layouts."
    ],
    HARD: [
      "Design a Real-Time Collaborative Rich Text Editor (like Google Docs). Address OT/CRDT conflict resolution, offline syncing, and collaborative cursor sharing."
    ]
  },
  javascript: {
    EASY: [
      "Design a Client-side Pub/Sub Event Emitter supporting once-listeners, namespace wildcards, and clean subscription removal."
    ],
    MEDIUM: [
      "Design a Frontend Analytics SDK. Detail event batching, local persistence (IndexDB/LocalStorage), retry queues, and optimization to prevent main-thread blockage."
    ],
    HARD: [
      "Design a Client-side API Request Orchestrator supporting priority queuing, concurrency limits, auto-retries with backoff, and caching."
    ]
  },
  python: {
    EASY: [
      "Design an API Rate Limiter class using the Token Bucket and Leaky Bucket algorithms."
    ],
    MEDIUM: [
      "Design a distributed Task Queue (like Celery). Cover producer-consumer structures, task serialization, state tracking, and error retries."
    ],
    HARD: [
      "Design a Web Crawler system to index 1 billion pages. Cover scheduling, politeness constraints, duplicate-detection bloom filters, and distributed storage."
    ]
  },
  general: {
    EASY: [
      "Design a distributed URL Shortener (like Bit.ly) with redirection caching and hash collision mitigation."
    ],
    MEDIUM: [
      "Design a distributed Key-Value Cache (like Redis). Address eviction algorithms (LRU/LFU), replication, sharding, and memory-compaction strategies."
    ],
    HARD: [
      "Design a Globally Scalable Video Streaming Platform (like YouTube). Detail ingest transcoding pipelines, global CDN distribution, adaptive bitrate streaming, and storage tiering."
    ]
  }
};

function getFallbackQuestion(tech: string, difficulty: Difficulty): string {
  const normTech = tech.toLowerCase();
  const techKey = normTech.includes("react")
    ? "react"
    : normTech.includes("javascript") || normTech.includes("js")
    ? "javascript"
    : normTech.includes("python")
    ? "python"
    : "general";

  const list = SYSTEM_DESIGN_FALLBACKS[techKey]?.[difficulty] || SYSTEM_DESIGN_FALLBACKS.general[difficulty];
  return list[0];
}

export async function startSystemDesignInterview(technology: string, difficulty: Difficulty) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Generate a creative system design question using AI
    let question = "";
    try {
      const aiPrompt = `Generate a system design interview question for a candidate interviewing for a ${difficulty} difficulty role focused on ${technology}. 
The question should be concise and clearly specify what needs to be designed. E.g. "Design a distributed real-time messaging system like Slack."
Return ONLY the question title/prompt itself. No introductory, conversational, or markdown wrapper text.`;
      
      const response = await generateStructuredOutput<{ question: string }>(
        `Generate a JSON object containing the question.
Schema: { "question": string }
Prompt: ${aiPrompt}`
      );
      if (response && response.question) {
        question = response.question;
      }
    } catch (e) {
      console.warn("AI generation of system design question failed, using local fallback:", e);
    }

    if (!question) {
      question = getFallbackQuestion(technology, difficulty);
    }

    // Save SystemDesignInterview
    const interview = await db.systemDesignInterview.create({
      data: {
        technology,
        difficulty,
        question,
        userId,
        canvasState: JSON.stringify({
          version: 2,
          type: "excalidraw",
          elements: [],
          appState: {
            gridSize: 20,
            viewBackgroundColor: "#0b0f19",
            theme: "dark"
          }
        }),
      }
    });

    revalidatePath("/mock-interview");
    return { interviewId: interview.id };
  } catch (error: any) {
    console.error("Failed to start system design interview:", error);
    return { error: error.message || "Failed to start interview" };
  }
}

export async function saveSystemDesignDraft(
  id: string,
  explanation: string,
  canvasState: string,
  screenshot?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db.systemDesignInterview.update({
      where: { id, userId: session.user.id },
      data: {
        userExplanation: explanation,
        canvasState,
        ...(screenshot ? { screenshot } : {})
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save draft:", error);
    return { error: error.message || "Failed to save draft" };
  }
}

export async function createSystemDesignVersion(
  id: string,
  canvasState: string,
  screenshot?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const interview = await db.systemDesignInterview.findUnique({
      where: { id, userId: session.user.id },
      include: { versions: true }
    });

    if (!interview) {
      return { error: "Interview not found" };
    }

    const nextVer = interview.versions.length + 1;

    const newVersion = await db.systemDesignVersion.create({
      data: {
        interviewId: id,
        canvasState,
        screenshot,
        versionNumber: nextVer
      }
    });

    return { success: true, version: newVersion };
  } catch (error: any) {
    console.error("Failed to create version checkpoint:", error);
    return { error: error.message || "Failed to save version checkpoint" };
  }
}

interface AISystemDesignEvaluation {
  score: number;
  scalability: string;
  highAvailability: string;
  faultTolerance: string;
  caching: string;
  databaseDesign: string;
  apiDesign: string;
  security: string;
  performance: string;
  diagramQuality: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export async function submitSystemDesignEvaluation(
  id: string,
  explanation: string,
  canvasState: string,
  shapesMetadata: string,
  screenshot?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const interview = await db.systemDesignInterview.findUnique({
      where: { id, userId: session.user.id }
    });

    if (!interview) {
      return { error: "Interview not found" };
    }

    // Call Gemini with the explanation and whiteboard shapes metadata
    const prompt = buildSystemDesignEvaluationPrompt(interview.question, explanation, shapesMetadata);
    const evaluation = await generateStructuredOutput<AISystemDesignEvaluation>(prompt, { usePro: true });

    const updated = await db.systemDesignInterview.update({
      where: { id },
      data: {
        userExplanation: explanation,
        canvasState,
        ...(screenshot ? { screenshot } : {}),
        score: evaluation.score,
        scalability: evaluation.scalability,
        highAvailability: evaluation.highAvailability,
        faultTolerance: evaluation.faultTolerance,
        caching: evaluation.caching,
        databaseDesign: evaluation.databaseDesign,
        apiDesign: evaluation.apiDesign,
        security: evaluation.security,
        performance: evaluation.performance,
        diagramQuality: evaluation.diagramQuality,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        improvements: evaluation.improvements,
        completedAt: new Date()
      }
    });

    revalidatePath("/mock-interview");
    return { success: true, evaluation: updated };
  } catch (error: any) {
    console.error("Failed to submit system design evaluation:", error);
    return { error: error.message || "Failed to evaluate system design" };
  }
}
