import { anthropic } from "@ai-sdk/anthropic";

// Initializes and exports the Anthropic language model instance
// configured for "claude-3-5-sonnet-20240620".
export const model = anthropic("claude-3-5-sonnet-20240620");
