import { Link, data } from "react-router";
import type { Route } from "./+types/instructor.$courseId.lessons.$lessonId.quiz";
import { requireUser, requireRole } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as lessonService from "~/services/lessonService";
import * as quizService from "~/services/quizService";
import { quizGenerationSchema, type GeneratedQuestion } from "~/lib/validation";
import { UserRole } from "~/db/schema";
import { QuizEditor } from "~/components/quiz-editor";

function assertOwner(userId: number, role: UserRole, courseId: number) {
  const course = courseService.getCourseById(courseId);
  if (!course) throw data("Course not found", { status: 404 });
  if (course.instructorId !== userId && role !== UserRole.Admin) {
    throw data("Not your course", { status: 403 });
  }
}

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);
  assertOwner(user.id, user.role, Number(args.params.courseId));

  const lesson = lessonService.getLessonById(Number(args.params.lessonId));
  if (!lesson) throw data("Lesson not found", { status: 404 });

  const quiz = quizService.getQuizByLesson(lesson.id);
  const questions: GeneratedQuestion[] = quiz
    ? quiz.questions.map((q) => ({
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }))
    : [];

  return {
    lesson,
    courseId: args.params.courseId,
    questions,
  };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);
  assertOwner(user.id, user.role, Number(args.params.courseId));

  const lesson = lessonService.getLessonById(Number(args.params.lessonId));
  if (!lesson) throw data("Lesson not found", { status: 404 });

  const form = await args.request.formData();
  if (form.get("intent") !== "save") return null;

  const parsed = quizGenerationSchema.safeParse(
    JSON.parse(String(form.get("questionsJson") ?? "{}"))
  );
  if (!parsed.success) {
    return { error: "Some questions are invalid. Check each has a prompt, options, and a correct answer." };
  }

  const quiz = quizService.ensureQuizForLesson(
    lesson.id,
    `${lesson.title} — Quiz`
  );
  quizService.replaceQuestions(quiz.id, parsed.data.questions);
  return { saved: true };
}

export default function QuizEditorRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { lesson, courseId, questions } = loaderData;

  return (
    <div className="max-w-3xl">
      <Link
        to={`/instructor/${courseId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to course
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Quiz · {lesson.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate draft questions with AI, edit them, then save.
      </p>

      {actionData && "error" in actionData && actionData.error && (
        <p className="mt-4 text-sm text-destructive">{actionData.error}</p>
      )}

      <div className="mt-6">
        <QuizEditor
          lessonId={lesson.id}
          initialQuestions={questions}
          saved={actionData && "saved" in actionData ? actionData.saved : false}
        />
      </div>
    </div>
  );
}
