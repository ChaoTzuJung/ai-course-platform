import { describe, it, expect } from "vitest";
import { scoreQuiz, type ScorableQuestion } from "./quizScoringService";

const questions: ScorableQuestion[] = [
  { id: 1, correctAnswer: "Paris" },
  { id: 2, correctAnswer: "True" },
  { id: 3, correctAnswer: "42" },
];

describe("scoreQuiz", () => {
  it("scores a perfect attempt", () => {
    const result = scoreQuiz(questions, { 1: "Paris", 2: "True", 3: "42" });
    expect(result.correct).toBe(3);
    expect(result.total).toBe(3);
    expect(result.score).toBe(1);
    expect(result.results.every((r) => r.correct)).toBe(true);
  });

  it("scores a partial attempt", () => {
    const result = scoreQuiz(questions, { 1: "Paris", 2: "False", 3: "42" });
    expect(result.correct).toBe(2);
    expect(result.score).toBeCloseTo(2 / 3);
  });

  it("counts missing answers as incorrect", () => {
    const result = scoreQuiz(questions, { 1: "Paris" });
    expect(result.correct).toBe(1);
    const q2 = result.results.find((r) => r.questionId === 2)!;
    expect(q2.selected).toBeNull();
    expect(q2.correct).toBe(false);
  });

  it("is case- and exact-match sensitive", () => {
    const result = scoreQuiz(questions, { 1: "paris" });
    expect(result.correct).toBe(0);
  });

  it("returns score 0 for an empty quiz", () => {
    const result = scoreQuiz([], {});
    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
  });
});
