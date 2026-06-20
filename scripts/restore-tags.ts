import dotenv from "dotenv";
dotenv.config();

async function restoreTags() {
  try {
    const { db } = await import("../src/lib/db");
    const questions = await db.question.findMany();
    console.log(`Found ${questions.length} questions in database.`);

    let updatedCount = 0;
    for (const q of questions) {
      if (!q.tags || q.tags.length === 0) {
        let newTags: string[] = [];
        const title = q.title.toLowerCase();

        if (title.includes("virtual dom") || title.includes("reconciliation")) {
          newTags = ["INTERMEDIATE", "FREQUENTLY_ASKED"];
        } else if (title.includes("useeffect") || title.includes("uselayouteffect") || title.includes("usememo")) {
          newTags = ["INTERMEDIATE", "FREQUENTLY_ASKED"];
        } else if (title.includes("context api") || title.includes("state management")) {
          newTags = ["BEGINNER", "FREQUENTLY_ASKED"];
        } else if (title.includes("closure")) {
          newTags = ["INTERMEDIATE", "FREQUENTLY_ASKED"];
        } else if (title.includes("event loop")) {
          newTags = ["ADVANCED", "FREQUENTLY_ASKED"];
        } else {
          // Default based on difficulty
          if (q.difficulty === "EASY") {
            newTags = ["BEGINNER"];
          } else if (q.difficulty === "HARD") {
            newTags = ["ADVANCED"];
          } else {
            newTags = ["INTERMEDIATE"];
          }
        }

        await db.question.update({
          where: { id: q.id },
          data: { tags: newTags }
        });
        updatedCount++;
        console.log(`Updated Q: "${q.title}" with tags:`, newTags);
      }
    }

    console.log(`Successfully restored tags for ${updatedCount} questions.`);
  } catch (err) {
    console.error("Error restoring tags:", err);
  }
}

restoreTags();
