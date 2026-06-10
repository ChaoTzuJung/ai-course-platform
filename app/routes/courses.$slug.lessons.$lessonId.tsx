import { Link, Form, redirect, data } from "react-router";
import type { UIMessage } from "ai";
import type { Route } from "./+types/courses.$slug.lessons.$lessonId";
import { requireUser } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as lessonService from "~/services/lessonService";
import * as enrollmentService from "~/services/enrollmentService";
import * as progressService from "~/services/progressService";
import * as quizService from "~/services/quizService";
import * as chatService from "~/services/chatService";
import * as commentService from "~/services/commentService";
import { scoreQuiz } from "~/services/quizScoringService";
import { renderMarkdown } from "~/lib/markdown.server";
import { LessonProgressStatus, UserRole } from "~/db/enums";
import { normalizeCommentBody } from "~/services/commentService";
import { Button, buttonVariants } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TutorChat } from "~/components/tutor-chat";
import { LessonComments } from "~/components/lesson-comments";

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  const course = courseService.getCourseBySlug(args.params.slug);
  if (!course) throw data("Course not found", { status: 404 });

  const enrolled = enrollmentService.isEnrolled(user.id, course.id);
  const canPost = commentService.canPostComment(user, course, enrolled);
  // Enrolled students learn here; the instructor/admin may also view to moderate.
  if (!canPost) {
    throw redirect(`/courses/${course.slug}`);
  }

  const lesson = lessonService.getLessonById(Number(args.params.lessonId));
  if (!lesson) throw data("Lesson not found", { status: 404 });

  const contentHtml = lesson.content
    ? await renderMarkdown(lesson.content)
    : "";

  const progress = progressService.getLessonProgress(user.id, lesson.id);

  const quizRow = quizService.getQuizByLesson(lesson.id);
  // Strip correctAnswer before sending to the client.
  const quiz = quizRow
    ? {
        id: quizRow.id,
        title: quizRow.title,
        questions: quizRow.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
        })),
      }
    : null;

  const history = chatService.getMessages(user.id, lesson.id);
  const initialMessages: UIMessage[] = history.map((m) => ({
    id: String(m.id),
    role: m.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: m.content }],
  }));

  const comments = commentService
    .getCommentsByLesson(lesson.id)
    .map((c) => ({
      ...c,
      authorRole: c.authorRole as UserRole,
      canDelete: commentService.canDeleteComment(user, c, course),
    }));

  return {
    course,
    lesson,
    contentHtml,
    status: progress?.status ?? LessonProgressStatus.NotStarted,
    quiz,
    initialMessages,
    comments,
    canPost,
  };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  const lesson = lessonService.getLessonById(Number(args.params.lessonId));
  if (!lesson) throw data("Lesson not found", { status: 404 });

  const form = await args.request.formData();
  const intent = form.get("intent");

  if (intent === "comment-create") {
    const course = courseService.getCourseBySlug(args.params.slug);
    if (!course) throw data("Course not found", { status: 404 });

    const enrolled = enrollmentService.isEnrolled(user.id, course.id);
    if (!commentService.canPostComment(user, course, enrolled)) {
      throw data("You can't comment on this lesson.", { status: 403 });
    }

    const body = normalizeCommentBody(String(form.get("body") ?? ""));
    if (body === null) {
      throw data("Comment must be 1–500 characters.", { status: 400 });
    }

    commentService.addComment(user.id, lesson.id, body);
    return { kind: "comment" as const };
  }

  if (intent === "comment-delete") {
    const course = courseService.getCourseBySlug(args.params.slug);
    if (!course) throw data("Course not found", { status: 404 });

    const commentId = Number(form.get("commentId"));
    const comment = commentService.getCommentById(commentId);
    if (!comment || comment.lessonId !== lesson.id) {
      throw data("Comment not found", { status: 404 });
    }
    if (!commentService.canDeleteComment(user, comment, course)) {
      throw data("You can't delete this comment.", { status: 403 });
    }

    commentService.softDeleteComment(commentId);
    return { kind: "comment" as const };
  }

  if (intent === "progress") {
    const status = form.get("status") as LessonProgressStatus;
    progressService.setLessonProgress(user.id, lesson.id, status);
    return { kind: "progress" as const };
  }

  if (intent === "quiz") {
    const quiz = quizService.getQuizByLesson(lesson.id);
    if (!quiz) throw data("Quiz not found", { status: 404 });

    const answers: Record<number, string> = {};
    for (const q of quiz.questions) {
      const value = form.get(`q_${q.id}`);
      if (typeof value === "string") answers[q.id] = value;
    }

    const result = scoreQuiz(
      quiz.questions.map((q) => ({ id: q.id, correctAnswer: q.correctAnswer })),
      answers
    );
    quizService.recordAttempt(user.id, quiz.id, result.score, answers);

    return {
      kind: "quiz" as const,
      score: result.score,
      correct: result.correct,
      total: result.total,
      results: result.results,
    };
  }

  return null;
}

export default function LessonView({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const {
    course,
    lesson,
    contentHtml,
    status,
    quiz,
    initialMessages,
    comments,
    canPost,
  } = loaderData;
  const completed = status === LessonProgressStatus.Completed;
  const quizResult =
    actionData && actionData.kind === "quiz" ? actionData : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <Link
          to={`/courses/${course.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {course.title}
        </Link>

        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {completed && <Badge variant="success">Completed</Badge>}
        </div>

        {lesson.videoUrl && (
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-border">
            <iframe
              className="h-full w-full"
              src={lesson.videoUrl}
              title={lesson.title}
              allowFullScreen
            />
          </div>
        )}

        {contentHtml ? (
          <div
            className="prose prose-neutral mt-6 max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="mt-6 text-muted-foreground">
            This lesson has no written content yet.
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <Form method="post">
            <input type="hidden" name="intent" value="progress" />
            <input
              type="hidden"
              name="status"
              value={
                completed
                  ? LessonProgressStatus.InProgress
                  : LessonProgressStatus.Completed
              }
            />
            <Button variant={completed ? "outline" : "default"} type="submit">
              {completed ? "Mark as not done" : "Mark complete"}
            </Button>
          </Form>
        </div>

        {quiz && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">{quiz.title}</h2>
            {quizResult && (
              <div className="mt-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
                You scored {quizResult.correct}/{quizResult.total} (
                {Math.round(quizResult.score * 100)}%).
              </div>
            )}
            <Form method="post" className="mt-4 space-y-6">
              <input type="hidden" name="intent" value="quiz" />
              {quiz.questions.map((q, qi) => {
                const r = quizResult?.results.find(
                  (x) => x.questionId === q.id
                );
                return (
                  <fieldset key={q.id} className="space-y-2">
                    <legend className="font-medium">
                      {qi + 1}. {q.prompt}
                      {r && (
                        <span
                          className={
                            "ml-2 text-xs " +
                            (r.correct ? "text-emerald-600" : "text-destructive")
                          }
                        >
                          {r.correct ? "correct" : "incorrect"}
                        </span>
                      )}
                    </legend>
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          defaultChecked={r?.selected === opt}
                        />
                        {opt}
                      </label>
                    ))}
                  </fieldset>
                );
              })}
              <Button type="submit">Submit quiz</Button>
            </Form>
          </section>
        )}

        <LessonComments comments={comments} canPost={canPost} />
      </div>

      <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)]">
        <TutorChat lessonId={lesson.id} initialMessages={initialMessages} />
      </div>
    </div>
  );
}
