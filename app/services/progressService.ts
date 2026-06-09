import { eq, and, inArray } from "drizzle-orm";
import { db } from "~/db";
import {
  lessonProgress,
  lessons,
  modules,
  LessonProgressStatus,
} from "~/db/schema";

// ─── Progress Service ───
// Per-lesson status + course-level completion. `progressPercent` is pure and
// unit-tested; the rest read/write the database.

/** Pure: completion percentage (0–100, rounded). */
export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function getLessonProgress(userId: number, lessonId: number) {
  return db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      )
    )
    .get();
}

export function setLessonProgress(
  userId: number,
  lessonId: number,
  status: LessonProgressStatus
) {
  const completedAt =
    status === LessonProgressStatus.Completed
      ? new Date().toISOString()
      : null;

  return db
    .insert(lessonProgress)
    .values({ userId, lessonId, status, completedAt })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { status, completedAt },
    })
    .returning()
    .get();
}

/** Lesson ids belonging to a course (via its modules). */
function courseLessonIds(courseId: number): number[] {
  const rows = db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all();
  return rows.map((r) => r.id);
}

export function getCompletedLessonIds(
  userId: number,
  courseId: number
): number[] {
  const lessonIds = courseLessonIds(courseId);
  if (lessonIds.length === 0) return [];

  const rows = db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .all();
  return rows.map((r) => r.lessonId);
}

export function getCourseProgress(userId: number, courseId: number) {
  const total = courseLessonIds(courseId).length;
  const completed = getCompletedLessonIds(userId, courseId).length;
  return { completed, total, percent: progressPercent(completed, total) };
}
