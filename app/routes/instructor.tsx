import { Link, Form, redirect } from "react-router";
import type { Route } from "./+types/instructor";
import { requireUser, requireRole } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import { UserRole } from "~/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "course"}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);
  return { courses: courseService.getCoursesByInstructor(user.id) };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);

  const form = await args.request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!title || !description) {
    return { error: "Title and description are required." };
  }

  const course = courseService.createCourse(
    title,
    slugify(title),
    description,
    user.id,
    null
  );
  return redirect(`/instructor/${course.id}`);
}

export default function InstructorHome({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { courses } = loaderData;

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">Your courses</h1>
        {courses.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No courses yet — create one on the right.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <Link key={course.id} to={`/instructor/${course.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{course.title}</CardTitle>
                      <Badge
                        variant={
                          course.status === "published"
                            ? "success"
                            : "secondary"
                        }
                      >
                        {course.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="line-clamp-2 text-sm text-muted-foreground">
                    {course.description}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <aside className="h-fit rounded-xl border border-border p-6">
        <h2 className="font-semibold">New course</h2>
        <Form method="post" className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" required />
          </div>
          {actionData && "error" in actionData && actionData.error && (
            <p className="text-sm text-destructive">{actionData.error}</p>
          )}
          <Button type="submit" className="w-full">
            Create course
          </Button>
        </Form>
      </aside>
    </div>
  );
}
