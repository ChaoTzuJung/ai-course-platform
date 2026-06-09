import { eq, desc } from "drizzle-orm";
import { db } from "~/db";
import {
  quizzes,
  quizQuestions,
  quizAttempts,
  QuestionType,
} from "~/db/schema";

// ─── Quiz Service ───
// Quiz + question persistence (options stored as JSON text) and attempts.

export interface QuestionInput {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
}

export interface QuestionView extends QuestionInput {
  id: number;
  position: number;
}

export function getQuizById(id: number) {
  return db.select().from(quizzes).where(eq(quizzes.id, id)).get();
}

export function getQuizByLesson(lessonId: number) {
  const quiz = db
    .select()
    .from(quizzes)
    .where(eq(quizzes.lessonId, lessonId))
    .get();
  if (!quiz) return null;

  const questions = getQuestions(quiz.id);
  return { ...quiz, questions };
}

export function getQuestions(quizId: number): QuestionView[] {
  const rows = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    prompt: r.prompt,
    options: JSON.parse(r.options) as string[],
    correctAnswer: r.correctAnswer,
    position: r.position,
  }));
}

/** Creates the quiz for a lesson if it doesn't exist; returns it either way. */
export function ensureQuizForLesson(lessonId: number, title: string) {
  const existing = db
    .select()
    .from(quizzes)
    .where(eq(quizzes.lessonId, lessonId))
    .get();
  if (existing) return existing;

  return db
    .insert(quizzes)
    .values({ lessonId, title })
    .returning()
    .get();
}

/** Replaces all questions for a quiz with the provided set (full overwrite). */
export function replaceQuestions(quizId: number, questions: QuestionInput[]) {
  db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId)).run();

  questions.forEach((q, index) => {
    db.insert(quizQuestions)
      .values({
        quizId,
        type: q.type,
        prompt: q.prompt,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        position: index,
      })
      .run();
  });
}

export function recordAttempt(
  userId: number,
  quizId: number,
  score: number,
  answers: Record<number, string>
) {
  return db
    .insert(quizAttempts)
    .values({ userId, quizId, score, answers: JSON.stringify(answers) })
    .returning()
    .get();
}

export function getAttemptsByUser(userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId))
    .orderBy(desc(quizAttempts.submittedAt))
    .all()
    .filter((a) => a.quizId === quizId);
}
