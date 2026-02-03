import { config } from "dotenv";
import { join } from "path";

config();

export interface Config {
  geminiApiKey?: string;
  agentPath: string;
  useVertexAI: boolean;
}

export function loadConfig(): Config {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  return {
    geminiApiKey,
    agentPath: process.env.AGENT_PATH || "gemini --experimental-acp",
    useVertexAI: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true",
  };
}
