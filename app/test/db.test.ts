import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "./setup";
import { enrollments } from "~/db/schema";

// Validates that the Drizzle migrations apply cleanly to a fresh database and
// that key constraints (FKs, the unique enrollment index) behave as expected.

describe("database schema", () => {
  it("migrates and seeds base data", () => {
    const db = createTestDb();
    const { instructor, student, course, lesson } = seedBaseData(db);

    expect(instructor.role).toBe("instructor");
    expect(course.instructorId).toBe(instructor.id);
    expect(lesson.title).toBe("Lesson 1");
    expect(student.id).toBeGreaterThan(0);
  });

  it("enforces the unique (user, course) enrollment index", () => {
    const db = createTestDb();
    const { student, course } = seedBaseData(db);

    db.insert(enrollments)
      .values({ userId: student.id, courseId: course.id })
      .run();

    expect(() =>
      db
        .insert(enrollments)
        .values({ userId: student.id, courseId: course.id })
        .run()
    ).toThrow();

    const rows = db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, student.id))
      .all();
    expect(rows).toHaveLength(1);
  });
});
