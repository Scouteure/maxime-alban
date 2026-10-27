import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../server/game.js';
import { buildTurnPrompt } from '../server/narrator/prompts.js';
import { LOOK } from '../server/personnalisation.js';
import {
  CLASSES,
  ORIGINS,
  RACES,
  SKILLS,
  createCharacter,
  pointBuyCost,
  resolveSkills,
  skillTotals,
  upgradeCharacter,
  validBaseStats,
} from '../server/rules.js';

test('chaque classe et chaque race est cohérente', () => {
  for (const [key, cls] of Object.entries(CLASSES)) {
    assert.equal(cls.priorities.length, 6, key);
    assert.ok(cls.skillChoices.length >= cls.skillCount, key);
    assert.ok(cls.skillChoices.every((k) => SKILLS[k]), key);
    for (const [field, value] of Object.entries(cls.look)) assert.ok(LOOK[field].options[value], `${key}.${field}`);
  }
  for (const [key, race] of Object.entries(RACES)) {
    assert.ok((race.skills ?? []).every((k) => SKILLS[k]), key);
    for (const [field, value] of Object.entries(race.look)) assert.ok(LOOK[field].options[value], `${key}.${field}`);
  }
  for (const [key, origin] of Object.entries(ORIGINS)) assert.ok(origin.skills.every((k) => SKILLS[k]), key);
});

test('achat de points : budget de 27 respecté', () => {
  const ok = { FOR: 15, DEX: 14, CON: 13, INT: 12, SAG: 10, CHA: 8 };
  assert.equal(pointBuyCost(ok), 27);
  assert.deepEqual(validBaseStats({ statMethod: 'achat', baseStats: ok, classKey: 'guerrier' }), ok);
  const greedy = { FOR: 15, DEX: 15, CON: 15, INT: 15, SAG: 15, CHA: 15 };
  const fallback = validBaseStats({ statMethod: 'achat', baseStats: greedy, classKey: 'mage' });
  assert.equal(fallback.INT, 15);
  assert.equal(fallback.FOR, 8, 'triche refusée : répartition standard');
});

test('jets de dés : seules les valeurs tirées par le serveur sont acceptées', () => {
  const rolled = [17, 16, 12, 11, 9, 7];
  const placed = { FOR: 7, DEX: 17, CON: 16, INT: 12, SAG: 11, CHA: 9 };
  assert.deepEqual(validBaseStats({ statMethod: 'des', baseStats: placed, rolledPool: rolled, classKey: 'voleur' }), placed);
  const forged = { ...placed, FOR: 18 };
  assert.notDeepEqual(validBaseStats({ statMethod: 'des', baseStats: forged, rolledPool: rolled, classKey: 'voleur' }), forged);
});

test('répartition standard placée librement par le joueur', () => {
  const placed = { FOR: 8, DEX: 10, CON: 12, INT: 13, SAG: 14, CHA: 15 };
  assert.deepEqual(validBaseStats({ statMethod: 'standard', baseStats: placed, classKey: 'guerrier' }), placed);
});

test('compétences : race + historique + choix de classe, complétées si besoin', () => {
  const skills = resolveSkills({ race: 'elfe', classKey: 'voleur', origin: 'sage', skills: ['discretion', 'escamotage', 'arcanes'] });
  assert.ok(skills.includes('perception'), 'elfe');
  assert.ok(skills.includes('arcanes') && skills.includes('histoire'), 'historique de sage');
  assert.ok(skills.includes('discretion') && skills.includes('escamotage'), 'choix du joueur');
  assert.equal(skills.length, 1 + 2 + 4, 'le voleur choisit 4 compétences');
  const human = resolveSkills({ race: 'humain', classKey: 'guerrier', origin: '', skills: ['arcanes'] });
  assert.equal(human.length, 2 + 1, 'humain : une compétence libre en plus');
  assert.ok(human.includes('arcanes'));
});

test('personnage complet : historique, apparence, personnalité', () => {
  const c = createCharacter({
    name: 'Zariel',
    race: 'tieffelin',
    classKey: 'occultiste',
    origin: 'charlatan',
    pronouns: 'elle',
    alignment: 'cn',
    personality: { traits: ['Fierté', 'inventé', 'Vantardise', 'Méfiance', 'Timidité'], ideal: 'Liberté' },
    look: { skin: 'rouge', hairColor: 'violet', headwear: '<script>' },
  });
  assert.equal(c.origin, 'charlatan');
  assert.ok(c.inventory.some((i) => i.name === 'Kit de déguisement'));
  assert.ok(c.skills.includes('tromperie') && c.skills.includes('escamotage'));
  assert.equal(c.pronouns, 'elle');
  assert.deepEqual(c.personality.traits, ['Fierté', 'Vantardise', 'Méfiance'], 'max 3 traits connus');
  assert.equal(c.look.skin, 'rouge');
  assert.equal(c.look.headwear, 'capuche', 'valeur inconnue remplacée par celle de la classe');
});

test('bonus de maîtrise sur les compétences maîtrisées', () => {
  const c = createCharacter({ name: 'A', race: 'halfelin', classKey: 'voleur', skills: ['acrobaties'] });
  const totals = skillTotals(c, 10);
  assert.equal(totals.discretion, 10 + Math.floor((c.stats.DEX - 10) / 2) + 2);
  assert.equal(totals.arcanes, undefined, 'non maîtrisée');
});

test('les anciennes sauvegardes sont complétées', () => {
  const old = { name: 'Borin', race: 'nain', classKey: 'guerrier', stats: { FOR: 16, DEX: 13, CON: 16, INT: 8, SAG: 12, CHA: 10 } };
  upgradeCharacter(old);
  assert.equal(old.look.beard, 'tressee');
  assert.ok(old.skills.includes('histoire'));
  assert.deepEqual(old.personality.traits, []);
  const game = new Game({ ...Game.create('VIEU'), players: [{ id: 'a', token: 't', name: 'X', character: { ...old, look: undefined, skills: undefined } }] });
  assert.ok(game.players[0].character.look);
});

test('le narrateur reçoit identité, apparence et compétences', () => {
  const game = Game.create('ABCD');
  const a = game.addPlayer('Maxime');
  game.setCharacter(a.id, {
    name: 'Aria',
    race: 'elfe',
    classKey: 'mage',
    origin: 'sage',
    pronouns: 'iel',
    personality: { traits: ['Curiosité insatiable'], flaw: 'Peur des araignées' },
    look: { hairColor: 'argent', details: 'Une cicatrice en forme d’étoile' },
  });
  const prompt = buildTurnPrompt(game, { kind: 'intro', next: a });
  assert.match(prompt, /pronom : iel/);
  assert.match(prompt, /cheveux argentés/);
  assert.match(prompt, /cicatrice en forme d’étoile/);
  assert.match(prompt, /Compétences maîtrisées : .*Arcanes/);
  assert.match(prompt, /Défaut : Peur des araignées/);
});
