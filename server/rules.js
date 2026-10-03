// Règles du jeu : caractéristiques, races, classes, dés, expérience.
// Inspiré de D&D 5e, mais volontairement simplifié.

export const STATS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

export const STAT_LABELS = {
  FOR: 'Force',
  DEX: 'Dextérité',
  CON: 'Constitution',
  INT: 'Intelligence',
  SAG: 'Sagesse',
  CHA: 'Charisme',
};

export const RACES = {
  humain: { label: 'Humain', emoji: '🧑', bonus: { FOR: 1, DEX: 1, CON: 1, INT: 1, SAG: 1, CHA: 1 } },
  elfe: { label: 'Elfe', emoji: '🧝', bonus: { DEX: 2, INT: 1 } },
  nain: { label: 'Nain', emoji: '🧔', bonus: { CON: 2, FOR: 1 } },
  halfelin: { label: 'Halfelin', emoji: '🧒', bonus: { DEX: 2, CHA: 1 } },
  demiorc: { label: 'Demi-orc', emoji: '👹', bonus: { FOR: 2, CON: 1 } },
  tieffelin: { label: 'Tieffelin', emoji: '😈', bonus: { CHA: 2, INT: 1 } },
};

export const CLASSES = {
  guerrier: {
    label: 'Guerrier',
    emoji: '⚔️',
    hitDie: 10,
    priorities: ['FOR', 'CON', 'DEX', 'SAG', 'CHA', 'INT'],
    gold: 15,
    abilities: ['Second souffle (se soigner une fois par combat)', 'Attaque puissante', 'Maîtrise des armures lourdes'],
    items: [
      { name: 'Épée longue', quantity: 1, description: 'Arme fiable, 1d8 dégâts.' },
      { name: 'Bouclier', quantity: 1, description: 'Rend plus difficile à toucher.' },
      { name: 'Cotte de mailles', quantity: 1, description: 'Armure lourde.' },
      { name: 'Potion de soin', quantity: 1, description: 'Rend environ 7 PV.' },
    ],
  },
  mage: {
    label: 'Mage',
    emoji: '🧙',
    hitDie: 6,
    priorities: ['INT', 'DEX', 'CON', 'SAG', 'CHA', 'FOR'],
    gold: 12,
    abilities: ['Projectile magique (touche toujours)', 'Bouclier arcanique', 'Lumière', 'Sommeil'],
    items: [
      { name: 'Bâton de mage', quantity: 1, description: 'Focaliseur arcanique, peut servir de gourdin.' },
      { name: 'Grimoire', quantity: 1, description: 'Contient vos sorts.' },
      { name: 'Composantes de sorts', quantity: 1, description: 'Petite sacoche de poudres et cristaux.' },
      { name: 'Potion de soin', quantity: 1, description: 'Rend environ 7 PV.' },
    ],
  },
  voleur: {
    label: 'Voleur',
    emoji: '🗡️',
    hitDie: 8,
    priorities: ['DEX', 'CHA', 'CON', 'INT', 'SAG', 'FOR'],
    gold: 20,
    abilities: ['Attaque sournoise', 'Discrétion experte', 'Crochetage et pièges', 'Esquive agile'],
    items: [
      { name: 'Dague', quantity: 2, description: 'Légère, peut être lancée, 1d4 dégâts.' },
      { name: 'Outils de voleur', quantity: 1, description: 'Crochets et petits outils.' },
      { name: 'Cape sombre', quantity: 1, description: 'Idéale pour se fondre dans l’ombre.' },
      { name: 'Corde (15 m)', quantity: 1, description: 'Corde en chanvre solide.' },
    ],
  },
  clerc: {
    label: 'Clerc',
    emoji: '✨',
    hitDie: 8,
    priorities: ['SAG', 'CON', 'FOR', 'CHA', 'INT', 'DEX'],
    gold: 15,
    abilities: ['Soins (toucher guérisseur)', 'Flamme sacrée', 'Bénédiction', 'Repousser les morts-vivants'],
    items: [
      { name: 'Masse d’armes', quantity: 1, description: 'Arme contondante, 1d6 dégâts.' },
      { name: 'Symbole sacré', quantity: 1, description: 'Focaliseur divin.' },
      { name: 'Bouclier', quantity: 1, description: 'Rend plus difficile à toucher.' },
      { name: 'Potion de soin', quantity: 2, description: 'Rend environ 7 PV.' },
    ],
  },
  rodeur: {
    label: 'Rôdeur',
    emoji: '🏹',
    hitDie: 10,
    priorities: ['DEX', 'SAG', 'CON', 'FOR', 'INT', 'CHA'],
    gold: 15,
    abilities: ['Tir précis', 'Pistage', 'Ennemi juré (bêtes)', 'Survie en milieu sauvage'],
    items: [
      { name: 'Arc long', quantity: 1, description: 'Arme à distance, 1d8 dégâts.' },
      { name: 'Flèches', quantity: 20, description: 'Munitions pour l’arc.' },
      { name: 'Épée courte', quantity: 1, description: 'Arme de corps à corps, 1d6 dégâts.' },
      { name: 'Rations de voyage', quantity: 3, description: 'De quoi tenir quelques jours.' },
    ],
  },
  barde: {
    label: 'Barde',
    emoji: '🎻',
    hitDie: 8,
    priorities: ['CHA', 'DEX', 'CON', 'SAG', 'INT', 'FOR'],
    gold: 18,
    abilities: ['Inspiration bardique', 'Moquerie cruelle (sort)', 'Charme-personne', 'Touche-à-tout'],
    items: [
      { name: 'Luth', quantity: 1, description: 'Instrument de musique bien accordé.' },
      { name: 'Rapière', quantity: 1, description: 'Arme élégante, 1d8 dégâts.' },
      { name: 'Costume de scène', quantity: 1, description: 'Pour briller en société.' },
      { name: 'Potion de soin', quantity: 1, description: 'Rend environ 7 PV.' },
    ],
  },
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function modifier(score) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function rollDie(sides, rng = Math.random) {
  return 1 + Math.floor(rng() * sides);
}

export function roll4d6DropLowest(rng = Math.random) {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)].sort((a, b) => b - a);
  return dice[0] + dice[1] + dice[2];
}

// Répartit une liste de valeurs (de la plus haute à la plus basse) selon les priorités de la classe.
function assignByPriority(values, classKey) {
  const cls = CLASSES[classKey] ?? CLASSES.guerrier;
  const sorted = [...values].sort((a, b) => b - a);
  const stats = {};
  cls.priorities.forEach((stat, i) => {
    stats[stat] = sorted[i];
  });
  return stats;
}

export function standardStats(classKey) {
  return assignByPriority(STANDARD_ARRAY, classKey);
}

export function rollStats(classKey, rng = Math.random) {
  return assignByPriority(
    STATS.map(() => roll4d6DropLowest(rng)),
    classKey,
  );
}

// Expérience nécessaire pour atteindre un niveau : niv 2 = 100, niv 3 = 300, niv 4 = 600, niv 5 = 1000...
export function xpForLevel(level) {
  return 50 * level * (level - 1);
}

export function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < 20) level++;
  return level;
}

function isValidBaseStats(stats) {
  return stats && typeof stats === 'object' && STATS.every((s) => Number.isInteger(stats[s]) && stats[s] >= 3 && stats[s] <= 18);
}

function cleanText(value, max) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

// Crée une fiche de personnage complète à partir des choix du joueur.
export function createCharacter({ name, race, classKey, background, baseStats }) {
  const raceKey = RACES[race] ? race : 'humain';
  const cls = CLASSES[classKey] ? classKey : 'guerrier';
  const base = isValidBaseStats(baseStats) ? baseStats : standardStats(cls);
  const stats = {};
  for (const s of STATS) {
    stats[s] = Math.min(20, base[s] + (RACES[raceKey].bonus[s] ?? 0));
  }
  const maxHp = CLASSES[cls].hitDie + modifier(stats.CON);
  return {
    name: cleanText(name, 40) || 'Aventurier sans nom',
    race: raceKey,
    classKey: cls,
    emoji: CLASSES[cls].emoji,
    background: cleanText(background, 600),
    level: 1,
    xp: 0,
    maxHp: Math.max(4, maxHp),
    hp: Math.max(4, maxHp),
    gold: CLASSES[cls].gold,
    stats,
    abilities: [...CLASSES[cls].abilities],
    inventory: CLASSES[cls].items.map((item) => ({ ...item })),
    conditions: [],
  };
}

// PV gagnés à chaque nouveau niveau : moyenne du dé de vie + modificateur de CON (minimum 1).
export function hpGainOnLevelUp(character) {
  const hitDie = CLASSES[character.classKey]?.hitDie ?? 8;
  return Math.max(1, hitDie / 2 + 1 + modifier(character.stats.CON));
}

// Totaux d'un jet de d20 pour chaque caractéristique (d20 + modificateur).
export function rollTotals(character, d20) {
  const totals = {};
  for (const s of STATS) totals[s] = d20 + modifier(character.stats[s]);
  return totals;
}

export function describeCharacterShort(character) {
  const race = RACES[character.race]?.label ?? character.race;
  const cls = CLASSES[character.classKey]?.label ?? character.classKey;
  return `${race} ${cls} niveau ${character.level}`;
}
