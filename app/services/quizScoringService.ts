// ─── Quiz Scoring Service ───
// Pure scoring logic — no database access, fully unit-tested. The route loads
// questions + the learner's answers and passes them here.

export interface ScorableQuestion {
  id: number;
  correctAnswer: string;
}

export interface QuestionResult {
  questionId: number;
  selected: string | null;
  correct: boolean;
}

export interface ScoreResult {
  total: number;
  correct: number;
  /** Fraction in the range 0–1. */
  score: number;
  results: QuestionResult[];
}

/**
 * Scores a set of questions against a map of { questionId: selectedOption }.
 * A missing answer counts as incorrect. Comparison is exact-string match
 * against each question's `correctAnswer`.
 */
export function scoreQuiz(
  questions: ScorableQuestion[],
  answers: Record<number, string>
): ScoreResult {
  const results: QuestionResult[] = questions.map((q) => {
    const selected = answers[q.id] ?? null;
    return {
      questionId: q.id,
      selected,
      correct: selected !== null && selected === q.correctAnswer,
    };
  });

  const correct = results.filter((r) => r.correct).length;
  const total = questions.length;
  const score = total > 0 ? correct / total : 0;

  return { total, correct, score, results };
}
