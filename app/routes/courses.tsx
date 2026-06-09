import { Link } from "react-router";
import type { Route } from "./+types/courses";
import { requireUser } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as ratingService from "~/services/ratingService";
import { CourseRating } from "~/components/course-rating";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export async function loader(args: Route.LoaderArgs) {
  await requireUser(args);
  const courses = courseService.getPublishedCourses();
  const stats = ratingService.getRatingStatsForCourses(
    courses.map((c) => c.id)
  );
  return {
    courses: courses.map((course) => ({
      ...course,
      rating: stats.get(course.id) ?? { average: null, count: 0 },
    })),
  };
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
                  <CourseRating
                    average={course.rating.average}
                    count={course.rating.count}
                    className="mt-1"
                  />
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
