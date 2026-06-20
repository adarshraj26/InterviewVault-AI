"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Difficulty, InterviewFrequency } from "@prisma/client";
import { createTechnology } from "./technologies";

// Slugify function
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export interface ParsedQuestion {
  title: string;
  answer?: string;
  codeExample?: string | null;
  codeLanguage?: string | null;
  difficulty?: string;
  interviewFrequency?: string;
  tags?: string[];
  technology?: string;
}

// Guess technology based on words in title/answer
function guessTechnology(title: string, answer: string): string {
  const combined = `${title} ${answer}`.toLowerCase();
  
  if (combined.includes("c++") || combined.includes("cpp") || combined.includes("destructor") || combined.includes("virtual function") || combined.includes("stl ") || combined.includes("template class")) {
    return "C++";
  }
  if (combined.includes("java") || combined.includes("jvm") || combined.includes("throw and throws") || combined.includes("throws?") || combined.includes("throws ") || combined.includes("hashmap") || combined.includes("hashtable") || combined.includes("multithreading") || combined.includes("thread") || combined.includes("garbage collection") || combined.includes("abstract class") || combined.includes("interface vs")) {
    return "Java";
  }
  if (combined.includes("react") || combined.includes("useeffect") || combined.includes("usestate") || combined.includes("usememo") || combined.includes("jsx")) {
    return "React.js";
  }
  if (combined.includes("nextjs") || combined.includes("next.js")) {
    return "Next.js";
  }
  if (combined.includes("typescript") || combined.includes("ts interface") || combined.includes("tsconfig")) {
    return "TypeScript";
  }
  if (combined.includes("javascript") || combined.includes("closure") || combined.includes("promise") || combined.includes("async/await") || combined.includes("prototype") || combined.includes("es6")) {
    return "JavaScript";
  }
  if (combined.includes("node.js") || combined.includes("nodejs") || combined.includes("express.js") || combined.includes("expressjs")) {
    return "Node.js";
  }
  if (combined.includes("python") || combined.includes("django") || combined.includes("flask") || combined.includes("pip ")) {
    return "Python";
  }
  if (combined.includes("rust") || combined.includes("borrow checker") || combined.includes("cargo")) {
    return "Rust";
  }
  if (combined.includes("golang") || combined.includes("goroutine") || combined.includes("go channel")) {
    return "Go";
  }
  if (combined.includes("swift") || combined.includes("ios development") || combined.includes("xcode")) {
    return "Swift";
  }
  if (combined.includes("kotlin") || combined.includes("android development")) {
    return "Kotlin";
  }
  if (combined.includes("c#") || combined.includes(".net") || combined.includes("asp.net")) {
    return "C#";
  }
  if (combined.includes("sql") || combined.includes("postgresql") || combined.includes("mysql") || combined.includes("database") || combined.includes("mongodb") || combined.includes("prisma")) {
    return "SQL & Databases";
  }
  if (combined.includes("docker") || combined.includes("kubernetes") || combined.includes("k8s") || combined.includes("container")) {
    return "DevOps & Cloud";
  }
  if (combined.includes("css") || combined.includes("html") || combined.includes("tailwind")) {
    return "HTML & CSS";
  }
  
  return "General";
}

// Helper to check if a header represents a genuine question
function isQuestionHeading(title: string): boolean {
  const clean = title.trim().toLowerCase().replace(/^[0-9.\s#\-\)]+/, "");
  
  // If it ends with a question mark, it's definitely a question
  if (clean.endsWith("?")) return true;
  
  // Check common question starting patterns
  const questionStarts = [
    "what", "how", "why", "explain", "describe", "compare", "difference", 
    "is", "are", "write", "implement", "create", "design", "can you", 
    "could you", "tell me", "when to", "where to", "which", "who", "whom"
  ];
  
  if (questionStarts.some(word => clean.startsWith(word + " ") || clean.startsWith(word + "'s"))) {
    return true;
  }
  
  // Common subsection titles to exclude
  const commonSubsections = [
    "how it works", "internal working", "example", "examples", "advantages", "disadvantages",
    "interview tip", "interview tips", "best practice", "best practices", "real world use case",
    "real-world use case", "use case", "use cases", "common mistakes", "common mistake",
    "note", "important", "remember", "summary", "references", "conclusion", "solution",
    "explanation", "pros", "cons", "pros & cons", "pros and cons", "code example", "code examples",
    "code snippet", "code snippets", "usage", "why use it", "limitations", "tips",
    "output", "expected output", "explanation", "key takeaway", "key takeaways", "working"
  ];
  
  if (commonSubsections.some(sub => clean === sub || clean.startsWith(sub + " ") || clean.startsWith(sub + ":") || (/^[a-z]+ \d+$/.test(clean) && clean.startsWith(sub)))) {
    return false;
  }
  
  return true;
}

// Validation merging step to combine suspiciously short questions / sub-sections into the previous question
function postProcessMergeQuestions(questions: ParsedQuestion[]): ParsedQuestion[] {
  if (questions.length <= 1) return questions;

  const result: ParsedQuestion[] = [];
  
  for (const q of questions) {
    const titleClean = q.title.trim().toLowerCase().replace(/^[0-9.\s#\-\)]+/, "");
    
    const commonSubsections = [
      "how it works", "internal working", "example", "examples", "advantages", "disadvantages",
      "interview tip", "interview tips", "best practice", "best practices", "real world use case",
      "real-world use case", "use case", "use cases", "common mistakes", "common mistake",
      "note", "notes", "important", "remember", "summary", "references", "conclusion", "solution",
      "explanation", "pros", "cons", "pros & cons", "pros and cons", "code example", "code examples",
      "code snippet", "code snippets", "usage", "why use it", "limitations", "tips",
      "output", "expected output", "explanation", "key takeaway", "key takeaways", "working"
    ];
    
    // Check if question is suspiciously a sub-section
    const isSuspicious = 
      commonSubsections.some(sub => titleClean === sub || titleClean.startsWith(sub + " ") || titleClean.startsWith(sub + ":")) ||
      (q.title.split(/\s+/).length <= 3 && !q.title.endsWith("?") && !/^(what|how|why|explain|is|are|write|implement|design)/i.test(q.title));

    if (isSuspicious && result.length > 0) {
      const prev = result[result.length - 1];
      let mergedAnswer = prev.answer || "";
      mergedAnswer += `\n\n### ${q.title}\n\n${q.answer || ""}`;
      
      if (q.codeExample) {
        if (!prev.codeExample) {
          prev.codeExample = q.codeExample;
          prev.codeLanguage = q.codeLanguage;
        } else {
          // Append code snippet directly to the answer block
          mergedAnswer += `\n\n\`\`\`${q.codeLanguage || "javascript"}\n${q.codeExample}\n\`\`\``;
        }
      }
      
      prev.answer = mergedAnswer;
    } else {
      result.push(q);
    }
  }
  
  return result;
}

// Local markdown parser fallback
function fallbackMarkdownParser(text: string): ParsedQuestion[] {
  const lines = text.split(/\r?\n/);
  const parsedQuestions: ParsedQuestion[] = [];
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentAnswerLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        if (currentQuestion) {
          currentQuestion.codeExample = codeBlockLines.join("\n");
          currentQuestion.codeLanguage = codeBlockLang || "javascript";
        }
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const isExplicitQ = trimmed.startsWith("**Question:**") || 
                        trimmed.startsWith("**Q:**") || 
                        /^(?:Q|Question|Q\d+|Question\d+)\s*:/i.test(trimmed);

    let isQuestionHeader = false;
    let cleanTitle = "";

    if (isExplicitQ) {
      isQuestionHeader = true;
      if (trimmed.startsWith("**Question:**")) {
        cleanTitle = trimmed.replace(/^\*\*Question:\*\*\s*/i, "");
      } else if (trimmed.startsWith("**Q:**")) {
        cleanTitle = trimmed.replace(/^\*\*Q:\*\*\s*/i, "");
      } else {
        cleanTitle = trimmed.replace(/^(?:Q|Question|Q\d+|Question\d+)\s*:\s*/i, "");
      }
    } else {
      // H1 always triggers a question. H2 triggers a question if it represents a real question title.
      // H3+ (###) never triggers a question and is always treated as part of the answer text.
      const isH1 = line.startsWith("# ");
      const isH2 = line.startsWith("## ");
      if (isH1 || isH2) {
        const rawTitle = line.replace(/^#+\s*/, "").trim();
        if (isH1 || isQuestionHeading(rawTitle)) {
          isQuestionHeader = true;
          cleanTitle = rawTitle;
        }
      }
    }

    if (isQuestionHeader) {
      if (currentQuestion && currentQuestion.title) {
        currentQuestion.answer = currentAnswerLines.join("\n").trim();
        parsedQuestions.push(currentQuestion as ParsedQuestion);
      }

      cleanTitle = cleanTitle.replace(/^\d+[\s.)-]+\s*/, "").trim();

      currentQuestion = {
        title: cleanTitle,
        answer: "",
        codeExample: null,
        codeLanguage: null,
        difficulty: "MEDIUM",
        interviewFrequency: "COMMON",
        tags: ["INTERMEDIATE"],
        technology: "General",
      };
      currentAnswerLines = [];
    } else {
      if (currentQuestion) {
        let cleanLine = line;
        if (trimmed.startsWith("**Answer:**")) {
          cleanLine = trimmed.replace(/^\*\*Answer:\*\*\s*/i, "");
        } else if (trimmed.startsWith("A:")) {
          cleanLine = trimmed.replace(/^A:\s*/i, "");
        }
        currentAnswerLines.push(cleanLine);
      }
    }
  }

  if (currentQuestion && currentQuestion.title) {
    currentQuestion.answer = currentAnswerLines.join("\n").trim();
    parsedQuestions.push(currentQuestion as ParsedQuestion);
  }

  // Guess technologies
  parsedQuestions.forEach(q => {
    q.technology = guessTechnology(q.title, q.answer || "");
  });

  return parsedQuestions;
}

/**
 * Action to parse bulk text or markdown content into a list of structured questions using AI (Gemini) or a regex fallback.
 */
export async function parseBulkQuestionsAction(text: string, overrideTech?: string, autoFormat?: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!text || !text.trim()) {
    return { error: "No content provided to parse" };
  }

  try {
    let parsed: { questions: ParsedQuestion[] } | null = null;
    
    try {
      const { generateStructuredOutput, buildMarkdownQuestionsParsingPrompt } = require("@/lib/ai");
      const prompt = buildMarkdownQuestionsParsingPrompt(text);
      parsed = (await generateStructuredOutput(prompt)) as { questions: ParsedQuestion[] };
    } catch (apiError) {
      console.warn("AI bulk parsing failed, using fallback parser:", apiError);
    }

    let questions = parsed && parsed.questions && parsed.questions.length > 0
      ? parsed.questions
      : fallbackMarkdownParser(text);

    // Apply the over-splitting validation/cleanup merge step
    questions = postProcessMergeQuestions(questions);

    if (overrideTech) {
      questions = questions.map(q => ({
        ...q,
        technology: overrideTech,
      }));
    }

    // Auto format answers before preview if enabled
    // Uses local markdownToHtml conversion (instant) instead of per-question AI calls
    if (autoFormat && questions.length > 0) {
      const { markdownToHtml } = require("@/lib/markdown");
      
      for (const q of questions) {
        if (q.answer) {
          try {
            q.answer = markdownToHtml(q.answer.trim());
          } catch (formatErr) {
            console.warn(`Failed to format question "${q.title}":`, formatErr);
          }
        }
      }
    }

    return { success: true, questions };

  } catch (error: any) {
    console.error("Bulk parsing error:", error);
    const { getFriendlyAIError } = require("@/lib/ai");
    return { error: getFriendlyAIError(error) };
  }
}

/**
 * Action to check for existing questions with matching/similar titles for the current user.
 */
export async function checkDuplicateQuestionsAction(titles: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!titles || titles.length === 0) {
    return { success: true, duplicates: [] };
  }

  try {
    const duplicates = await db.question.findMany({
      where: {
        userId: session.user.id,
        title: {
          in: titles,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        title: true,
        technologyId: true,
        technology: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return { success: true, duplicates };
  } catch (error: any) {
    console.error("Duplicate check error:", error);
    return { error: "Failed to check duplicates" };
  }
}

interface ImportQuestionInput {
  title: string;
  answer?: string;
  codeExample?: string | null;
  codeLanguage?: string | null;
  difficulty?: string;
  interviewFrequency?: string;
  tags?: string[];
  technology: string;
  duplicateId?: string;
  importStrategy: "insert" | "skip" | "replace" | "keep";
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags || !Array.isArray(tags)) return ["INTERMEDIATE"];
  const result: string[] = [];
  
  for (const tag of tags) {
    const cleaned = tag.trim();
    if (cleaned) {
      result.push(cleaned);
    }
  }
  
  return result.length > 0 ? result : ["INTERMEDIATE"];
}

function normalizeDifficulty(diff?: string): Difficulty {
  const d = (diff || "").toUpperCase();
  if (d === "EASY") return Difficulty.EASY;
  if (d === "HARD") return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

function normalizeFrequency(freq?: string): InterviewFrequency {
  const f = (freq || "").toUpperCase().replace(/\s+/g, "_");
  if (f === "RARE") return InterviewFrequency.RARE;
  if (f === "VERY_COMMON" || f === "VERYCOMMON") return InterviewFrequency.VERY_COMMON;
  return InterviewFrequency.COMMON;
}

/**
 * Action to run the final bulk import. Handles skipping, replacing, or keeping both duplicate records.
 */
export async function bulkImportQuestionsAction(questions: ImportQuestionInput[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const techCache: Record<string, string> = {};
    let workspacesCreatedCount = 0;
    let importedCount = 0;
    let skippedCount = 0;
    const importedByWorkspace: Record<string, number> = {};

    for (const q of questions) {
      if (q.importStrategy === "skip") {
        skippedCount++;
        continue;
      }

      const techName = q.technology || "General";
      const slug = slugify(techName);
      let techId = techCache[slug];

      if (!techId) {
        // Resolve technology workspace
        const existingTech = await db.technology.findUnique({
          where: {
            userId_slug: {
              userId: session.user.id,
              slug,
            },
          },
        });

        if (existingTech) {
          techId = existingTech.id;
          techCache[slug] = techId;
        } else {
          // Create workspace
          const createRes = await createTechnology(techName, `Imported workspace for ${techName} preparation.`);
          if (createRes.success && createRes.technology) {
            techId = createRes.technology.id;
            techCache[slug] = techId;
            workspacesCreatedCount++;
          } else {
            // Fallback to general workspace
            const generalSlug = slugify("General");
            const existingGeneral = await db.technology.findUnique({
              where: {
                userId_slug: {
                  userId: session.user.id,
                  slug: generalSlug,
                },
              },
            });
            if (existingGeneral) {
              techId = existingGeneral.id;
              techCache[generalSlug] = techId;
            } else {
              const genCreate = await createTechnology("General", "General workspace for miscellaneous topics.");
              if (genCreate.success && genCreate.technology) {
                techId = genCreate.technology.id;
                techCache[generalSlug] = techId;
                workspacesCreatedCount++;
              } else {
                throw new Error("Failed to resolve technology workspace");
              }
            }
          }
        }
      }

      // If replace strategy is chosen and duplicateId is provided, delete the original
      if (q.importStrategy === "replace" && q.duplicateId) {
        try {
          await db.question.delete({
            where: {
              id: q.duplicateId,
              userId: session.user.id,
            },
          });
        } catch (delError) {
          console.warn(`Could not delete duplicate question ${q.duplicateId}:`, delError);
        }
      }

      // Insert question
      await db.question.create({
        data: {
          title: q.title,
          answer: q.answer || "",
          codeExample: q.codeExample || null,
          codeLanguage: q.codeLanguage || null,
          difficulty: normalizeDifficulty(q.difficulty),
          interviewFrequency: normalizeFrequency(q.interviewFrequency),
          tags: normalizeTags(q.tags),
          technologyId: techId,
          userId: session.user.id,
        },
      });

      importedCount++;
      importedByWorkspace[techName] = (importedByWorkspace[techName] || 0) + 1;
    }

    revalidatePath("/dashboard");
    revalidatePath("/technologies");
    revalidatePath("/revision");

    return {
      success: true,
      importedCount,
      skippedCount,
      workspacesCreatedCount,
      importedByWorkspace,
    };
  } catch (error: any) {
    console.error("Bulk import execution error:", error);
    return { error: error.message || "Failed to execute bulk import" };
  }
}

/**
 * Action to fetch all question titles for the user to perform client-side duplicate checking.
 */
export async function getAllUserQuestionTitlesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const questions = await db.question.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        technology: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return { success: true, questions };
  } catch (error: any) {
    console.error("Failed to fetch all user question titles:", error);
    return { error: "Failed to load questions for duplicate check" };
  }
}
