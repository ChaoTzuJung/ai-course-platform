import type { Route } from "./+types/api.quiz-generate";
import { requireUser, requireRole } from "~/lib/session.server";
import { generateQuizQuestions } from "~/lib/ai/quizgen.server";
import * as lessonService from "~/services/lessonService";
import { UserRole } from "~/db/schema";

// Instructor-only: generates draft quiz questions from a lesson's content and
// returns them as JSON for the quiz editor to populate. Does NOT save anything.

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);

  const body = (await args.request.json()) as {
    lessonId: number;
    count?: number;
  };

  const ctx = lessonService.getLessonWithContext(Number(body.lessonId));
  if (!ctx) {
    throw new Response("Lesson not found", { status: 404 });
  }

  const count = Math.min(Math.max(body.count ?? 5, 1), 10);
  const questions = await generateQuizQuestions(
    ctx.lessonTitle,
    ctx.lessonContent ?? "",
    count
  );

  return { questions };
}
