import dotenv from "dotenv";

dotenv.config();

async function listTargetQuestions() {
  try {
    const { db } = await import("../src/lib/db");
    const questions = await db.question.findMany({
      orderBy: { createdAt: "asc" }
    });

    console.log("Total questions:", questions.length);
    const targets = questions.slice(3, 29); // Q4 is index 3, Q29 is index 28 (length 26)
    
    targets.forEach((q: any, idx: number) => {
      const qNum = idx + 4;
      const ans = q.answer || "";
      const isHtml = /<(p|ul|ol|li|h[1-6]|strong|em|code|pre|blockquote)\b/i.test(ans);
      console.log(`Q#${qNum}: "${q.title}"`);
      console.log(`  - HTML: ${isHtml} | Length: ${ans.length} | Has #: ${ans.includes("#")} | Has **: ${ans.includes("**")}`);
      console.log(`  - Snippet: ${ans.substring(0, 120).replace(/\n/g, " ")}...`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

listTargetQuestions();



