import { Form } from "react-router";
import { UserRole } from "~/db/enums";
import { COMMENT_MAX_LENGTH } from "~/lib/validation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";

export interface LessonComment {
  id: number;
  body: string;
  deletedAt: string | null;
  createdAt: string;
  userId: number;
  authorName: string;
  authorRole: UserRole;
  /** Whether the current viewer may delete this comment. */
  canDelete: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LessonComments({
  comments,
  canPost,
}: {
  comments: LessonComment[];
  canPost: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Discussion</h2>

      {canPost && (
        <Form method="post" className="mt-4 space-y-2">
          <input type="hidden" name="intent" value="comment-create" />
          <Textarea
            name="body"
            required
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Add a comment…"
            aria-label="Add a comment"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Post comment
            </Button>
          </div>
        </Form>
      )}

      <ul className="mt-6 space-y-4">
        {comments.length === 0 && (
          <li className="text-sm text-muted-foreground">No comments yet.</li>
        )}

        {comments.map((comment) =>
          comment.deletedAt ? (
            <li
              key={comment.id}
              className="text-sm italic text-muted-foreground"
            >
              [Comment removed]
            </li>
          ) : (
            <li
              key={comment.id}
              className="rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.authorName}
                  </span>
                  {comment.authorRole === UserRole.Instructor && (
                    <Badge variant="secondary">Instructor</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                {comment.canDelete && (
                  <Form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value="comment-delete"
                    />
                    <input type="hidden" name="commentId" value={comment.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </Form>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
            </li>
          )
        )}
      </ul>
    </section>
  );
}
