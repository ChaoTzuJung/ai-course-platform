import { generateObject } from "ai";
import { getModel } from "./provider.server";
import { quizGenerationSchema, type GeneratedQuestion } from "~/lib/validation";
import { QuestionType } from "~/db/schema";

// ─── AI Quiz Generation ───
// Turns lesson content into draft questions. Live mode uses generateObject with
// a Zod schema (guaranteed shape); stub mode returns deterministic placeholders.

export async function generateQuizQuestions(
  lessonTitle: string,
  lessonContent: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const model = getModel();
  if (!model) return stubQuestions(lessonTitle, count);

  const { object } = await generateObject({
    model,
    schema: quizGenerationSchema,
    prompt: [
      `Create ${count} quiz questions that test understanding of the lesson below.`,
      `Mix multiple_choice (4 options) and true_false (options exactly ["True","False"]).`,
      `Each question's correctAnswer MUST exactly match one of its options.`,
      "",
      `Lesson title: ${lessonTitle}`,
      "",
      "Lesson content:",
      lessonContent,
    ].join("\n"),
  });

  return object.questions;
}

function stubQuestions(
  lessonTitle: string,
  count: number
): GeneratedQuestion[] {
  const out: GeneratedQuestion[] = [];
  for (let i = 1; i <= count; i++) {
    if (i % 2 === 1) {
      out.push({
        type: QuestionType.MultipleChoice,
        prompt: `(Demo) Which statement best relates to "${lessonTitle}" (Q${i})?`,
        options: [
          "The key idea of this lesson",
          "An unrelated concept",
          "A common misconception",
          "None of the above",
        ],
        correctAnswer: "The key idea of this lesson",
      });
    } else {
      out.push({
        type: QuestionType.TrueFalse,
        prompt: `(Demo) "${lessonTitle}" introduces concept ${i}. True or false?`,
        options: ["True", "False"],
        correctAnswer: "True",
      });
    }
  }
  return out;
}
