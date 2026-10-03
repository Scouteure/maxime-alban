/* global io */
// Interface du jeu : un seul fichier, sans framework, pour rester facile à modifier.

const socket = io();
const $ = (selector) => document.querySelector(selector);

const state = {
  rules: null, // races, classes, caractéristiques (chargées depuis /api/regles)
  info: null, // nom du narrateur et adresses réseau local (/api/info)
  code: null,
  token: null,
  playerId: null,
  game: null, // dernier état reçu du serveur
  editing: false, // modification du personnage depuis le salon
  draft: null, // personnage en cours de création
  partial: '', // narration en train d'arriver
  tab: 'fiche',
  renderedLog: new Map(),
  chatCount: -1, // -1 : messages pas encore affichés
  unreadChat: 0,
  wasMyTurn: false,
  image: null,
  settingsDirty: false,
  openMembers: new Set(),
};

// ---------- Utilitaires ----------

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // stockage indisponible (navigation privée) : tant pis
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // idem
    }
  },
};

// Crée un élément HTML : el('div', { className: 'x', text: 'y' }, enfant1, enfant2...)
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'className') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// Remplace le contenu d'un élément en ignorant les enfants vides (null, false...).
function fill(node, ...children) {
  node.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
}

let toastTimer;
function toast(message, type = 'erreur') {
  const box = $('#toast');
  box.textContent = message;
  box.className = `visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.className = ''), 5000);
}

function emit(event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(15000).emit(event, payload, (err, response) => {
      resolve(err ? { ok: false, error: 'Le serveur ne répond pas.' } : response);
    });
  });
}

const modifier = (score) => Math.floor((score - 10) / 2);
const formatMod = (mod) => (mod >= 0 ? `+${mod}` : `${mod}`);
// Même formule que server/rules.js
const xpForLevel = (level) => 50 * level * (level - 1);

function myPlayer() {
  return state.game?.players.find((p) => p.id === state.playerId);
}
function playerById(id) {
  return state.game?.players.find((p) => p.id === id);
}
function isMyTurn() {
  const g = state.game;
  return g?.status === 'playing' && !g.narrating && g.turn.playerId === state.playerId;
}
function inviteLink(origin = location.origin) {
  return `${origin}${location.pathname}?partie=${state.code}`;
}

// Un lien « localhost » ne fonctionne que sur l'ordinateur qui héberge la partie.
function isLocalhost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

async function copyInvite() {
  const link = inviteLink();
  try {
    await navigator.clipboard.writeText(link);
    toast('Lien copié ! Envoie-le à ton ami.', 'info');
  } catch {
    window.prompt('Copie ce lien et envoie-le à ton ami :', link);
  }
}

// Petit carillon quand c'est à vous de jouer.
let audioContext;
function chime() {
  try {
    audioContext ??= new AudioContext();
    const t = audioContext.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t + i * 0.15;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {
    // pas de son disponible
  }
}

const BASE_TITLE = document.title;
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) document.title = BASE_TITLE;
});

// ---------- Connexion à une partie ----------

function onJoined({ code, token, playerId }) {
  state.code = code;
  state.token = token;
  state.playerId = playerId;
  storage.set(`taverne:jeton:${code}`, token);
  storage.set('taverne:derniere', code);
  history.replaceState(null, '', `?partie=${code}`);
  render();
}

async function join(code, name) {
  const cleanCode = String(code ?? '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{4}$/.test(cleanCode)) return toast('Le code de partie fait 4 lettres.');
  const token = storage.get(`taverne:jeton:${cleanCode}`);
  const res = await emit('partie:rejoindre', { code: cleanCode, token, name });
  if (res.needName) {
    toast('Indique ton prénom pour rejoindre la partie.', 'info');
    $('#code-partie').value = cleanCode;
    $('#nom-joueur').focus();
    return;
  }
  if (!res.ok) return toast(res.error);
  onJoined(res);
}

function leave() {
  emit('partie:quitter');
  storage.remove('taverne:derniere');
  Object.assign(state, {
    code: null,
    token: null,
    playerId: null,
    game: null,
    editing: false,
    draft: null,
    image: null,
    chatCount: -1,
    unreadChat: 0,
  });
  state.renderedLog.clear();
  $('#recit').replaceChildren();
  history.replaceState(null, '', location.pathname);
  render();
}

socket.on('connect', () => {
  // Après une coupure réseau, on se reconnecte automatiquement à la partie.
  if (state.code) join(state.code);
});
socket.on('disconnect', () => toast('Connexion perdue… reconnexion en cours.'));
socket.on('etat', (game) => {
  state.game = game;
  if (!game.narrating) state.partial = '';
  render();
});
socket.on('narration:flux', ({ text }) => {
  state.partial = text;
  renderLiveNarration();
});
socket.on('erreur', ({ message }) => toast(message));
socket.on('action:rendue', ({ text }) => {
  const input = $('#action-texte');
  if (!input.value) input.value = text;
});

// ---------- Rendu général ----------

function showScreen(name) {
  for (const screen of document.querySelectorAll('.ecran')) {
    screen.classList.toggle('cache', screen.id !== `ecran-${name}`);
  }
}

function render() {
  if (!state.rules) return; // init() rappellera render() une fois les règles chargées
  const g = state.game;
  const me = myPlayer();
  let screen = 'accueil';
  if (g && me) {
    if (!me.character || state.editing) screen = 'personnage';
    else if (g.status === 'lobby') screen = 'salon';
    else screen = 'jeu';
  }
  showScreen(screen);
  if (screen === 'accueil') renderHome();
  if (screen === 'personnage') renderCharacterCreation(me);
  else state.draft = null;
  if (screen === 'salon') renderLobby();
  if (screen === 'jeu') renderGame();
}

// ---------- Accueil ----------

function renderHome() {
  const last = storage.get('taverne:derniere');
  const button = $('#btn-reprendre');
  const canResume = last && storage.get(`taverne:jeton:${last}`);
  button.classList.toggle('cache', !canResume);
  if (canResume) button.textContent = `↩️ Reprendre la partie ${last}`;
}

$('#btn-creer').addEventListener('click', async () => {
  const name = $('#nom-joueur').value.trim();
  if (!name) {
    toast('Indique ton prénom.', 'info');
    return $('#nom-joueur').focus();
  }
  storage.set('taverne:nom', name);
  const res = await emit('partie:creer', { name });
  if (!res.ok) return toast(res.error);
  onJoined(res);
});

$('#btn-rejoindre').addEventListener('click', () => {
  const name = $('#nom-joueur').value.trim();
  if (name) storage.set('taverne:nom', name);
  join($('#code-partie').value, name);
});
$('#code-partie').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btn-rejoindre').click();
});
$('#btn-reprendre').addEventListener('click', () => join(storage.get('taverne:derniere')));

// ---------- Création du personnage ----------

function assignStats(pool, classKey) {
  const priorities = state.rules.classes[classKey].priorities;
  const sorted = [...pool].sort((a, b) => b - a);
  return Object.fromEntries(priorities.map((stat, i) => [stat, sorted[i]]));
}

function startDraft(existing) {
  const rules = state.rules;
  if (existing) {
    const base = rules.stats.map((s) => existing.stats[s] - (rules.races[existing.race].bonus[s] ?? 0));
    state.draft = { race: existing.race, classKey: existing.classKey, pool: base };
    $('#perso-nom').value = existing.name;
    $('#perso-histoire').value = existing.background;
  } else {
    state.draft = { race: 'humain', classKey: 'guerrier', pool: [...rules.standardArray] };
    $('#perso-nom').value = '';
    $('#perso-histoire').value = '';
  }
}

function renderCharacterCreation(me) {
  if (!state.rules) return;
  if (!state.draft) startDraft(me.character);
  const { rules, draft } = state;
  $('#btn-annuler-perso').classList.toggle('cache', !me.character);

  $('#choix-race').replaceChildren(
    ...Object.entries(rules.races).map(([key, race]) =>
      el(
        'button',
        {
          className: draft.race === key ? 'choisi' : '',
          onclick: () => {
            draft.race = key;
            renderCharacterCreation(me);
          },
        },
        el('span', { className: 'emoji', text: race.emoji }),
        race.label,
        el('span', {
          className: 'bonus',
          text: Object.entries(race.bonus)
            .map(([s, b]) => `${s} +${b}`)
            .join(' '),
        }),
      ),
    ),
  );

  $('#choix-classe').replaceChildren(
    ...Object.entries(rules.classes).map(([key, cls]) =>
      el(
        'button',
        {
          className: draft.classKey === key ? 'choisi' : '',
          onclick: () => {
            draft.classKey = key;
            renderCharacterCreation(me);
          },
        },
        el('span', { className: 'emoji', text: cls.emoji }),
        cls.label,
        el('span', { className: 'bonus', text: `PV : d${cls.hitDie}` }),
      ),
    ),
  );

  const cls = rules.classes[draft.classKey];
  $('#classe-details').replaceChildren(
    el('div', {}, el('strong', { text: 'Capacités : ' }), cls.abilities.join(', ')),
    el(
      'div',
      {},
      el('strong', { text: 'Équipement : ' }),
      cls.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(', '),
      ` · ${cls.gold} pièces d'or`,
    ),
  );

  const base = assignStats(draft.pool, draft.classKey);
  $('#caracs').replaceChildren(
    ...rules.stats.map((s) => {
      const value = Math.min(20, base[s] + (rules.races[draft.race].bonus[s] ?? 0));
      return el(
        'div',
        { className: 'carac', title: rules.statLabels[s] },
        el('div', { className: 'nom', text: s }),
        el('div', { className: 'valeur', text: value }),
        el('div', { className: 'mod', text: formatMod(modifier(value)) }),
      );
    }),
  );
}

$('#btn-des').addEventListener('click', async () => {
  const res = await emit('personnage:caracs', { classKey: state.draft.classKey, mode: 'des' });
  if (!res.ok) return toast(res.error);
  state.draft.pool = Object.values(res.stats);
  renderCharacterCreation(myPlayer());
});
$('#btn-standard').addEventListener('click', () => {
  state.draft.pool = [...state.rules.standardArray];
  renderCharacterCreation(myPlayer());
});
$('#btn-annuler-perso').addEventListener('click', () => {
  state.editing = false;
  render();
});
$('#btn-valider-perso').addEventListener('click', async () => {
  const name = $('#perso-nom').value.trim();
  if (!name) {
    toast('Donne un nom à ton personnage.', 'info');
    return $('#perso-nom').focus();
  }
  const { race, classKey, pool } = state.draft;
  const res = await emit('personnage:creer', {
    name,
    race,
    classKey,
    background: $('#perso-histoire').value,
    baseStats: assignStats(pool, classKey),
  });
  if (!res.ok) return toast(res.error);
  state.editing = false;
  state.draft = null;
  render();
});

// ---------- Salon ----------

function characterSummary(c) {
  const race = state.rules?.races[c.race]?.label ?? c.race;
  const cls = state.rules?.classes[c.classKey]?.label ?? c.classKey;
  return `${race} ${cls}`;
}

function renderLobby() {
  const g = state.game;
  $('#salon-code').textContent = g.code;
  $('#salon-joueurs').replaceChildren(
    ...g.players.map((p) =>
      el(
        'li',
        {},
        el('span', { className: `point ${p.connected ? 'en-ligne' : ''}`, title: p.connected ? 'Connecté' : 'Déconnecté' }),
        el('strong', { text: p.name }),
        p.id === state.playerId ? el('span', { className: 'petit', text: '(toi)' }) : null,
        p.character
          ? `— ${p.character.emoji} ${p.character.name}, ${characterSummary(p.character)}`
          : el('em', { className: 'petit', text: '— crée son personnage…' }),
      ),
    ),
  );

  const tip = $('#astuce-lien');
  tip.classList.toggle('cache', !isLocalhost());
  if (isLocalhost()) {
    const lan = state.info?.lan ?? [];
    fill(
      tip,
      '💡 Ce lien commence par « localhost » : il ne marche que sur cet ordinateur. ',
      lan.length
        ? ['Si ton ami est sur le même Wi-Fi, envoie-lui plutôt : ', el('code', { text: inviteLink(lan[0]) }), '. ']
        : null,
      'Pour jouer à distance, utilise un tunnel (voir le README, section « Jouer à deux »).',
    );
  }

  if (!state.settingsDirty) {
    $('#param-univers').value = g.settings.world;
    $('#param-ton').value = g.settings.tone;
    $('#param-depart').value = g.settings.start;
  }
  const ready = g.players.some((p) => p.character);
  const start = $('#btn-commencer');
  start.disabled = !ready || g.narrating;
  start.textContent = g.narrating ? '📜 Le narrateur prépare l’histoire…' : '⚔️ Commencer l’aventure';
}

for (const id of ['#param-univers', '#param-ton', '#param-depart']) {
  $(id).addEventListener('input', () => (state.settingsDirty = true));
}

async function saveSettings() {
  const res = await emit('partie:parametres', {
    world: $('#param-univers').value,
    tone: $('#param-ton').value,
    start: $('#param-depart').value,
  });
  if (!res.ok) return toast(res.error);
  state.settingsDirty = false;
  return true;
}

$('#btn-enregistrer-params').addEventListener('click', async () => {
  if (await saveSettings()) toast('Réglages enregistrés.', 'info');
});
$('#btn-copier-lien').addEventListener('click', copyInvite);
$('#btn-inviter').addEventListener('click', copyInvite);
$('#btn-modifier-perso').addEventListener('click', () => {
  state.editing = true;
  render();
});
$('#btn-commencer').addEventListener('click', async () => {
  if (state.settingsDirty && !(await saveSettings())) return;
  const res = await emit('partie:commencer');
  if (!res.ok) toast(res.error);
});
for (const button of document.querySelectorAll('.btn-quitter')) {
  button.addEventListener('click', () => {
    if (confirm('Quitter la partie ? Tu pourras la reprendre plus tard avec son code.')) leave();
  });
}

// ---------- Partie en cours ----------

function inlineMarkdown(text) {
  // **gras** uniquement ; tout le reste est affiché tel quel (pas de HTML injecté).
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? el('strong', { text: part }) : part));
}

function formatNarration(text) {
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((paragraph) => {
      const p = el('p');
      paragraph.split('\n').forEach((line, i) => {
        if (i) p.append(el('br'));
        p.append(...inlineMarkdown(line).map((n) => (n instanceof Node ? n : document.createTextNode(n))));
      });
      return p;
    });
}

function renderEntry(entry) {
  const who = entry.playerId ? playerById(entry.playerId) : null;
  const name = who?.character?.name ?? who?.name ?? '?';
  switch (entry.type) {
    case 'narration':
      return el('div', { className: 'entree narration' }, formatNarration(entry.text));
    case 'action':
      return el(
        'div',
        { className: 'entree action' },
        el('span', { className: 'qui', text: `${who?.character?.emoji ?? '🙂'} ${name}` }),
        ' : ',
        el('span', { className: 'texte', text: `« ${entry.text} »` }),
      );
    case 'roll': {
      const mod = entry.total - entry.d20;
      const critical = entry.d20 === 20 || entry.d20 === 1;
      const label =
        entry.d20 === 20 ? 'Réussite critique !' : entry.d20 === 1 ? 'Échec critique !' : entry.success ? 'Réussite' : 'Échec';
      return el(
        'div',
        { className: 'entree jet' },
        `🎲 ${name} — ${state.rules?.statLabels[entry.stat] ?? entry.stat} : `,
        el('span', { className: `de ${critical ? 'critique' : ''}`, text: entry.d20 }),
        ` ${mod >= 0 ? '+' : '−'} ${Math.abs(mod)} = ${entry.total} contre DD ${entry.dc} → `,
        el('span', { className: `resultat ${entry.success ? 'reussite' : 'echec'}`, text: label }),
      );
    }
    case 'effects':
      return el(
        'div',
        { className: 'entree effets' },
        entry.lines.map((line) =>
          el('span', { className: 'ligne-effet', text: `${line.character} : ${line.parts.join(' · ')}` }),
        ),
      );
    case 'system':
      return el('div', { className: 'entree systeme', text: entry.text });
    default:
      return el('div');
  }
}

function liveElement() {
  let live = $('#narration-live');
  if (!live) {
    live = el('div', { id: 'narration-live', className: 'entree' });
    $('#recit').append(live);
  }
  return live;
}

// Le récit suit automatiquement les nouveaux messages, sauf si le joueur est remonté lire plus haut.
function isNearBottom(box) {
  return box.scrollHeight - box.scrollTop - box.clientHeight < 160;
}

function renderLiveNarration() {
  const g = state.game;
  const box = $('#recit');
  const live = liveElement();
  if (!g?.narrating) {
    live.className = 'entree cache';
    return;
  }
  const follow = isNearBottom(box);
  if (state.partial) {
    live.className = 'entree narration en-cours';
    live.replaceChildren(...formatNarration(state.partial));
  } else {
    live.className = 'entree reflexion';
    live.textContent = '📜 Le narrateur réfléchit';
  }
  if (follow) box.scrollTop = box.scrollHeight;
}

function renderLog() {
  const box = $('#recit');
  const live = liveElement();
  const entries = state.game.log.filter((e) => e.type !== 'chat');
  const ids = new Set(entries.map((e) => e.id));
  const follow = state.renderedLog.size === 0 || isNearBottom(box);
  for (const [id, node] of state.renderedLog) {
    if (!ids.has(id)) {
      node.remove();
      state.renderedLog.delete(id);
    }
  }
  let added = false;
  for (const entry of entries) {
    if (state.renderedLog.has(entry.id)) continue;
    const node = renderEntry(entry);
    box.insertBefore(node, live);
    state.renderedLog.set(entry.id, node);
    added = true;
  }
  if (added && follow) box.scrollTop = box.scrollHeight;
}

function renderScene() {
  const { scene } = state.game;
  if (scene.image && scene.image !== state.image) {
    state.image = scene.image;
    // Affichée via <img> : un SVG chargé ainsi ne peut exécuter aucun script.
    $('#scene-image').src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scene.image)}`;
  }
  $('#scene-lieu').textContent = scene.place || '…';
  $('#scene-ambiance').textContent = scene.mood || '';
  $('#scene-chargement').classList.toggle('cache', !state.game.illustrating);
  $('#scene-ennemis').replaceChildren(
    ...scene.enemies.map((e) => el('span', { className: 'ennemi', text: `⚔️ ${e.nom} · ${e.etat}` })),
  );
}

function renderTurn() {
  const g = state.game;
  const current = playerById(g.turn.playerId);
  const mine = isMyTurn();
  const banner = $('#bandeau-tour');
  banner.classList.toggle('mon-tour', mine);
  if (g.narrating) banner.textContent = '📜 Le narrateur raconte…';
  else if (mine) banner.textContent = `🎲 C'est à toi de jouer, ${current.character.name} !`;
  else if (current) {
    banner.textContent = `⏳ Au tour de ${current.character?.name ?? current.name} (${current.name})${current.connected ? '' : ' — déconnecté'}`;
  } else banner.textContent = '';

  // On peut préparer son action pendant le tour des autres, mais pas l'envoyer.
  const input = $('#action-texte');
  $('#btn-agir').disabled = !mine;
  const pass = $('#btn-passer');
  const canSkipOther = !g.narrating && current && !current.connected && current.id !== state.playerId;
  pass.disabled = !(mine || canSkipOther);
  pass.textContent = canSkipOther ? `Passer le tour de ${current.name}` : 'Passer';

  $('#suggestions').replaceChildren(
    ...(mine ? g.suggestions : []).map((s) =>
      el('button', {
        text: s,
        onclick: () => {
          input.value = s;
          input.focus();
        },
      }),
    ),
  );

  if (mine && !state.wasMyTurn) {
    chime();
    if (document.hidden) document.title = '🎲 À toi de jouer !';
    input.focus();
  }
  state.wasMyTurn = mine;
}

function gauge(kind, label, value, max, low = false) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return el(
    'div',
    { className: `jauge ${kind} ${low ? 'bas' : ''}` },
    el('div', { className: 'etiquette' }, el('span', { text: label }), el('span', { text: `${value} / ${max}` })),
    el('div', { className: 'barre-fond' }, el('div', { className: 'remplissage', style: `width:${percent}%` })),
  );
}

function hpGauge(c) {
  return gauge('pv', '❤️ Points de vie', c.hp, c.maxHp, c.hp / c.maxHp < 0.3);
}

function xpGauge(c) {
  const floor = xpForLevel(c.level);
  const next = xpForLevel(c.level + 1);
  return gauge('xp', `⭐ Niveau ${c.level} — ${c.xp} XP`, c.xp - floor, next - floor);
}

function statsGrid(c, mini = false) {
  return el(
    'div',
    { className: `caracs ${mini ? 'mini' : ''}` },
    state.rules.stats.map((s) =>
      el(
        'div',
        { className: 'carac', title: state.rules.statLabels[s] },
        el('div', { className: 'nom', text: s }),
        el('div', { className: 'valeur', text: c.stats[s] }),
        el('div', { className: 'mod', text: formatMod(modifier(c.stats[s])) }),
      ),
    ),
  );
}

function conditions(c) {
  return c.conditions.length
    ? el(
        'div',
        { className: 'etiquettes' },
        c.conditions.map((s) => el('span', { className: 'etat', text: s })),
      )
    : null;
}

function renderSheet(c) {
  fill(
    $('#onglet-fiche'),
    el(
      'div',
      { className: 'entete-perso' },
      el('div', { className: 'portrait', text: c.emoji }),
      el(
        'div',
        {},
        el('div', { className: 'nom', text: c.name }),
        el('div', { className: 'sous', text: `${characterSummary(c)} · niveau ${c.level}` }),
      ),
    ),
    hpGauge(c),
    xpGauge(c),
    el('div', { className: 'or-ligne', text: `🪙 ${c.gold} pièces d'or` }),
    conditions(c),
    statsGrid(c),
    el('h3', { text: 'Capacités' }),
    el(
      'ul',
      {},
      c.abilities.map((a) => el('li', { text: a })),
    ),
    c.background ? el('h3', { text: 'Histoire' }) : null,
    c.background ? el('p', { className: 'histoire', text: c.background }) : null,
  );
}

function renderInventory(c) {
  const mine = isMyTurn();
  fill(
    $('#onglet-inventaire'),
    el('div', { className: 'or-ligne', text: `🪙 ${c.gold} pièces d'or` }),
    c.inventory.length ? null : el('p', { className: 'petit', text: 'Ton sac est vide.' }),
    ...c.inventory.map((item) =>
      el(
        'div',
        { className: 'objet' },
        el(
          'div',
          {},
          el('div', {}, item.name, item.quantity > 1 ? el('span', { className: 'quantite', text: ` ×${item.quantity}` }) : null),
          item.description ? el('div', { className: 'description', text: item.description }) : null,
        ),
        el('button', {
          className: 'petit-bouton',
          text: 'Utiliser',
          disabled: !mine,
          title: mine ? '' : 'Attends ton tour',
          onclick: () => {
            const input = $('#action-texte');
            input.value = `J'utilise ${item.name} pour `;
            input.focus();
          },
        }),
      ),
    ),
  );
}

function renderGroup() {
  const g = state.game;
  $('#onglet-groupe').replaceChildren(
    ...g.players
      .filter((p) => p.character)
      .map((p) => {
        const c = p.character;
        const details = el(
          'details',
          {
            className: `carte-membre ${g.turn.playerId === p.id ? 'actif' : ''}`,
            open: state.openMembers.has(p.id),
            ontoggle: (e) => (e.target.open ? state.openMembers.add(p.id) : state.openMembers.delete(p.id)),
          },
          el(
            'summary',
            {},
            el(
              'div',
              { className: 'tete' },
              el('span', { className: `point ${p.connected ? 'en-ligne' : ''}` }),
              el('strong', { text: `${c.emoji} ${c.name}` }),
              el('span', { className: 'petit', text: `${p.name} · niv. ${c.level}` }),
            ),
            hpGauge(c),
            conditions(c),
          ),
          el(
            'div',
            { className: 'details' },
            el('div', { text: `${characterSummary(c)} · 🪙 ${c.gold} · ${c.xp} XP` }),
            statsGrid(c, true),
            el('div', {
              text: `Sac : ${c.inventory.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(', ') || 'vide'}`,
            }),
          ),
        );
        return details;
      }),
  );
}

function renderJournal() {
  const g = state.game;
  fill(
    $('#onglet-journal'),
    el('h3', { text: '📍 Lieu actuel' }),
    el('p', { text: g.scene.place || '—' }),
    el('h3', { text: '📜 Notes du groupe' }),
    g.journal.length
      ? null
      : el('p', { className: 'petit', text: 'Les quêtes, indices et personnages importants apparaîtront ici.' }),
    ...[...g.journal].reverse().map((note) => el('div', { className: 'note-journal', text: note })),
  );
}

function renderChat() {
  const messages = state.game.log.filter((e) => e.type === 'chat');
  if (messages.length === state.chatCount) return;
  if (state.chatCount >= 0 && state.tab !== 'chat') {
    state.unreadChat += messages.slice(state.chatCount).filter((m) => m.playerId !== state.playerId).length;
  }
  state.chatCount = messages.length;
  const box = $('#chat-messages');
  box.replaceChildren(
    ...messages.map((m) => {
      const author = playerById(m.playerId);
      return el(
        'div',
        { className: `message-chat ${m.playerId === state.playerId ? 'moi' : ''}` },
        el('span', { className: 'auteur', text: `${author?.name ?? '?'} : ` }),
        m.text,
      );
    }),
  );
  box.scrollTop = box.scrollHeight;
  updateChatBadge();
}

function updateChatBadge() {
  const badge = $('#badge-chat');
  badge.textContent = state.unreadChat;
  badge.classList.toggle('cache', state.unreadChat === 0);
}

function renderGame() {
  const g = state.game;
  const me = myPlayer();
  $('#jeu-code').textContent = g.code;
  $('#tour-numero').textContent = g.turn.number ? `Tour ${g.turn.number}` : '';
  renderScene();
  renderLog();
  renderLiveNarration();
  renderTurn();
  renderSheet(me.character);
  renderInventory(me.character);
  renderGroup();
  renderJournal();
  renderChat();
}

async function sendAction() {
  const input = $('#action-texte');
  const text = input.value.trim();
  if (!text || !isMyTurn()) return;
  $('#btn-agir').disabled = true;
  const res = await emit('tour:action', { text });
  if (!res.ok) {
    $('#btn-agir').disabled = false;
    return toast(res.error);
  }
  input.value = '';
}

$('#btn-agir').addEventListener('click', sendAction);
$('#action-texte').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAction();
  }
});
$('#btn-passer').addEventListener('click', async () => {
  const res = await emit('tour:passer');
  if (!res.ok) toast(res.error);
});

for (const button of document.querySelectorAll('.onglets button')) {
  button.addEventListener('click', () => {
    state.tab = button.dataset.onglet;
    for (const b of document.querySelectorAll('.onglets button')) b.classList.toggle('actif', b === button);
    for (const panel of document.querySelectorAll('.onglet')) panel.classList.toggle('cache', panel.id !== `onglet-${state.tab}`);
    if (state.tab === 'chat') {
      state.unreadChat = 0;
      updateChatBadge();
      $('#chat-texte').focus();
    }
  });
}

$('#chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#chat-texte');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const res = await emit('chat:message', { text });
  if (!res.ok && res.error) toast(res.error);
});

// ---------- Démarrage ----------

async function init() {
  const [rules, info] = await Promise.all([fetch('/api/regles').then((r) => r.json()), fetch('/api/info').then((r) => r.json())]);
  state.rules = rules;
  state.info = info;
  $('#info-narrateur').textContent = info.narrator.startsWith('Démo')
    ? '⚠️ Mode démo : pas de clé API configurée, le narrateur est simulé.'
    : `Narrateur : ${info.narrator}`;

  $('#nom-joueur').value = storage.get('taverne:nom') ?? '';
  const code = new URLSearchParams(location.search).get('partie');
  if (code) {
    $('#code-partie').value = code.toUpperCase();
    if (storage.get(`taverne:jeton:${code.toUpperCase()}`)) {
      state.code = code.toUpperCase(); // le gestionnaire « connect » fera la reconnexion
      if (socket.connected) join(state.code);
    } else if (!$('#nom-joueur').value) {
      $('#nom-joueur').focus();
    }
  }
  render();
}

init();
