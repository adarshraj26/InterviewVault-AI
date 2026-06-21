import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export const geminiProModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-preview-05-20",
});
/**
 * Automatically retries an asynchronous API operation if it fails due to a rate limit / quota block.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1500
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;
      const msg = error?.message || String(error);
      const isRateLimit =
        msg.includes("Quota exceeded") ||
        msg.includes("rate-limits") ||
        msg.includes("rate limit") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("429");

      if (!isRateLimit || retries > maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = initialDelay * Math.pow(2, retries - 1);
      
      // Attempt to extract delay directly from response if present
      const delayMatch = msg.match(/retry in ([\d.]+)(s?)/i) || msg.match(/retryDelay"?\s*:\s*"?([\d.]+)(s?)/i);
      if (delayMatch) {
        const parsedDelaySec = parseFloat(delayMatch[1]);
        if (!isNaN(parsedDelaySec)) {
          // Add 500ms safety buffer
          const extractedDelayMs = parsedDelaySec * 1000 + 500;
          if (extractedDelayMs < 12000) {
            delay = extractedDelayMs;
          }
        }
      }

      console.warn(
        `Gemini API rate limit hit. Retrying attempt ${retries}/${maxRetries} after ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Generate structured JSON output from Gemini
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  options?: { usePro?: boolean }
): Promise<T> {
  const model = options?.usePro ? geminiProModel : geminiModel;
  
  return retryWithBackoff(async () => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const text = result.response.text();
    return JSON.parse(text) as T;
  });
}

/**
 * Generate text output from Gemini
 */
export async function generateTextOutput(
  prompt: string,
  options?: { usePro?: boolean }
): Promise<string> {
  const model = options?.usePro ? geminiProModel : geminiModel;
  
  return retryWithBackoff(async () => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    return result.response.text();
  });
}

/**
 * Resume skill extraction prompt
 */
export function buildResumeParsingPrompt(resumeText: string): string {
  return `Analyze the following resume text and extract all technical skills, technologies, frameworks, databases, tools, and programming languages mentioned.

Return a JSON object with these categories:
{
  "languages": ["JavaScript", "Python", ...],
  "frameworks": ["React.js", "Node.js", "Express.js", ...],
  "databases": ["MongoDB", "MySQL", "PostgreSQL", ...],
  "tools": ["Git", "Docker", "AWS", ...],
  "other": ["REST API", "GraphQL", ...]
}

Only include actual technical skills. Be specific (e.g., "React.js" not just "React"). Remove duplicates.

Resume text:
${resumeText}`;
}

/**
 * Question generation prompt
 */
export function buildQuestionGenerationPrompt(
  technology: string,
  count: number = 10
): string {
  return `Generate ${count} top interview questions for ${technology}. 

For each question, provide:
- title: The interview question
- answer: A comprehensive answer (2-4 paragraphs)
- codeExample: A relevant code example if applicable (otherwise null)
- codeLanguage: The programming language for the code example (otherwise null)
- difficulty: "EASY", "MEDIUM", or "HARD"
- interviewFrequency: "RARE", "COMMON", or "VERY_COMMON"
- tags: Array of applicable tags from ["BEGINNER", "INTERMEDIATE", "ADVANCED", "FREQUENTLY_ASKED"]
- followUpQuestions: Array of 2-3 follow-up questions

Return a JSON object:
{
  "questions": [
    {
      "title": "...",
      "answer": "...",
      "codeExample": "...",
      "codeLanguage": "...",
      "difficulty": "...",
      "interviewFrequency": "...",
      "tags": [...],
      "followUpQuestions": [...]
    }
  ]
}

Focus on questions that are commonly asked in real technical interviews. Mix fundamental and advanced topics. Include practical code examples where relevant.`;
}

/**
 * Mock interview question generation
 */
export function buildMockInterviewPrompt(
  technology: string,
  difficulty: string,
  count: number = 5
): string {
  return `Generate ${count} interview questions for a ${difficulty} difficulty mock interview about ${technology}.

Return JSON:
{
  "questions": [
    {
      "question": "The interview question",
      "expectedAnswer": "The ideal answer a candidate should give"
    }
  ]
}

Make questions progressively harder. Include a mix of conceptual and practical questions.`;
}

/**
 * Answer evaluation prompt
 */
export function buildAnswerEvaluationPrompt(
  question: string,
  expectedAnswer: string,
  userAnswer: string
): string {
  return `Evaluate this interview answer.

Question: ${question}

Expected Answer: ${expectedAnswer}

Candidate's Answer: ${userAnswer}

Rate the answer on these criteria (0-100):
- accuracy: How correct is the answer?
- completeness: How comprehensive is the answer?
- communication: How well is the answer communicated?

Provide brief feedback and areas of improvement.

Return JSON:
{
  "accuracy": number,
  "completeness": number,
  "communication": number,
  "score": number (overall 0-100),
  "feedback": "string",
  "areasOfImprovement": ["string"]
}`;
}

/**
 * Gap analysis prompt
 */
export function buildGapAnalysisPrompt(skills: string[]): string {
  return `Analyze these technical skills from a developer's resume and identify gaps for interview preparation:

Skills: ${skills.join(", ")}

Return JSON:
{
  "missingConcepts": ["Important concepts within their technologies they should know"],
  "weakTechnologies": ["Technologies commonly paired with their stack that they're missing"],
  "frequentlyAskedNotCovered": ["Common interview topics in their domain not covered by their skills"],
  "recommendations": ["Specific actionable recommendations for improvement"]
}

Be specific and actionable. Focus on what's commonly asked in FAANG/top-tier company interviews.`;
}

/**
 * Learning roadmap prompt
 */
export function buildRoadmapPrompt(skills: string[]): string {
  return `Create a personalized learning roadmap for a developer with these skills:

Skills: ${skills.join(", ")}

Return JSON:
{
  "steps": [
    {
      "order": 1,
      "technology": "Technology name",
      "topics": ["Topic 1", "Topic 2"],
      "estimatedHours": 10,
      "resources": ["Resource suggestion 1"]
    }
  ]
}

Order from foundational to advanced. Include estimated hours for each step. Maximum 8 steps.`;
}

/**
 * Markdown questions parsing prompt
 */
export function buildMarkdownQuestionsParsingPrompt(markdownText: string): string {
  return `Analyze the following markdown text containing interview questions and answers. The questions can be from a single tech stack or mixed tech stacks.
  
Follow these Question Detection and Over-splitting Prevention Rules strictly:
1. Detect ONLY genuine, top-level interview questions (typically H1 headings starting with # or H2 headings starting with ## representing a complete question).
2. NEVER create separate questions from subsections, examples, code blocks, lists, explanations, or notes.
3. Every subheading under a question (such as ### Example, ### How It Works, ### Advantages, ### Disadvantages, ### Interview Tip, ### Best Practice, ### Real World Use Case, ### Common Mistakes, ### Note, ### Code Snippet) MUST remain part of the current question's answer. Do not split it.
4. Markdown tables, bullet lists, numbered lists, blockquotes, and code blocks MUST remain attached to the current answer.
5. Everything between "# Question A" and "# Question B" belongs entirely to Question A's answer.

For each genuine question, extract:
- title: The interview question text (clean, concise, without index numbers)
- answer: A comprehensive answer containing all the text, explanations, subheadings (e.g. ### Example), lists, tables, and notes belonging to this question. Formatted as clean markdown.
- codeExample: The main relevant code example/snippet if present in the question/answer, otherwise null (clean code, no markdown fence backticks inside the string)
- codeLanguage: The programming language for the code example (e.g. "javascript", "typescript", "python", "sql") or null if none
- difficulty: The difficulty level. Must be one of: "EASY", "MEDIUM", or "HARD"
- interviewFrequency: Estimate how frequently this is asked. Must be one of: "RARE", "COMMON", or "VERY_COMMON"
- tags: Array of tags. Filter from: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "FREQUENTLY_ASKED"]. Empty array if none apply.
- technology: The specific technology category (e.g. "JavaScript", "React.js", "Python", "SQL", "Docker", "Node.js"). Keep the name clean, standard, and capitalized correctly (e.g., "JavaScript" instead of "js" or "javascript").

Return a JSON object with a single "questions" field containing the array of parsed questions:
{
  "questions": [
    {
      "title": "...",
      "answer": "...",
      "codeExample": "...",
      "codeLanguage": "...",
      "difficulty": "...",
      "interviewFrequency": "...",
      "tags": [...],
      "technology": "..."
    }
  ]
}

Only return a valid JSON object matching the schema. Parse all questions in the text. Do not truncate the list.

Markdown text to parse:
${markdownText}`;
}

/**
 * Prompt to parse unstructured documents/files/lists to extract questions (supporting empty answers)
 */
export function buildQuestionsListParsingPrompt(text: string): string {
  return `Analyze the following text (which could be a markdown file, raw text, or text extracted from a PDF/DOCX document). It contains a list of interview questions.
  Some questions might have answers under them, and some might just be a list of question titles (e.g., a numbered list of questions without answers).
  
  Extract all the questions. If a question does not have an answer in the text, leave the "answer" field as a null or empty string. Do NOT write your own answers; only extract what is present in the text.
  
  For each question, extract:
  - title: The question text (clean, concise, without index numbers)
  - answer: The answer explanation text if present in the source text (otherwise null or empty string)
  - codeExample: Any code example associated with the question/answer if present in the source text (otherwise null)
  - codeLanguage: The programming language for the code example (e.g. "cpp", "javascript", "python") or null if none
  - difficulty: "EASY", "MEDIUM", or "HARD" (estimate if not specified)
  - interviewFrequency: "RARE", "COMMON", or "VERY_COMMON" (estimate if not specified)
  - tags: Array of tags from ["BEGINNER", "INTERMEDIATE", "ADVANCED", "FREQUENTLY_ASKED"] (estimate if not specified)
  
  Return a JSON object:
  {
    "questions": [
      {
        "title": "...",
        "answer": "...",
        "codeExample": "...",
        "codeLanguage": "...",
        "difficulty": "...",
        "interviewFrequency": "...",
        "tags": [...]
      }
    ]
  }
  
  Only return a valid JSON object. Extract all questions listed.
  
  Text to parse:
  ${text}`;
}

/**
 * Prompt to format/beautify an answer using AI
 */
export function buildFormatAnswerPrompt(answer: string, questionTitle: string): string {
  return `You are an expert technical interviewer and editor. Format and improve the readability of the following interview answer for the question: "${questionTitle}".

Follow these formatting rules strictly:
1. PRESERVE the original meaning, technical accuracy, any code examples, notes, and interview tips. Do not omit any core explanations or information.
2. IMPROVE headings, paragraph spacing, and overall structure.
3. Use proper markdown (e.g. bolding key terms, using bullet lists or numbered steps, and markdown tables for comparisons where appropriate).
4. Do NOT wrap code blocks in double backtick fences inside the markdown block if they already have one, or make sure code blocks are correctly formatted with syntax highlighting languages (e.g. \`\`\`javascript).
5. Ensure there is logical spacing between sections and clear paragraphs for readability.
6. The output must be valid markdown that is easy to read and ready for candidates to prepare with. Do not output any chat wrapper or conversational intro/outro text, just output the formatted markdown content.

Original Answer content to format:
${answer}`;
}

/**
 * Parses and returns a user-friendly error message from a raw Gemini API error.
 */
export function getFriendlyAIError(error: any): string {
  const msg = error?.message || String(error);
  
  if (
    msg.includes("Quota exceeded") || 
    msg.includes("rate-limits") || 
    msg.includes("rate limit") || 
    msg.includes("RESOURCE_EXHAUSTED") || 
    msg.includes("429")
  ) {
    // Try to extract exact retry delay time (e.g. 57s) from the exception text
    const delayMatch = msg.match(/retry in ([\d.]+)(s?)/i) || msg.match(/retryDelay"?\s*:\s*"?([\d.]+)(s?)/i);
    let delayText = "";
    if (delayMatch) {
      const num = parseFloat(delayMatch[1]);
      if (!isNaN(num)) {
        delayText = ` Please retry in ${num.toFixed(1)}s.`;
      } else {
        delayText = ` Please retry in ${delayMatch[1]}${delayMatch[2] || "s"}.`;
      }
    } else {
      delayText = " Please try again in a minute.";
    }
    return `AI quota exceeded for the free tier.${delayText}`;
  }
  
  if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID") || msg.includes("API key not found")) {
    return "Gemini API key is invalid or not found. Please check your environment variables.";
  }
  
  if (msg.includes("blocked") || msg.includes("safety") || msg.includes("SAFETY")) {
    return "AI generation was blocked by safety filters. Please revise the answer content.";
  }

  // If error message is very long/unfriendly, return a clean message
  if (msg.length > 150) {
    return "AI service is currently busy or rate-limited. Please wait a moment and try again.";
  }
  
  return msg;
}


