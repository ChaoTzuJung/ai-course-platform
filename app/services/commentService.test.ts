import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBaseData } from "~/test/setup";
import { lessonComments, UserRole } from "~/db/schema";
import {
  normalizeCommentBody,
  canPostComment,
  canDeleteComment,
} from "./commentService";

describe("normalizeCommentBody", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeCommentBody("  hello  ")).toBe("hello");
  });

  it("rejects an empty or whitespace-only body", () => {
    expect(normalizeCommentBody("")).toBeNull();
    expect(normalizeCommentBody("   ")).toBeNull();
  });

  it("rejects a body longer than 500 characters", () => {
    expect(normalizeCommentBody("a".repeat(501))).toBeNull();
  });

  it("accepts a body of exactly 500 characters", () => {
    const body = "a".repeat(500);
    expect(normalizeCommentBody(body)).toBe(body);
  });
});

describe("canPostComment", () => {
  const course = { instructorId: 10 };

  it("allows an enrolled student", () => {
    const user = { id: 1, role: UserRole.Student };
    expect(canPostComment(user, course, true)).toBe(true);
  });

  it("denies a non-enrolled student", () => {
    const user = { id: 1, role: UserRole.Student };
    expect(canPostComment(user, course, false)).toBe(false);
  });

  it("allows the course instructor even when not enrolled", () => {
    const user = { id: 10, role: UserRole.Instructor };
    expect(canPostComment(user, course, false)).toBe(true);
  });

  it("allows an admin even when not enrolled", () => {
    const user = { id: 99, role: UserRole.Admin };
    expect(canPostComment(user, course, false)).toBe(true);
  });
});

describe("canDeleteComment", () => {
  const course = { instructorId: 10 };

  it("allows the author", () => {
    const user = { id: 1, role: UserRole.Student };
    expect(canDeleteComment(user, { userId: 1 }, course)).toBe(true);
  });

  it("denies another student", () => {
    const user = { id: 2, role: UserRole.Student };
    expect(canDeleteComment(user, { userId: 1 }, course)).toBe(false);
  });

  it("allows the course instructor", () => {
    const user = { id: 10, role: UserRole.Instructor };
    expect(canDeleteComment(user, { userId: 1 }, course)).toBe(true);
  });

  it("allows an admin", () => {
    const user = { id: 99, role: UserRole.Admin };
    expect(canDeleteComment(user, { userId: 1 }, course)).toBe(true);
  });

  it("denies an instructor who does not own the course", () => {
    const user = { id: 11, role: UserRole.Instructor };
    expect(canDeleteComment(user, { userId: 1 }, course)).toBe(false);
  });
});

describe("lesson_comments schema", () => {
  it("inserts a comment with a null deletedAt by default", () => {
    const db = createTestDb();
    const { student, lesson } = seedBaseData(db);

    const row = db
      .insert(lessonComments)
      .values({ lessonId: lesson.id, userId: student.id, body: "Great lesson" })
      .returning()
      .get();

    expect(row.deletedAt).toBeNull();
    expect(row.body).toBe("Great lesson");

    const fetched = db
      .select()
      .from(lessonComments)
      .where(eq(lessonComments.lessonId, lesson.id))
      .all();
    expect(fetched).toHaveLength(1);
  });
});
