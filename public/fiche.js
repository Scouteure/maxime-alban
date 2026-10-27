// Fiche de personnage complète : utilisée dans le récapitulatif, l'onglet « Fiche » et la fiche des autres joueurs.

import { portrait } from './portrait.js';
import { el, formatMod, modifier, proficiencyBonus, xpForLevel } from './ui.js';

export function characterSummary(c, rules) {
  const race = rules.races[c.race]?.label ?? c.race;
  const cls = rules.classes[c.classKey]?.label ?? c.classKey;
  return `${race} ${cls.toLowerCase()}`;
}

export function identityLine(c, rules) {
  return [
    rules.pronouns[c.pronouns]?.label,
    rules.ages[c.age]?.label,
    rules.alignments[c.alignment]?.label,
    rules.origins[c.origin]?.label,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function describeLook(look, rules) {
  if (!look) return '';
  const label = (key) => rules.look[key].options[look[key]]?.label ?? '';
  const parts = [`Teint ${label('skin').toLowerCase()}`, `yeux ${label('eyes').toLowerCase()}`];
  parts.push(look.hairStyle === 'chauve' ? 'crâne rasé' : `cheveux ${label('hairColor').toLowerCase()} (${label('hairStyle').toLowerCase()})`);
  if (look.beard !== 'aucune') parts.push(label('beard').toLowerCase());
  if (look.mark !== 'aucune') parts.push(label('mark').toLowerCase());
  if (look.headwear !== 'aucun') parts.push(label('headwear').toLowerCase());
  parts.push(`${label('outfitStyle').toLowerCase()} ${label('outfitColor').toLowerCase()}`);
  return `${parts.join(', ')}.${look.details ? ` ${look.details}` : ''}`;
}

export function gauge(kind, label, value, max, low = false) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return el(
    'div',
    { className: `jauge ${kind} ${low ? 'bas' : ''}` },
    el('div', { className: 'etiquette' }, el('span', { text: label }), el('span', { text: `${value} / ${max}` })),
    el(
      'div',
      { className: 'barre-fond', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': value },
      el('div', { className: 'remplissage', style: `width:${percent}%` }),
    ),
  );
}

export const hpGauge = (c) => gauge('pv', '❤️ Points de vie', c.hp, c.maxHp, c.hp / c.maxHp < 0.3);

export function xpGauge(c) {
  const floor = xpForLevel(c.level);
  const next = xpForLevel(c.level + 1);
  return gauge('xp', `⭐ Niveau ${c.level} · ${c.xp} XP`, c.xp - floor, next - floor);
}

export function statsGrid(c, rules, { mini = false, bonus } = {}) {
  return el(
    'div',
    { className: `caracs ${mini ? 'mini' : ''}` },
    rules.stats.map((s) =>
      el(
        'div',
        { className: 'carac', title: `${rules.statLabels[s]} : ${rules.statDescriptions[s]}` },
        el('div', { className: 'nom', text: mini ? s : rules.statLabels[s] }),
        el('div', { className: 'valeur', text: c.stats[s] }),
        el('div', { className: 'mod', text: formatMod(modifier(c.stats[s])) }),
        bonus?.[s] ? el('div', { className: 'bonus-race', text: `dont +${bonus[s]} de race` }) : null,
      ),
    ),
  );
}

export function conditions(c) {
  return c.conditions?.length
    ? el(
        'div',
        { className: 'etiquettes' },
        c.conditions.map((s) => el('span', { className: 'etat', text: s })),
      )
    : null;
}

export function skillList(c, rules) {
  const prof = proficiencyBonus(c.level);
  const known = new Set(c.skills ?? []);
  return el(
    'ul',
    { className: 'liste-competences' },
    Object.entries(rules.skills).map(([key, skill]) => {
      const mastered = known.has(key);
      const total = modifier(c.stats[skill.stat]) + (mastered ? prof : 0);
      return el(
        'li',
        { className: mastered ? 'maitrisee' : '' },
        el('span', { className: 'marque', 'aria-hidden': 'true', text: mastered ? '★' : '·' }),
        el('span', { className: 'nom', text: skill.label }),
        el('span', { className: 'carac-lien', text: skill.stat }),
        el('span', { className: 'total', text: formatMod(total) }),
        mastered ? el('span', { className: 'sr-only', text: ' (maîtrisée)' }) : null,
      );
    }),
  );
}

function section(title, ...content) {
  const body = content.flat(Infinity).filter(Boolean);
  if (!body.length) return null;
  return el('section', { className: 'fiche-section' }, el('h3', { text: title }), body);
}

function bulletList(items) {
  return items?.length ? el('ul', {}, items.map((a) => el('li', { text: a }))) : null;
}

// Fiche complète. `actions` : boutons affichés sous l'en-tête (ex. « Modifier »).
export function characterSheet(c, rules, { player, actions = [], showGauges = true } = {}) {
  const p = c.personality ?? { traits: [] };
  const origin = rules.origins[c.origin];
  return el(
    'article',
    { className: 'fiche' },
    el(
      'header',
      { className: 'entete-perso' },
      el('div', { className: 'portrait grand' }, portrait(c, rules)),
      el(
        'div',
        {},
        el('h2', { className: 'nom', text: c.name || 'Sans nom' }),
        el('div', { className: 'sous', text: `${characterSummary(c, rules)} · niveau ${c.level}` }),
        el('div', { className: 'identite', text: identityLine(c, rules) }),
        player ? el('div', { className: 'petit', text: `Joué par ${player.name}` }) : null,
      ),
    ),
    actions.length ? el('div', { className: 'ligne actions-fiche' }, actions) : null,
    showGauges ? [hpGauge(c), xpGauge(c)] : null,
    el('div', { className: 'or-ligne', text: `🪙 ${c.gold} pièces d'or` }),
    conditions(c),
    section('Caractéristiques', statsGrid(c, rules, { mini: true })),
    section(`Compétences (maîtrise +${proficiencyBonus(c.level)})`, skillList(c, rules)),
    section(`Capacités de ${rules.classes[c.classKey]?.label.toLowerCase()}`, bulletList(c.abilities)),
    section(`Traits de ${rules.races[c.race]?.label.toLowerCase()}`, bulletList(c.racialTraits)),
    origin ? section(`Historique : ${origin.label}`, el('p', { text: c.feature })) : null,
    section(
      'Personnalité',
      p.traits?.length ? el('div', { className: 'etiquettes' }, p.traits.map((t) => el('span', { className: 'puce', text: t }))) : null,
      p.ideal ? el('p', {}, el('strong', { text: 'Idéal : ' }), p.ideal) : null,
      p.bond ? el('p', {}, el('strong', { text: 'Lien : ' }), p.bond) : null,
      p.flaw ? el('p', {}, el('strong', { text: 'Défaut : ' }), p.flaw) : null,
    ),
    section('Apparence', el('p', { text: describeLook(c.look, rules) })),
    c.background ? section('Histoire', el('p', { className: 'histoire', text: c.background })) : null,
  );
}
