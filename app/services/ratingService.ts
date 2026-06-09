import { eq, and, inArray } from "drizzle-orm";
import { db } from "~/db";
import { courseRatings } from "~/db/schema";

// ─── Rating Service ───
// Star-only course ratings (1–5), one per (user, course). Aggregation math is
// pure and unit-tested; the rest read/write the database. Positional params.

export interface RatingStats {
  /** Average rating rounded to one decimal, or null when there are no ratings. */
  average: number | null;
  count: number;
}

/** Pure: average (1 decimal) + count for a list of ratings. */
export function summarizeRatings(ratings: number[]): RatingStats {
  if (ratings.length === 0) return { average: null, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const average = Math.round((sum / ratings.length) * 10) / 10;
  return { average, count: ratings.length };
}

/** Pure: per-course stats; every requested course id gets an entry. */
export function summarizeRatingsByCourse(
  rows: { courseId: number; rating: number }[],
  courseIds: number[]
): Map<number, RatingStats> {
  const byCourse = new Map<number, number[]>();
  for (const { courseId, rating } of rows) {
    const list = byCourse.get(courseId);
    if (list) list.push(rating);
    else byCourse.set(courseId, [rating]);
  }
  const result = new Map<number, RatingStats>();
  for (const id of courseIds) {
    result.set(id, summarizeRatings(byCourse.get(id) ?? []));
  }
  return result;
}

export function getUserRating(userId: number, courseId: number) {
  return db
    .select()
    .from(courseRatings)
    .where(
      and(
        eq(courseRatings.userId, userId),
        eq(courseRatings.courseId, courseId)
      )
    )
    .get();
}

/** Upsert: re-rating a course updates the existing row (one per user+course). */
export function rateCourse(userId: number, courseId: number, rating: number) {
  return db
    .insert(courseRatings)
    .values({ userId, courseId, rating })
    .onConflictDoUpdate({
      target: [courseRatings.userId, courseRatings.courseId],
      set: { rating, updatedAt: new Date().toISOString() },
    })
    .returning()
    .get();
}

export function getRatingStats(courseId: number): RatingStats {
  const rows = db
    .select({ rating: courseRatings.rating })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .all();
  return summarizeRatings(rows.map((r) => r.rating));
}

/** Batched stats for many courses in one query (avoids N+1 on the list page). */
export function getRatingStatsForCourses(
  courseIds: number[]
): Map<number, RatingStats> {
  if (courseIds.length === 0) return new Map();
  const rows = db
    .select({
      courseId: courseRatings.courseId,
      rating: courseRatings.rating,
    })
    .from(courseRatings)
    .where(inArray(courseRatings.courseId, courseIds))
    .all();
  return summarizeRatingsByCourse(rows, courseIds);
}
