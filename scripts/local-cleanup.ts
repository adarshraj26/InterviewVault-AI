import dotenv from "dotenv";
import { db } from "../src/lib/db";

dotenv.config();

async function localCleanup() {
  try {
    console.log("Fetching all questions for local cleanup...");
    const questions = await db.question.findMany();
    console.log(`Found ${questions.length} questions.`);

    let updatedCount = 0;

    for (const q of questions) {
      if (!q.answer) continue;

      let original = q.answer;
      let html = original;

      // 1. Convert --- to premium <hr /> elements
      html = html.replace(/<p class="my-2">---<\/p>/g, '<hr class="my-4 border-border/60" />');
      html = html.replace(/---/g, '<hr class="my-4 border-border/60" />');

      // 2. Fix headings with markdown hashes inside <p> tags
      // e.g. <p class="my-2">#### Output:<br />...
      html = html.replace(/<p class="my-2">####\s+([^<]+)(?:<br\s*\/?>)?/gi, '<h4>$1</h4><p class="my-2">');
      html = html.replace(/<p class="my-2">###\s+([^<]+)(?:<br\s*\/?>)?/gi, '<h3>$1</h3><p class="my-2">');
      html = html.replace(/<p class="my-2">##\s+([^<]+)(?:<br\s*\/?>)?/gi, '<h2>$1</h2><p class="my-2">');
      html = html.replace(/<p class="my-2">#\s+([^<]+)(?:<br\s*\/?>)?/gi, '<h1>$1</h1><p class="my-2">');

      // 3. Fix standalone headings with markdown hashes
      html = html.replace(/####\s+([^<#\n]+)/g, '<h4>$1</h4>');
      html = html.replace(/###\s+([^<#\n]+)/g, '<h3>$1</h3>');
      html = html.replace(/##\s+([^<#\n]+)/g, '<h2>$1</h2>');
      html = html.replace(/#\s+([^<#\n]+)/g, '<h1>$1</h1>');

      // 4. Lift <pre> tags out of <p> tags to fix invalid HTML structures
      html = html.replace(/<p class="my-2">\s*(<pre>[\s\S]*?<\/pre>)\s*<\/p>/gi, '$1');
      html = html.replace(/<p class="my-2">\s*(<pre>[\s\S]*?<\/pre>)/gi, '$1<p class="my-2">');
      html = html.replace(/(<pre>[\s\S]*?<\/pre>)\s*<\/p>/gi, '$1');

      // 5. Clean up any empty or junk paragraph elements created by the regexes
      html = html.replace(/<p class="my-2">\s*<\/p>/gi, '');
      html = html.replace(/<p class="my-2"><br\s*\/?>/gi, '<p class="my-2">');

      // 6. Fix bold text remnants like **text**
      html = html.replace(/\*\*([^*<]+)\*\*/g, '<strong>$1</strong>');

      // Double-check if we changed anything
      if (html !== original) {
        await db.question.update({
          where: { id: q.id },
          data: { answer: html }
        });
        console.log(`✓ Cleaned up question: "${q.title}"`);
        updatedCount++;
      }
    }

    console.log(`\nLocal cleanup finished. Updated ${updatedCount} questions.`);
  } catch (err) {
    console.error("Local cleanup failed:", err);
  } finally {
    await db.$disconnect();
  }
}

localCleanup();
