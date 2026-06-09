import { Link } from "react-router";
import type { Route } from "./+types/courses";
import { requireUser } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export async function loader(args: Route.LoaderArgs) {
  await requireUser(args);
  return { courses: courseService.getPublishedCourses() };
}

export default function Courses({ loaderData }: Route.ComponentProps) {
  const { courses } = loaderData;

  return (
    <div>
      <h1 className="text-2xl font-bold">Browse courses</h1>
      {courses.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No published courses yet.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.slug}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>by {course.instructorName}</CardDescription>
                </CardHeader>
                <CardContent className="line-clamp-3 text-sm text-muted-foreground">
                  {course.description}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
