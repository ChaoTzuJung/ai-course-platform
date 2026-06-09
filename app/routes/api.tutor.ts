import type { UIMessage } from "ai";
import type { Route } from "./+types/api.tutor";
import { requireUser } from "~/lib/session.server";
import { streamTutorResponse } from "~/lib/ai/tutor.server";
import * as lessonService from "~/services/lessonService";
import * as chatService from "~/services/chatService";
import { ChatRole } from "~/db/schema";

// Streams an AI-tutor reply grounded in a lesson. Consumed by the v5 useChat
// client on the lesson page.

function textOf(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("");
}

export async function action(args: Route.ActionArgs) {
  const user = await requireUser(args);

  const body = (await args.request.json()) as {
    messages: UIMessage[];
    lessonId: number;
  };
  const lessonId = Number(body.lessonId);
  const ctx = lessonService.getLessonWithContext(lessonId);
  if (!ctx) {
    throw new Response("Lesson not found", { status: 404 });
  }

  // Persist the learner's new message.
  const last = body.messages[body.messages.length - 1];
  const userText = textOf(last);
  if (last?.role === "user" && userText) {
    chatService.appendMessage(
      user.id,
      ctx.lessonId,
      ChatRole.User,
      userText
    );
  }

  return streamTutorResponse(
    {
      lessonTitle: ctx.lessonTitle,
      lessonContent: ctx.lessonContent,
      courseTitle: ctx.courseTitle,
      moduleTitle: ctx.moduleTitle,
    },
    body.messages,
    (assistantText) => {
      if (assistantText.trim()) {
        chatService.appendMessage(
          user.id,
          ctx.lessonId,
          ChatRole.Assistant,
          assistantText
        );
      }
    }
  );
}
