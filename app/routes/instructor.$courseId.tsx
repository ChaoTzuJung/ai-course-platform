import { Link, Form, data } from "react-router";
import type { Route } from "./+types/instructor.$courseId";
import { requireUser, requireRole, type AppUser } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as moduleService from "~/services/moduleService";
import * as lessonService from "~/services/lessonService";
import { UserRole, CourseStatus } from "~/db/enums";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";

function requireOwnedCourse(user: AppUser, courseId: number) {
  const course = courseService.getCourseById(courseId);
  if (!course) throw data("Course not found", { status: 404 });
  if (course.instructorId !== user.id && user.role !== UserRole.Admin) {
    throw data("Not your course", { status: 403 });
  }
  return course;
}

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);
  requireOwnedCourse(user, Number(args.params.courseId));
  const outline = courseService.getCourseOutline(Number(args.params.courseId));
  return { course: outline! };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);
  const courseId = Number(args.params.courseId);
  requireOwnedCourse(user, courseId);

  const form = await args.request.formData();
  const intent = form.get("intent");

  if (intent === "publish") {
    courseService.updateCourseStatus(courseId, CourseStatus.Published);
  } else if (intent === "unpublish") {
    courseService.updateCourseStatus(courseId, CourseStatus.Draft);
  } else if (intent === "add-module") {
    const title = String(form.get("title") ?? "").trim();
    if (title) moduleService.createModule(courseId, title);
  } else if (intent === "add-lesson") {
    const moduleId = Number(form.get("moduleId"));
    const title = String(form.get("title") ?? "").trim();
    if (title && Number.isFinite(moduleId)) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      lessonService.createLesson(moduleId, title, slug, null, null);
    }
  }

  return null;
}

export default function ManageCourse({ loaderData }: Route.ComponentProps) {
  const { course } = loaderData;
  const published = course.status === CourseStatus.Published;

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <Badge variant={published ? "success" : "secondary"}>
          {course.status}
        </Badge>
        <Form method="post" className="ml-auto">
          <input
            type="hidden"
            name="intent"
            value={published ? "unpublish" : "publish"}
          />
          <Button variant={published ? "outline" : "default"} type="submit">
            {published ? "Unpublish" : "Publish"}
          </Button>
        </Form>
      </div>

      <div className="mt-8 space-y-8">
        {course.modules.map((mod) => (
          <div key={mod.id} className="rounded-xl border border-border p-5">
            <h2 className="font-semibold">{mod.title}</h2>
            <ul className="mt-3 divide-y divide-border">
              {mod.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex items-center justify-between py-2"
                >
                  <span>{lesson.title}</span>
                  <span className="flex gap-2">
                    <Link
                      to={`/instructor/${course.id}/lessons/${lesson.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/instructor/${course.id}/lessons/${lesson.id}/quiz`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Quiz
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
            <Form method="post" className="mt-3 flex gap-2">
              <input type="hidden" name="intent" value="add-lesson" />
              <input type="hidden" name="moduleId" value={mod.id} />
              <Input name="title" placeholder="New lesson title" />
              <Button type="submit" variant="secondary">
                Add lesson
              </Button>
            </Form>
          </div>
        ))}
      </div>

      <Form method="post" className="mt-8 flex max-w-md gap-2">
        <input type="hidden" name="intent" value="add-module" />
        <Input name="title" placeholder="New module title" />
        <Button type="submit">Add module</Button>
      </Form>
    </div>
  );
}
