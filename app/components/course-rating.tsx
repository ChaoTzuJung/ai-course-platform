import { useState } from "react";
import { Form } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

function Stars({ filled, className }: { filled: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-hidden="true">
      {STAR_VALUES.map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= filled
              ? "fill-yellow-400 text-yellow-400"
              : "fill-transparent text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  );
}

/**
 * Read-only average display: filled stars + "x.x (count)", or a neutral
 * "No ratings yet" placeholder when the course has no ratings.
 */
export function CourseRating({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  if (count === 0 || average === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
          className
        )}
      >
        <Stars filled={0} />
        No ratings yet
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm", className)}
      aria-label={`Average rating ${average} out of 5 from ${count} ${
        count === 1 ? "rating" : "ratings"
      }`}
    >
      <Stars filled={Math.round(average)} />
      <span className="font-medium">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

/**
 * Interactive star control for enrolled students. Submits `intent=rate` +
 * `rating` to the course detail route's action. Pre-filled with the student's
 * current rating (if any); hovering previews the value before submit.
 */
export function CourseRatingInput({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;

  return (
    <Form method="post" className={cn("space-y-2", className)}>
      <input type="hidden" name="intent" value="rate" />
      <p className="text-sm font-medium">
        {value ? "Your rating" : "Rate this course"}
      </p>
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {STAR_VALUES.map((n) => (
          <button
            key={n}
            type="submit"
            name="rating"
            value={n}
            onMouseEnter={() => setHover(n)}
            aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "size-6",
                n <= active
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
    </Form>
  );
}
