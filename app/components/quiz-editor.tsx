import { useState } from "react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { QuestionType } from "~/db/enums";
import type { GeneratedQuestion } from "~/lib/validation";

interface QuizEditorProps {
  lessonId: number;
  initialQuestions: GeneratedQuestion[];
  saved?: boolean;
}

function blankQuestion(): GeneratedQuestion {
  return {
    type: QuestionType.MultipleChoice,
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  };
}

export function QuizEditor({
  lessonId,
  initialQuestions,
  saved,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(
    initialQuestions
  );
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<GeneratedQuestion>) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  }

  function setType(index: number, type: QuestionType) {
    const options =
      type === QuestionType.TrueFalse ? ["True", "False"] : ["", "", "", ""];
    update(index, { type, options, correctAnswer: "" });
  }

  function setOption(index: number, optIndex: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== index) return q;
        const options = q.options.map((o, oi) => (oi === optIndex ? value : o));
        return { ...q, options };
      })
    );
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, count }),
      });
      if (!res.ok) throw new Error(`Generation failed (${res.status})`);
      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // Normalize correctAnswer to a valid option before submitting.
  const normalized = questions.map((q) => ({
    ...q,
    correctAnswer: q.options.includes(q.correctAnswer)
      ? q.correctAnswer
      : (q.options[0] ?? ""),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <Label htmlFor="count">How many?</Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20"
          />
        </div>
        <Button type="button" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : "Generate with AI"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>

      {questions.map((q, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Question {i + 1}</span>
            <button
              type="button"
              className="text-sm text-destructive"
              onClick={() =>
                setQuestions((qs) => qs.filter((_, idx) => idx !== i))
              }
            >
              Remove
            </button>
          </div>

          <Textarea
            value={q.prompt}
            onChange={(e) => update(i, { prompt: e.target.value })}
            placeholder="Question prompt"
          />

          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={q.type === QuestionType.MultipleChoice}
                onChange={() => setType(i, QuestionType.MultipleChoice)}
              />
              Multiple choice
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={q.type === QuestionType.TrueFalse}
                onChange={() => setType(i, QuestionType.TrueFalse)}
              />
              True / false
            </label>
          </div>

          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <Input
                key={oi}
                value={opt}
                onChange={(e) => setOption(i, oi, e.target.value)}
                placeholder={`Option ${oi + 1}`}
                disabled={q.type === QuestionType.TrueFalse}
              />
            ))}
          </div>

          <div className="space-y-1">
            <Label>Correct answer</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={q.correctAnswer}
              onChange={(e) => update(i, { correctAnswer: e.target.value })}
            >
              <option value="">— pick —</option>
              {q.options
                .filter((o) => o.length > 0)
                .map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
            </select>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
        >
          Add question
        </Button>

        <Form method="post">
          <input type="hidden" name="intent" value="save" />
          <input
            type="hidden"
            name="questionsJson"
            value={JSON.stringify({ questions: normalized })}
          />
          <Button type="submit" disabled={questions.length === 0}>
            Save quiz
          </Button>
        </Form>

        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </div>
  );
}
