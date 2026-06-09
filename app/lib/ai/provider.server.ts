import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// ─── AI Provider ───
// The single place provider selection lives. Everything else asks for a model
// via getModel(); a null result means "stub mode" (no key configured).

export type ProviderName = "anthropic" | "openai" | "stub";

/**
 * Resolves the active provider. Explicit AI_PROVIDER wins; otherwise we
 * auto-detect from whichever API key is present, falling back to the stub.
 */
export function resolveProvider(): ProviderName {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "anthropic" || explicit === "openai" || explicit === "stub") {
    return explicit;
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "stub";
}

export function hasLiveProvider(): boolean {
  return resolveProvider() !== "stub";
}

/** Returns a configured language model, or null in stub mode. */
export function getModel(): LanguageModel | null {
  switch (resolveProvider()) {
    case "anthropic":
      return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8");
    case "openai":
      return openai(process.env.OPENAI_MODEL ?? "gpt-4.1");
    default:
      return null;
  }
}
