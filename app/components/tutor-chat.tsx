import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface TutorChatProps {
  lessonId: number;
  initialMessages: UIMessage[];
}

export function TutorChat({ lessonId, initialMessages }: TutorChatProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    id: `lesson-${lessonId}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/tutor",
      body: { lessonId },
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">AI Tutor</h3>
        <p className="text-xs text-muted-foreground">
          Ask about this lesson.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet — try “Can you summarize this lesson?”
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user" ? "text-right" : "text-left"
            }
          >
            <div
              className={
                "inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm " +
                (message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground")
              }
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <span key={i}>{part.text}</span>
                ) : null
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the tutor…"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          {busy ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
