import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  OPENAI_API_KEY: z.string().min(20).optional(),
  AI_CHAT_MODEL: z.string().min(1).default("gpt-4.1-mini"),
});

export const env = envSchema.parse(process.env);
