import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../server/game.js';
import { buildTurnPrompt } from '../server/narrator/prompts.js';
import { extractPartialString } from '../server/narrator/partialJson.js';

function setup() {
  const game = Game.create('ABCD');
  const a = game.addPlayer('Maxime');
  const b = game.addPlayer('Alban');
  game.setCharacter(a.id, { name: 'Aria', race: 'elfe', classKey: 'mage' });
  game.setCharacter(b.id, { name: 'Borin', race: 'nain', classKey: 'guerrier' });
  a.connections = 1;
  b.connections = 1;
  return { game, a, b };
}

const effect = (personnage, fields) => ({
  personnage,
  pv: 0,
  xp: 0,
  or: 0,
  objets_gagnes: [],
  objets_perdus: [],
  etats_ajoutes: [],
  etats_retires: [],
  ...fields,
});

test('les tours alternent entre joueurs connectés', () => {
  const { game, a, b } = setup();
  game.turn.playerId = a.id;
  assert.equal(game.nextPlayerAfter(a.id), b);
  assert.equal(game.nextPlayerAfter(b.id), a);
  b.connections = 0;
  assert.equal(game.nextPlayerAfter(a.id), a, 'un joueur déconnecté est sauté');
});

test('effets : dégâts, soins, or, objets, états', () => {
  const { game } = setup();
  const borin = game.playerByCharacterName('borin').character;
  const lines = game.applyEffects([
    effect('Borin', {
      pv: -5,
      or: 10,
      objets_gagnes: [{ nom: 'Clé rouillée', quantite: 1, description: 'Ouvre quelque chose.' }],
      objets_perdus: [{ nom: 'Potion de soin', quantite: 1 }],
      etats_ajoutes: ['Empoisonné'],
    }),
  ]);
  assert.equal(borin.hp, borin.maxHp - 5);
  assert.equal(borin.gold, 25);
  assert.ok(borin.inventory.some((i) => i.name === 'Clé rouillée'));
  assert.ok(!borin.inventory.some((i) => i.name === 'Potion de soin'));
  assert.deepEqual(borin.conditions, ['Empoisonné']);
  assert.equal(lines.length, 1);

  game.applyEffects([effect('Borin', { pv: 999, etats_retires: ['empoisonné'] })]);
  assert.equal(borin.hp, borin.maxHp);
  assert.deepEqual(borin.conditions, []);
});

test('0 PV : à terre, puis relevé par des soins', () => {
  const { game } = setup();
  const aria = game.playerByCharacterName('Aria').character;
  game.applyEffects([effect('Aria', { pv: -100 })]);
  assert.equal(aria.hp, 0);
  assert.ok(aria.conditions.includes('À terre'));
  game.applyEffects([effect('Aria', { pv: 3 })]);
  assert.equal(aria.hp, 3);
  assert.ok(!aria.conditions.includes('À terre'));
});

test('montée de niveau avec l’expérience', () => {
  const { game } = setup();
  const aria = game.playerByCharacterName('Aria').character;
  const hpBefore = aria.maxHp;
  game.applyEffects([effect('Aria', { xp: 320 })]);
  assert.equal(aria.level, 3);
  assert.ok(aria.maxHp > hpBefore);
  assert.equal(aria.hp, aria.maxHp);
});

test('les effets pour un personnage inconnu sont ignorés', () => {
  const { game } = setup();
  assert.deepEqual(game.applyEffects([effect('Gandalf', { xp: 50 })]), []);
});

test('la vue publique ne révèle pas les jetons secrets', () => {
  const { game } = setup();
  const json = JSON.stringify(game.publicView());
  for (const p of game.players) assert.ok(!json.includes(p.token));
});

test('le contexte du narrateur contient fiches, journal et action', () => {
  const { game, a, b } = setup();
  game.addJournalNotes(['Quête : retrouver le chat du tavernier']);
  const entry = game.addLog({ type: 'action', playerId: a.id, text: 'Je lance un sort' });
  game.addLog({ type: 'chat', playerId: b.id, text: 'secret hors-jeu' });
  const prompt = buildTurnPrompt(game, {
    kind: 'action',
    actor: a,
    text: 'Je lance un sort',
    d20: 20,
    totals: { FOR: 19, DEX: 22, CON: 21, INT: 23, SAG: 20, CHA: 20 },
    next: b,
    actionLogId: entry.id,
  });
  assert.match(prompt, /### Aria — joué par Maxime/);
  assert.match(prompt, /retrouver le chat du tavernier/);
  assert.match(prompt, /20 naturel/);
  assert.match(prompt, /Le prochain à jouer sera Borin/);
  assert.doesNotMatch(prompt, /secret hors-jeu/);
});

test('extraction de la narration d’un JSON incomplet', () => {
  assert.equal(extractPartialString('{"jet":{"utilise":false},"narr', 'narration'), null);
  assert.equal(extractPartialString('{"narration":"Il était une', 'narration'), 'Il était une');
  assert.equal(extractPartialString('{"narration":"L\\u00e0 \\"oui\\"\\nfin","x":1}', 'narration'), 'Là "oui"\nfin');
  assert.equal(extractPartialString('{"narration":"coupé\\', 'narration'), 'coupé');
});
