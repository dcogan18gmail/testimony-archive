import OpenAI from "openai";

/**
 * Create an OpenAI client using the API key passed from the browser.
 * This runs server-side only (API routes).
 */
export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}
