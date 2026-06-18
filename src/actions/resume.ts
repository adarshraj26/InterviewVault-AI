"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { 
  generateStructuredOutput, 
  buildResumeParsingPrompt, 
  buildQuestionGenerationPrompt 
} from "@/lib/ai";
import { createTechnology } from "./technologies";
import { createQuestion } from "./questions";
import { Difficulty, InterviewFrequency, QuestionTagEnum } from "@prisma/client";
export async function extractTextFromPdfAction(base64String: string) {
  try {
    const dataBuffer = Buffer.from(base64String, "base64");
    // Require the raw parser library directly to bypass index.js's buggy isDebugMode check in Next.js
    const parse = require("pdf-parse/lib/pdf-parse.js");
    const data = await parse(dataBuffer);
    return { text: data.text };
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return { error: "Failed to extract text from PDF file" };
  }
}



interface AIParsedResume {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  other: string[];
}

interface AIParsedQuestions {
  questions: {
    title: string;
    answer: string;
    codeExample: string | null;
    codeLanguage: string | null;
    difficulty: Difficulty;
    interviewFrequency: InterviewFrequency;
    tags: QuestionTagEnum[];
    followUpQuestions: string[];
  }[];
}

function fallbackResumeParser(text: string): AIParsedResume {
  const parsed: AIParsedResume = {
    languages: [],
    frameworks: [],
    databases: [],
    tools: [],
    other: [],
  };

  const skillsMap = {
    languages: [
      { name: "JavaScript", pattern: /\b(javascript|js|es6)\b/i },
      { name: "TypeScript", pattern: /\b(typescript|ts)\b/i },
      { name: "Python", pattern: /\bpython\b/i },
      { name: "C++", pattern: /\bc\+\+\b/i },
      { name: "Java", pattern: /\bjava\b/i },
      { name: "HTML", pattern: /\bhtml(5)?\b/i },
      { name: "CSS", pattern: /\bcss(3)?\b/i },
      { name: "Go", pattern: /\b(go|golang)\b/i },
      { name: "Rust", pattern: /\brust\b/i },
      { name: "Ruby", pattern: /\bruby\b/i },
      { name: "PHP", pattern: /\bphp\b/i },
      { name: "Swift", pattern: /\bswift\b/i },
      { name: "Kotlin", pattern: /\bkotlin\b/i },
      { name: "SQL", pattern: /\bsql\b/i },
    ],
    frameworks: [
      { name: "React.js", pattern: /\breact(\.js)?\b/i },
      { name: "Angular", pattern: /\bangular(\.js)?\b/i },
      { name: "Vue.js", pattern: /\bvue(\.js)?\b/i },
      { name: "Next.js", pattern: /\bnext(\.js)?\b/i },
      { name: "Node.js", pattern: /\bnode(\.js)?\b/i },
      { name: "Express.js", pattern: /\bexpress(\.js)?\b/i },
      { name: "Django", pattern: /\bdjango\b/i },
      { name: "Flask", pattern: /\bflask\b/i },
      { name: "Spring Boot", pattern: /\bspring( )?boot\b/i },
      { name: "Laravel", pattern: /\blaravel\b/i },
      { name: "Tailwind CSS", pattern: /\btailwind( )?(css)?\b/i },
    ],
    databases: [
      { name: "MongoDB", pattern: /\bmongo(db)?\b/i },
      { name: "PostgreSQL", pattern: /\b(postgres|postgresql)\b/i },
      { name: "MySQL", pattern: /\bmysql\b/i },
      { name: "Redis", pattern: /\bredis\b/i },
      { name: "SQLite", pattern: /\bsqlite\b/i },
      { name: "DynamoDB", pattern: /\bdynamodb\b/i },
      { name: "Firebase", pattern: /\bfirebase\b/i },
      { name: "Supabase", pattern: /\bsupabase\b/i },
    ],
    tools: [
      { name: "Git", pattern: /\bgit\b/i },
      { name: "GitHub", pattern: /\bgithub\b/i },
      { name: "Docker", pattern: /\bdocker\b/i },
      { name: "Kubernetes", pattern: /\b(kubernetes|k8s)\b/i },
      { name: "AWS", pattern: /\baws\b/i },
      { name: "Azure", pattern: /\bazure\b/i },
      { name: "GCP", pattern: /\bgcp\b/i },
      { name: "Figma", pattern: /\bfigma\b/i },
      { name: "CI/CD", pattern: /\bci\/?cd\b/i },
    ],
    other: [
      { name: "REST API", pattern: /\brest(ful)?( )?api(s)?\b/i },
      { name: "GraphQL", pattern: /\bgraphql\b/i },
      { name: "Microservices", pattern: /\bmicroservices\b/i },
      { name: "Agile", pattern: /\bagile\b/i },
      { name: "System Design", pattern: /\bsystem( )?design\b/i },
    ]
  };

  for (const [category, list] of Object.entries(skillsMap)) {
    const key = category as keyof AIParsedResume;
    list.forEach(skill => {
      if (skill.pattern.test(text)) {
        parsed[key].push(skill.name);
      }
    });
  }

  return parsed;
}

function getFallbackQuestions(technology: string): AIParsedQuestions {
  const lowerTech = technology.toLowerCase();
  
  const defaultQuestions = [
    {
      title: `What are the core concepts and design patterns of ${technology}?`,
      answer: `${technology} is widely used in modern software development. Important concepts include its core architecture, lifecycle management, performance optimization, and common integration patterns. Understanding these elements helps in building robust and scalable applications.`,
      codeExample: null,
      codeLanguage: null,
      difficulty: Difficulty.MEDIUM,
      interviewFrequency: InterviewFrequency.VERY_COMMON,
      tags: [QuestionTagEnum.BEGINNER, QuestionTagEnum.INTERMEDIATE],
      followUpQuestions: [
        `How do you optimize performance in a production ${technology} application?`,
        `What are the security best practices when working with ${technology}?`
      ]
    },
    {
      title: `How does state management and data flow work in ${technology}?`,
      answer: `Data flow and state persistence are crucial in ${technology}. Developers typically manage state locally or via centralized patterns to ensure predictable updates and consistency. Efficient state synchronization prevents common bugs like race conditions and stale data.`,
      codeExample: null,
      codeLanguage: null,
      difficulty: Difficulty.MEDIUM,
      interviewFrequency: InterviewFrequency.VERY_COMMON,
      tags: [QuestionTagEnum.INTERMEDIATE],
      followUpQuestions: [
        `What are the differences between local and global state in this ecosystem?`,
        `Can you describe a scenario where state synchronization becomes bottlenecked?`
      ]
    },
    {
      title: `Can you explain the error handling and debugging strategies in ${technology}?`,
      answer: `Effective debugging in ${technology} involves utilizing built-in developer tools, logging levels, unit testing suites, and remote tracing tools. Robust try-catch boundaries, global error catchers, and clear feedback loops ensure that errors are resolved quickly.`,
      codeExample: null,
      codeLanguage: null,
      difficulty: Difficulty.EASY,
      interviewFrequency: InterviewFrequency.COMMON,
      tags: [QuestionTagEnum.BEGINNER],
      followUpQuestions: [
        `How do you configure logging in a production environment?`,
        `What unit testing frameworks do you prefer for testing ${technology}?`
      ]
    }
  ];

  if (lowerTech.includes("react")) {
    return {
      questions: [
        {
          title: "What is the Virtual DOM and how does React reconciliation work?",
          answer: "React creates an in-memory cache of the DOM structure, called the Virtual DOM. When state or props change, React generates a new Virtual DOM tree and compares it with the previous one using a diffing algorithm (reconciliation). It then updates only the changed parts in the real DOM, making the rendering process highly efficient.",
          codeExample: "// React diffing updates only what's changed\nconst element = <h1>Hello, World!</h1>;\nroot.render(element);",
          codeLanguage: "javascript",
          difficulty: Difficulty.MEDIUM,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.INTERMEDIATE, QuestionTagEnum.FREQUENTLY_ASKED],
          followUpQuestions: [
            "What is the time complexity of React's reconciliation diffing algorithm?",
            "How do 'keys' help React during reconciliation?"
          ]
        },
        {
          title: "Explain the difference between useEffect, useLayoutEffect, and useMemo.",
          answer: "useEffect runs asynchronously after the render paint, making it suitable for side effects. useLayoutEffect fires synchronously after all DOM mutations but before the browser paints, which is ideal for measuring DOM layout. useMemo memoizes a value to avoid expensive calculations on every render.",
          codeExample: "import React, { useState, useMemo, useEffect } from 'react';\n\nfunction MyComponent() {\n  const [count, setCount] = useState(0);\n  const doubled = useMemo(() => count * 2, [count]);\n  useEffect(() => {\n    console.log('Count updated:', count);\n  }, [count]);\n  return <div>{doubled}</div>;\n}",
          codeLanguage: "javascript",
          difficulty: Difficulty.MEDIUM,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.INTERMEDIATE, QuestionTagEnum.FREQUENTLY_ASKED],
          followUpQuestions: [
            "When should you avoid using useMemo or useCallback?",
            "What happens if you omit the dependency array in useEffect?"
          ]
        },
        {
          title: "How does React state management work and what are the benefits of Context API?",
          answer: "React state management starts with component state (useState). For global state, Context API avoids 'prop drilling' by sharing values across components without passing props down. For complex state flows, React developers also use Redux Toolkit or Zustand.",
          codeExample: "const ThemeContext = React.createContext('light');\nfunction Provider({ children }) {\n  return <ThemeContext.Provider value=\"dark\">{children}</ThemeContext.Provider>;\n}",
          codeLanguage: "javascript",
          difficulty: Difficulty.EASY,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.BEGINNER, QuestionTagEnum.FREQUENTLY_ASKED],
          followUpQuestions: [
            "Does Context API trigger re-renders for all consumer components?",
            "What is the difference between Context API and Redux?"
          ]
        }
      ]
    };
  }

  if (lowerTech.includes("javascript") || lowerTech.includes("js") || lowerTech.includes("ts") || lowerTech.includes("typescript")) {
    return {
      questions: [
        {
          title: "Explain closure in JavaScript and give a practical use case.",
          answer: "A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment). Closure allows an inner function to access the scope of an outer function even after the outer function has returned. Common use cases include data privacy (emulating private methods) and event handlers.",
          codeExample: "function createCounter() {\n  let count = 0;\n  return {\n    increment: () => ++count,\n    getCount: () => count\n  };\n}\nconst counter = createCounter();\nconsole.log(counter.increment()); // 1",
          codeLanguage: "javascript",
          difficulty: Difficulty.MEDIUM,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.INTERMEDIATE, QuestionTagEnum.FREQUENTLY_ASKED],
          followUpQuestions: [
            "How do closures affect garbage collection and memory usage?",
            "Can you explain the lexical scope chain in JavaScript?"
          ]
        },
        {
          title: "What is the JavaScript Event Loop and how does it handle microtasks and macrotasks?",
          answer: "JavaScript is single-threaded. The event loop monitors the Call Stack and the Callback Queue. When the stack is empty, it pushes callbacks onto the stack. Microtasks (like Promise callbacks) have higher priority than macrotasks (like setTimeout) and are executed completely before the event loop continues to the next macrotask.",
          codeExample: "console.log('start');\nsetTimeout(() => console.log('timeout'), 0);\nPromise.resolve().then(() => console.log('promise'));\nconsole.log('end');\n// Output: start -> end -> promise -> timeout",
          codeLanguage: "javascript",
          difficulty: Difficulty.HARD,
          interviewFrequency: InterviewFrequency.VERY_COMMON,
          tags: [QuestionTagEnum.ADVANCED, QuestionTagEnum.FREQUENTLY_ASKED],
          followUpQuestions: [
            "What is the difference between process.nextTick and Promise.then in Node.js?",
            "How does rendering paint cycle fit into the event loop?"
          ]
        }
      ]
    };
  }

  return { questions: defaultQuestions };
}

export async function parseResumeAndSetupWorkspaces(fileUrl: string, fileName: string, fileSize: number, rawText: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Create resume record
    const resume = await db.resume.create({
      data: {
        fileName,
        fileUrl,
        fileSize,
        rawText,
        userId: session.user.id,
      },
    });

    // 2. Parse text with Gemini (with fallback)
    let parsed: AIParsedResume | null = null;
    try {
      const prompt = buildResumeParsingPrompt(rawText);
      parsed = await generateStructuredOutput<AIParsedResume>(prompt);
    } catch (apiError) {
      console.warn("Gemini resume parsing failed, using fallback parser:", apiError);
      parsed = fallbackResumeParser(rawText);
    }

    if (!parsed) {
      return { error: "Failed to parse resume technical skills" };
    }

    // 3. Flatten skills to insert into DB
    const skillsToCreate: { name: string; category: string; resumeId: string }[] = [];
    const allSkillNames: string[] = [];

    const categories = [
      { key: "languages", label: "language" },
      { key: "frameworks", label: "framework" },
      { key: "databases", label: "database" },
      { key: "tools", label: "tool" },
      { key: "other", label: "other" },
    ];

    for (const cat of categories) {
      const list = parsed[cat.key as keyof AIParsedResume] || [];
      list.forEach((name) => {
        if (name && name.trim()) {
          skillsToCreate.push({
            name: name.trim(),
            category: cat.label,
            resumeId: resume.id,
          });
          allSkillNames.push(name.trim());
        }
      });
    }

    // Insert skills
    if (skillsToCreate.length > 0) {
      await db.skill.createMany({
        data: skillsToCreate,
      });
    }

    // 4. Update Resume parsedAt
    await db.resume.update({
      where: { id: resume.id },
      data: { parsedAt: new Date() },
    });

    // 5. Automatically create technology workspaces for the top extracted skills (limit to top 6 to prevent timeouts/overwhelm)
    const topSkills = allSkillNames.slice(0, 6);
    
    for (const skillName of topSkills) {
      // Create technology workspace
      const techResult = await createTechnology(skillName, `Personalized workspace for ${skillName} interview preparation.`);
      
      if (techResult.success && techResult.technology) {
        const techId = techResult.technology.id;
        
        // Generate initial questions (with fallback if AI fails)
        try {
          const qPrompt = buildQuestionGenerationPrompt(skillName, 5); // Start with 5 questions
          const qParsed = await generateStructuredOutput<AIParsedQuestions>(qPrompt);
          
          if (qParsed && qParsed.questions) {
            for (const q of qParsed.questions) {
              await createQuestion({
                title: q.title,
                answer: q.answer,
                codeExample: q.codeExample || undefined,
                codeLanguage: q.codeLanguage || undefined,
                difficulty: q.difficulty,
                interviewFrequency: q.interviewFrequency,
                tags: q.tags,
                technologyId: techId,
              });
            }
          }
        } catch (qErr) {
          console.warn(`Error generating questions for ${skillName}, using fallback questions:`, qErr);
          try {
            const fallbackQ = getFallbackQuestions(skillName);
            for (const q of fallbackQ.questions) {
              await createQuestion({
                title: q.title,
                answer: q.answer,
                codeExample: q.codeExample || undefined,
                codeLanguage: q.codeLanguage || undefined,
                difficulty: q.difficulty,
                interviewFrequency: q.interviewFrequency,
                tags: q.tags,
                technologyId: techId,
              });
            }
          } catch (innerErr) {
            console.error(`Error writing fallback questions for ${skillName}:`, innerErr);
          }
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/technologies");
    revalidatePath("/settings");

    return { success: true, skillsCount: allSkillNames.length, workspacesCreated: topSkills.length };
  } catch (error) {
    console.error("Parse resume error:", error);
    return { error: "Failed to parse resume and build workspaces" };
  }
}

export async function deleteResume(resumeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await db.resume.delete({
      where: {
        id: resumeId,
        userId: session.user.id,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete resume error:", error);
    return { error: "Failed to delete resume" };
  }
}

