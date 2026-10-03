// Vérifie le narrateur Claude contre un faux serveur qui imite l'API Anthropic (aucun appel réel).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { Game } from '../server/game.js';
import { ClaudeNarrator, NarratorError } from '../server/narrator/claude.js';

let server;
let baseURL;
let nextResponse;
const requests = [];

before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requests.push({ headers: req.headers, body: JSON.parse(body) });
      nextResponse(res);
    });
  });
  await new Promise((resolve) => server.listen(0, resolve));
  baseURL = `http://localhost:${server.address().port}`;
});

after(() => server.close());

function sse(res, events) {
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  for (const event of events) res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  res.end();
}

function streamedMessage(text, stopReason = 'end_turn') {
  const chunks = text.match(/.{1,25}/gs) ?? [];
  return [
    {
      type: 'message_start',
      message: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 1 },
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'abc' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
    ...chunks.map((c) => ({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: c } })),
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 50 } },
    { type: 'message_stop' },
  ];
}

const RESULT = {
  jet: { utilise: true, caracteristique: 'DEX', difficulte: 12 },
  narration: 'Tu bondis par-dessus le comptoir.\n\nBorin, que fais-tu ?',
  effets: [],
  lieu: 'Taverne',
  changement_de_lieu: false,
  description_visuelle: '',
  ambiance: '🍺🔥',
  ennemis: [],
  journal: [],
  suggestions: ['Fuir', 'Combattre', 'Chanter'],
};

function setup() {
  const narrator = new ClaudeNarrator({
    model: 'claude-opus-5-5',
    effort: 'low',
    illustrations: true,
    illustratorModel: 'claude-opus-5-5',
  });
  narrator.client = new Anthropic({ baseURL, apiKey: 'cle-de-test', maxRetries: 0 });
  const game = Game.create('TEST');
  const a = game.addPlayer('Maxime');
  const b = game.addPlayer('Alban');
  game.setCharacter(a.id, { name: 'Aria', race: 'elfe', classKey: 'mage' });
  game.setCharacter(b.id, { name: 'Borin', race: 'nain', classKey: 'guerrier' });
  const request = {
    kind: 'action',
    actor: a,
    text: 'Je saute',
    d20: 12,
    totals: { FOR: 12, DEX: 15, CON: 13, INT: 15, SAG: 13, CHA: 13 },
    next: b,
  };
  return { narrator, game, request };
}

test('requête envoyée à l’API et narration reçue en continu', async () => {
  const { narrator, game, request } = setup();
  nextResponse = (res) => sse(res, streamedMessage(JSON.stringify(RESULT)));
  const partials = [];
  const result = await narrator.narrate(game, request, (t) => partials.push(t));

  assert.deepEqual(result, RESULT);
  assert.ok(partials.length > 1, 'la narration arrive par morceaux');
  assert.ok(partials.every((p) => RESULT.narration.startsWith(p)));

  const { body, headers } = requests.at(-1);
  assert.equal(body.model, 'claude-opus-5-5');
  assert.equal(body.stream, true);
  assert.equal(body.fallbacks, 'default');
  assert.match(headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(body.output_config.effort, 'low');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.deepEqual(body.system[0].cache_control, { type: 'ephemeral' });
  assert.match(body.messages[0].content, /Aria \(joué par Maxime\) : « Je saute »/);
});

test('un refus du modèle devient une erreur lisible', async () => {
  const { narrator, game, request } = setup();
  nextResponse = (res) => sse(res, streamedMessage('', 'refusal'));
  await assert.rejects(narrator.narrate(game, request), NarratorError);
});

test('une clé API invalide est signalée clairement', async () => {
  const { narrator, game, request } = setup();
  nextResponse = (res) => {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }));
  };
  await assert.rejects(narrator.narrate(game, request), /Clé API Anthropic invalide/);
});

test('illustration SVG extraite de la réponse', async () => {
  const { narrator } = setup();
  nextResponse = (res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'msg_2',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
        content: [
          {
            type: 'text',
            text: 'Voici :\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360"/></svg>',
          },
        ],
      }),
    );
  };
  const svg = await narrator.illustrate({ place: 'Taverne', description: 'Une taverne', mood: '🍺', world: 'Fantasy' });
  assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
  assert.equal(requests.at(-1).body.output_config.effort, 'low');
});
