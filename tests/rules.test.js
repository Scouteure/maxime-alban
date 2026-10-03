import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCharacter, levelForXp, modifier, rollStats, rollTotals, standardStats, xpForLevel } from '../server/rules.js';

test('modificateurs façon D&D', () => {
  assert.equal(modifier(10), 0);
  assert.equal(modifier(8), -1);
  assert.equal(modifier(15), 2);
  assert.equal(modifier(20), 5);
});

test('niveaux selon l’expérience', () => {
  assert.equal(xpForLevel(2), 100);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(99), 1);
  assert.equal(levelForXp(100), 2);
  assert.equal(levelForXp(650), 4);
});

test('répartition standard selon les priorités de la classe', () => {
  const stats = standardStats('mage');
  assert.equal(stats.INT, 15);
  assert.equal(stats.FOR, 8);
});

test('jets de caractéristiques entre 3 et 18', () => {
  const stats = rollStats('voleur');
  for (const value of Object.values(stats)) assert.ok(value >= 3 && value <= 18);
  assert.ok(stats.DEX >= stats.FOR);
});

test('création de personnage avec bonus de race et équipement de classe', () => {
  const c = createCharacter({ name: 'Borin', race: 'nain', classKey: 'guerrier', background: '' });
  assert.equal(c.stats.FOR, 16); // 15 + 1
  assert.equal(c.stats.CON, 16); // 14 + 2
  assert.equal(c.maxHp, 13); // d10 + 3
  assert.ok(c.inventory.some((i) => i.name === 'Épée longue'));
});

test('valeurs invalides remplacées par la répartition standard', () => {
  const c = createCharacter({ name: 'X', race: 'inconnue', classKey: 'pirate', baseStats: { FOR: 99 } });
  assert.equal(c.race, 'humain');
  assert.equal(c.classKey, 'guerrier');
  assert.equal(c.stats.FOR, 16);
});

test('totaux d20 + modificateur', () => {
  const c = createCharacter({ name: 'A', race: 'elfe', classKey: 'voleur' });
  const totals = rollTotals(c, 10);
  assert.equal(totals.DEX, 10 + modifier(c.stats.DEX));
});
