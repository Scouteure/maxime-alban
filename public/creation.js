// Création (et modification) du personnage : un assistant en étapes, toutes accessibles à tout moment.

import { characterSheet, characterSummary, identityLine } from './fiche.js';
import { portrait } from './portrait.js';
import { $, $$, el, fill, formatMod, modifier, pick, proficiencyBonus, storage, toast } from './ui.js';

const ALL_STEPS = [
  { key: 'race', label: 'Race', icon: '🧝' },
  { key: 'classe', label: 'Classe', icon: '⚔️' },
  { key: 'historique', label: 'Historique', icon: '📜' },
  { key: 'competences', label: 'Compétences', icon: '🎯' },
  { key: 'caracs', label: 'Caractéristiques', icon: '💪' },
  { key: 'apparence', label: 'Apparence', icon: '🎨' },
  { key: 'identite', label: 'Identité', icon: '🪪' },
  { key: 'resume', label: 'Résumé', icon: '✅' },
];
const STYLE_STEPS = ['apparence', 'identite', 'resume'];

const STAT_METHODS = {
  standard: { label: 'Répartition standard', description: 'Six valeurs fixes (15, 14, 13, 12, 10, 8) à placer où tu veux. Équilibré et rapide.' },
  achat: { label: 'Achat de points', description: '27 points à dépenser : chaque valeur coûte plus cher en montant. Le plus de contrôle.' },
  des: { label: 'Lancer les dés', description: 'Six jets de 4d6 (on garde les 3 meilleurs dés). Peut donner un héros… ou un boulet !' },
};

let ctx = null; // { rules, draft, mode, steps, step, onSubmit, onCancel, storageKey }

// ---------- Brouillon ----------

function priorityAssign(rules, classKey, count = 6) {
  // Index de la valeur (triée de la plus haute à la plus basse) donnée à chaque caractéristique.
  const order = rules.classes[classKey].priorities;
  return Object.fromEntries(order.slice(0, count).map((stat, i) => [stat, i]));
}

function newDraft(rules) {
  const race = 'humain';
  const classKey = 'guerrier';
  return {
    name: '',
    race,
    classKey,
    origin: 'soldat',
    classSkills: [],
    freeSkills: [],
    statMethod: 'standard',
    pool: [...rules.standardArray],
    assign: priorityAssign(rules, classKey),
    buy: null,
    statsTouched: false,
    look: { ...rules.defaultLooks[race][classKey], details: '' },
    lookTouched: false,
    pronouns: '',
    age: 'adulte',
    alignment: '',
    personality: { traits: [], ideal: '', bond: '', flaw: '' },
    background: '',
  };
}

function draftFromCharacter(rules, c) {
  const base = c.baseStats ?? Object.fromEntries(rules.stats.map((s) => [s, c.stats[s] - (rules.races[c.race].bonus[s] ?? 0)]));
  const values = rules.stats.map((s) => base[s]);
  const sorted = [...values].sort((a, b) => b - a);
  const isStandard = sorted.join() === rules.standardArray.join();
  const draft = newDraft(rules);
  const fixed = fixedSkills(rules, c.race, c.origin);
  Object.assign(draft, {
    name: c.name,
    race: c.race,
    classKey: c.classKey,
    origin: c.origin ?? '',
    classSkills: (c.skills ?? []).filter((k) => !fixed.has(k) && rules.classes[c.classKey].skillChoices.includes(k)),
    freeSkills: (c.skills ?? []).filter((k) => !fixed.has(k) && !rules.classes[c.classKey].skillChoices.includes(k)),
    statsTouched: true,
    look: { ...c.look },
    lookTouched: true,
    pronouns: c.pronouns ?? '',
    age: c.age ?? 'adulte',
    alignment: c.alignment ?? '',
    personality: { traits: [], ideal: '', bond: '', flaw: '', ...c.personality },
    background: c.background ?? '',
  });
  if (isStandard) {
    draft.statMethod = 'standard';
    draft.pool = [...rules.standardArray];
  } else if (values.every((v) => v >= rules.pointBuy.min && v <= rules.pointBuy.max)) {
    draft.statMethod = 'achat';
    draft.buy = { ...base };
  } else {
    draft.statMethod = 'des';
    draft.pool = sorted;
  }
  if (draft.statMethod !== 'achat') {
    // Retrouve quelle valeur du tableau va à quelle caractéristique.
    const used = new Set();
    draft.assign = {};
    for (const s of rules.stats) {
      const idx = draft.pool.findIndex((v, i) => v === base[s] && !used.has(i));
      used.add(idx);
      draft.assign[s] = idx;
    }
  }
  return draft;
}

function fixedSkills(rules, race, origin) {
  return new Set([...(rules.races[race]?.skills ?? []), ...(rules.origins[origin]?.skills ?? [])]);
}

// Même logique que resolveSkills (server/rules.js), pour l'aperçu.
function resolvedSkills(rules, d) {
  const fixed = fixedSkills(rules, d.race, d.origin);
  const cls = rules.classes[d.classKey];
  const chosen = d.classSkills.filter((k) => cls.skillChoices.includes(k) && !fixed.has(k)).slice(0, cls.skillCount);
  for (const k of cls.skillChoices) {
    if (chosen.length >= cls.skillCount) break;
    if (!fixed.has(k) && !chosen.includes(k)) chosen.push(k);
  }
  const extra = rules.races[d.race].extraSkills ?? 0;
  const free = d.freeSkills.filter((k) => !fixed.has(k) && !chosen.includes(k)).slice(0, extra);
  for (const k of Object.keys(rules.skills)) {
    if (free.length >= extra) break;
    if (!fixed.has(k) && !chosen.includes(k) && !free.includes(k)) free.push(k);
  }
  return Object.keys(rules.skills).filter((k) => fixed.has(k) || chosen.includes(k) || free.includes(k));
}

function baseStats(rules, d) {
  if (d.statMethod === 'achat') return { ...d.buy };
  return Object.fromEntries(rules.stats.map((s) => [s, d.pool[d.assign[s]]]));
}

function pointsSpent(rules, buy) {
  return rules.stats.reduce((sum, s) => sum + rules.pointBuy.costs[buy[s]], 0);
}

// Personnage tel qu'il sera créé (même calcul que createCharacter côté serveur).
function previewCharacter(rules, d) {
  const race = rules.races[d.race];
  const cls = rules.classes[d.classKey];
  const origin = rules.origins[d.origin];
  const base = baseStats(rules, d);
  const stats = Object.fromEntries(rules.stats.map((s) => [s, Math.min(20, base[s] + (race.bonus[s] ?? 0))]));
  const maxHp = Math.max(4, cls.hitDie + modifier(stats.CON));
  return {
    name: d.name,
    race: d.race,
    classKey: d.classKey,
    origin: d.origin,
    pronouns: d.pronouns,
    age: d.age,
    alignment: d.alignment,
    personality: d.personality,
    look: d.look,
    background: d.background,
    level: 1,
    xp: 0,
    hp: maxHp,
    maxHp,
    gold: cls.gold + (origin?.gold ?? 0),
    stats,
    skills: resolvedSkills(rules, d),
    abilities: cls.abilities,
    racialTraits: race.traits,
    feature: origin?.feature ?? '',
    inventory: [...cls.items, ...(origin ? [origin.item] : [])],
    conditions: [],
  };
}

function save() {
  if (ctx.mode === 'creation') storage.setJSON(ctx.storageKey, ctx.draft);
}

// Quand la race ou la classe change, on adapte ce que le joueur n'a pas personnalisé.
function onIdentityChange() {
  const { rules, draft } = ctx;
  if (!draft.lookTouched) draft.look = { ...rules.defaultLooks[draft.race][draft.classKey], details: draft.look.details ?? '' };
  if (!draft.statsTouched && draft.statMethod !== 'achat') draft.assign = priorityAssign(rules, draft.classKey);
  const fixed = fixedSkills(rules, draft.race, draft.origin);
  const cls = rules.classes[draft.classKey];
  draft.classSkills = draft.classSkills.filter((k) => cls.skillChoices.includes(k) && !fixed.has(k)).slice(0, cls.skillCount);
  draft.freeSkills = draft.freeSkills.filter((k) => !fixed.has(k) && !draft.classSkills.includes(k)).slice(0, rules.races[draft.race].extraSkills ?? 0);
}

// ---------- Rendu ----------

function update({ step = true } = {}) {
  save();
  if (step) renderStep();
  renderPreview();
  renderStepper();
}

// Re-dessine en gardant le focus sur le même champ (utile au clavier).
function renderStep() {
  const active = document.activeElement;
  const id = active?.id;
  const box = $('#etape-contenu');
  const key = ctx.steps[ctx.step];
  fill(box, STEP_RENDERERS[key]());
  if (id && document.getElementById(id)) document.getElementById(id).focus({ preventScroll: true });
  const isLast = ctx.step === ctx.steps.length - 1;
  $('#btn-etape-prec').disabled = ctx.step === 0;
  $('#btn-etape-suiv').textContent = isLast ? (ctx.mode === 'creation' ? '✅ Valider le personnage' : '✅ Enregistrer') : 'Suivant →';
  $('#etape-position').textContent = `Étape ${ctx.step + 1} sur ${ctx.steps.length}`;
}

function goTo(index) {
  ctx.step = Math.max(0, Math.min(ctx.steps.length - 1, index));
  renderStep();
  renderStepper();
  const box = $('#etape-contenu');
  box.scrollTop = 0;
  window.scrollTo({ top: 0 });
  box.focus({ preventScroll: true });
}

function stepDone(key) {
  const d = ctx.draft;
  switch (key) {
    case 'identite':
      return Boolean(d.name.trim());
    default:
      return true;
  }
}

function renderStepper() {
  fill(
    $('#liste-etapes'),
    ctx.steps.map((key, i) => {
      const step = ALL_STEPS.find((s) => s.key === key);
      const current = i === ctx.step;
      return el(
        'li',
        {},
        el(
          'button',
          {
            type: 'button',
            className: `etape-bouton ${current ? 'actuelle' : ''} ${stepDone(key) ? 'faite' : 'a-faire'}`,
            'aria-current': current ? 'step' : null,
            onclick: () => goTo(i),
          },
          el('span', { className: 'etape-icone', 'aria-hidden': 'true', text: step.icon }),
          el('span', { className: 'etape-num', text: `${i + 1}.` }),
          el('span', { className: 'etape-nom', text: step.label }),
        ),
      );
    }),
  );
  // Sur petit écran, la barre des étapes défile pour garder l'étape en cours visible.
  const bar = $('#liste-etapes');
  const current = $('.etape-bouton.actuelle');
  if (current) {
    const offset = current.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    bar.scrollLeft += offset - (bar.clientWidth - current.offsetWidth) / 2;
  }
}

function renderPreview() {
  const { rules, draft } = ctx;
  const c = previewCharacter(rules, draft);
  fill(
    $('#apercu'),
    el('div', { className: 'portrait apercu-portrait' }, portrait(c, rules)),
    el('div', { className: 'apercu-texte' }, [
      el('div', { className: 'apercu-nom', text: draft.name.trim() || 'Sans nom' }),
      el('div', { className: 'sous', text: characterSummary(c, rules) }),
      el('div', { className: 'identite', text: identityLine(c, rules) }),
      el('div', { className: 'apercu-chiffres' }, [
        el('span', { title: 'Points de vie', text: `❤️ ${c.maxHp} PV` }),
        el('span', { title: 'Pièces d’or', text: `🪙 ${c.gold}` }),
      ]),
      el(
        'div',
        { className: 'apercu-caracs', 'aria-label': 'Caractéristiques' },
        rules.stats.map((s) => el('span', { title: rules.statLabels[s] }, el('b', { text: s }), ` ${c.stats[s]}`)),
      ),
    ]),
  );
}

// ---------- Petits composants ----------

function radioCards(name, entries, selected, onChange, { describe, className = '' } = {}) {
  return el(
    'div',
    { className: `grille-choix ${className}`, role: 'radiogroup' },
    entries.map(([key, item]) =>
      el(
        'label',
        { className: `carte-choix ${selected === key ? 'choisi' : ''}` },
        el('input', {
          type: 'radio',
          name,
          value: key,
          id: `${name}-${key}`,
          className: 'sr-only',
          checked: selected === key,
          onchange: () => onChange(key),
        }),
        item.emoji ? el('span', { className: 'emoji', 'aria-hidden': 'true', text: item.emoji }) : null,
        el('span', { className: 'choix-nom', text: item.label }),
        describe ? el('span', { className: 'choix-detail', text: describe(item, key) }) : null,
      ),
    ),
  );
}

function chips(name, entries, selected, onChange, { type = 'radio', max } = {}) {
  const isChecked = (key) => (type === 'radio' ? selected === key : selected.includes(key));
  const full = type === 'checkbox' && max && selected.length >= max;
  return el(
    'div',
    { className: 'puces', role: type === 'radio' ? 'radiogroup' : 'group' },
    entries.map(([key, item]) => {
      const checked = isChecked(key);
      return el(
        'label',
        { className: `puce-choix ${checked ? 'choisi' : ''} ${full && !checked ? 'grise' : ''}`, title: item.description ?? null },
        el('input', {
          type,
          name,
          value: key,
          id: `${name}-${key}`,
          className: 'sr-only',
          checked,
          disabled: full && !checked,
          onchange: (e) => onChange(key, e.target.checked),
        }),
        item.label,
      );
    }),
  );
}

function swatches(name, entries, selected, onChange) {
  return el(
    'div',
    { className: 'pastilles', role: 'radiogroup' },
    entries.map(([key, item]) =>
      el(
        'label',
        { className: `pastille ${selected === key ? 'choisi' : ''}`, title: item.label },
        el('input', { type: 'radio', name, value: key, id: `${name}-${key}`, className: 'sr-only', checked: selected === key, onchange: () => onChange(key) }),
        el('span', { className: 'rond', style: `background:${item.color}`, 'aria-hidden': 'true' }),
        el('span', { className: 'sr-only', text: item.label }),
      ),
    ),
  );
}

function stepHeader(title, text) {
  return [el('h2', { text: title }), text ? el('p', { className: 'consigne', text }) : null];
}

function bonusText(bonus) {
  return Object.entries(bonus)
    .map(([s, b]) => `${s} +${b}`)
    .join(' · ');
}

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

function skillNames(keys) {
  return keys.map((k) => ctx.rules.skills[k].label).join(', ');
}

// ---------- Étapes ----------

const STEP_RENDERERS = {
  race() {
    const { rules, draft } = ctx;
    const race = rules.races[draft.race];
    return [
      stepHeader('Choisis ta race', 'Ton peuple d’origine : il donne des bonus de caractéristiques et des talents naturels.'),
      radioCards(
        'race',
        Object.entries(rules.races),
        draft.race,
        (key) => {
          draft.race = key;
          onIdentityChange();
          update();
        },
        { describe: (r) => bonusText(r.bonus) },
      ),
      el(
        'div',
        { className: 'detail-choix', 'aria-live': 'polite' },
        el('h3', {}, `${race.emoji} ${race.label}`),
        el('p', { text: race.description }),
        el('p', {}, el('strong', { text: 'Bonus : ' }), bonusText(race.bonus)),
        el('ul', {}, race.traits.map((t) => el('li', { text: t }))),
      ),
    ];
  },

  classe() {
    const { rules, draft } = ctx;
    const cls = rules.classes[draft.classKey];
    return [
      stepHeader('Choisis ta classe', 'Ton métier d’aventurier : comment tu combats, ce que tu sais faire, ton équipement. Les étoiles indiquent la difficulté.'),
      radioCards(
        'classe',
        Object.entries(rules.classes),
        draft.classKey,
        (key) => {
          draft.classKey = key;
          onIdentityChange();
          update();
        },
        { describe: (c) => `${c.role} · ${stars(c.difficulty)}` },
      ),
      el(
        'div',
        { className: 'detail-choix', 'aria-live': 'polite' },
        el('h3', {}, `${cls.emoji} ${cls.label}`),
        el('p', { text: cls.description }),
        el(
          'dl',
          { className: 'details-grille' },
          el('dt', { text: 'Rôle' }),
          el('dd', { text: cls.role }),
          el('dt', { text: 'Difficulté' }),
          el('dd', { text: `${stars(cls.difficulty)} ${['', 'facile', 'moyenne', 'avancée'][cls.difficulty]}` }),
          el('dt', { text: 'Points de vie' }),
          el('dd', { text: `${cls.hitDie} + modificateur de Constitution` }),
          el('dt', { text: 'Caractéristiques clés' }),
          el('dd', { text: cls.priorities.slice(0, 2).map((s) => rules.statLabels[s]).join(', ') }),
          el('dt', { text: 'Capacités' }),
          el('dd', { text: cls.abilities.join(' · ') }),
          el('dt', { text: 'Équipement' }),
          el('dd', { text: `${cls.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(', ')} · ${cls.gold} pièces d'or` }),
        ),
      ),
    ];
  },

  historique() {
    const { rules, draft } = ctx;
    const origin = rules.origins[draft.origin];
    return [
      stepHeader('Choisis ton historique', 'Ce que tu faisais avant de partir à l’aventure : deux compétences, un avantage et un objet.'),
      radioCards(
        'historique',
        Object.entries(rules.origins),
        draft.origin,
        (key) => {
          draft.origin = key;
          onIdentityChange();
          update();
        },
        { describe: (o) => skillNames(o.skills) },
      ),
      origin
        ? el(
            'div',
            { className: 'detail-choix', 'aria-live': 'polite' },
            el('h3', {}, `${origin.emoji} ${origin.label}`),
            el('p', { text: origin.description }),
            el(
              'dl',
              { className: 'details-grille' },
              el('dt', { text: 'Compétences' }),
              el('dd', { text: skillNames(origin.skills) }),
              el('dt', { text: 'Avantage' }),
              el('dd', { text: origin.feature }),
              el('dt', { text: 'Objet' }),
              el('dd', { text: `${origin.item.name} : ${origin.item.description}` }),
              origin.gold ? [el('dt', { text: 'Bonus' }), el('dd', { text: `+${origin.gold} pièces d'or` })] : null,
            ),
          )
        : null,
    ];
  },

  competences() {
    const { rules, draft } = ctx;
    const cls = rules.classes[draft.classKey];
    const fixed = fixedSkills(rules, draft.race, draft.origin);
    const extra = rules.races[draft.race].extraSkills ?? 0;
    const prof = proficiencyBonus(1);
    const c = previewCharacter(rules, draft);
    const skillLabel = (k) => `${rules.skills[k].label} (${rules.skills[k].stat} ${formatMod(modifier(c.stats[rules.skills[k].stat]) + prof)})`;
    const fixedEntries = [...fixed].map((k) => {
      const from = rules.races[draft.race].skills?.includes(k) ? rules.races[draft.race].label : rules.origins[draft.origin]?.label;
      return el('li', {}, el('span', { className: 'marque', 'aria-hidden': 'true', text: '★' }), `${skillLabel(k)} — grâce à : ${from}`);
    });
    const classOptions = cls.skillChoices.filter((k) => !fixed.has(k));
    const freeOptions = Object.keys(rules.skills).filter((k) => !fixed.has(k) && !draft.classSkills.includes(k));
    return [
      stepHeader(
        'Choisis tes compétences',
        `Quand le narrateur te demande un jet dans une compétence que tu maîtrises, tu ajoutes +${prof} au dé. Choisis ce que ton personnage sait vraiment bien faire.`,
      ),
      fixedEntries.length ? el('div', { className: 'bloc' }, el('h3', { text: 'Déjà acquises' }), el('ul', { className: 'liste-simple' }, fixedEntries)) : null,
      el(
        'fieldset',
        { className: 'bloc' },
        el('legend', {}, `Compétences de ${cls.label.toLowerCase()} : `, el('strong', { text: `${draft.classSkills.length} / ${cls.skillCount}` })),
        chips(
          'competence-classe',
          classOptions.map((k) => [k, { label: skillLabel(k) }]),
          draft.classSkills,
          (key, checked) => {
            draft.classSkills = checked ? [...draft.classSkills, key] : draft.classSkills.filter((k) => k !== key);
            draft.freeSkills = draft.freeSkills.filter((k) => k !== key);
            update();
          },
          { type: 'checkbox', max: cls.skillCount },
        ),
        draft.classSkills.length < cls.skillCount
          ? el('p', { className: 'petit', text: 'Si tu n’en choisis pas assez, elles seront complétées automatiquement.' })
          : null,
      ),
      extra
        ? el(
            'fieldset',
            { className: 'bloc' },
            el('legend', {}, `Bonus de ${rules.races[draft.race].label.toLowerCase()} : n’importe quelle compétence `, el('strong', { text: `${draft.freeSkills.length} / ${extra}` })),
            chips(
              'competence-libre',
              freeOptions.map((k) => [k, { label: skillLabel(k) }]),
              draft.freeSkills,
              (key, checked) => {
                draft.freeSkills = checked ? [...draft.freeSkills, key] : draft.freeSkills.filter((k) => k !== key);
                update();
              },
              { type: 'checkbox', max: extra },
            ),
          )
        : null,
    ];
  },

  caracs() {
    const { rules, draft } = ctx;
    const race = rules.races[draft.race];
    const c = previewCharacter(rules, draft);
    const method = draft.statMethod;
    const spent = method === 'achat' ? pointsSpent(rules, draft.buy) : 0;

    const setMethod = async (key) => {
      draft.statMethod = key;
      draft.statsTouched = false;
      if (key === 'standard') {
        draft.pool = [...rules.standardArray];
        draft.assign = priorityAssign(rules, draft.classKey);
      } else if (key === 'achat') {
        draft.buy = Object.fromEntries(rules.stats.map((s) => [s, rules.standardArray[priorityAssign(rules, draft.classKey)[s]]]));
      } else {
        await rollDice();
        return;
      }
      update();
    };

    const control = (s) => {
      if (method === 'achat') {
        const v = draft.buy[s];
        const nextCost = rules.pointBuy.costs[v + 1] - rules.pointBuy.costs[v];
        const canUp = v < rules.pointBuy.max && spent + nextCost <= rules.pointBuy.budget;
        const canDown = v > rules.pointBuy.min;
        const change = (delta) => {
          draft.buy[s] = v + delta;
          draft.statsTouched = true;
          update();
        };
        return el(
          'div',
          { className: 'compteur' },
          el('button', { type: 'button', id: `moins-${s}`, 'aria-label': `Baisser ${rules.statLabels[s]}`, disabled: !canDown, onclick: () => change(-1), text: '−' }),
          el('span', { className: 'compteur-valeur', 'aria-live': 'polite', text: v }),
          el('button', { type: 'button', id: `plus-${s}`, 'aria-label': `Monter ${rules.statLabels[s]}`, disabled: !canUp, onclick: () => change(1), text: '+' }),
        );
      }
      return el(
        'select',
        {
          id: `valeur-${s}`,
          'aria-label': `Valeur de base de ${rules.statLabels[s]}`,
          onchange: (e) => {
            const idx = Number(e.target.value);
            const other = rules.stats.find((t) => draft.assign[t] === idx);
            if (other) draft.assign[other] = draft.assign[s];
            draft.assign[s] = idx;
            draft.statsTouched = true;
            update();
          },
        },
        draft.pool.map((v, i) => el('option', { value: String(i), selected: draft.assign[s] === i, text: String(v) })),
      );
    };

    return [
      stepHeader('Répartis tes caractéristiques', 'Elles mesurent ce que ton personnage fait bien (ou mal). Le modificateur (+2, −1…) s’ajoute à tes jets de dé.'),
      el(
        'fieldset',
        { className: 'bloc' },
        el('legend', { text: 'Méthode' }),
        chips('methode', Object.entries(STAT_METHODS), method, setMethod),
        el('p', { className: 'petit', text: STAT_METHODS[method].description }),
        method === 'achat'
          ? el('p', { className: `budget ${spent > rules.pointBuy.budget ? 'depasse' : ''}`, 'aria-live': 'polite' }, `Points restants : `, el('strong', { text: rules.pointBuy.budget - spent }), ` / ${rules.pointBuy.budget}`)
          : null,
        el(
          'div',
          { className: 'ligne' },
          method === 'des' ? el('button', { type: 'button', id: 'btn-relancer', onclick: rollDice, text: '🎲 Relancer les dés' }) : null,
          el('button', {
            type: 'button',
            id: 'btn-auto-caracs',
            className: 'secondaire',
            text: `✨ Répartir automatiquement pour un ${rules.classes[draft.classKey].label.toLowerCase()}`,
            onclick: () => {
              if (method === 'achat') {
                draft.buy = Object.fromEntries(rules.stats.map((s) => [s, rules.standardArray[priorityAssign(rules, draft.classKey)[s]]]));
              } else draft.assign = priorityAssign(rules, draft.classKey);
              draft.statsTouched = false;
              update();
            },
          }),
        ),
      ),
      el(
        'div',
        { className: 'tableau-caracs', role: 'table', 'aria-label': 'Caractéristiques' },
        el(
          'div',
          { className: 'ligne-carac entete', role: 'row' },
          ['Caractéristique', 'Base', 'Race', 'Total', 'Modif.'].map((t) => el('span', { role: 'columnheader', text: t })),
        ),
        rules.stats.map((s) => {
          const total = c.stats[s];
          const key = rules.classes[draft.classKey].priorities.slice(0, 2).includes(s);
          return el(
            'div',
            { className: `ligne-carac ${key ? 'cle' : ''}`, role: 'row' },
            el(
              'span',
              { role: 'cell', className: 'carac-nom' },
              el('strong', {}, rules.statLabels[s], key ? el('span', { className: 'cle-badge', title: 'Caractéristique clé de ta classe', text: ' ★' }) : null),
              el('span', { className: 'petit', text: rules.statDescriptions[s] }),
            ),
            el('span', { role: 'cell' }, control(s)),
            el('span', { role: 'cell', className: 'bonus-race', text: race.bonus[s] ? `+${race.bonus[s]}` : '—' }),
            el('span', { role: 'cell', className: 'total', text: total }),
            el('span', { role: 'cell', className: 'mod', text: formatMod(modifier(total)) }),
          );
        }),
      ),
      el('p', { className: 'petit' }, `Points de vie au niveau 1 : `, el('strong', { text: c.maxHp }), ` (${rules.classes[draft.classKey].hitDie} + Constitution ${formatMod(modifier(c.stats.CON))}).`),
    ];
  },

  apparence() {
    const { rules, draft } = ctx;
    const look = draft.look;
    const set = (key) => (value) => {
      look[key] = value;
      draft.lookTouched = true;
      update();
    };
    const group = (key, kind) => {
      const def = rules.look[key];
      const entries = Object.entries(def.options);
      return el(
        'fieldset',
        { className: 'groupe-apparence' },
        el('legend', {}, def.label, el('span', { className: 'valeur-choisie', text: ` : ${def.options[look[key]]?.label ?? ''}` })),
        kind === 'couleur' ? swatches(key, entries, look[key], set(key)) : chips(key, entries, look[key], set(key)),
      );
    };
    return [
      stepHeader('Apparence', 'Compose le portrait de ton personnage. Le narrateur s’en servira pour le décrire.'),
      el(
        'div',
        { className: 'atelier' },
        el(
          'div',
          { className: 'atelier-portrait' },
          el('div', { className: 'portrait geant' }, portrait(previewCharacter(rules, draft), rules)),
          el(
            'div',
            { className: 'ligne centre' },
            el('button', { type: 'button', id: 'btn-look-hasard', onclick: () => (randomLook(), update()), text: '🎲 Au hasard' }),
            el('button', {
              type: 'button',
              id: 'btn-look-defaut',
              className: 'secondaire',
              onclick: () => {
                draft.look = { ...rules.defaultLooks[draft.race][draft.classKey], details: look.details };
                draft.lookTouched = false;
                update();
              },
              text: '↺ Par défaut',
            }),
          ),
        ),
        el(
          'div',
          { className: 'atelier-options' },
          group('skin', 'couleur'),
          group('hairStyle'),
          group('hairColor', 'couleur'),
          group('eyes', 'couleur'),
          group('beard'),
          group('mark'),
          group('headwear'),
          group('outfitStyle'),
          group('outfitColor', 'couleur'),
          group('backdrop', 'couleur'),
          el(
            'label',
            { className: 'champ' },
            'Autres détails ',
            el('span', { className: 'petit', text: '(facultatif : bijoux, démarche, odeur…)' }),
            el('input', {
              id: 'look-details',
              maxlength: 160,
              value: look.details ?? '',
              placeholder: 'ex. Une dent en or, sent toujours la cannelle',
              oninput: (e) => {
                look.details = e.target.value;
                save();
              },
            }),
          ),
        ),
      ),
    ];
  },

  identite() {
    const { rules, draft } = ctx;
    const p = draft.personality;
    const textField = (id, label, key, max, examples, { multiline = false, placeholder = '' } = {}) => {
      const target = key === 'background' ? draft : p;
      const input = el(multiline ? 'textarea' : 'input', {
        id,
        maxlength: max,
        rows: multiline ? 4 : null,
        value: target[key] ?? '',
        placeholder,
        oninput: (e) => {
          target[key] = e.target.value;
          save();
        },
      });
      return el(
        'div',
        { className: 'champ' },
        el('label', { for: id, text: label }),
        el(
          'div',
          { className: 'ligne champ-avec-bouton' },
          input,
          el('button', {
            type: 'button',
            className: 'secondaire',
            title: 'Une idée au hasard',
            'aria-label': `Idée au hasard pour : ${label}`,
            text: '💡',
            onclick: () => {
              target[key] = pick(examples);
              input.value = target[key];
              save();
            },
          }),
        ),
      );
    };
    const locked = ctx.mode === 'style';
    return [
      stepHeader('Identité et personnalité', 'Qui est ton personnage ? Rien n’est obligatoire sauf le nom, mais plus tu en dis, plus le narrateur pourra jouer avec.'),
      el(
        'div',
        { className: 'champ' },
        el('label', { for: 'perso-nom' }, 'Nom du personnage ', el('span', { className: 'requis', text: '(obligatoire)' })),
        el(
          'div',
          { className: 'ligne champ-avec-bouton' },
          el('input', {
            id: 'perso-nom',
            maxlength: 40,
            required: true,
            disabled: locked,
            autocomplete: 'off',
            value: draft.name,
            placeholder: `ex. ${rules.names[draft.race][0]}`,
            oninput: (e) => {
              draft.name = e.target.value;
              save();
              renderPreview();
              renderStepper();
            },
          }),
          locked
            ? null
            : el('button', {
                type: 'button',
                className: 'secondaire',
                'aria-label': 'Nom au hasard',
                title: 'Nom au hasard',
                text: '🎲',
                onclick: () => {
                  draft.name = pick(rules.names[draft.race]);
                  $('#perso-nom').value = draft.name;
                  update({ step: false });
                },
              }),
        ),
        locked ? el('p', { className: 'petit', text: 'Le nom ne peut plus changer pendant l’aventure.' }) : null,
      ),
      el(
        'fieldset',
        { className: 'bloc' },
        el('legend', { text: 'Pronom' }),
        chips('pronom', [['', { label: 'Peu importe' }], ...Object.entries(rules.pronouns)], draft.pronouns, (key) => {
          draft.pronouns = key;
          update();
        }),
      ),
      el(
        'fieldset',
        { className: 'bloc' },
        el('legend', { text: 'Âge' }),
        chips('age', Object.entries(rules.ages), draft.age, (key) => {
          draft.age = key;
          update();
        }),
      ),
      el(
        'fieldset',
        { className: 'bloc' },
        el('legend', {}, 'Alignement ', el('span', { className: 'petit', text: '(sa morale : facultatif)' })),
        el(
          'div',
          { className: 'grille-alignement' },
          chips('alignement', [['', { label: 'Aucun' }], ...Object.entries(rules.alignments)], draft.alignment, (key) => {
            draft.alignment = key;
            update();
          }),
        ),
        draft.alignment ? el('p', { className: 'petit', text: rules.alignments[draft.alignment].description }) : null,
      ),
      el(
        'fieldset',
        { className: 'bloc' },
        el('legend', {}, 'Traits de caractère ', el('strong', { text: `${p.traits.length} / 3` })),
        chips(
          'trait',
          rules.traits.map((t) => [t, { label: t }]),
          p.traits,
          (key, checked) => {
            p.traits = checked ? [...p.traits, key] : p.traits.filter((t) => t !== key);
            update();
          },
          { type: 'checkbox', max: 3 },
        ),
      ),
      textField('perso-ideal', 'Idéal : ce qui le fait avancer', 'ideal', 160, rules.inspirations.ideal),
      textField('perso-lien', 'Lien : une personne, un lieu ou une promesse', 'bond', 160, rules.inspirations.bond),
      textField('perso-defaut', 'Défaut : sa faiblesse', 'flaw', 160, rules.inspirations.flaw),
      textField('perso-histoire', 'Histoire', 'background', 600, rules.inspirations.background, {
        multiline: true,
        placeholder: 'D’où vient ton personnage ? Que cherche-t-il ? Le narrateur s’en servira.',
      }),
    ];
  },

  resume() {
    const { rules, draft } = ctx;
    const c = previewCharacter(rules, draft);
    const missing = !draft.name.trim();
    return [
      stepHeader('Résumé', 'Vérifie ta fiche. Tu peux revenir à n’importe quelle étape en cliquant dessus en haut.'),
      missing
        ? el(
            'p',
            { className: 'alerte' },
            '⚠️ Il manque le nom de ton personnage. ',
            el('button', { type: 'button', className: 'lien', text: 'Le choisir', onclick: () => goTo(ctx.steps.indexOf('identite')) }),
          )
        : null,
      characterSheet(c, rules, { showGauges: false }),
      el(
        'section',
        { className: 'fiche-section' },
        el('h3', { text: 'Équipement de départ' }),
        el('ul', {}, c.inventory.map((i) => el('li', { text: i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name }))),
      ),
    ];
  },
};

// ---------- Hasard ----------

async function rollDice() {
  const res = await ctx.roll();
  if (!res.ok) return toast(res.error);
  const { draft, rules } = ctx;
  draft.statMethod = 'des';
  draft.pool = res.pool;
  draft.assign = priorityAssign(rules, draft.classKey);
  draft.statsTouched = false;
  update();
  toast(`🎲 Résultat : ${res.pool.join(', ')}`, 'info');
}

const NATURAL_SKINS = ['porcelaine', 'clair', 'mat', 'ambre', 'brun', 'ebene'];
const SCALES = ['bronze', 'vert', 'argent', 'noir', 'rouge', 'bleu', 'dore'];
const NATURAL_HAIR = ['noir', 'brun', 'chatain', 'roux', 'blond', 'blanc', 'gris'];

function randomLook() {
  const { rules, draft } = ctx;
  const base = rules.defaultLooks[draft.race][draft.classKey];
  const options = (key) => Object.keys(rules.look[key].options);
  const look = { ...base, details: draft.look.details ?? '' };
  if (draft.race === 'drakeide') look.skin = pick(SCALES);
  else if (['tieffelin', 'aasimar', 'demiorc', 'gnome'].includes(draft.race) && Math.random() < 0.6) look.skin = base.skin;
  else look.skin = pick(NATURAL_SKINS);
  look.hairStyle = pick(options('hairStyle'));
  look.hairColor = Math.random() < 0.8 ? pick(NATURAL_HAIR) : pick(options('hairColor'));
  look.eyes = pick(options('eyes').filter((k) => k !== 'blanc'));
  look.beard = draft.race === 'nain' ? pick(['courte', 'longue', 'tressee']) : Math.random() < 0.65 ? 'aucune' : pick(options('beard'));
  look.mark = Math.random() < 0.55 ? 'aucune' : pick(options('mark'));
  look.headwear = Math.random() < 0.5 ? base.headwear : pick(options('headwear'));
  look.outfitColor = Math.random() < 0.5 ? base.outfitColor : pick(options('outfitColor'));
  look.backdrop = pick(options('backdrop'));
  draft.look = look;
  draft.lookTouched = true;
}

function randomEverything() {
  const { rules, draft } = ctx;
  if (ctx.mode === 'creation') {
    draft.race = pick(Object.keys(rules.races));
    draft.classKey = pick(Object.keys(rules.classes));
    draft.origin = pick(Object.keys(rules.origins));
    draft.classSkills = [];
    draft.freeSkills = [];
    draft.statMethod = 'standard';
    draft.pool = [...rules.standardArray];
    draft.statsTouched = false;
    draft.lookTouched = false;
    onIdentityChange();
    const cls = rules.classes[draft.classKey];
    const fixed = fixedSkills(rules, draft.race, draft.origin);
    draft.classSkills = [...cls.skillChoices.filter((k) => !fixed.has(k))].sort(() => Math.random() - 0.5).slice(0, cls.skillCount);
    draft.name = pick(rules.names[draft.race]);
  }
  randomLook();
  draft.pronouns = pick(Object.keys(rules.pronouns));
  draft.age = pick(Object.keys(rules.ages));
  draft.alignment = pick(['lb', 'nb', 'cb', 'n', 'cn', 'ln']);
  draft.personality = {
    traits: [...rules.traits].sort(() => Math.random() - 0.5).slice(0, 2),
    ideal: pick(rules.inspirations.ideal),
    bond: pick(rules.inspirations.bond),
    flaw: pick(rules.inspirations.flaw),
  };
  draft.background = pick(rules.inspirations.background);
  update();
  toast('🎲 Personnage tiré au hasard ! Modifie ce que tu veux, ou valide directement.', 'info');
}

// ---------- Validation ----------

async function submit() {
  const { rules, draft } = ctx;
  if (!draft.name.trim()) {
    toast('Donne un nom à ton personnage.', 'info');
    goTo(ctx.steps.indexOf('identite'));
    $('#perso-nom')?.focus();
    return;
  }
  const button = $('#btn-etape-suiv');
  button.disabled = true;
  const choices = {
    name: draft.name.trim(),
    race: draft.race,
    classKey: draft.classKey,
    origin: draft.origin,
    skills: [...draft.classSkills, ...draft.freeSkills],
    statMethod: draft.statMethod,
    baseStats: baseStats(rules, draft),
    pronouns: draft.pronouns,
    age: draft.age,
    alignment: draft.alignment,
    personality: draft.personality,
    look: draft.look,
    background: draft.background,
  };
  const ok = await ctx.onSubmit(choices);
  button.disabled = false;
  if (ok && ctx?.mode === 'creation') storage.remove(ctx.storageKey);
}

// ---------- Point d'entrée ----------

// mode : 'creation' (nouveau personnage ou modification dans le salon) ou 'style' (en pleine aventure).
export function openCreator({ rules, existing, mode = 'creation', storageKey, roll, onSubmit, onCancel }) {
  const saved = mode === 'creation' && !existing ? storage.getJSON(storageKey) : null;
  const valid = saved && rules.races[saved.race] && rules.classes[saved.classKey] && Array.isArray(saved.pool);
  const draft = existing ? draftFromCharacter(rules, existing) : valid ? { ...newDraft(rules), ...saved } : newDraft(rules);
  const steps = mode === 'style' ? STYLE_STEPS : ALL_STEPS.map((s) => s.key);
  ctx = { rules, draft, mode, steps, step: 0, storageKey, roll, onSubmit, onCancel };
  $('#titre-creation').textContent =
    mode === 'style' ? 'Apparence et personnalité' : existing ? 'Modifier mon personnage' : 'Création du personnage';
  $('#btn-annuler-perso').classList.toggle('cache', !onCancel);
  update();
  goTo(0);
}

export function creatorOpen() {
  return Boolean(ctx);
}

export function closeCreator() {
  ctx = null;
}

$('#btn-etape-prec').addEventListener('click', () => goTo(ctx.step - 1));
$('#btn-etape-suiv').addEventListener('click', () => {
  if (ctx.step === ctx.steps.length - 1) submit();
  else goTo(ctx.step + 1);
});
$('#btn-tout-hasard').addEventListener('click', randomEverything);
$('#btn-annuler-perso').addEventListener('click', () => ctx?.onCancel?.());

// Flèches gauche/droite sur la liste des étapes.
$('#liste-etapes').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const buttons = $$('.etape-bouton');
  const index = buttons.indexOf(document.activeElement);
  if (index < 0) return;
  const next = buttons[(index + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
  next.focus();
});
