import { Link } from "react-router";
import type { Route } from "./+types/dashboard";
import { requireUser } from "~/lib/session.server";
import * as enrollmentService from "~/services/enrollmentService";
import * as progressService from "~/services/progressService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  const enrollments = enrollmentService.getEnrollmentsByUser(user.id);

  const courses = enrollments.map((e) => ({
    ...e,
    progress: progressService.getCourseProgress(user.id, e.courseId),
  }));

  return { courses };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { courses } = loaderData;

  return (
    <div>
      <h1 className="text-2xl font-bold">My learning</h1>

      {courses.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            You haven't enrolled in any courses yet.
          </p>
          <Link to="/courses" className={buttonVariants({})}>
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.courseId} to={`/courses/${course.courseSlug}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{course.courseTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${course.progress.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {course.progress.completed}/{course.progress.total} lessons
                    · {course.progress.percent}%
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
