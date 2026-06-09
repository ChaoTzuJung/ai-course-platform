import { eq, and } from "drizzle-orm";
import { db } from "~/db";
import { chatMessages, ChatRole } from "~/db/schema";

// ─── Chat Service ───
// Persists the AI-tutor conversation per (learner, lesson).

export function getMessages(userId: number, lessonId: number) {
  return db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.lessonId, lessonId)
      )
    )
    .orderBy(chatMessages.createdAt)
    .all();
}

export function appendMessage(
  userId: number,
  lessonId: number,
  role: ChatRole,
  content: string
) {
  return db
    .insert(chatMessages)
    .values({ userId, lessonId, role, content })
    .returning()
    .get();
}
