// Choix du narrateur selon la configuration (.env).

import { ClaudeNarrator } from './claude.js';
import { DemoNarrator } from './demo.js';

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

export function createNarrator(env = process.env) {
  const mode = (env.NARRATEUR ?? 'auto').toLowerCase();
  const hasCredentials = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  if (mode === 'demo' || (mode !== 'claude' && !hasCredentials)) return new DemoNarrator();

  const model = env.NARRATOR_MODEL || 'claude-sonnet-5-5';
  return new ClaudeNarrator({
    model,
    effort: EFFORTS.includes(env.NARRATOR_EFFORT) ? env.NARRATOR_EFFORT : 'low',
    illustrations: (env.ILLUSTRATIONS ?? 'oui').toLowerCase() !== 'non',
    illustratorModel: env.ILLUSTRATOR_MODEL || model,
  });
}
