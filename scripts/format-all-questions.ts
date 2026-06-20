import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { markdownToHtml } from "../src/lib/markdown";

dotenv.config();

let prisma: any;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Track if we hit a rate limit so we can pause before next question
let lastWasRateLimit = false;

function isHtmlFormatted(text: string): boolean {
  // If the answer already contains HTML tags, it's been formatted
  return /<(p|ul|ol|li|h[1-6]|strong|em|code|pre|blockquote)\b/i.test(text);
}

function withTimeout<T>(promise: Promise<T>, ms = 120000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timeout")), ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 6,
  initialDelay = 5000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      const result = await fn();
      lastWasRateLimit = false;
      return result;
    } catch (error: any) {
      retries++;
      const msg = error?.message || String(error);
      const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded") || msg.includes("rate limit");
      const isTransient =
        isRateLimit ||
        msg.includes("rate-limits") ||
        msg.includes("503") ||
        msg.includes("Service Unavailable") ||
        msg.includes("high demand") ||
        msg.includes("502") ||
        msg.includes("Bad Gateway") ||
        msg.includes("timeout") ||
        msg.includes("Timeout") ||
        msg.includes("fetch failed");

      if (!isTransient || retries > maxRetries) {
        throw error;
      }

      if (isRateLimit) {
        lastWasRateLimit = true;
      }

      let delay = initialDelay * Math.pow(2, retries - 1);
      // Cap at 90 seconds per retry
      delay = Math.min(delay, 90000);

      const delayMatch = msg.match(/retry in ([\d.]+)(s?)/i) || msg.match(/retryDelay"?\s*:\s*"?([\d.]+)(s?)/i);
      if (delayMatch) {
        const parsedDelaySec = parseFloat(delayMatch[1]);
        if (!isNaN(parsedDelaySec)) {
          delay = Math.max(delay, parsedDelaySec * 1000 + 1000);
        }
      }

      console.log(`Transient error: "${msg.substring(0, 150)}". Waiting ${(delay/1000).toFixed(1)}s before retry ${retries}/${maxRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function formatAnswer(answer: string, title: string): Promise<string> {
  const prompt = `You are an expert technical interviewer and editor. Format and improve the readability of the following interview answer for the question: "${title}".

Follow these formatting rules strictly:
1. PRESERVE the original meaning, technical accuracy, any code examples, notes, and interview tips. Do not omit any core explanations or information.
2. IMPROVE headings, paragraph spacing, and overall structure.
3. Use proper markdown (e.g. bolding key terms, using bullet lists or numbered steps, and markdown tables for comparisons where appropriate).
4. Do NOT wrap code blocks in double backtick fences inside the markdown block if they already have one, or make sure code blocks are correctly formatted with syntax highlighting languages (e.g. \`\`\`javascript).
5. Ensure there is logical spacing between sections and clear paragraphs for readability.
6. The output must be valid markdown that is easy to read and ready for candidates to prepare with. Do not output any chat wrapper or conversational intro/outro text, just output the formatted markdown content.

Original Answer content to format:
${answer}`;

  return retryWithBackoff(async () => {
    return withTimeout(
      (async () => {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 }
        });
        return result.response.text();
      })(),
      120000
    );
  });
}

async function main() {
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not defined in your environment variables.");
    process.exit(1);
  }

  const { db } = await import("../src/lib/db");
  prisma = db;

  console.log("Fetching questions from database...");
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${questions.length} total questions in database.`);
  
  // Filter questions from index 3 (Question 4) to index 28 (Question 29)
  const targetQuestions = questions.filter((q: any, idx: number) => {
    return idx >= 3 && idx <= 28 && q.answer;
  });

  // Separate already-formatted from pending
  const pendingQuestions = targetQuestions.filter((q: any) => {
    const ans = q.answer || "";
    // Format if it's not HTML OR contains raw markdown remnants like '#' or '**'
    return !isHtmlFormatted(ans) || ans.includes("#") || ans.includes("**");
  });
  const alreadyDone = targetQuestions.length - pendingQuestions.length;

  console.log(`Found ${targetQuestions.length} questions in Q#4–Q#29 range.`);
  console.log(`Already formatted (HTML): ${alreadyDone} — skipping.`);
  console.log(`Pending formatting: ${pendingQuestions.length} questions.\n`);

  if (pendingQuestions.length === 0) {
    console.log("All questions are already formatted! Exiting.");
    return;
  }

  for (let i = 0; i < pendingQuestions.length; i++) {
    const q = pendingQuestions[i];
    const qIndex = questions.findIndex((item: any) => item.id === q.id) + 1;
    console.log(`[${i + 1}/${pendingQuestions.length}] Formatting Q#${qIndex}: "${q.title}"...`);
    
    try {
      // If previous request hit a rate limit, wait extra before next call
      if (lastWasRateLimit && i > 0) {
        const cooldown = 15000;
        console.log(`  (Post rate-limit cooldown: ${cooldown/1000}s...)`);
        await new Promise(resolve => setTimeout(resolve, cooldown));
        lastWasRateLimit = false;
      }

      const markdownOutput = await formatAnswer(q.answer!, q.title);
      const htmlOutput = markdownToHtml(markdownOutput.trim());
      
      await prisma.question.update({
        where: { id: q.id },
        data: { answer: htmlOutput }
      });
      
      console.log(`  ✓ Successfully formatted Q#${qIndex}.`);
      
      // Stagger requests to avoid rate limits
      if (i < pendingQuestions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (err: any) {
      console.error(`  ✗ Failed to format Q#${qIndex}: "${q.title}": ${err.message || err}`);
      // Wait before continuing to next on failure
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log("\nAll questions formatting processing complete!");
}

main()
  .catch((e) => {
    console.error("Migration script error:", e);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
