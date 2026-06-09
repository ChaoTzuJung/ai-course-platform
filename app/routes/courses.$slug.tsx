import { Link, Form, data } from "react-router";
import type { Route } from "./+types/courses.$slug";
import { requireUser } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as enrollmentService from "~/services/enrollmentService";
import * as progressService from "~/services/progressService";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  const course = courseService.getCourseOutlineBySlug(args.params.slug);
  if (!course) throw data("Course not found", { status: 404 });

  const enrolled = enrollmentService.isEnrolled(user.id, course.id);
  const completed = new Set(
    progressService.getCompletedLessonIds(user.id, course.id)
  );

  return { course, enrolled, completedIds: [...completed] };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  const course = courseService.getCourseBySlug(args.params.slug);
  if (!course) throw data("Course not found", { status: 404 });
  enrollmentService.enroll(user.id, course.id);
  return { ok: true };
}

export default function CourseDetail({ loaderData }: Route.ComponentProps) {
  const { course, enrolled, completedIds } = loaderData;
  const completed = new Set(completedIds);
  const firstLesson = course.modules.flatMap((m) => m.lessons)[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="mt-2 text-muted-foreground">{course.description}</p>

        <div className="mt-8 space-y-6">
          {course.modules.map((mod) => (
            <div key={mod.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {mod.title}
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {mod.lessons.map((lesson) => {
                  const isDone = completed.has(lesson.id);
                  const inner = (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span>{lesson.title}</span>
                      {isDone && <Badge variant="success">Done</Badge>}
                    </div>
                  );
                  return (
                    <li key={lesson.id}>
                      {enrolled ? (
                        <Link
                          to={`/courses/${course.slug}/lessons/${lesson.id}`}
                          className="block hover:bg-accent"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="text-muted-foreground">{inner}</div>
                      )}
                    </li>
                  );
                })}
                {mod.lessons.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    No lessons yet.
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <aside className="h-fit rounded-xl border border-border p-6">
        {enrolled ? (
          <>
            <Badge variant="success">Enrolled</Badge>
            {firstLesson && (
              <Link
                to={`/courses/${course.slug}/lessons/${firstLesson.id}`}
                className="mt-4 block"
              >
                <Button className="w-full">Continue learning</Button>
              </Link>
            )}
          </>
        ) : (
          <Form method="post">
            <p className="mb-4 text-sm text-muted-foreground">
              Enroll to access lessons and the AI tutor.
            </p>
            <Button type="submit" className="w-full">
              Enroll — free
            </Button>
          </Form>
        )}
      </aside>
    </div>
  );
}
