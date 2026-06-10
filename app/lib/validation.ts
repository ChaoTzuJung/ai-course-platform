import { z } from "zod";
import { QuestionType } from "~/db/schema";

// Max length for a lesson comment body (chars).
export const COMMENT_MAX_LENGTH = 500;

// ─── Shared Zod schemas ───
// Used by AI quiz generation (generateObject) and by the quiz-save action.

export const generatedQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  prompt: z.string().min(1).describe("The question text shown to the learner."),
  options: z
    .array(z.string().min(1))
    .min(2)
    .describe(
      "Answer choices. For true_false use exactly ['True','False']."
    ),
  correctAnswer: z
    .string()
    .min(1)
    .describe("Must exactly match one of the strings in options."),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const quizGenerationSchema = z.object({
  questions: z.array(generatedQuestionSchema),
});

export type QuizGeneration = z.infer<typeof quizGenerationSchema>;
