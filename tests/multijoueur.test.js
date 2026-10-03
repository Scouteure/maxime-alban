// Test de bout en bout : deux joueurs connectés au même serveur, narrateur de démonstration.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { io as connect } from 'socket.io-client';
import { createGameServer } from '../server/app.js';
import { DemoNarrator } from '../server/narrator/demo.js';

let server;
let url;
let dataDir;
const clients = [];

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'taverne-'));
  server = createGameServer({ narrator: new DemoNarrator(), dataDir, publicDir: dataDir });
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${server.httpServer.address().port}`;
});

after(async () => {
  for (const c of clients) c.close();
  await server.store.flush();
  server.io.close();
  await rm(dataDir, { recursive: true, force: true });
});

function client() {
  const socket = connect(url, { transports: ['websocket'] });
  socket.states = [];
  socket.on('etat', (s) => socket.states.push(s));
  clients.push(socket);
  return socket;
}

const call = (socket, event, payload = {}) => new Promise((resolve) => socket.emit(event, payload, resolve));

function waitForState(socket, predicate, timeout = 5000) {
  const found = socket.states.findLast(predicate);
  if (found) return Promise.resolve(found);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('état attendu jamais reçu')), timeout);
    const listener = (s) => {
      if (!predicate(s)) return;
      clearTimeout(timer);
      socket.off('etat', listener);
      resolve(s);
    };
    socket.on('etat', listener);
  });
}

test('deux amis jouent chacun leur tour', async () => {
  const maxime = client();
  const alban = client();

  const created = await call(maxime, 'partie:creer', { name: 'Maxime' });
  assert.ok(created.ok);
  assert.match(created.code, /^[A-Z]{4}$/);

  // Rejoindre sans prénom : le serveur le demande.
  assert.equal((await call(alban, 'partie:rejoindre', { code: created.code })).needName, true);
  const joined = await call(alban, 'partie:rejoindre', { code: created.code, name: 'Alban' });
  assert.ok(joined.ok);

  assert.ok((await call(maxime, 'personnage:creer', { name: 'Aria', race: 'elfe', classKey: 'mage' })).ok);
  assert.ok((await call(alban, 'personnage:creer', { name: 'Borin', race: 'nain', classKey: 'guerrier' })).ok);

  assert.ok((await call(maxime, 'partie:commencer')).ok);
  let state = await waitForState(alban, (s) => s.status === 'playing' && !s.narrating && s.turn.number === 1);
  assert.equal(state.turn.playerId, created.playerId, 'Maxime commence');
  assert.ok(state.log.some((e) => e.type === 'narration'));

  // Alban ne peut pas jouer pendant le tour de Maxime.
  const refused = await call(alban, 'tour:action', { text: 'Je vole la bourse du tavernier' });
  assert.equal(refused.ok, false);

  assert.ok((await call(maxime, 'tour:action', { text: 'Je commande une bière' })).ok);
  state = await waitForState(alban, (s) => s.turn.number === 2 && !s.narrating);
  assert.equal(state.turn.playerId, joined.playerId, 'au tour d’Alban');
  assert.ok(state.log.some((e) => e.type === 'action' && e.text === 'Je commande une bière'));
  assert.ok(state.log.some((e) => e.type === 'roll'));
  const aria = state.players.find((p) => p.id === created.playerId).character;
  assert.ok(aria.xp > 0, 'Maxime a gagné de l’XP');

  assert.ok((await call(alban, 'tour:action', { text: 'Je salue l’inconnu' })).ok);
  state = await waitForState(maxime, (s) => s.turn.number === 3 && !s.narrating);
  assert.equal(state.turn.playerId, created.playerId, 'retour à Maxime');

  // Le chat hors-jeu est partagé.
  await call(alban, 'chat:message', { text: 'On fouille la cave ?' });
  state = await waitForState(maxime, (s) => s.log.some((e) => e.type === 'chat'));
  assert.ok(state.log.some((e) => e.text === 'On fouille la cave ?'));

  // Une illustration est produite pour la scène.
  state = await waitForState(maxime, (s) => Boolean(s.scene.image));
  assert.match(state.scene.image, /^<svg/);

  // Si Maxime se déconnecte, Alban peut passer son tour.
  maxime.close();
  state = await waitForState(alban, (s) => s.players.some((p) => p.id === created.playerId && !p.connected));
  assert.ok((await call(alban, 'tour:passer')).ok);
  state = await waitForState(alban, (s) => s.turn.number === 4);
  assert.equal(state.turn.playerId, joined.playerId);

  // Maxime revient avec son jeton et retrouve son personnage.
  const back = client();
  const rejoined = await call(back, 'partie:rejoindre', { code: created.code, token: created.token });
  assert.equal(rejoined.playerId, created.playerId);
});
