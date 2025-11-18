import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { assertAIProvider, env } from './env';

const openai = env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    })
  : null;

const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    })
  : null;

export async function runStructuredWorkoutPrompt(prompt: string): Promise<string> {
  assertAIProvider();

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a world-class performance coach. Always respond with STRICT JSON that matches the requested schema. Never add commentary.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();

    if (!text) {
      throw new Error('OpenAI returned an empty response.');
    }

    return text;
  }

  if (anthropic) {
    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      temperature: 0.35,
      max_tokens: 1600,
      system:
        'You are a world-class performance coach. Always return STRICT JSON that matches the requested schema. Do not wrap your response in markdown.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    if (!text) {
      throw new Error('Anthropic returned an empty response.');
    }

    return text;
  }

  throw new Error('No AI provider configured.');
}
