import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

// Fail fast if API key missing
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
}

// Export LLM instance
export const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY, // Explicit binding (important)
    modelName: "gemini-2.5-flash",        // Avoid using 'latest' in production
    temperature: 0.1,                  // Deterministic for bug fixing
    maxOutputTokens: 8192,
    topP: 0.9,
    timeout: 60_000                    // 60s safety timeout
});
