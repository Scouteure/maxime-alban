// Sauvegarde des parties en fichiers JSON (un fichier par partie dans data/parties/).

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Game, generateCode } from './game.js';

export class GameStore {
  constructor(dir) {
    this.dir = dir;
    this.games = new Map();
    this.pendingSaves = new Map();
  }

  fileFor(code) {
    return path.join(this.dir, `${code}.json`);
  }

  async create() {
    await mkdir(this.dir, { recursive: true });
    let code;
    do code = generateCode();
    while (this.games.has(code) || (await this.load(code)));
    const game = Game.create(code);
    this.games.set(code, game);
    await this.saveNow(game);
    return game;
  }

  // Renvoie la partie en mémoire, ou la recharge depuis le disque (après un redémarrage du serveur).
  async get(code) {
    const key = String(code ?? '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}$/.test(key)) return undefined;
    return this.games.get(key) ?? (await this.load(key));
  }

  async load(code) {
    try {
      const data = JSON.parse(await readFile(this.fileFor(code), 'utf8'));
      const game = new Game(data);
      this.games.set(code, game);
      return game;
    } catch {
      return undefined;
    }
  }

  // Sauvegarde différée : regroupe les écritures rapprochées.
  save(game) {
    if (this.pendingSaves.has(game.code)) return;
    const timer = setTimeout(() => {
      this.pendingSaves.delete(game.code);
      this.saveNow(game).catch((err) => console.error(`Sauvegarde de ${game.code} impossible :`, err));
    }, 300);
    this.pendingSaves.set(game.code, timer);
  }

  async saveNow(game) {
    await mkdir(this.dir, { recursive: true });
    const file = this.fileFor(game.code);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(game, null, 2));
    await rename(tmp, file);
  }

  async flush() {
    const codes = [...this.pendingSaves.keys()];
    for (const code of codes) {
      clearTimeout(this.pendingSaves.get(code));
      this.pendingSaves.delete(code);
      await this.saveNow(this.games.get(code));
    }
  }
}
