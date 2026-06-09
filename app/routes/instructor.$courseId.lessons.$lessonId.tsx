import { Link, Form, data } from "react-router";
import type { Route } from "./+types/instructor.$courseId.lessons.$lessonId";
import { requireUser, requireRole } from "~/lib/session.server";
import * as courseService from "~/services/courseService";
import * as lessonService from "~/services/lessonService";
import { UserRole } from "~/db/schema";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";

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
  return { lesson, courseId: args.params.courseId };
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);
  requireRole(user, UserRole.Instructor, UserRole.Admin);
  assertOwner(user.id, user.role, Number(args.params.courseId));

  const form = await args.request.formData();
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "");
  const videoUrl = String(form.get("videoUrl") ?? "").trim() || null;

  lessonService.updateLesson(
    Number(args.params.lessonId),
    title,
    content || null,
    videoUrl
  );
  return { saved: true };
}

export default function EditLesson({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { lesson, courseId } = loaderData;

  return (
    <div className="max-w-3xl">
      <Link
        to={`/instructor/${courseId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to course
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit lesson</h1>

      <Form method="post" className="mt-6 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={lesson.title} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="videoUrl">Video embed URL (optional)</Label>
          <Input
            id="videoUrl"
            name="videoUrl"
            defaultValue={lesson.videoUrl ?? ""}
            placeholder="https://www.youtube.com/embed/…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="content">Content (Markdown)</Label>
          <Textarea
            id="content"
            name="content"
            defaultValue={lesson.content ?? ""}
            className="min-h-80 font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">Save lesson</Button>
          <Link
            to={`/instructor/${courseId}/lessons/${lesson.id}/quiz`}
            className={buttonVariants({ variant: "outline" })}
          >
            Edit quiz
          </Link>
          {actionData?.saved && (
            <span className="text-sm text-emerald-600">Saved</span>
          )}
        </div>
      </Form>
    </div>
  );
}
