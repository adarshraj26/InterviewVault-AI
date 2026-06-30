import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Primary model (fresh rate limit quota)
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Lighter fallback model (fresh separate quota pool)
export const geminiFallbackModel = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite",
});

export const geminiProModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
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

async function callGeminiREST(
  modelName: string,
  prompt: string,
  responseMimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: responseMimeType
        ? { responseMimeType, temperature: 0.7 }
        : { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetail = errorJson?.error?.message || errorText;
    } catch (_) {}
    throw new Error(`GoogleGenerativeAI Error: ${response.status} - ${errorDetail}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Invalid response format from Gemini API");
  }
  return text;
}

/**
 * Generate structured JSON output from Gemini
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  options?: { usePro?: boolean }
): Promise<T> {
  const primaryModel = options?.usePro ? "gemini-2.5-pro" : "gemini-2.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  // Try primary model first, fallback to lighter model on rate limit
  try {
    return await retryWithBackoff(async () => {
      const text = await callGeminiREST(primaryModel, prompt, "application/json");
      return JSON.parse(text) as T;
    }, 2, 2000);
  } catch (primaryErr: any) {
    const msg = primaryErr?.message || String(primaryErr);
    const isRateLimit = msg.includes("429") || msg.includes("Quota exceeded") || msg.includes("RESOURCE_EXHAUSTED");
    if (!isRateLimit) throw primaryErr;

    console.warn(`Primary model ${primaryModel} rate limited, trying fallback model ${fallbackModel}...`);
    return await retryWithBackoff(async () => {
      const text = await callGeminiREST(fallbackModel, prompt, "application/json");
      return JSON.parse(text) as T;
    }, 2, 3000);
  }
}

/**
 * Generate text output from Gemini
 */
export async function generateTextOutput(
  prompt: string,
  options?: { usePro?: boolean }
): Promise<string> {
  const model = options?.usePro ? "gemini-2.5-pro" : "gemini-2.5-flash";
  
  return retryWithBackoff(async () => {
    return await callGeminiREST(model, prompt);
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
 * Answer evaluation prompt — strict rubric with gibberish/irrelevancy penalties
 */
export function buildAnswerEvaluationPrompt(
  question: string,
  expectedAnswer: string,
  userAnswer: string
): string {
  return `You are an expert technical interviewer with 15+ years of FAANG hiring experience. Evaluate the candidate answer below with STRICT, HONEST scoring. Do NOT be lenient. Do NOT assign a default passing score.

QUESTION: ${question}

IDEAL ANSWER: ${expectedAnswer}

CANDIDATE ANSWER: ${userAnswer}

---
MANDATORY SCORING RULES:

ZERO score (score = 0) when:
- Answer is empty or only whitespace
- Answer is pure gibberish (e.g. "asdf", "qwerty", "abc", "123", random keyboard mashing)
- Answer is under 15 meaningful characters
- Answer contains only special characters or numbers with no real words

VERY LOW score (0-10%) when:
- Gibberish mixed with some words, single meaningless repeated words
- No technical content whatsoever, length under 30 characters

LOW score (0-20%) when:
- Completely irrelevant sentence (e.g. "I like cricket", "I love football")
- Mentions technology name but provides zero technical explanation
- Off-topic response

PARTIAL score (30-60%) when:
- Some correct concepts but misses key points
- Partially correct but incomplete
- Basic understanding without depth

GOOD score (60-80%) when:
- Mostly correct, covers main concepts
- Minor missing details but core explanation is sound

EXCELLENT score (80-100%) when:
- Technically accurate and comprehensive
- Covers core concepts, nuances, and practical implications
- Clear, well-structured, demonstrates mastery

SCORING CRITERIA (each 0-100):
- accuracy: Technical correctness compared to expected answer (weight: 50%)
- completeness: Coverage of all key concepts from expected answer (weight: 30%)
- communication: Clarity and structure (weight: 20%)
- score: Weighted average (accuracy*0.5 + completeness*0.3 + communication*0.2). Apply mandatory rules above. Never round up above what content deserves.

Return ONLY valid JSON:
{
  "accuracy": <number 0-100>,
  "completeness": <number 0-100>,
  "communication": <number 0-100>,
  "score": <number 0-100>,
  "feedback": "<1-2 sentence honest assessment>",
  "strengths": ["<specific strength if any>"],
  "weaknesses": ["<specific weakness>"],
  "missingConcepts": ["<key concept from expected answer that was absent>"],
  "suggestedAnswer": "<2-4 sentence model answer>",
  "confidenceLevel": "<'No Answer' | 'Very Low' | 'Low' | 'Medium' | 'High' | 'Expert'>",
  "areasOfImprovement": ["<actionable tip>"]
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


/**
 * Comprehensive resume analysis prompt for AI Resume Analyzer
 */
export function buildResumeAnalysisPrompt(resumeText: string): string {
  return `You are an expert resume reviewer, ATS specialist, and senior technical recruiter with 15+ years of experience at top tech companies.

Analyze the following resume text THOROUGHLY and return a structured JSON analysis.

CRITICAL RULES:
- Base ALL analysis ONLY on what is actually written in the resume. Do NOT invent data.
- Never fabricate companies, job titles, schools, projects, or achievements.
- Only rewrite WORDING. Never add fake experience, fake metrics, or fake skills.
- Grammar/spelling corrections must be real errors found in the text.
- Missing keywords must be genuinely absent from the resume.
- SPEED CONSTRAINT: Limit all arrays (missingKeywords, grammarIssues, actionVerbs, bulletPoints, projectAnalysis, recruiterFeedback, formattingTips) to MAXIMUM 3 items each to ensure fast API processing.

Return a SINGLE valid JSON object with this EXACT structure:
{
  "candidateName": "string or null",
  "candidateEmail": "string or null",
  "candidatePhone": "string or null",
  "atsScore": 0-100,
  "sectionScores": {
    "technical": 0-100,
    "projects": 0-100,
    "experience": 0-100,
    "education": 0-100,
    "formatting": 0-100,
    "readability": 0-100,
    "grammar": 0-100,
    "keywords": 0-100,
    "recruiterAppeal": 0-100
  },
  "summary": "2-4 sentence professional summary of the resume's strengths and weaknesses",
  "missingKeywords": [
    { "keyword": "Docker", "reason": "Widely expected for backend roles; absence hurts ATS ranking." }
  ],
  "grammarIssues": [
    { "original": "exact text from resume with error", "suggestion": "corrected version", "type": "Grammar | Spelling | Passive Voice | Weak Wording | Long Sentence | Repeated Word | Unclear" }
  ],
  "actionVerbs": [
    { "weak": "Worked on", "strong": "Engineered", "reason": "Strong verbs demonstrate ownership and impact." }
  ],
  "bulletPoints": [
    { "original": "exact bullet from resume", "improved": "rewritten bullet with stronger wording — never fabricate data" }
  ],
  "projectAnalysis": [
    {
      "name": "Project name from resume",
      "score": 0-100,
      "suggestions": ["Add GitHub link", "Quantify user impact", "Mention tech stack used"]
    }
  ],
  "recruiterFeedback": [
    "Move Projects section above Education for better impact.",
    "Add measurable achievements to experience bullets."
  ],
  "formattingTips": [
    "Use consistent bullet styles throughout.",
    "Ensure section headings are uniform in size and weight."
  ],
  "skillCategories": {
    "languages": ["JavaScript", "Python"],
    "frameworks": ["React", "Node.js"],
    "libraries": ["Redux", "Axios"],
    "databases": ["MongoDB", "PostgreSQL"],
    "cloud": ["AWS", "GCP"],
    "tools": ["Docker", "Git"],
    "versionControl": ["GitHub", "GitLab"],
    "testing": ["Jest", "Cypress"]
  }
}

ATS Score Criteria:
- Contact info present: +5
- Skills section present and categorized: +10
- Quantifiable achievements: +15
- Action verbs used: +10
- Relevant keywords density: +15
- Education section: +10
- Projects section with descriptions: +10
- Clean formatting (no tables/columns detected): +10
- Grammar and spelling quality: +10
- Professional summary: +5

Resume text to analyze:
${resumeText}`;
}
