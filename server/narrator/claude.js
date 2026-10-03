// Narrateur propulsé par Claude (API Anthropic).

import Anthropic from '@anthropic-ai/sdk';
import { extractPartialString } from './partialJson.js';
import { SYSTEM_PROMPT, buildIllustrationPrompt, buildTurnPrompt } from './prompts.js';
import { NARRATION_SCHEMA } from './schema.js';

// Si le modèle décline une requête, l'API la relance automatiquement sur un modèle de repli.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export class NarratorError extends Error {}

function textAfterLastFallback(content) {
  // En cas de repli en cours de route, seul le texte produit après le dernier bloc « fallback » compte.
  let text = '';
  for (const block of content) {
    if (block.type === 'fallback') text = '';
    else if (block.type === 'text') text += block.text;
  }
  return text;
}

function describeApiError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Clé API Anthropic invalide (vérifiez ANTHROPIC_API_KEY dans .env).';
  if (err instanceof Anthropic.PermissionDeniedError) return 'Cette clé API n’a pas accès au modèle demandé.';
  if (err instanceof Anthropic.NotFoundError) return 'Modèle introuvable (vérifiez NARRATOR_MODEL dans .env).';
  if (err instanceof Anthropic.RateLimitError) return 'Trop de requêtes vers l’API, réessayez dans un instant.';
  if (err instanceof Anthropic.BadRequestError) return `Requête refusée par l’API : ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Erreur de l’API (${err.status ?? 'réseau'}) : ${err.message}`;
  return err.message;
}

export class ClaudeNarrator {
  constructor({ model, effort, illustrations, illustratorModel }) {
    this.client = new Anthropic();
    this.model = model;
    this.effort = effort;
    this.illustrations = illustrations;
    this.illustratorModel = illustratorModel;
    this.label = `Claude (${model})`;
  }

  // Résout un tour. `onPartial(texte)` reçoit la narration au fur et à mesure.
  async narrate(game, request, onPartial = () => {}) {
    const stream = this.client.beta.messages.stream({
      model: this.model,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: {
        effort: this.effort,
        format: { type: 'json_schema', schema: NARRATION_SCHEMA },
      },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildTurnPrompt(game, request) }],
    });

    let buffer = '';
    stream.on('streamEvent', (event) => {
      if (event.type === 'content_block_start' && event.content_block.type === 'fallback') {
        buffer = '';
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        buffer += event.delta.text;
        const partial = extractPartialString(buffer, 'narration');
        if (partial) onPartial(partial);
      }
    });

    let message;
    try {
      message = await stream.finalMessage();
    } catch (err) {
      throw new NarratorError(describeApiError(err));
    }

    if (message.stop_reason === 'refusal') {
      throw new NarratorError('Le narrateur a refusé de poursuivre cette scène. Essayez une autre action.');
    }
    if (message.stop_reason === 'max_tokens') {
      throw new NarratorError('La réponse du narrateur a été coupée. Réessayez.');
    }
    try {
      return JSON.parse(textAfterLastFallback(message.content));
    } catch {
      throw new NarratorError('Réponse du narrateur illisible. Réessayez.');
    }
  }

  // Renvoie une petite illustration SVG de la scène, ou null.
  async illustrate(scene) {
    if (!this.illustrations) return null;
    const message = await this.client.beta.messages.create({
      model: this.illustratorModel,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: buildIllustrationPrompt(scene) }],
    });
    if (message.stop_reason !== 'end_turn') return null;
    const match = /<svg[\s\S]*<\/svg>/i.exec(textAfterLastFallback(message.content));
    return match ? match[0] : null;
  }
}
