import { eq, and, desc } from "drizzle-orm";
import { db } from "~/db";
import { enrollments, courses } from "~/db/schema";

// ─── Enrollment Service ───

export function isEnrolled(userId: number, courseId: number) {
  const row = db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .get();
  return Boolean(row);
}

/** Idempotent: enrolling an already-enrolled user is a no-op. */
export function enroll(userId: number, courseId: number) {
  if (isEnrolled(userId, courseId)) return;
  db.insert(enrollments).values({ userId, courseId }).run();
}

export function getEnrollmentsByUser(userId: number) {
  return db
    .select({
      enrollmentId: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      courseId: courses.id,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      courseImageUrl: courses.imageUrl,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt))
    .all();
}
