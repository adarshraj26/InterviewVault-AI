"use server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Difficulty } from "@prisma/client";
import { 
  generateStructuredOutput, 
  buildMockInterviewPrompt, 
  buildAnswerEvaluationPrompt 
} from "@/lib/ai";

interface AIParsedQuestions {
  questions: {
    question: string;
    expectedAnswer: string;
  }[];
}

interface AIEvaluationResult {
  accuracy: number;
  completeness: number;
  communication: number;
  score: number;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  missingConcepts?: string[];
  suggestedAnswer?: string;
  confidenceLevel?: string;
  areasOfImprovement: string[];
}

export async function startMockInterview(technology: string, difficulty: Difficulty, count: number = 5) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Check or initialize/recharge credits
    let credits = await db.aICredit.findUnique({
      where: { userId: session.user.id },
    });

    if (!credits) {
      credits = await db.aICredit.create({
        data: {
          userId: session.user.id,
          credits: 50,
          used: 0,
        },
      });
    } else if (credits.credits - credits.used < 5) {
      // Auto-recharge to keep the platform free forever
      credits = await db.aICredit.update({
        where: { userId: session.user.id },
        data: {
          credits: credits.used + 50,
        },
      });
    }

    // Generate questions using Gemini AI
    const prompt = buildMockInterviewPrompt(technology, difficulty, count);
    let parsed: AIParsedQuestions | null = null;
    try {
      parsed = await generateStructuredOutput<AIParsedQuestions>(prompt);
    } catch (apiError) {
      console.warn("AI Mock Interview generation failed, using local fallback generator:", apiError);
    }

    if (!parsed || !parsed.questions || parsed.questions.length === 0) {
      const fallbacks = getFallbackMockQuestions(technology, difficulty, count);
      parsed = { questions: fallbacks };
    }

    // Deduct credits
    await db.aICredit.update({
      where: { userId: session.user.id },
      data: {
        used: { increment: 5 },
      },
    });

    // Save Mock Interview
    const mockInterview = await db.mockInterview.create({
      data: {
        technology,
        difficulty,
        totalQuestions: count,
        userId: session.user.id,
        questions: {
          create: parsed.questions.map((q, idx) => ({
            question: q.question,
            expectedAnswer: q.expectedAnswer,
            order: idx + 1,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    revalidatePath("/mock-interview");
    return { success: true, interviewId: mockInterview.id };
  } catch (error) {
    console.error("Start mock interview error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Returns true if the given string is gibberish/meaningless (random chars, no real words).
 */
function isGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Under 15 characters → too short to be a meaningful technical answer
  if (trimmed.length < 15) return true;

  // Count alphabetic characters vs total — if less than 50% alphabetic, likely gibberish
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount / trimmed.length < 0.5) return true;

  // Count distinct words of length >= 3
  const words = trimmed.toLowerCase().split(/\s+/).filter((w) => /^[a-z]{3,}$/.test(w));
  if (words.length < 2) return true;

  // Check if all words are very short "words" that are likely keyboard mashing
  // e.g. "asdf qwer zxcv" — letters that don't form real syllable patterns
  const vowelPattern = /[aeiou]/;
  const realWords = words.filter((w) => vowelPattern.test(w));
  if (realWords.length === 0) return true;

  return false;
}

export async function submitAnswer(interviewQuestionId: string, userAnswer: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const question = await db.mockInterviewQuestion.findUnique({
      where: { id: interviewQuestionId },
      include: { interview: true },
    });

    if (!question || question.interview.userId !== session.user.id) {
      return { error: "Question not found" };
    }

    // ── Pre-flight validation ────────────────────────────────────────────────
    // If the answer is empty, too short, or gibberish, return score 0 immediately
    // without wasting an AI API call.
    const trimmedAnswer = (userAnswer || "").trim();
    if (!trimmedAnswer || isGibberish(trimmedAnswer)) {
      const zeroEvaluation: AIEvaluationResult = {
        accuracy: 0,
        completeness: 0,
        communication: 0,
        score: 0,
        feedback: !trimmedAnswer
          ? "No answer was provided. Please write a meaningful technical explanation."
          : "The answer appears to be gibberish or too short to evaluate. Please provide a proper technical explanation of at least 2-3 sentences.",
        strengths: [],
        weaknesses: ["Answer is either empty, too short, or contains no meaningful technical content."],
        missingConcepts: ["A proper technical explanation addressing the question."],
        suggestedAnswer: undefined,
        confidenceLevel: !trimmedAnswer ? "No Answer" : "Very Low",
        areasOfImprovement: [
          "Write at least 2-3 complete sentences explaining the concept.",
          "Include relevant technical terminology.",
          "Provide a concrete example if possible.",
        ],
      };

      const savedQuestion = await db.mockInterviewQuestion.update({
        where: { id: interviewQuestionId },
        data: {
          userAnswer: trimmedAnswer || "",
          score: 0,
          feedback: JSON.stringify(zeroEvaluation),
        },
      });
      return { success: true, evaluation: savedQuestion };
    }
    // ────────────────────────────────────────────────────────────────────────

    // Evaluate response using Gemini AI
    const prompt = buildAnswerEvaluationPrompt(
      question.question,
      question.expectedAnswer || "",
      userAnswer
    );
    
    let evaluation: AIEvaluationResult | null = null;
    try {
      evaluation = await generateStructuredOutput<AIEvaluationResult>(prompt);
    } catch (apiError) {
      console.warn("AI Answer evaluation failed, using local heuristic fallback:", apiError);
      
      const userText = (userAnswer || "").toLowerCase().trim();
      const expectedText = (question.expectedAnswer || "").toLowerCase().trim();

      if (!userText || isGibberish(userText)) {
        // Empty or gibberish — zero score, no AI needed
        evaluation = {
          accuracy: 0,
          completeness: 0,
          communication: 0,
          score: 0,
          feedback: "No meaningful answer was provided. Please write a proper technical explanation.",
          strengths: [],
          weaknesses: ["Answer is empty or contains no meaningful technical content."],
          missingConcepts: ["A proper explanation addressing the question."],
          confidenceLevel: "No Answer",
          areasOfImprovement: ["Provide a complete answer of at least 2-3 sentences.", "Use relevant technical terminology."],
        };
      } else {
        // Word-overlap heuristic — base at 0, not 50
        const expectedWords = new Set(expectedText.split(/\W+/).filter((w) => w.length > 4));
        const userWords = new Set(userText.split(/\W+/).filter((w) => w.length > 4));

        let matchCount = 0;
        expectedWords.forEach((w) => {
          if (userWords.has(w)) matchCount++;
        });

        // Fraction of expected keywords the user matched (0.0 – 1.0)
        const overlapRatio = expectedWords.size > 0 ? matchCount / expectedWords.size : 0;
        // Length bonus: max +10 for long, thorough answers (>= 500 chars)
        const lengthBonus = Math.min(10, Math.round(userText.length / 50));
        // Base score starts at 0, scaled purely by overlap + length
        const baseScore = Math.min(90, Math.round(overlapRatio * 85) + lengthBonus);

        evaluation = {
          accuracy: baseScore,
          completeness: Math.max(0, baseScore - 5),
          communication: Math.min(90, Math.round(userText.length / 10) + 20),
          score: baseScore,
          feedback: `[Local Evaluation Fallback] Your answer matched approximately ${Math.round(overlapRatio * 100)}% of the key concepts. ${baseScore < 30 ? "More depth and technical detail is required." : "Good effort — expand on the practical examples and edge cases."}`,
          strengths: baseScore >= 50 ? ["Demonstrates some relevant knowledge."] : [],
          weaknesses: baseScore < 30 ? ["Lacks key technical terms and concepts from the expected answer."] : [],
          missingConcepts: [],
          confidenceLevel: baseScore >= 75 ? "High" : baseScore >= 50 ? "Medium" : baseScore >= 20 ? "Low" : "Very Low",
          areasOfImprovement: [
            "Cover more core concepts from the expected answer.",
            "Include a concrete code example or scenario.",
          ],
        };
      }
    }

    // Save evaluation to DB
    const updatedQuestion = await db.mockInterviewQuestion.update({
      where: { id: interviewQuestionId },
      data: {
        userAnswer,
        score: evaluation.score,
        feedback: JSON.stringify(evaluation),
      },
    });

    return { success: true, evaluation: updatedQuestion };
  } catch (error) {
    console.error("Submit answer evaluation error:", error);
    return { error: "Failed to evaluate candidate answer" };
  }
}

export async function finishMockInterview(interviewId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const interview = await db.mockInterview.findUnique({
      where: { id: interviewId, userId: session.user.id },
      include: { questions: true },
    });

    if (!interview) {
      return { error: "Interview not found" };
    }

    // Calculate overall stats from questions that were answered
    const answeredQuestions = interview.questions.filter((q) => q.userAnswer !== null);
    if (answeredQuestions.length === 0) {
      return { error: "No questions were answered." };
    }

    let totalScore = 0;
    let totalAccuracy = 0;
    let totalCompleteness = 0;
    let totalCommunication = 0;
    const allAreasOfImprovement = new Set<string>();
    const feedbacks: string[] = [];

    answeredQuestions.forEach((q) => {
      try {
        const evalObj = JSON.parse(q.feedback || "{}") as AIEvaluationResult;
        totalScore += evalObj.score || 0;
        totalAccuracy += evalObj.accuracy || 0;
        totalCompleteness += evalObj.completeness || 0;
        totalCommunication += evalObj.communication || 0;
        if (evalObj.areasOfImprovement) {
          evalObj.areasOfImprovement.forEach((area) => allAreasOfImprovement.add(area));
        }
        if (evalObj.feedback) feedbacks.push(evalObj.feedback);
      } catch (e) {
        totalScore += q.score || 0;
      }
    });

    const divisor = answeredQuestions.length;
    const avgScore = totalScore / divisor;
    const avgAccuracy = totalAccuracy / divisor;
    const avgCompleteness = totalCompleteness / divisor;
    const avgCommunication = totalCommunication / divisor;

    const overallFeedback = `Great effort completing the mock interview on ${interview.technology}. You scored ${avgScore.toFixed(0)}% overall.
Accuracy: ${avgAccuracy.toFixed(0)}% - correctness of core concepts.
Completeness: ${avgCompleteness.toFixed(0)}% - depth and coverage.
Communication: ${avgCommunication.toFixed(0)}% - clarity of explanation.
Summary: ${feedbacks.slice(0, 2).join(" ")}`;

    await db.mockInterview.update({
      where: { id: interviewId },
      data: {
        score: avgScore,
        accuracy: avgAccuracy,
        completeness: avgCompleteness,
        communication: avgCommunication,
        feedback: overallFeedback,
        areasOfImprovement: Array.from(allAreasOfImprovement).slice(0, 5), // Keep top 5 areas
        completedAt: new Date(),
      },
    });

    revalidatePath("/mock-interview");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    return { success: true };
  } catch (error) {
    console.error("Finish mock interview error:", error);
    return { error: "Failed to finalize the mock interview" };
  }
}

export async function getMockInterviews() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return await db.mockInterview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });
}

function getFallbackMockQuestions(tech: string, difficulty: string, count: number) {
  const normTech = tech.toLowerCase().trim();
  let pool: { question: string; expectedAnswer: string }[] = [];

  if (normTech.includes("javascript") || normTech.includes("js")) {
    pool = [
      {
        question: "What is a closure in JavaScript and when would you use it?",
        expectedAnswer: "A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In JavaScript, closures are created every time a function is created, at function creation time. You use closures to give objects private variables, handle callbacks, or build partial functions/currying.",
      },
      {
        question: "Explain the difference between let, const, and var.",
        expectedAnswer: "var is function-scoped, hoisted to the top of its scope, and initialized with undefined. let and const are block-scoped, hoisted but in the Temporal Dead Zone (TDZ) until evaluated, and cannot be redeclared. const also prevents reassignment, though its properties can still be mutated.",
      },
      {
        question: "What is the event loop in JavaScript and how does it handle asynchronous code?",
        expectedAnswer: "JavaScript is single-threaded. The event loop is a runtime model that manages executing code, collecting events, and executing queued sub-tasks. It continuously checks if the Call Stack is empty. If it is, it takes the first task from the Microtask Queue (like Promises) and then the Macrotask Queue (like setTimeout, I/O) and pushes it onto the Call Stack.",
      },
      {
        question: "What is prototypal inheritance and how does it work?",
        expectedAnswer: "In JavaScript, objects inherit properties and methods from other objects via prototypes. Every object has an internal [[Prototype]] link (accessible via Object.getPrototypeOf or __proto__). When accessing a property on an object, JavaScript checks if it exists on the object itself. If not, it traverses the prototype chain upward until the property is found or null is reached.",
      },
      {
        question: "Explain Promises and how async/await improves asynchronous code readability.",
        expectedAnswer: "A Promise is an object representing the eventual completion or failure of an asynchronous operation. async/await is syntactic sugar built on top of Promises. async makes a function return a Promise, and await suspends execution of the function until the promise is resolved, making asynchronous code look and behave more like synchronous code.",
      },
    ];
  } else if (normTech.includes("react")) {
    pool = [
      {
        question: "What is the Virtual DOM and how does React reconcile changes?",
        expectedAnswer: "The Virtual DOM is a lightweight in-memory representation of the real DOM. When component state changes, React creates a new Virtual DOM tree, compares it with the previous tree using a diffing algorithm (Reconciliation), and batch-updates the real DOM with only the differences (using a library like ReactDOM or via React Fiber updates).",
      },
      {
        question: "Explain the rules of React Hooks and why they are necessary.",
        expectedAnswer: "Hooks must only be called at the top level of functional components (never inside loops, conditions, or nested functions) and only from React function components or custom hooks. These rules ensure React can correctly associate state hooks with corresponding components across multiple render cycles.",
      },
      {
        question: "What is the difference between controlled and uncontrolled components?",
        expectedAnswer: "Controlled components have their state managed by React (using state and onChange event handlers). Uncontrolled components store their own state internally and access input values using React Refs (e.g. useRef). Controlled components are preferred for validation and dynamic UI updates.",
      },
      {
        question: "How does useEffect control side effects, and how does the dependency array function?",
        expectedAnswer: "useEffect lets functional components run side effects. If no dependency array is passed, the effect runs on every render. If an empty array [] is passed, it runs only once after mount. If variables are passed [prop1, state1], the effect runs only when those variables change. Returning a function from useEffect acts as a cleanup routine (similar to componentWillUnmount).",
      },
      {
        question: "How can you optimize performance in a React application?",
        expectedAnswer: "Performance can be optimized using: React.memo to prevent unnecessary re-renders of child components, useMemo and useCallback to memoize expensive computations and callbacks, lazy loading with React.lazy and Suspense, virtualizing long lists (windowing), and avoiding inline object or function allocations in component properties.",
      },
    ];
  } else if (normTech.includes("python")) {
    pool = [
      {
        question: "What is the difference between mutable and immutable types in Python, and give examples.",
        expectedAnswer: "Mutable types can be changed in-place after creation (e.g., lists, dictionaries, sets). Immutable types cannot be changed; modifying them creates a new object in memory (e.g., tuples, strings, integers, floats, booleans).",
      },
      {
        question: "Explain decorators in Python and how to implement one.",
        expectedAnswer: "A decorator is a design pattern in Python that allows you to modify the behavior of a function or class. It takes a function as an argument, wraps its execution inside an inner helper function, adds custom logic before/after, and returns the wrapper function. They are applied using the @decorator syntax.",
      },
      {
        question: "What is the Global Interpreter Lock (GIL) and how does it affect multi-threading?",
        expectedAnswer: "The GIL is a mutex in CPython that prevents multiple native threads from executing Python bytecodes at once. This lock is necessary because CPython's memory management is not thread-safe. As a result, Python multi-threading does not offer CPU-bound concurrency on multi-core systems (which requires multiprocessing or async task queues instead).",
      },
      {
        question: "Explain memory management in Python, including garbage collection.",
        expectedAnswer: "Python uses a private heap for all objects. Memory allocation is handled internally. It manages memory using reference counting (deallocating objects when reference count hits zero) and a generational cyclic garbage collector that periodically detects and cleans up self-referencing reference cycles.",
      },
      {
        question: "What is the difference between classmethod and staticmethod?",
        expectedAnswer: "A @classmethod receives the class reference (cls) as its first implicit argument, allowing it to modify class state or create factory instances. A @staticmethod receives no implicit first argument (neither self nor cls) and behaves like a regular function defined inside the namespace of a class.",
      },
    ];
  } else if (normTech.includes("java")) {
    pool = [
      {
        question: "What is polymorphism and how does Java support it?",
        expectedAnswer: "Polymorphism is the ability of an object to take on many forms. Java supports runtime polymorphism (method overriding, resolved at runtime) and compile-time polymorphism (method overloading, resolved at compile-time). This enables writing generic code that interfaces with subclasses through superclass interfaces.",
      },
      {
        question: "What is the difference between JDK, JRE, and JVM?",
        expectedAnswer: "JVM (Java Virtual Machine) runs Java bytecode. JRE (Java Runtime Environment) includes the JVM plus core libraries needed to run Java apps. JDK (Java Development Kit) contains the JRE plus compilers and debuggers (like javac) needed to develop Java applications.",
      },
      {
        question: "How does Java garbage collection work?",
        expectedAnswer: "Garbage collection in Java is an automatic process managed by the JVM to reclaim heap memory occupied by unreachable objects. It typically uses generational collection, splitting heap memory into Young (Eden, Survivor), Old (Tenured), and Permanent generations, applying mark-and-sweep or copying algorithms to optimize recovery times.",
      },
      {
        question: "What is the difference between abstract classes and interfaces in Java?",
        expectedAnswer: "An abstract class can have instance fields, constructors, and private/protected methods, and a class can inherit only one abstract class. An interface has traditionally only allowed public abstract methods (and constant fields), but Java 8+ allows default and static methods. A class can implement multiple interfaces.",
      },
      {
        question: "Explain Java Exception handling hierarchy and the difference between checked and unchecked exceptions.",
        expectedAnswer: "All exception classes inherit from Throwable. Error and RuntimeException (and subclasses) are unchecked exceptions and do not need to be declared or caught. Other subclasses of Exception are checked exceptions and must be declared in the method signature (throws) or caught inside a try-catch block.",
      },
    ];
  } else if (normTech.includes("html") || normTech.includes("css")) {
    pool = [
      {
        question: "What is semantic HTML and why should we use it?",
        expectedAnswer: "Semantic HTML uses element tags that describe their meaning (e.g. <header>, <nav>, <article>, <section>, <footer>) rather than generic tags like <div> or <span>. It improves web accessibility (ADA/WCAG), search engine optimization (SEO), and code maintainability.",
      },
      {
        question: "Explain the difference between localStorage, sessionStorage, and cookies.",
        expectedAnswer: "localStorage stores data with no expiration date across browser sessions. sessionStorage stores data for the duration of the page session (cleared when tab closes). Cookies store small strings (up to 4KB) sent back and forth with every HTTP request, supporting expiration controls and security flags like HttpOnly.",
      },
      {
        question: "What are the CSS Box Model components and how does box-sizing affect layout?",
        expectedAnswer: "The Box Model consists of: content, padding, border, and margin. By default (content-box), width and height apply only to the content. Setting box-sizing: border-box includes padding and border in the specified width and height, which makes responsive grid calculations much easier.",
      },
      {
        question: "What is the difference between position: absolute, relative, fixed, and sticky?",
        expectedAnswer: "relative positions an element relative to its normal flow. absolute positions an element relative to its nearest positioned ancestor. fixed positions an element relative to the viewport. sticky alternates between relative and fixed depending on scroll offset.",
      },
      {
        question: "Explain the difference between async and defer attributes in a script tag.",
        expectedAnswer: "Both download scripts in the background without blocking HTML parsing. async executes the script immediately after download is complete, blocking HTML parsing at that moment. defer guarantees scripts execute in order after HTML parsing is completely finished.",
      },
    ];
  } else {
    // General fallback template for other technologies
    pool = [
      {
        question: `Explain the core concepts and fundamental architecture of ${tech}.`,
        expectedAnswer: `Developing with ${tech} requires understanding its runtime model, compiler/interpreter details, syntax rules, execution paradigm, and how it handles dependencies and compilation targets in standard projects.`,
      },
      {
        question: `What are the common design patterns and best practices used when building applications in ${tech}?`,
        expectedAnswer: `Typical patterns in ${tech} include organizing directories logically, separating business logic from representation layers, writing clean modular files, and utilizing built-in abstractions or design frameworks recommended by the community.`,
      },
      {
        question: `How does memory management or resource allocation operate under the hood in ${tech}?`,
        expectedAnswer: `Resource management in ${tech} can involve automatic reference counting, manual memory pointers, JVM heap sizes, garbage collection runs, or scoped context cleanups to avoid memory leaks and maximize hardware utilization.`,
      },
      {
        question: `Discuss the performance optimization strategies and diagnostic profiling techniques specific to ${tech}.`,
        expectedAnswer: `Optimizations in ${tech} involve profiling execution bottlenecks, lazy-loading resources, using efficient algorithms, compiling options, setting cache parameters, and limiting blocking calls in synchronous flows.`,
      },
      {
        question: `What is your approach to testing, debugging, and logging in a standard ${tech} application?`,
        expectedAnswer: `Comprehensive development requires setting up unit testing suites, configuring debugger breakpoints, outputting structured JSON logs, and handling error codes gracefully to ease system debugging and monitoring.`,
      },
    ];
  }

  // Shuffle pool using a simple deterministic algorithm or random slice
  const selected = [];
  const poolCopy = [...pool];
  const selectCount = Math.min(count, pool.length);
  for (let i = 0; i < selectCount; i++) {
    const idx = Math.floor(Math.random() * poolCopy.length);
    selected.push(poolCopy.splice(idx, 1)[0]);
  }

  // If pool didn't have enough, pad with general questions
  while (selected.length < count) {
    selected.push({
      question: `Describe a complex problem you resolved while working with ${tech}.`,
      expectedAnswer: "A strong answer explains the situation, task, action taken, and quantitative/qualitative result achieved using the STAR method, highlighting diagnostic capability.",
    });
  }

  return selected;
}
