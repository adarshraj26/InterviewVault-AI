"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Difficulty, InterviewFrequency, RevisionStatus, QuestionTagEnum } from "@prisma/client";
import { createTechnology } from "./technologies";

export async function getQuestions(technologyId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await db.question.findMany({
    where: {
      userId: session.user.id,
      ...(technologyId ? { technologyId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createQuestion(data: {
  title: string;
  answer?: string;
  codeExample?: string;
  codeLanguage?: string;
  difficulty: Difficulty;
  interviewFrequency: InterviewFrequency;
  tags: QuestionTagEnum[];
  technologyId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const question = await db.question.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    revalidatePath("/technologies");
    revalidatePath("/revision");
    revalidatePath("/dashboard");
    return { success: true, question };
  } catch (error) {
    console.error("Create question error:", error);
    return { error: "Failed to create question" };
  }
}

export async function updateQuestion(
  id: string,
  data: {
    title?: string;
    answer?: string;
    codeExample?: string;
    codeLanguage?: string;
    difficulty?: Difficulty;
    interviewFrequency?: InterviewFrequency;
    tags?: QuestionTagEnum[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const question = await db.question.update({
      where: {
        id,
        userId: session.user.id,
      },
      data,
    });

    revalidatePath("/technologies");
    revalidatePath("/revision");
    return { success: true, question };
  } catch (error) {
    console.error("Update question error:", error);
    return { error: "Failed to update question" };
  }
}

export async function deleteQuestion(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db.question.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    revalidatePath("/technologies");
    revalidatePath("/revision");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete question error:", error);
    return { error: "Failed to delete question" };
  }
}

export async function toggleQuestionPublic(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const question = await db.question.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!question) {
      return { error: "Question not found" };
    }

    const updated = await db.question.update({
      where: { id },
      data: { isPublic: !question.isPublic },
    });

    revalidatePath("/community");
    revalidatePath("/technologies");
    return { success: true, question: updated };
  } catch (error) {
    console.error("Toggle public error:", error);
    return { error: "Failed to change question visibility" };
  }
}

// Spaced Repetition (SM-2 simplified implementation)
export async function recordRevision(questionId: string, quality: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Quality: 0 to 5
    // 0: "Total blackout", 1: "Incorrect response, but remembered upon seeing it", 2: "Incorrect response, but easy to recall", 
    // 3: "Correct response recalled with serious difficulty", 4: "Correct response after a hesitation", 5: "Perfect response"
    
    // Get last revision record or set defaults
    const lastRecord = await db.revisionRecord.findFirst({
      where: { questionId, userId: session.user.id },
      orderBy: { revisedAt: "desc" },
    });

    let repetitions = lastRecord ? lastRecord.quality >= 3 ? 1 : 0 : 0; // Simple approximation of repetition count
    let interval = 1; // in days
    
    if (quality >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        // approximate previous interval
        const prevIntervalDays = lastRecord?.nextReviewAt 
          ? Math.max(1, Math.round((lastRecord.nextReviewAt.getTime() - lastRecord.revisedAt.getTime()) / (1000 * 60 * 60 * 24)))
          : 1;
        interval = Math.round(prevIntervalDays * 2.5); // Default EF = 2.5
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    // Create revision record
    await db.revisionRecord.create({
      data: {
        questionId,
        userId: session.user.id,
        quality,
        nextReviewAt,
      },
    });

    // Update question status
    let revisionStatus: RevisionStatus = "LEARNING";
    if (quality === 5) {
      revisionStatus = "MASTERED";
    } else if (repetitions > 1) {
      revisionStatus = "REVISED_ONCE";
    }

    await db.question.update({
      where: { id: questionId },
      data: {
        revisionStatus,
      },
    });

    revalidatePath("/revision");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Record revision error:", error);
    return { error: "Failed to record revision" };
  }
}

// Community likes/bookmarks
export async function toggleLikeQuestion(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const existing = await db.like.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId,
        },
      },
    });

    if (existing) {
      await db.like.delete({
        where: { id: existing.id },
      });
    } else {
      await db.like.create({
        data: {
          userId: session.user.id,
          questionId,
        },
      });
    }

    revalidatePath("/community");
    return { success: true };
  } catch (error) {
    console.error("Toggle like error:", error);
    return { error: "Failed to process request" };
  }
}

export async function toggleBookmarkQuestion(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const existing = await db.bookmark.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId,
        },
      },
    });

    if (existing) {
      await db.bookmark.delete({
        where: { id: existing.id },
      });
    } else {
      await db.bookmark.create({
        data: {
          userId: session.user.id,
          questionId,
        },
      });
    }

    revalidatePath("/community");
    revalidatePath("/dashboard");
    revalidatePath("/saved");
    return { success: true };
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    return { error: "Failed to process request" };
  }
}

export async function getSavedQuestions() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const bookmarks = await db.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      question: {
        include: {
          technology: {
            select: { id: true, name: true, slug: true },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  return bookmarks.map((b) => ({
    bookmarkId: b.id,
    bookmarkedAt: b.createdAt,
    ...b.question,
  }));
}

export async function moveQuestionToTechnology(questionId: string, targetTechId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify the question belongs to this user
    const question = await db.question.findUnique({
      where: { id: questionId, userId: session.user.id },
    });
    if (!question) return { error: "Question not found" };

    // Verify the target technology belongs to this user
    const tech = await db.technology.findUnique({
      where: { id: targetTechId, userId: session.user.id },
    });
    if (!tech) return { error: "Technology workspace not found" };

    await db.question.update({
      where: { id: questionId },
      data: { technologyId: targetTechId },
    });

    revalidatePath("/saved");
    revalidatePath("/technologies");
    revalidatePath(`/technologies/${tech.slug}`);
    revalidatePath("/dashboard");
    return { success: true, techName: tech.name };
  } catch (err) {
    console.error("Move question error:", err);
    return { error: "Failed to move question" };
  }
}

export async function generateAIQuestions(technologyId: string, technologyName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const { generateStructuredOutput, buildQuestionGenerationPrompt } = require("@/lib/ai");
    const qPrompt = buildQuestionGenerationPrompt(technologyName, 5);
    
    let qParsed: any = null;
    try {
      qParsed = await generateStructuredOutput(qPrompt);
    } catch (apiError) {
      console.warn("AI Question generation failed, using local fallback generator:", apiError);
    }
    
    if (!qParsed || !qParsed.questions) {
      const fallbackQuestions = [
        {
          title: `Explain performance optimization strategies in ${technologyName}.`,
          answer: `Optimizing ${technologyName} applications involves profiling resource utilization, eliminating redundant operations, caching heavy computations, and applying best coding practices specific to the runtime ecosystem.`,
          codeExample: null,
          codeLanguage: null,
          difficulty: Difficulty.MEDIUM,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.INTERMEDIATE, QuestionTagEnum.FREQUENTLY_ASKED],
          followUpQuestions: ["How do you trace memory leaks?", "What performance metrics are most critical?"]
        },
        {
          title: `What is the difference between synchronous and asynchronous processes in ${technologyName}?`,
          answer: `Synchronous execution blocks subsequent code execution until the current task finishes. Asynchronous execution allows tasks to execute concurrently or non-blockingly, resuming when their callbacks or promises resolve.`,
          codeExample: null,
          codeLanguage: null,
          difficulty: Difficulty.EASY,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.BEGINNER],
          followUpQuestions: ["What concurrency model is used?", "How is error bubbling handled in async code?"]
        }
      ];
      qParsed = { questions: fallbackQuestions };
    }

    const createdQuestions = [];
    for (const q of qParsed.questions) {
      const question = await db.question.create({
        data: {
          title: q.title,
          answer: q.answer,
          codeExample: q.codeExample || undefined,
          codeLanguage: q.codeLanguage || undefined,
          difficulty: q.difficulty,
          interviewFrequency: q.interviewFrequency,
          tags: q.tags,
          technologyId,
          userId: session.user.id,
          followUpQuestions: q.followUpQuestions || [],
        },
      });
      createdQuestions.push(question);
    }

    revalidatePath("/technologies");
    revalidatePath("/revision");
    revalidatePath("/dashboard");
    return { success: true, count: createdQuestions.length };
  } catch (error) {
    console.error("AI question generation error:", error);
    return { error: "Failed to generate questions with AI" };
  }
}

// ─────────────────────────────────────────────────────────────
// ── Markdown Question List Import Feature ─────────────────────
// ─────────────────────────────────────────────────────────────

interface AIParsedQuestion {
  title: string;
  answer: string;
  codeExample: string | null;
  codeLanguage: string | null;
  difficulty: Difficulty;
  interviewFrequency: InterviewFrequency;
  tags: QuestionTagEnum[];
  technology: string;
}

function localSlugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

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

function fallbackMarkdownParser(text: string): AIParsedQuestion[] {
  const lines = text.split(/\r?\n/);
  const parsedQuestions: AIParsedQuestion[] = [];
  let currentQuestion: Partial<AIParsedQuestion> | null = null;
  let currentAnswerLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        if (currentQuestion) {
          currentQuestion.codeExample = codeBlockLines.join("\n");
          currentQuestion.codeLanguage = codeBlockLang || "javascript";
        }
        codeBlockLines = [];
        codeBlockLang = "";
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Check for new question indicator
    // Matches: "## 1. Question Title", "### What is...", "**Question:** What is...", "Q: What is..."
    const isQuestionHeader = 
      line.startsWith("#") || 
      trimmed.startsWith("**Question:**") || 
      trimmed.startsWith("**Q:**") || 
      /^(?:Q|Question|Q\d+|Question\d+)\s*:/i.test(trimmed);

    if (isQuestionHeader) {
      // If we have an active question, save it
      if (currentQuestion && currentQuestion.title) {
        currentQuestion.answer = currentAnswerLines.join("\n").trim();
        parsedQuestions.push(currentQuestion as AIParsedQuestion);
      }

      // Start new question
      let cleanTitle = line;
      if (line.startsWith("#")) {
        cleanTitle = line.replace(/^#+\s*/, "");
      } else if (trimmed.startsWith("**Question:**")) {
        cleanTitle = trimmed.replace(/^\*\*Question:\*\*\s*/i, "");
      } else if (trimmed.startsWith("**Q:**")) {
        cleanTitle = trimmed.replace(/^\*\*Q:\*\*\s*/i, "");
      } else {
        cleanTitle = trimmed.replace(/^(?:Q|Question|Q\d+|Question\d+)\s*:\s*/i, "");
      }

      // Clean up any numbers at start, like "1. What is..." -> "What is..."
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
      // Accumulate answer lines if we have a current question
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

  // Add the last question
  if (currentQuestion && currentQuestion.title) {
    currentQuestion.answer = currentAnswerLines.join("\n").trim();
    parsedQuestions.push(currentQuestion as AIParsedQuestion);
  }

  // Post-process guessed technologies to handle single stack files in fallback parser
  const techCounts: Record<string, number> = {};
  parsedQuestions.forEach(q => {
    const tech = guessTechnology(q.title, q.answer || "");
    q.technology = tech;
    if (tech !== "General") {
      techCounts[tech] = (techCounts[tech] || 0) + 1;
    }
  });

  // Find dominant tech
  let dominantTech = "General";
  let maxCount = 0;
  for (const [tech, count] of Object.entries(techCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantTech = tech;
    }
  }

  const totalQuestions = parsedQuestions.length;
  if (totalQuestions > 0 && (maxCount / totalQuestions) > 0.6) {
    parsedQuestions.forEach(q => {
      if (q.technology === "General") {
        q.technology = dominantTech;
      }
    });
  }

  return parsedQuestions;
}

export async function importMarkdownQuestionsAction(markdownText: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!markdownText || !markdownText.trim()) {
    return { error: "Markdown text is empty" };
  }

  try {
    let parsed: { questions: AIParsedQuestion[] } | null = null;
    
    // 1. Try Gemini parser first
    try {
      const { generateStructuredOutput, buildMarkdownQuestionsParsingPrompt } = require("@/lib/ai");
      const prompt = buildMarkdownQuestionsParsingPrompt(markdownText);
      parsed = (await generateStructuredOutput(prompt)) as { questions: AIParsedQuestion[] };
    } catch (apiError) {
      console.warn("Gemini question list parsing failed, using fallback parser:", apiError);
    }

    // 2. Fall back to local regex/keyword parser if Gemini failed
    const questionsToImport = parsed && parsed.questions && parsed.questions.length > 0
      ? parsed.questions
      : fallbackMarkdownParser(markdownText);

    if (questionsToImport.length === 0) {
      return { error: "Could not find any questions to parse. Ensure your file has questions starting with ##, ###, Q: or **Question:**" };
    }

    // 3. Resolve technologies and insert questions
    const techCache: Record<string, string> = {};
    let workspacesCreatedCount = 0;
    let questionsImportedCount = 0;

    for (const q of questionsToImport) {
      const techName = q.technology || "General";
      const slug = localSlugify(techName);

      let techId = techCache[slug];

      if (!techId) {
        // Find existing technology for this user
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
          // Create new technology workspace
          const createRes = await createTechnology(techName, `Imported workspace for ${techName} preparation.`);
          if (createRes.success && createRes.technology) {
            techId = createRes.technology.id;
            techCache[slug] = techId;
            workspacesCreatedCount++;
          } else {
            // Fallback to General if creation failed
            const generalSlug = localSlugify("General");
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

      // Create the question
      await db.question.create({
        data: {
          title: q.title,
          answer: q.answer,
          codeExample: q.codeExample || undefined,
          codeLanguage: q.codeLanguage || undefined,
          difficulty: q.difficulty || "MEDIUM",
          interviewFrequency: q.interviewFrequency || "COMMON",
          tags: q.tags || ["INTERMEDIATE"],
          technologyId: techId,
          userId: session.user.id,
          followUpQuestions: [],
        },
      });

      questionsImportedCount++;
    }

    revalidatePath("/dashboard");
    revalidatePath("/technologies");
    revalidatePath("/revision");

    return { 
      success: true, 
      questionsImported: questionsImportedCount,
      workspacesCreated: workspacesCreatedCount
    };
  } catch (err) {
    console.error("Import questions error:", err);
    return { error: "Failed to import questions. Please check format." };
  }
}

// ─────────────────────────────────────────────────────────────
// ── Recategorize General Questions ────────────────────────────
// ─────────────────────────────────────────────────────────────

export async function recategorizeGeneralQuestionsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Find the user's "General" technology workspace
    const generalTech = await db.technology.findFirst({
      where: {
        userId: session.user.id,
        slug: "general",
      },
      include: {
        questions: true,
      },
    });

    if (!generalTech || generalTech.questions.length === 0) {
      return { error: "No General workspace found or it has no questions." };
    }

    const techCache: Record<string, string> = {};
    let movedCount = 0;
    let remainCount = 0;
    let workspacesCreated = 0;

    for (const question of generalTech.questions) {
      const guessed = guessTechnology(question.title, question.answer || "");

      // If still General, leave it
      if (guessed === "General") {
        remainCount++;
        continue;
      }

      const slug = localSlugify(guessed);

      // Resolve target technology
      let targetTechId = techCache[slug];
      if (!targetTechId) {
        const existing = await db.technology.findUnique({
          where: {
            userId_slug: {
              userId: session.user.id,
              slug,
            },
          },
        });

        if (existing) {
          targetTechId = existing.id;
        } else {
          const created = await createTechnology(guessed, `Workspace for ${guessed} interview preparation.`);
          if (created.success && created.technology) {
            targetTechId = created.technology.id;
            workspacesCreated++;
          } else {
            // Can't create workspace — leave in General
            remainCount++;
            continue;
          }
        }

        techCache[slug] = targetTechId;
      }

      // Move the question to the resolved workspace
      await db.question.update({
        where: { id: question.id },
        data: { technologyId: targetTechId },
      });

      movedCount++;
    }

    // If General workspace is now empty, delete it
    const remaining = await db.question.count({
      where: { technologyId: generalTech.id },
    });

    if (remaining === 0) {
      await db.technology.delete({ where: { id: generalTech.id } });
    }

    revalidatePath("/technologies");
    revalidatePath("/revision");
    revalidatePath("/dashboard");

    return {
      success: true,
      movedCount,
      remainCount,
      workspacesCreated,
      generalDeleted: remaining === 0,
    };
  } catch (err) {
    console.error("Recategorize error:", err);
    return { error: "Failed to recategorize questions." };
  }
}
