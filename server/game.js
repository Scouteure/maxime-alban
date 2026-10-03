// État d'une partie et toute la logique « pure » : joueurs, tours, journal, effets.
// Aucune dépendance réseau ici, ce qui rend la logique facile à tester.

import { randomBytes, randomUUID } from 'node:crypto';
import { createCharacter, hpGainOnLevelUp, levelForXp } from './rules.js';

const MAX_LOG = 400;
const MAX_JOURNAL = 60;
const DOWNED = 'À terre';

export const DEFAULT_SETTINGS = {
  world: 'Médiéval-fantastique classique : royaumes, forêts anciennes, donjons, magie et créatures légendaires.',
  tone: 'Épique avec une bonne pointe d’humour.',
  start: 'Les personnages arrivent, un soir d’orage, dans une taverne animée.',
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateCode() {
  const bytes = randomBytes(4);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function clampInt(value, min, max) {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(max, Math.max(min, n));
}

function sameName(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export class Game {
  constructor(data) {
    Object.assign(this, data);
    // Champs non sauvegardés
    this.narrating = false;
    this.illustrating = false;
    for (const p of this.players) p.connections = 0;
  }

  static create(code) {
    return new Game({
      code,
      createdAt: new Date().toISOString(),
      status: 'lobby',
      settings: { ...DEFAULT_SETTINGS },
      players: [],
      turn: { playerId: null, number: 0 },
      log: [],
      journal: [],
      scene: { place: '', mood: '', enemies: [], image: null, illustratedPlace: '' },
      suggestions: [],
    });
  }

  // ----- Joueurs -----

  addPlayer(name) {
    const player = {
      id: randomUUID().slice(0, 8),
      token: randomBytes(16).toString('hex'),
      name:
        String(name ?? '')
          .trim()
          .slice(0, 30) || `Joueur ${this.players.length + 1}`,
      character: null,
      connections: 0,
    };
    this.players.push(player);
    return player;
  }

  playerByToken(token) {
    return token ? this.players.find((p) => p.token === token) : undefined;
  }

  playerById(id) {
    return this.players.find((p) => p.id === id);
  }

  // Retrouve un joueur à partir du nom de son personnage (ou de son id), tel que renvoyé par le narrateur.
  playerByCharacterName(name) {
    return (
      this.players.find((p) => p.character && sameName(p.character.name, name)) ??
      this.players.find((p) => p.character && sameName(p.id, name)) ??
      this.players.find((p) => p.character && sameName(p.name, name))
    );
  }

  setCharacter(playerId, choices) {
    const player = this.playerById(playerId);
    if (!player) throw new Error('Joueur inconnu.');
    const isNew = !player.character;
    player.character = createCharacter(choices);
    if (isNew && this.status === 'playing') {
      this.addLog({
        type: 'system',
        text: `✨ ${player.character.name} (${player.name}) rejoint l’aventure.`,
      });
      if (!this.currentPlayer()) this.turn.playerId = player.id;
    }
    return player.character;
  }

  // Joueurs ayant un personnage, dans l'ordre de jeu.
  activePlayers() {
    return this.players.filter((p) => p.character);
  }

  currentPlayer() {
    return this.playerById(this.turn.playerId);
  }

  // Prochain joueur après `playerId`, en privilégiant les joueurs connectés.
  nextPlayerAfter(playerId) {
    const order = this.activePlayers();
    if (order.length === 0) return undefined;
    const start = order.findIndex((p) => p.id === playerId);
    for (let i = 1; i <= order.length; i++) {
      const candidate = order[(start + i) % order.length];
      if (candidate.connections > 0) return candidate;
    }
    return order[(start + 1) % order.length];
  }

  advanceTurn(nextPlayer) {
    const next = nextPlayer ?? this.nextPlayerAfter(this.turn.playerId);
    this.turn.playerId = next?.id ?? null;
    this.turn.number += 1;
  }

  // ----- Journal des événements -----

  addLog(entry) {
    const full = { id: randomUUID().slice(0, 8), at: new Date().toISOString(), ...entry };
    this.log.push(full);
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
    return full;
  }

  removeLog(id) {
    this.log = this.log.filter((e) => e.id !== id);
  }

  addJournalNotes(notes) {
    for (const note of notes ?? []) {
      const text = String(note).trim().slice(0, 300);
      if (text && !this.journal.some((j) => sameName(j, text))) this.journal.push(text);
    }
    if (this.journal.length > MAX_JOURNAL) this.journal.splice(0, this.journal.length - MAX_JOURNAL);
  }

  // ----- Effets décidés par le narrateur -----

  // Applique les effets (PV, XP, or, objets, états) et renvoie des lignes lisibles pour l'interface.
  applyEffects(effects) {
    const lines = [];
    for (const effect of effects ?? []) {
      const player = this.playerByCharacterName(effect.personnage);
      if (!player) continue;
      const c = player.character;
      const parts = [];

      const hp = clampInt(effect.pv, -999, 999);
      if (hp !== 0) {
        const before = c.hp;
        c.hp = clampInt(c.hp + hp, 0, c.maxHp);
        const delta = c.hp - before;
        if (delta !== 0) parts.push(delta > 0 ? `❤️ +${delta} PV` : `💔 ${delta} PV`);
        if (c.hp === 0 && !c.conditions.includes(DOWNED)) {
          c.conditions.push(DOWNED);
          parts.push('💀 tombe inconscient');
        }
        if (c.hp > 0) c.conditions = c.conditions.filter((s) => s !== DOWNED);
      }

      const gold = clampInt(effect.or, -100000, 100000);
      if (gold !== 0) {
        const before = c.gold;
        c.gold = Math.max(0, c.gold + gold);
        const delta = c.gold - before;
        if (delta !== 0) parts.push(`🪙 ${delta > 0 ? '+' : ''}${delta} or`);
      }

      for (const item of effect.objets_gagnes ?? []) {
        const name = String(item.nom ?? '')
          .trim()
          .slice(0, 60);
        if (!name) continue;
        const quantity = clampInt(item.quantite || 1, 1, 999);
        const existing = c.inventory.find((i) => sameName(i.name, name));
        if (existing) existing.quantity += quantity;
        else c.inventory.push({ name, quantity, description: String(item.description ?? '').slice(0, 200) });
        parts.push(`🎒 +${quantity > 1 ? `${quantity} ` : ''}${name}`);
      }

      for (const item of effect.objets_perdus ?? []) {
        const existing = c.inventory.find((i) => sameName(i.name, item.nom));
        if (!existing) continue;
        const quantity = clampInt(item.quantite || 1, 1, 999);
        existing.quantity -= quantity;
        if (existing.quantity <= 0) c.inventory = c.inventory.filter((i) => i !== existing);
        parts.push(`➖ ${quantity > 1 ? `${quantity} ` : ''}${existing.name}`);
      }

      for (const state of effect.etats_ajoutes ?? []) {
        const s = String(state).trim().slice(0, 40);
        if (s && !c.conditions.some((x) => sameName(x, s))) {
          c.conditions.push(s);
          parts.push(`⚠️ ${s}`);
        }
      }
      for (const state of effect.etats_retires ?? []) {
        const before = c.conditions.length;
        c.conditions = c.conditions.filter((x) => !sameName(x, state));
        if (c.conditions.length < before) parts.push(`✅ n’est plus ${String(state).toLowerCase()}`);
      }

      const xp = clampInt(effect.xp, 0, 5000);
      if (xp > 0) {
        c.xp += xp;
        parts.push(`⭐ +${xp} XP`);
        const newLevel = levelForXp(c.xp);
        while (c.level < newLevel) {
          c.level += 1;
          const gain = hpGainOnLevelUp(c);
          c.maxHp += gain;
          c.hp = c.maxHp;
          c.conditions = c.conditions.filter((s) => s !== DOWNED);
          parts.push(`🎉 passe au niveau ${c.level} (+${gain} PV max)`);
        }
      }

      if (parts.length) lines.push({ character: c.name, playerId: player.id, parts });
    }
    return lines;
  }

  // ----- Vues -----

  // État envoyé aux navigateurs (sans les jetons secrets des joueurs).
  publicView() {
    return {
      code: this.code,
      status: this.status,
      settings: this.settings,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connections > 0,
        character: p.character,
      })),
      turn: this.turn,
      narrating: this.narrating,
      illustrating: this.illustrating,
      log: this.log.slice(-200),
      journal: this.journal,
      scene: this.scene,
      suggestions: this.suggestions,
    };
  }

  // Données sauvegardées sur disque.
  toJSON() {
    return {
      code: this.code,
      createdAt: this.createdAt,
      status: this.status,
      settings: this.settings,
      players: this.players.map(({ connections, ...rest }) => rest),
      turn: this.turn,
      log: this.log,
      journal: this.journal,
      scene: this.scene,
      suggestions: this.suggestions,
    };
  }
}
