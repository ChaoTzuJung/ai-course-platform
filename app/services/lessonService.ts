import { eq, max } from "drizzle-orm";
import { db } from "~/db";
import { lessons, modules, courses } from "~/db/schema";

// ─── Lesson Service ───

export function getLessonById(id: number) {
  return db.select().from(lessons).where(eq(lessons.id, id)).get();
}

export function getLessonsByModule(moduleId: number) {
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(lessons.position)
    .all();
}

export function nextLessonPosition(moduleId: number) {
  const row = db
    .select({ value: max(lessons.position) })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .get();
  return (row?.value ?? -1) + 1;
}

export function createLesson(
  moduleId: number,
  title: string,
  slug: string,
  content: string | null,
  videoUrl: string | null
) {
  return db
    .insert(lessons)
    .values({
      moduleId,
      title,
      slug,
      content,
      videoUrl,
      position: nextLessonPosition(moduleId),
    })
    .returning()
    .get();
}

export function updateLesson(
  id: number,
  title: string,
  content: string | null,
  videoUrl: string | null
) {
  return db
    .update(lessons)
    .set({ title, content, videoUrl })
    .where(eq(lessons.id, id))
    .returning()
    .get();
}

/**
 * A lesson joined with its module and course — used to ground the AI tutor
 * (it needs the lesson content plus the surrounding course/module context).
 */
export function getLessonWithContext(lessonId: number) {
  return db
    .select({
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      lessonContent: lessons.content,
      moduleId: modules.id,
      moduleTitle: modules.title,
      courseId: courses.id,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(lessons.id, lessonId))
    .get();
}
