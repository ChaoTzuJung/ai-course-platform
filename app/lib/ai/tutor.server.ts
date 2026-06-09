import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { getModel } from "./provider.server";

// ─── AI Tutor ───
// Streams a tutor reply grounded in a single lesson. Live mode uses the model;
// stub mode emits a deterministic streamed reply so the chat UX works keyless.

export interface TutorContext {
  lessonTitle: string;
  lessonContent: string | null;
  courseTitle: string;
  moduleTitle: string;
}

export function buildTutorSystemPrompt(ctx: TutorContext): string {
  return [
    "You are an AI tutor helping a learner understand one specific lesson.",
    `Course: ${ctx.courseTitle}`,
    `Module: ${ctx.moduleTitle}`,
    `Lesson: ${ctx.lessonTitle}`,
    "",
    "Lesson content (Markdown):",
    ctx.lessonContent?.trim() || "(this lesson has no written content yet)",
    "",
    "Answer the learner's questions about THIS lesson. Be concise and clear,",
    "use small concrete examples, and aim to build understanding rather than",
    "just give answers. If a question falls outside this lesson's scope, say so",
    "briefly and steer the learner back to the lesson.",
  ].join("\n");
}

/** Returns a UI-message-stream Response consumable by the v5 `useChat` client. */
export function streamTutorResponse(
  ctx: TutorContext,
  messages: UIMessage[],
  onFinish?: (assistantText: string) => void
): Response {
  const model = getModel();
  if (!model) return stubTutorResponse(ctx, onFinish);

  const result = streamText({
    model,
    system: buildTutorSystemPrompt(ctx),
    messages: convertToModelMessages(messages),
    onFinish: ({ text }) => onFinish?.(text),
  });
  return result.toUIMessageStreamResponse();
}

function stubTutorResponse(
  ctx: TutorContext,
  onFinish?: (assistantText: string) => void
): Response {
  const text =
    `**(Demo tutor — no AI provider configured.)** ` +
    `I'd normally answer your question about "${ctx.lessonTitle}" using this ` +
    `lesson's content. Set OPENAI_API_KEY or ANTHROPIC_API_KEY (and AI_PROVIDER) ` +
    `to get real, lesson-grounded answers.`;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = "stub-text";
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id });
      for (const word of text.split(" ")) {
        writer.write({ type: "text-delta", id, delta: word + " " });
        await new Promise((r) => setTimeout(r, 8));
      }
      writer.write({ type: "text-end", id });
      onFinish?.(text);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
