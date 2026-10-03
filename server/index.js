// Point d'entrée : `npm start`

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameServer, lanAddresses } from './app.js';
import { createNarrator } from './narrator/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  // Pas de fichier .env : on utilise seulement les variables d'environnement existantes.
}

const narrator = createNarrator();
const { httpServer, store } = createGameServer({
  narrator,
  dataDir: process.env.DATA_DIR || path.join(root, 'data', 'parties'),
  publicDir: path.join(root, 'public'),
});

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, () => {
  console.log('\n🐉  La Taverne du Dragon est ouverte !\n');
  console.log(`   Sur cet ordinateur :      http://localhost:${port}`);
  for (const ip of lanAddresses()) console.log(`   Sur le réseau local :     http://${ip}:${port}`);
  console.log(`\n   Narrateur : ${narrator.label}`);
  if (narrator.label.startsWith('Démo')) {
    console.log('   ⚠️  Aucune clé API trouvée : mode démo. Ajoutez ANTHROPIC_API_KEY dans .env pour un vrai MJ.');
  }
  console.log('');
});

async function shutdown() {
  await store.flush();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
