import { Link } from "react-router";
import type { Route } from "./+types/home";
import * as courseService from "~/services/courseService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "AI Course Platform" },
    {
      name: "description",
      content: "Learn faster with an AI tutor grounded in every lesson.",
    },
  ];
}

export function loader(_: Route.LoaderArgs) {
  return { courses: courseService.getPublishedCourses() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { courses } = loaderData;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
          <span className="font-bold">AI Course Platform</span>
          <Link
            to="/dashboard"
            className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
          >
            Go to app
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Learn faster with an AI tutor in every lesson
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Browse courses, ask the built-in tutor about anything in the lesson,
          and test yourself with AI-generated quizzes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/courses" className={buttonVariants({ size: "lg" })}>
            Browse courses
          </Link>
          <Link
            to="/dashboard"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            My dashboard
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-4 text-lg font-semibold">Published courses</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published courses yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.slug}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>
                      by {course.instructorName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="line-clamp-3 text-sm text-muted-foreground">
                    {course.description}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
