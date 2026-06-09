import { Link, Form, data } from "react-router";
import type { Route } from "./+types/courses.$slug";
import { requireUser } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as enrollmentService from "~/services/enrollmentService";
import * as progressService from "~/services/progressService";
import * as ratingService from "~/services/ratingService";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { CourseRating, CourseRatingInput } from "~/components/course-rating";

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  const course = courseService.getCourseOutlineBySlug(args.params.slug);
  if (!course) throw data("Course not found", { status: 404 });

  const enrolled = enrollmentService.isEnrolled(user.id, course.id);
  const completed = new Set(
    progressService.getCompletedLessonIds(user.id, course.id)
  );
  const ratingStats = ratingService.getRatingStats(course.id);
  const userRating = enrolled
    ? (ratingService.getUserRating(user.id, course.id)?.rating ?? null)
    : null;

  return {
    course,
    enrolled,
    completedIds: [...completed],
    ratingStats,
    userRating,
  };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  const course = courseService.getCourseBySlug(args.params.slug);
  if (!course) throw data("Course not found", { status: 404 });

  const formData = await args.request.formData();
  const intent = formData.get("intent");

  if (intent === "rate") {
    if (!enrollmentService.isEnrolled(user.id, course.id)) {
      throw data("Enroll before rating this course.", { status: 403 });
    }
    const rating = Number(formData.get("rating"));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw data("Rating must be a whole number from 1 to 5.", { status: 400 });
    }
    ratingService.rateCourse(user.id, course.id, rating);
    return { ok: true };
  }

  enrollmentService.enroll(user.id, course.id);
  return { ok: true };
}

export default function CourseDetail({ loaderData }: Route.ComponentProps) {
  const { course, enrolled, completedIds, ratingStats, userRating } =
    loaderData;
  const completed = new Set(completedIds);
  const firstLesson = course.modules.flatMap((m) => m.lessons)[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <CourseRating
          average={ratingStats.average}
          count={ratingStats.count}
          className="mt-2"
        />
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
            <CourseRatingInput
              value={userRating}
              className="mt-6 border-t border-border pt-4"
            />
          </>
        ) : (
          <Form method="post">
            <input type="hidden" name="intent" value="enroll" />
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
