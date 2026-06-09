import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "~/db/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

/**
 * Creates a fresh in-memory SQLite database with all tables for testing.
 * Each call returns a new isolated database instance, migrated from the same
 * Drizzle migrations as the live database (so schemas never drift).
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const testDb = drizzle(sqlite, { schema });
  migrate(testDb, { migrationsFolder });

  return testDb;
}

export type TestDb = ReturnType<typeof createTestDb>;

/**
 * Seeds a minimal instructor + student + published course + module + lesson.
 * Returns the created rows for use in assertions.
 */
export function seedBaseData(testDb: TestDb) {
  const instructor = testDb
    .insert(schema.users)
    .values({
      name: "Test Instructor",
      email: "instructor@example.com",
      role: schema.UserRole.Instructor,
    })
    .returning()
    .get();

  const student = testDb
    .insert(schema.users)
    .values({
      name: "Test Student",
      email: "student@example.com",
      role: schema.UserRole.Student,
    })
    .returning()
    .get();

  const course = testDb
    .insert(schema.courses)
    .values({
      title: "Test Course",
      slug: "test-course",
      description: "A test course",
      instructorId: instructor.id,
      status: schema.CourseStatus.Published,
    })
    .returning()
    .get();

  const courseModule = testDb
    .insert(schema.modules)
    .values({ courseId: course.id, title: "Module 1", position: 0 })
    .returning()
    .get();

  const lesson = testDb
    .insert(schema.lessons)
    .values({
      moduleId: courseModule.id,
      title: "Lesson 1",
      slug: "lesson-1",
      content: "# Lesson 1\n\nSome content.",
      position: 0,
    })
    .returning()
    .get();

  return { instructor, student, course, courseModule, lesson };
}
