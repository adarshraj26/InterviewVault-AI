import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export const geminiProModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-preview-05-20",
});

/**
 * Generate structured JSON output from Gemini
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  options?: { usePro?: boolean }
): Promise<T> {
  const model = options?.usePro ? geminiProModel : geminiModel;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const text = result.response.text();
  return JSON.parse(text) as T;
}

/**
 * Generate text output from Gemini
 */
export async function generateTextOutput(
  prompt: string,
  options?: { usePro?: boolean }
): Promise<string> {
  const model = options?.usePro ? geminiProModel : geminiModel;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
    },
  });

  return result.response.text();
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
  
For each question, extract or infer the following fields:
- title: The interview question text (clean, concise, without index numbers)
- answer: A comprehensive answer (formatted as clean markdown if appropriate, with paragraphs, excluding the main code example which should go into codeExample)
- codeExample: A relevant code example/snippet if present in the question/answer, otherwise null (clean code, no markdown fence backticks inside the string)
- codeLanguage: The programming language for the code example (e.g. "javascript", "typescript", "python", "sql") or null if none
- difficulty: The difficulty level. Must be one of: "EASY", "MEDIUM", or "HARD"
- interviewFrequency: Estimate how frequently this is asked. Must be one of: "RARE", "COMMON", or "VERY_COMMON"
- tags: Array of tags. Filter from: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "FREQUENTLY_ASKED"]. Empty array if none apply.
- technology: The specific technology category (e.g. "JavaScript", "React.js", "Python", "SQL", "Docker", "Node.js"). Keep the name clean, standard, and capitalized correctly (e.g., "JavaScript" instead of "js" or "javascript"). If the file is from a single tech stack (e.g., all questions are about JavaScript), classify all questions under that tech stack name.

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
