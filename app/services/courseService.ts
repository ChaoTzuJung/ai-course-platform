import { eq, desc } from "drizzle-orm";
import { db } from "~/db";
import {
  courses,
  modules,
  lessons,
  users,
  CourseStatus,
} from "~/db/schema";

// ─── Course Service ───
// Course CRUD, status transitions, and the nested outline (modules → lessons).
// Positional parameters throughout (project convention).

export function getCourseById(id: number) {
  return db.select().from(courses).where(eq(courses.id, id)).get();
}

export function getCourseBySlug(slug: string) {
  return db.select().from(courses).where(eq(courses.slug, slug)).get();
}

export function getPublishedCourses() {
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      imageUrl: courses.imageUrl,
      instructorId: courses.instructorId,
      status: courses.status,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      instructorName: users.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courses.status, CourseStatus.Published))
    .orderBy(desc(courses.createdAt))
    .all();
}

export function getCoursesByInstructor(instructorId: number) {
  return db
    .select()
    .from(courses)
    .where(eq(courses.instructorId, instructorId))
    .orderBy(desc(courses.createdAt))
    .all();
}

export function createCourse(
  title: string,
  slug: string,
  description: string,
  instructorId: number,
  imageUrl: string | null
) {
  return db
    .insert(courses)
    .values({
      title,
      slug,
      description,
      instructorId,
      imageUrl,
      status: CourseStatus.Draft,
    })
    .returning()
    .get();
}

export function updateCourse(
  id: number,
  title: string,
  description: string,
  imageUrl: string | null
) {
  return db
    .update(courses)
    .set({ title, description, imageUrl, updatedAt: new Date().toISOString() })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

export function updateCourseStatus(id: number, status: CourseStatus) {
  return db
    .update(courses)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

/** Course plus its modules, each with its ordered lessons. */
export function getCourseOutline(courseId: number) {
  const course = getCourseById(courseId);
  if (!course) return null;

  const courseModules = db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.position)
    .all();

  return {
    ...course,
    modules: courseModules.map((mod) => ({
      ...mod,
      lessons: db
        .select()
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(lessons.position)
        .all(),
    })),
  };
}

export function getCourseOutlineBySlug(slug: string) {
  const course = getCourseBySlug(slug);
  if (!course) return null;
  return getCourseOutline(course.id);
}
