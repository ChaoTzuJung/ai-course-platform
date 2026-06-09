import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import { courseRatings } from "~/db/schema";
import { summarizeRatings, summarizeRatingsByCourse } from "./ratingService";

describe("summarizeRatings", () => {
  it("returns null average and zero count for no ratings", () => {
    expect(summarizeRatings([])).toEqual({ average: null, count: 0 });
  });

  it("averages a single rating", () => {
    expect(summarizeRatings([4])).toEqual({ average: 4, count: 1 });
  });

  it("averages multiple ratings", () => {
    expect(summarizeRatings([4, 5])).toEqual({ average: 4.5, count: 2 });
  });

  it("rounds the average to one decimal place", () => {
    // (3 + 4 + 4) / 3 = 3.666... -> 3.7
    expect(summarizeRatings([3, 4, 4])).toEqual({ average: 3.7, count: 3 });
  });
});

describe("summarizeRatingsByCourse", () => {
  it("groups ratings per course and includes empty stats for unrated courses", () => {
    const rows = [
      { courseId: 1, rating: 5 },
      { courseId: 1, rating: 3 },
      { courseId: 2, rating: 4 },
    ];

    const result = summarizeRatingsByCourse(rows, [1, 2, 3]);

    expect(result.get(1)).toEqual({ average: 4, count: 2 });
    expect(result.get(2)).toEqual({ average: 4, count: 1 });
    expect(result.get(3)).toEqual({ average: null, count: 0 });
  });
});

describe("course_ratings schema", () => {
  it("enforces one rating per (user, course)", () => {
    const db = createTestDb();
    const { student, course } = seedBaseData(db);

    db.insert(courseRatings)
      .values({ userId: student.id, courseId: course.id, rating: 4 })
      .run();

    expect(() =>
      db
        .insert(courseRatings)
        .values({ userId: student.id, courseId: course.id, rating: 2 })
        .run()
    ).toThrow();

    const rows = db
      .select()
      .from(courseRatings)
      .where(eq(courseRatings.userId, student.id))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].rating).toBe(4);
  });
});
