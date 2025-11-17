import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
});

const parsed = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
});

export const env = {
  ...parsed,
  OPENAI_MODEL: parsed.OPENAI_MODEL ?? 'gpt-4o-mini',
  ANTHROPIC_MODEL: parsed.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
};

export const hasAIProvider = Boolean(env.OPENAI_API_KEY ?? env.ANTHROPIC_API_KEY);

export function assertAIProvider() {
  if (!hasAIProvider) {
    throw new Error('Set OPENAI_API_KEY or ANTHROPIC_API_KEY to use the workout generator.');
  }
}
