import { db } from "~/db";
import {
  users,
  courses,
  modules,
  lessons,
  enrollments,
  lessonProgress,
  quizzes,
  quizQuestions,
  quizAttempts,
  chatMessages,
  UserRole,
  CourseStatus,
  LessonProgressStatus,
  QuestionType,
} from "~/db/schema";

// Wipe (child → parent order) so re-seeding is idempotent.
function reset() {
  db.delete(chatMessages).run();
  db.delete(quizAttempts).run();
  db.delete(quizQuestions).run();
  db.delete(quizzes).run();
  db.delete(lessonProgress).run();
  db.delete(enrollments).run();
  db.delete(lessons).run();
  db.delete(modules).run();
  db.delete(courses).run();
  db.delete(users).run();
}

function seed() {
  reset();

  // ─── Users (no clerkId → usable via dev-login) ───
  const instructor = db
    .insert(users)
    .values({
      name: "Ada Instructor",
      email: "instructor@example.com",
      role: UserRole.Instructor,
    })
    .returning()
    .get();

  const student = db
    .insert(users)
    .values({
      name: "Sam Student",
      email: "student@example.com",
      role: UserRole.Student,
    })
    .returning()
    .get();

  db.insert(users)
    .values({
      name: "Avery Admin",
      email: "admin@example.com",
      role: UserRole.Admin,
    })
    .run();

  // ─── Course 1: published, with modules/lessons + a quiz ───
  const jsCourse = db
    .insert(courses)
    .values({
      title: "JavaScript Fundamentals",
      slug: "javascript-fundamentals",
      description:
        "Learn the core of JavaScript: values, functions, and control flow.",
      instructorId: instructor.id,
      status: CourseStatus.Published,
    })
    .returning()
    .get();

  const m1 = db
    .insert(modules)
    .values({ courseId: jsCourse.id, title: "Getting Started", position: 0 })
    .returning()
    .get();

  const lesson1 = db
    .insert(lessons)
    .values({
      moduleId: m1.id,
      title: "Variables and Types",
      slug: "variables-and-types",
      position: 0,
      content: [
        "# Variables and Types",
        "",
        "JavaScript has `let`, `const`, and `var` for declaring variables.",
        "",
        "```js",
        "const name = \"Ada\";",
        "let count = 0;",
        "count += 1;",
        "```",
        "",
        "Primitive types include **string**, **number**, **boolean**, `null`,",
        "`undefined`, and **symbol**. Everything else is an object.",
      ].join("\n"),
    })
    .returning()
    .get();

  db.insert(lessons)
    .values({
      moduleId: m1.id,
      title: "Functions",
      slug: "functions",
      position: 1,
      content: [
        "# Functions",
        "",
        "Functions are reusable blocks of code.",
        "",
        "```js",
        "function add(a, b) {",
        "  return a + b;",
        "}",
        "const triple = (n) => n * 3;",
        "```",
      ].join("\n"),
    })
    .run();

  const m2 = db
    .insert(modules)
    .values({ courseId: jsCourse.id, title: "Control Flow", position: 1 })
    .returning()
    .get();

  db.insert(lessons)
    .values({
      moduleId: m2.id,
      title: "Conditionals and Loops",
      slug: "conditionals-and-loops",
      position: 0,
      content: [
        "# Conditionals and Loops",
        "",
        "Use `if`/`else` to branch and `for`/`while` to repeat.",
        "",
        "```js",
        "for (let i = 0; i < 3; i++) {",
        "  console.log(i);",
        "}",
        "```",
      ].join("\n"),
    })
    .run();

  // Quiz on lesson 1
  const quiz = db
    .insert(quizzes)
    .values({ lessonId: lesson1.id, title: "Variables and Types — Quiz" })
    .returning()
    .get();

  db.insert(quizQuestions)
    .values({
      quizId: quiz.id,
      type: QuestionType.MultipleChoice,
      prompt: "Which keyword declares a value that cannot be reassigned?",
      options: JSON.stringify(["let", "const", "var", "static"]),
      correctAnswer: "const",
      position: 0,
    })
    .run();

  db.insert(quizQuestions)
    .values({
      quizId: quiz.id,
      type: QuestionType.TrueFalse,
      prompt: "`null` is a primitive type in JavaScript.",
      options: JSON.stringify(["True", "False"]),
      correctAnswer: "True",
      position: 1,
    })
    .run();

  // ─── Course 2: published, lighter ───
  const cssCourse = db
    .insert(courses)
    .values({
      title: "CSS Layout Essentials",
      slug: "css-layout-essentials",
      description: "Master Flexbox and Grid to build responsive layouts.",
      instructorId: instructor.id,
      status: CourseStatus.Published,
    })
    .returning()
    .get();

  const cssM1 = db
    .insert(modules)
    .values({ courseId: cssCourse.id, title: "Flexbox", position: 0 })
    .returning()
    .get();

  db.insert(lessons)
    .values({
      moduleId: cssM1.id,
      title: "The Flex Container",
      slug: "the-flex-container",
      position: 0,
      content: [
        "# The Flex Container",
        "",
        "`display: flex` turns an element into a flex container.",
        "",
        "```css",
        ".row { display: flex; gap: 1rem; }",
        "```",
      ].join("\n"),
    })
    .run();

  // ─── Course 3: draft (instructor-only) ───
  db.insert(courses)
    .values({
      title: "Intro to TypeScript (draft)",
      slug: "intro-to-typescript",
      description: "A work-in-progress course — not yet published.",
      instructorId: instructor.id,
      status: CourseStatus.Draft,
    })
    .run();

  // ─── Enroll the student + mark first lesson complete ───
  db.insert(enrollments)
    .values({ userId: student.id, courseId: jsCourse.id })
    .run();

  db.insert(lessonProgress)
    .values({
      userId: student.id,
      lessonId: lesson1.id,
      status: LessonProgressStatus.Completed,
      completedAt: new Date().toISOString(),
    })
    .run();

  console.log("✅ Seed complete:");
  console.log("   users: instructor@example.com, student@example.com, admin@example.com");
  console.log("   courses: 2 published, 1 draft");
}

seed();
