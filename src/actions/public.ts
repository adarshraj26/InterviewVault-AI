"use server";

import { db } from "@/lib/db";

export async function getGlobalTopicCounts() {
  try {
    const reactCount = await db.question.count({
      where: { technology: { slug: 'react' } }
    });
    
    const jsCount = await db.question.count({
      where: { technology: { slug: 'javascript' } }
    });

    return { react: reactCount, javascript: jsCount };
  } catch (error) {
    console.error("Failed to fetch global topic counts:", error);
    return { react: 0, javascript: 0 };
  }
}
