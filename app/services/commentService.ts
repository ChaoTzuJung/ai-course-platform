import { eq, asc } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users, UserRole } from "~/db/schema";
import { COMMENT_MAX_LENGTH } from "~/lib/validation";

// ─── Comment Service ───
// Flat, per-lesson comments with soft delete. Permission + body checks are pure
// and unit-tested; the rest read/write the database. Positional params.

/** Pure: trimmed body, or null if empty or over the length limit. */
export function normalizeCommentBody(raw: string): string | null {
  const body = raw.trim();
  if (body.length === 0 || body.length > COMMENT_MAX_LENGTH) return null;
  return body;
}

/** Pure: enrolled students, the course instructor, and admins may post. */
export function canPostComment(
  user: { id: number; role: UserRole },
  course: { instructorId: number },
  enrolled: boolean
): boolean {
  return (
    enrolled ||
    course.instructorId === user.id ||
    user.role === UserRole.Admin
  );
}

/** Pure: the author, the course instructor, and admins may delete. */
export function canDeleteComment(
  user: { id: number; role: UserRole },
  comment: { userId: number },
  course: { instructorId: number }
): boolean {
  return (
    comment.userId === user.id ||
    course.instructorId === user.id ||
    user.role === UserRole.Admin
  );
}

/** All comments for a lesson, oldest first, with author name + role. */
export function getCommentsByLesson(lessonId: number) {
  return db
    .select({
      id: lessonComments.id,
      body: lessonComments.body,
      deletedAt: lessonComments.deletedAt,
      createdAt: lessonComments.createdAt,
      userId: lessonComments.userId,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(asc(lessonComments.createdAt))
    .all();
}

export function getCommentById(id: number) {
  return db
    .select()
    .from(lessonComments)
    .where(eq(lessonComments.id, id))
    .get();
}

export function addComment(userId: number, lessonId: number, body: string) {
  return db
    .insert(lessonComments)
    .values({ userId, lessonId, body })
    .returning()
    .get();
}

/** Soft delete: record the timestamp; the row stays for audit. */
export function softDeleteComment(id: number) {
  return db
    .update(lessonComments)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(lessonComments.id, id))
    .returning()
    .get();
}
