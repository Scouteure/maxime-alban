// Serveur web + temps réel (Socket.IO) : relie les navigateurs des joueurs à la partie et au narrateur.

import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import express from 'express';
import { Server } from 'socket.io';
import { GameStore } from './store.js';
import { CLASSES, RACES, STANDARD_ARRAY, STATS, STAT_LABELS, rollDie, rollStats, rollTotals, standardStats } from './rules.js';

const MAX_PLAYERS = 6;

// Adresses IPv4 de cet ordinateur sur le réseau local (pour inviter un ami sur le même Wi-Fi).
export function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}

function clean(value, max) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export function createGameServer({ narrator, dataDir, publicDir }) {
  const store = new GameStore(dataDir);
  const app = express();
  app.use(express.static(publicDir));
  app.get('/api/info', (req, res) =>
    res.json({ narrator: narrator.label, lan: lanAddresses().map((ip) => `http://${ip}:${req.socket.localPort}`) }),
  );
  app.get('/api/regles', (_req, res) =>
    res.json({ stats: STATS, statLabels: STAT_LABELS, races: RACES, classes: CLASSES, standardArray: STANDARD_ARRAY }),
  );

  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 100_000 });

  const broadcast = (game) => io.to(game.code).emit('etat', game.publicView());
  const changed = (game) => {
    store.save(game);
    broadcast(game);
  };
  const notifyError = (game, message) => io.to(game.code).emit('erreur', { message });

  // ----- Narration -----

  // Applique la réponse du narrateur à la partie.
  function applyNarration(game, request, result) {
    if (request.kind === 'action' && result.jet?.utilise && STATS.includes(result.jet.caracteristique)) {
      const stat = result.jet.caracteristique;
      const total = request.totals[stat];
      const dc = Math.min(40, Math.max(1, Math.round(result.jet.difficulte) || 10));
      const success = request.d20 === 20 || (request.d20 !== 1 && total >= dc);
      game.addLog({ type: 'roll', playerId: request.actor.id, stat, d20: request.d20, total, dc, success });
    }

    game.addLog({ type: 'narration', text: clean(result.narration, 6000) });

    const lines = game.applyEffects(result.effets);
    if (lines.length) game.addLog({ type: 'effects', lines });

    game.addJournalNotes((result.journal ?? []).slice(0, 3));

    game.scene.place = clean(result.lieu, 80) || game.scene.place;
    game.scene.mood = clean(result.ambiance, 40);
    game.scene.enemies = (result.ennemis ?? []).slice(0, 8).map((e) => ({ nom: clean(e.nom, 60), etat: clean(e.etat, 40) }));
    game.suggestions = (result.suggestions ?? [])
      .slice(0, 4)
      .map((s) => clean(s, 80))
      .filter(Boolean);

    if (request.kind === 'intro') {
      game.turn = { playerId: request.next.id, number: 1 };
    } else {
      // Si le joueur prévu s'est déconnecté entre-temps, on passe au suivant disponible.
      const next = request.next.connections > 0 ? request.next : game.nextPlayerAfter(request.actor.id);
      game.advanceTurn(next);
    }

    // Une seule tentative d'illustration par lieu (même si elle échoue), pour maîtriser les coûts.
    const newPlace = result.changement_de_lieu || game.scene.place !== game.scene.illustratedPlace;
    if (newPlace && game.scene.place) {
      illustrate(game, { place: game.scene.place, description: clean(result.description_visuelle, 400), mood: game.scene.mood });
    }
  }

  async function runNarration(game, request, onFailure) {
    game.narrating = true;
    broadcast(game);
    let lastPartial = 0;
    const onPartial = (text) => {
      const now = Date.now();
      if (now - lastPartial < 80) return;
      lastPartial = now;
      io.to(game.code).emit('narration:flux', { text });
    };
    try {
      const result = await narrator.narrate(game, request, onPartial);
      applyNarration(game, request, result);
    } catch (err) {
      console.error(`[${game.code}] Narration impossible :`, err.message);
      onFailure(err);
    } finally {
      game.narrating = false;
      changed(game);
    }
  }

  // L'illustration est générée en arrière-plan : la partie continue pendant ce temps.
  async function illustrate(game, scene) {
    game.scene.illustratedPlace = scene.place;
    game.illustrating = true;
    try {
      const svg = await narrator.illustrate({ ...scene, world: game.settings.world });
      if (svg && svg.length < 150_000 && game.scene.place === scene.place) game.scene.image = svg;
    } catch (err) {
      console.warn(`[${game.code}] Illustration impossible :`, err.message);
    } finally {
      game.illustrating = false;
      changed(game);
    }
  }

  // ----- Connexions des joueurs -----

  io.on('connection', (socket) => {
    let game = null;
    let player = null;

    // Enregistre un gestionnaire d'événement avec accusé de réception et gestion d'erreurs.
    const on = (event, handler, { needsPlayer = true } = {}) => {
      socket.on(event, async (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (needsPlayer && (!game || !player)) return reply({ ok: false, error: 'Rejoignez d’abord une partie.' });
        try {
          await handler(payload ?? {}, reply);
        } catch (err) {
          console.error(`Erreur sur « ${event} » :`, err);
          reply({ ok: false, error: err.message });
        }
      });
    };

    function detach() {
      if (game && player) {
        player.connections = Math.max(0, player.connections - 1);
        socket.leave(game.code);
        broadcast(game);
      }
      game = null;
      player = null;
    }

    function attach(g, p) {
      detach();
      game = g;
      player = p;
      p.connections += 1;
      socket.join(g.code);
      changed(g);
    }

    const joined = (reply) => reply({ ok: true, code: game.code, token: player.token, playerId: player.id });

    on(
      'partie:creer',
      async ({ name }, reply) => {
        const g = await store.create();
        attach(g, g.addPlayer(clean(name, 30)));
        joined(reply);
      },
      { needsPlayer: false },
    );

    on(
      'partie:rejoindre',
      async ({ code, token, name }, reply) => {
        const g = await store.get(code);
        if (!g) return reply({ ok: false, error: 'Partie introuvable. Vérifiez le code.' });
        let p = g.playerByToken(token);
        if (!p) {
          if (!clean(name, 30)) return reply({ ok: false, needName: true });
          if (g.players.length >= MAX_PLAYERS)
            return reply({ ok: false, error: `La partie est complète (${MAX_PLAYERS} joueurs maximum).` });
          p = g.addPlayer(clean(name, 30));
        }
        attach(g, p);
        joined(reply);
      },
      { needsPlayer: false },
    );

    on('partie:quitter', (_payload, reply) => {
      detach();
      reply({ ok: true });
    });

    on('personnage:caracs', ({ classKey, mode }, reply) => {
      reply({ ok: true, stats: mode === 'des' ? rollStats(classKey) : standardStats(classKey) });
    });

    on('personnage:creer', (choices, reply) => {
      if (player.character && game.status !== 'lobby') {
        return reply({ ok: false, error: 'Votre personnage est déjà en pleine aventure !' });
      }
      game.setCharacter(player.id, {
        name: choices.name,
        race: choices.race,
        classKey: choices.classKey,
        background: choices.background,
        baseStats: choices.baseStats,
      });
      changed(game);
      reply({ ok: true });
    });

    on('partie:parametres', ({ world, tone, start }, reply) => {
      game.settings = {
        world: clean(world, 500) || game.settings.world,
        tone: clean(tone, 200) || game.settings.tone,
        start: clean(start, 300) || game.settings.start,
      };
      changed(game);
      reply({ ok: true });
    });

    on('partie:commencer', async (_payload, reply) => {
      if (game.status !== 'lobby') return reply({ ok: false, error: 'L’aventure a déjà commencé.' });
      if (game.narrating) return reply({ ok: false, error: 'Le narrateur prépare déjà l’introduction.' });
      const order = game.activePlayers();
      if (!order.length) return reply({ ok: false, error: 'Créez au moins un personnage avant de commencer.' });
      const g = game;
      g.status = 'playing';
      reply({ ok: true });
      const first = order.find((p) => p.connections > 0) ?? order[0];
      await runNarration(g, { kind: 'intro', next: first }, (err) => {
        g.status = 'lobby';
        notifyError(g, `Le narrateur n’a pas pu démarrer l’aventure : ${err.message}`);
      });
    });

    on('tour:action', async ({ text }, reply) => {
      const g = game;
      const p = player;
      const action = clean(text, 500);
      if (!action) return reply({ ok: false, error: 'Décrivez ce que fait votre personnage.' });
      if (g.status !== 'playing') return reply({ ok: false, error: 'L’aventure n’a pas encore commencé.' });
      if (g.narrating) return reply({ ok: false, error: 'Patience, le narrateur raconte encore...' });
      if (!p.character) return reply({ ok: false, error: 'Créez d’abord votre personnage.' });
      if (g.turn.playerId !== p.id) return reply({ ok: false, error: 'Ce n’est pas votre tour.' });

      const entry = g.addLog({ type: 'action', playerId: p.id, text: action });
      g.suggestions = [];
      const d20 = rollDie(20);
      const request = {
        kind: 'action',
        actor: p,
        text: action,
        d20,
        totals: rollTotals(p.character, d20),
        next: g.nextPlayerAfter(p.id),
        actionLogId: entry.id,
      };
      reply({ ok: true });
      await runNarration(g, request, (err) => {
        // On annule l'action pour que le joueur puisse réessayer.
        g.removeLog(entry.id);
        notifyError(g, `Le narrateur a eu un problème : ${err.message}`);
        socket.emit('action:rendue', { text: action });
      });
    });

    on('tour:passer', (_payload, reply) => {
      const current = game.currentPlayer();
      if (game.status !== 'playing') return reply({ ok: false, error: 'L’aventure n’a pas encore commencé.' });
      if (game.narrating) return reply({ ok: false, error: 'Patience, le narrateur raconte encore...' });
      if (current && current.id !== player.id && current.connections > 0) {
        return reply({ ok: false, error: 'Seul le joueur dont c’est le tour peut passer (sauf s’il est déconnecté).' });
      }
      const who = current?.character?.name ?? 'Le joueur';
      game.addLog({ type: 'system', text: `⏭️ ${who} passe son tour.` });
      game.suggestions = [];
      game.advanceTurn();
      changed(game);
      reply({ ok: true });
    });

    on('chat:message', ({ text }, reply) => {
      const message = clean(text, 300);
      if (!message) return reply({ ok: false });
      game.addLog({ type: 'chat', playerId: player.id, text: message });
      changed(game);
      reply({ ok: true });
    });

    socket.on('disconnect', detach);
  });

  return { app, httpServer, io, store };
}
