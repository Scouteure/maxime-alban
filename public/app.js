/* global io */
// Interface du jeu, sans framework, pour rester facile à modifier.
// Les autres modules : ui.js (outils), creation.js (création du personnage), fiche.js (fiche), portrait.js (portrait).

import { closeCreator, openCreator } from './creation.js';
import { characterSheet, characterSummary, conditions, hpGauge } from './fiche.js';
import { portrait } from './portrait.js';
import { $, $$, confirmDialog, el, fill, initSettings, openDialog, settings, storage, toast } from './ui.js';

const socket = io();

const state = {
  rules: null, // races, classes, apparence… (chargées depuis /api/regles)
  info: null, // nom du narrateur et adresses réseau local (/api/info)
  code: null,
  token: null,
  playerId: null,
  game: null, // dernier état reçu du serveur
  editing: false, // false, 'creation' (depuis le salon) ou 'style' (pendant l'aventure)
  creatorKey: null, // évite de réinitialiser l'assistant à chaque mise à jour du serveur
  partial: '', // narration en train d'arriver
  tab: 'fiche',
  view: 'recit', // vue affichée sur téléphone : 'recit' ou un onglet
  renderedLog: new Map(),
  panelCache: {}, // évite de redessiner un onglet qui n'a pas changé
  chatCount: -1, // -1 : messages pas encore affichés
  unreadChat: 0,
  wasMyTurn: false,
  image: null,
  settingsDirty: false,
};

// ---------- Préréglages du salon ----------

const PRESETS = {
  univers: [
    ['🏰 Médiéval-fantastique', 'Médiéval-fantastique classique : royaumes, forêts anciennes, donjons, magie et créatures légendaires.'],
    ['🏴‍☠️ Pirates', 'L’archipel des Mers d’Émeraude : pirates, îles mystérieuses, trésors maudits, monstres marins et marine royale.'],
    ['🦇 Horreur gothique', 'Une contrée brumeuse sous la coupe d’un seigneur vampire : villages apeurés, loups-garous, cimetières et secrets de famille.'],
    ['🍄 Royaume féerique', 'Le Pays des Fées : forêts enchantées, cours féeriques capricieuses, animaux qui parlent et pactes à double tranchant.'],
    ['🏜️ Désert des djinns', 'Un empire du désert : cités-oasis, caravanes, djinns liés à des lampes, tombeaux oubliés sous les dunes.'],
    ['❄️ Terres nordiques', 'Les terres gelées du Nord : clans rivaux, drakkars, géants des glaces, runes anciennes et hivers sans fin.'],
    ['⚙️ Steampunk', 'Une métropole de vapeur et de cuivre : inventeurs, dirigeables, automates, guildes secrètes et magie industrielle.'],
    ['🏙️ Cité d’intrigues', 'Une grande cité portuaire : guildes de voleurs, nobles corrompus, sociétés secrètes et enquêtes dans les ruelles.'],
  ],
  ton: [
    ['😄 Épique et drôle', 'Épique avec une bonne pointe d’humour.'],
    ['🦸 Héroïque', 'Grand souffle héroïque : nobles quêtes, méchants mémorables, moments de bravoure.'],
    ['🌑 Sombre', 'Sombre et tendu : danger réel, choix difficiles, peu d’humour.'],
    ['🔎 Mystère', 'Mystère et enquête : indices, suspects, fausses pistes et révélations.'],
    ['🧸 Pour tous', 'Léger et bienveillant, adapté aux enfants : peu de violence, beaucoup d’aventure et d’humour.'],
    ['🤪 Loufoque', 'Absurde et loufoque : situations improbables, PNJ excentriques, humour à chaque tour.'],
  ],
  depart: [
    ['🍺 Taverne et orage', 'Les personnages arrivent, un soir d’orage, dans une taverne animée.'],
    ['⛓️ En prison', 'Les personnages se réveillent dans la même cellule, sans savoir comment ils sont arrivés là.'],
    ['🚢 Naufrage', 'Le navire des personnages vient de sombrer ; ils échouent sur une île inconnue.'],
    ['🐪 Embuscade', 'La caravane qui transporte les personnages est attaquée en pleine route.'],
    ['💍 Mariage royal', 'Les personnages sont invités (ou incrustés) au mariage du prince, quand un cri retentit.'],
    ['🗺️ Carte au trésor', 'Un vieillard mourant confie aux personnages une carte au trésor déchirée en plusieurs morceaux.'],
  ],
};
const PRESET_FIELDS = { univers: '#param-univers', ton: '#param-ton', depart: '#param-depart' };

// ---------- Utilitaires ----------

function emit(event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(15000).emit(event, payload, (err, response) => {
      resolve(err ? { ok: false, error: 'Le serveur ne répond pas.' } : response);
    });
  });
}

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

function smallPortrait(c, size = 40) {
  return el('span', { className: 'portrait mini', style: `--taille:${size}px` }, portrait(c, state.rules, { label: '' }));
}

function showSheet(player) {
  fill($('#dlg-fiche-contenu'), characterSheet(player.character, state.rules, { player }));
  openDialog($('#dlg-fiche'));
}

// Petit carillon quand c'est à vous de jouer.
let audioContext;
function chime() {
  if (!settings.sound) return;
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
    creatorKey: null,
    image: null,
    chatCount: -1,
    unreadChat: 0,
    panelCache: {},
  });
  closeCreator();
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
  for (const screen of $$('.ecran')) screen.classList.toggle('cache', screen.id !== `ecran-${name}`);
  $('#outils-globaux').classList.toggle('cache', name === 'jeu');
  document.body.dataset.ecran = name;
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
  const previous = document.body.dataset.ecran;
  showScreen(screen);
  if (screen === 'accueil') renderHome();
  if (screen === 'personnage') ensureCreator(me);
  else if (state.creatorKey) {
    state.creatorKey = null;
    closeCreator();
  }
  if (screen === 'salon') renderLobby();
  if (screen === 'jeu') renderGame();
  // En changeant d'écran, on place le focus sur son titre (utile avec un lecteur d'écran).
  if (previous && previous !== screen) {
    const title = $(`#ecran-${screen} h1`) ?? $(`#ecran-${screen} .logo`);
    title?.setAttribute('tabindex', '-1');
    title?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }
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

$('#form-rejoindre').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#nom-joueur').value.trim();
  if (name) storage.set('taverne:nom', name);
  join($('#code-partie').value, name);
});
$('#btn-reprendre').addEventListener('click', () => join(storage.get('taverne:derniere')));

// ---------- Création du personnage ----------

function ensureCreator(me) {
  const mode = state.editing === 'style' ? 'style' : 'creation';
  const key = `${state.code}:${mode}:${me.character ? 'modif' : 'nouveau'}`;
  if (state.creatorKey === key) return;
  state.creatorKey = key;
  const done = () => {
    state.editing = false;
    render();
  };
  openCreator({
    rules: state.rules,
    existing: me.character,
    mode,
    storageKey: `taverne:brouillon:${state.code}`,
    roll: () => emit('personnage:des'),
    onCancel: me.character ? done : null,
    onSubmit: async (choices) => {
      const res = await emit(mode === 'style' ? 'personnage:style' : 'personnage:creer', choices);
      if (!res.ok) {
        toast(res.error);
        return false;
      }
      toast(mode === 'style' ? 'Apparence et personnalité mises à jour.' : `${choices.name} est prêt pour l’aventure !`, 'info');
      done();
      return true;
    },
  });
}

// ---------- Salon ----------

function renderPresets() {
  for (const [kind, presets] of Object.entries(PRESETS)) {
    const field = $(PRESET_FIELDS[kind]);
    fill(
      $(`#presets-${kind}`),
      presets.map(([label, text]) =>
        el('button', {
          type: 'button',
          className: `puce-choix ${field.value.trim() === text ? 'choisi' : ''}`,
          'aria-pressed': String(field.value.trim() === text),
          title: text,
          text: label,
          onclick: () => {
            field.value = text;
            saveSettings();
          },
        }),
      ),
    );
  }
}

function renderLobby() {
  const g = state.game;
  const rules = state.rules;
  $('#salon-code').textContent = g.code;
  fill(
    $('#salon-joueurs'),
    g.players.map((p) =>
      el(
        'li',
        { className: 'joueur' },
        p.character ? smallPortrait(p.character, 52) : el('span', { className: 'portrait mini vide', style: '--taille:52px', 'aria-hidden': 'true', text: '?' }),
        el(
          'div',
          { className: 'joueur-texte' },
          el(
            'div',
            {},
            el('span', { className: `point ${p.connected ? 'en-ligne' : ''}`, role: 'img', 'aria-label': p.connected ? 'connecté' : 'déconnecté' }),
            el('strong', { text: p.name }),
            p.id === state.playerId ? el('span', { className: 'petit', text: ' (toi)' }) : null,
          ),
          p.character
            ? el('div', { className: 'petit', text: `${p.character.name} · ${characterSummary(p.character, rules)}` })
            : el('div', { className: 'petit', text: '✏️ crée son personnage…' }),
        ),
        p.character
          ? el('button', { type: 'button', className: 'petit-bouton', text: 'Voir la fiche', 'aria-label': `Voir la fiche de ${p.character.name}`, onclick: () => showSheet(p) })
          : null,
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
      lan.length ? ['Si ton ami est sur le même Wi-Fi, envoie-lui plutôt : ', el('code', { text: inviteLink(lan[0]) }), '. '] : null,
      'Pour jouer à distance, utilise un tunnel (voir le README, section « Jouer à deux »).',
    );
  }

  if (!state.settingsDirty) {
    $('#param-univers').value = g.settings.world;
    $('#param-ton').value = g.settings.tone;
    $('#param-depart').value = g.settings.start;
  }
  renderPresets();

  const ready = g.players.filter((p) => p.character).length;
  $('#salon-pret').textContent =
    ready === g.players.length
      ? `Tout le monde est prêt (${ready}).`
      : `${ready} aventurier${ready > 1 ? 's' : ''} prêt${ready > 1 ? 's' : ''} sur ${g.players.length}. Les retardataires pourront rejoindre en cours de route.`;
  const start = $('#btn-commencer');
  start.disabled = !ready || g.narrating;
  start.textContent = g.narrating ? '📜 Le narrateur prépare l’histoire…' : '⚔️ Commencer l’aventure';
}

for (const id of Object.values(PRESET_FIELDS)) {
  $(id).addEventListener('input', () => {
    state.settingsDirty = true;
    $('#params-statut').textContent = '';
  });
  $(id).addEventListener('change', () => saveSettings());
}

async function saveSettings() {
  const res = await emit('partie:parametres', {
    world: $('#param-univers').value,
    tone: $('#param-ton').value,
    start: $('#param-depart').value,
  });
  if (!res.ok) {
    toast(res.error);
    return false;
  }
  state.settingsDirty = false;
  $('#params-statut').textContent = '✓ Réglages enregistrés pour tout le groupe.';
  renderPresets();
  return true;
}

$('#btn-copier-lien').addEventListener('click', copyInvite);
$('#btn-inviter').addEventListener('click', copyInvite);
$('#btn-modifier-perso').addEventListener('click', () => {
  state.editing = 'creation';
  render();
});
$('#btn-commencer').addEventListener('click', async () => {
  if (state.settingsDirty && !(await saveSettings())) return;
  const res = await emit('partie:commencer');
  if (!res.ok) toast(res.error);
});
for (const button of $$('.btn-quitter')) {
  button.addEventListener('click', async () => {
    if (await confirmDialog('Quitter la partie ? Tu pourras la reprendre plus tard avec son code.', { ok: 'Quitter' })) leave();
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
  const rules = state.rules;
  switch (entry.type) {
    case 'narration':
      return el('div', { className: 'entree narration' }, formatNarration(entry.text));
    case 'action':
      return el(
        'div',
        { className: 'entree action' },
        who?.character ? smallPortrait(who.character, 36) : null,
        el('div', {}, el('span', { className: 'qui', text: name }), el('span', { className: 'texte', text: `« ${entry.text} »` })),
      );
    case 'roll': {
      const mod = entry.total - entry.d20;
      const critical = entry.d20 === 20 || entry.d20 === 1;
      const label =
        entry.d20 === 20 ? 'Réussite critique !' : entry.d20 === 1 ? 'Échec critique !' : entry.success ? 'Réussite' : 'Échec';
      const what = entry.skill
        ? `${rules.skills[entry.skill]?.label ?? entry.skill} (${entry.stat})${entry.proficient ? ' ★' : ''}`
        : (rules.statLabels[entry.stat] ?? entry.stat);
      return el(
        'div',
        { className: 'entree jet' },
        `🎲 ${name} — ${what} : `,
        el('span', { className: `de ${critical ? 'critique' : ''}`, text: entry.d20 }),
        ` ${mod >= 0 ? '+' : '−'} ${Math.abs(mod)} = ${entry.total} contre DD ${entry.dc} → `,
        el('span', { className: `resultat ${entry.success ? 'reussite' : 'echec'}`, text: label }),
      );
    }
    case 'effects':
      return el(
        'div',
        { className: 'entree effets' },
        entry.lines.map((line) => el('span', { className: 'ligne-effet', text: `${line.character} : ${line.parts.join(' · ')}` })),
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
    live = el('div', { id: 'narration-live', className: 'entree', 'aria-live': 'off' });
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
    $('#scene-image').alt = `Illustration : ${scene.place}`;
  }
  $('#scene-lieu').textContent = scene.place || '…';
  $('#scene-ambiance').textContent = scene.mood || '';
  $('#scene-chargement').classList.toggle('cache', !state.game.illustrating);
  fill(
    $('#scene-ennemis'),
    scene.enemies.map((e) => el('span', { className: 'ennemi', text: `⚔️ ${e.nom} · ${e.etat}` })),
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

  fill(
    $('#suggestions'),
    (mine ? g.suggestions : []).map((s) =>
      el('button', {
        type: 'button',
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
    if (!document.querySelector('dialog[open]') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) input.focus();
  }
  state.wasMyTurn = mine;
}

// Ne redessine un onglet que si son contenu a changé (garde la position de lecture).
function renderPanel(id, key, build) {
  if (state.panelCache[id] === key) return;
  state.panelCache[id] = key;
  fill($(`#${id}`), build());
}

function renderSheetTab(me) {
  renderPanel('onglet-fiche', JSON.stringify(me.character), () =>
    characterSheet(me.character, state.rules, {
      actions: [
        el('button', {
          type: 'button',
          className: 'petit-bouton',
          text: '✏️ Apparence et personnalité',
          onclick: () => {
            state.editing = 'style';
            render();
          },
        }),
      ],
    }),
  );
}

function renderInventory(c) {
  const mine = isMyTurn();
  renderPanel('onglet-inventaire', JSON.stringify([c.inventory, c.gold, mine]), () => [
    el('div', { className: 'or-ligne', text: `🪙 ${c.gold} pièces d'or` }),
    c.inventory.length ? null : el('p', { className: 'petit', text: 'Ton sac est vide.' }),
    el(
      'ul',
      { className: 'liste-objets' },
      c.inventory.map((item) =>
        el(
          'li',
          { className: 'objet' },
          el(
            'div',
            {},
            el('div', { className: 'objet-nom' }, item.name, item.quantity > 1 ? el('span', { className: 'quantite', text: ` ×${item.quantity}` }) : null),
            item.description ? el('div', { className: 'description', text: item.description }) : null,
          ),
          el('button', {
            type: 'button',
            className: 'petit-bouton',
            text: 'Utiliser',
            'aria-label': `Utiliser ${item.name}`,
            title: mine ? '' : 'Tu peux préparer ton action, elle partira à ton tour',
            onclick: () => {
              const input = $('#action-texte');
              input.value = `J'utilise ${item.name} pour `;
              setView('recit');
              input.focus();
            },
          }),
        ),
      ),
    ),
  ]);
}

function renderGroup() {
  const g = state.game;
  const members = g.players.filter((p) => p.character);
  renderPanel('onglet-groupe', JSON.stringify([members, g.turn.playerId]), () =>
    el(
      'ul',
      { className: 'liste-groupe' },
      members.map((p) => {
        const c = p.character;
        return el(
          'li',
          { className: `carte-membre ${g.turn.playerId === p.id ? 'actif' : ''}` },
          el(
            'div',
            { className: 'tete' },
            smallPortrait(c, 48),
            el(
              'div',
              { className: 'membre-texte' },
              el('strong', { text: c.name }),
              el('div', { className: 'petit' }, el('span', { className: `point ${p.connected ? 'en-ligne' : ''}`, role: 'img', 'aria-label': p.connected ? 'connecté' : 'déconnecté' }), ` ${p.name} · niv. ${c.level} · ${characterSummary(c, state.rules)}`),
            ),
          ),
          hpGauge(c),
          conditions(c),
          el('button', { type: 'button', className: 'petit-bouton', text: 'Voir la fiche complète', 'aria-label': `Voir la fiche de ${c.name}`, onclick: () => showSheet(p) }),
        );
      }),
    ),
  );
}

function renderJournal() {
  const g = state.game;
  renderPanel('onglet-journal', JSON.stringify([g.scene.place, g.journal]), () => [
    el('h3', { text: '📍 Lieu actuel' }),
    el('p', { text: g.scene.place || '—' }),
    el('h3', { text: '📜 Notes du groupe' }),
    g.journal.length ? null : el('p', { className: 'petit', text: 'Les quêtes, indices et personnages importants apparaîtront ici.' }),
    el(
      'ul',
      { className: 'liste-journal' },
      [...g.journal].reverse().map((note) => el('li', { className: 'note-journal', text: note })),
    ),
  ]);
}

function renderChat() {
  const messages = state.game.log.filter((e) => e.type === 'chat');
  if (messages.length === state.chatCount) return;
  const chatVisible = state.tab === 'chat' && (state.view === 'chat' || !isMobile());
  if (state.chatCount >= 0 && !chatVisible) {
    state.unreadChat += messages.slice(state.chatCount).filter((m) => m.playerId !== state.playerId).length;
  }
  state.chatCount = messages.length;
  const box = $('#chat-messages');
  fill(
    box,
    messages.map((m) => {
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
  for (const badge of $$('.badge-chat')) {
    badge.textContent = state.unreadChat;
    badge.setAttribute('aria-label', `${state.unreadChat} message${state.unreadChat > 1 ? 's' : ''} non lu${state.unreadChat > 1 ? 's' : ''}`);
    badge.classList.toggle('cache', state.unreadChat === 0);
  }
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
  renderSheetTab(me);
  renderInventory(me.character);
  renderGroup();
  renderJournal();
  renderChat();
  renderTabs();
}

async function sendAction() {
  const input = $('#action-texte');
  const text = input.value.trim();
  if (!text) return toast('Écris d’abord ce que fait ton personnage.', 'info');
  if (!isMyTurn()) return toast('Ce n’est pas encore ton tour : ton texte est gardé pour plus tard.', 'info');
  $('#btn-agir').disabled = true;
  const res = await emit('tour:action', { text });
  if (!res.ok) {
    $('#btn-agir').disabled = false;
    return toast(res.error);
  }
  input.value = '';
}

$('#form-action').addEventListener('submit', (e) => {
  e.preventDefault();
  sendAction();
});
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

// ---------- Onglets (ordinateur) et navigation du bas (téléphone) ----------

const TABS = ['fiche', 'inventaire', 'groupe', 'journal', 'chat'];
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

function renderTabs() {
  for (const button of $$('.onglets [role="tab"]')) {
    const active = button.dataset.onglet === state.tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of $$('.onglet')) panel.classList.toggle('cache', panel.id !== `onglet-${state.tab}`);
  $('#jeu').dataset.vue = state.view;
  for (const button of $$('.nav-mobile button')) {
    const active = button.dataset.mobile === state.view;
    button.classList.toggle('actif', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
}

function selectTab(tab, { focus = false } = {}) {
  state.tab = tab;
  if (tab === 'chat') {
    state.unreadChat = 0;
    updateChatBadge();
  }
  renderTabs();
  if (focus) $(`#tab-${tab}`).focus();
}

function setView(view) {
  state.view = view;
  if (view !== 'recit') selectTab(view);
  else renderTabs();
  window.scrollTo({ top: 0 });
}

for (const button of $$('.onglets [role="tab"]')) {
  button.addEventListener('click', () => {
    selectTab(button.dataset.onglet);
    state.view = button.dataset.onglet;
    if (button.dataset.onglet === 'chat') $('#chat-texte').focus();
  });
  button.addEventListener('keydown', (e) => {
    const i = TABS.indexOf(state.tab);
    if (e.key === 'ArrowRight') selectTab(TABS[(i + 1) % TABS.length], { focus: true });
    else if (e.key === 'ArrowLeft') selectTab(TABS[(i + TABS.length - 1) % TABS.length], { focus: true });
    else if (e.key === 'Home') selectTab(TABS[0], { focus: true });
    else if (e.key === 'End') selectTab(TABS.at(-1), { focus: true });
    else return;
    e.preventDefault();
  });
}
for (const button of $$('.nav-mobile button')) {
  button.addEventListener('click', () => setView(button.dataset.mobile));
}

// Raccourcis : Alt+0 pour agir, Alt+1 à 5 pour les onglets.
document.addEventListener('keydown', (e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey || document.body.dataset.ecran !== 'jeu') return;
  if (e.key === '0') {
    setView('recit');
    $('#action-texte').focus();
  } else if (/^[1-5]$/.test(e.key)) {
    const tab = TABS[Number(e.key) - 1];
    setView(tab);
    selectTab(tab, { focus: true });
  } else return;
  e.preventDefault();
});

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
  initSettings();
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
