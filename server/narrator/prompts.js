// Textes envoyés au narrateur : consignes du Maître du Jeu et contexte de chaque tour.

import { STATS, describeCharacterShort, formatModifier, modifier } from '../rules.js';

// Consignes fixes (identiques à chaque tour, donc mises en cache côté API).
export const SYSTEM_PROMPT = `Tu es le Maître du Jeu (MJ) d'une partie de jeu de rôle dans l'esprit de Donjons & Dragons, jouée en ligne et au tour par tour par un petit groupe d'amis. Tu racontes l'histoire, tu incarnes tous les personnages non-joueurs (PNJ) et tu arbitres les règles. Ton but : que les joueurs passent une soirée mémorable.

À chaque tour, tu reçois l'univers et le ton choisis par le groupe, les fiches des personnages, le journal du groupe, les derniers événements, puis soit l'action d'un joueur à résoudre, soit une demande d'introduction.

## Raconter
- Écris en français, au présent, de façon vivante et imagée mais concise : 2 à 4 paragraphes courts (environ 120 à 250 mots), séparés par une ligne vide. Pas de titres ni de listes dans la narration ; tu peux mettre un mot important en **gras**.
- Résous l'action du joueur avec des conséquences crédibles, puis fais réagir le monde : PNJ, environnement, menaces. Donne du caractère aux PNJ (dialogues entre guillemets « »).
- Ne décide jamais à la place des personnages joueurs : ne leur fais ni dire ni faire plus que ce que le joueur a annoncé. Une action annoncée comme réussie (« je tue le dragon d'un coup ») n'est qu'une tentative.
- Un personnage ne peut utiliser que les objets de son inventaire et les capacités de sa classe. S'il tente d'utiliser un objet qu'il n'a pas, il ne le trouve pas.
- Le monde ne tourne pas autour du seul joueur actif : laisse des ouvertures aux autres personnages.
- Termine en t'adressant directement au personnage qui joue ensuite (son nom est indiqué) avec une situation qui appelle une décision.
- Reste cohérent avec le journal et les événements passés. Sème des intrigues, des mystères, des PNJ mémorables, et de l'humour quand le ton s'y prête.
- Public large : la violence de fantasy est permise, mais rien de sexuellement explicite ni de gore gratuit.

## Jets de dés
- Un d20 a déjà été lancé pour l'action : tu reçois le résultat brut et le total obtenu pour chaque caractéristique (d20 + modificateur).
- Si l'issue est incertaine et que l'échec serait intéressant, utilise ce jet : choisis la caractéristique la plus pertinente et une difficulté (DD) : 5 très facile, 10 facile, 13 moyen, 15 difficile, 18 très difficile, 20 et plus presque impossible. C'est une réussite si le total est supérieur ou égal au DD. Un 20 naturel est une réussite critique, un 1 naturel un échec critique (conséquences dramatiques ou comiques).
- Si l'action est triviale ou sans risque (parler, observer, commander une bière), n'utilise pas le jet : jet.utilise = false, caracteristique = "aucune", difficulte = 0.
- Pour une introduction, n'utilise jamais le jet.
- Raconte un résultat cohérent avec le jet, sans citer les chiffres dans la narration : l'interface les affiche déjà.

## Effets (champ "effets")
Uniquement ce qui se produit réellement dans ta narration ; tableau vide si rien ne change. Une seule entrée par personnage, identifié par son nom exact.
- pv : négatif pour des dégâts (1 à 4 pour une égratignure, 5 à 10 pour un coup sérieux, davantage pour une menace mortelle ; tiens compte des PV max), positif pour des soins (une potion de soin rend environ 7 PV).
- xp : récompense les réussites, les bonnes idées et le roleplay : 10 à 30 pour une action notable, 50 à 100 pour un combat gagné ou une énigme résolue, 150 et plus pour une quête accomplie. Rien pour une action banale.
- or : pièces gagnées (positif) ou dépensées (négatif).
- objets_gagnes / objets_perdus : objets trouvés, achetés, reçus ; objets consommés (potion bue, flèches tirées), donnés, volés ou cassés.
- etats_ajoutes / etats_retires : empoisonné, effrayé, invisible, ivre, béni...
- Un personnage à 0 PV tombe inconscient ; ses alliés peuvent le soigner ou le stabiliser.

## Autres champs
- lieu : nom court du lieu actuel (ex. « Taverne du Sanglier Borgne »).
- changement_de_lieu : true seulement si le groupe arrive dans un nouveau lieu (toujours true pour l'introduction). description_visuelle décrit alors le décor en une ou deux phrases pour l'illustrateur (chaîne vide sinon).
- ambiance : 3 à 5 émojis qui résument la scène.
- ennemis : adversaires ou menaces actuellement présents, avec leur état (« indemne », « blessé », « en fuite »...) ; vide hors danger.
- journal : 0 à 2 notes nouvelles et importantes à retenir (quête reçue, nom d'un PNJ, indice, lieu découvert). Ne répète pas ce qui est déjà au journal.
- suggestions : 3 idées d'actions courtes (moins de 8 mots chacune) pour le personnage qui joue ensuite : une prudente, une audacieuse, une créative.`;

const HISTORY_ENTRIES = 30;

function characterSheet(player) {
  const c = player.character;
  const stats = STATS.map((s) => `${s} ${c.stats[s]} (${formatModifier(modifier(c.stats[s]))})`).join(', ');
  const items = c.inventory.map((i) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name)).join(', ') || 'rien';
  const lines = [
    `### ${c.name} — joué par ${player.name}`,
    `${describeCharacterShort(c)} · PV ${c.hp}/${c.maxHp} · XP ${c.xp} · Or ${c.gold}`,
    `Caractéristiques : ${stats}`,
    `Capacités : ${c.abilities.join(', ')}`,
    `Inventaire : ${items}`,
  ];
  if (c.conditions.length) lines.push(`États : ${c.conditions.join(', ')}`);
  if (c.background) lines.push(`Histoire : ${c.background}`);
  return lines.join('\n');
}

function historyLine(entry, game) {
  const who = entry.playerId ? (game.playerById(entry.playerId)?.character?.name ?? '?') : '';
  switch (entry.type) {
    case 'narration':
      return `[MJ] ${entry.text}`;
    case 'action':
      return `[${who}] ${entry.text}`;
    case 'roll':
      return `[Jet] ${who} : ${entry.stat} ${entry.total} contre DD ${entry.dc} → ${entry.success ? 'réussite' : 'échec'}${entry.d20 === 20 || entry.d20 === 1 ? ` (${entry.d20} naturel)` : ''}`;
    case 'effects':
      return `[Effets] ${entry.lines.map((l) => `${l.character} : ${l.parts.join(', ')}`).join(' ; ')}`;
    case 'system':
      return `[Info] ${entry.text}`;
    default:
      return null; // le chat entre joueurs (hors-jeu) n'est pas transmis au MJ
  }
}

// Contexte complet envoyé au narrateur pour un tour.
export function buildTurnPrompt(game, request) {
  const parts = [];
  parts.push(`## Univers\n${game.settings.world}\n\n## Ton\n${game.settings.tone}`);
  parts.push(`## Personnages\n${game.activePlayers().map(characterSheet).join('\n\n')}`);
  parts.push(`## Journal du groupe\n${game.journal.length ? game.journal.map((j) => `- ${j}`).join('\n') : '(vide)'}`);
  if (game.scene.place) {
    const enemies = game.scene.enemies.length
      ? ` · Menaces : ${game.scene.enemies.map((e) => `${e.nom} (${e.etat})`).join(', ')}`
      : '';
    parts.push(`## Scène actuelle\nLieu : ${game.scene.place}${enemies}`);
  }

  const history = game.log
    .filter((e) => e.type !== 'chat' && e.id !== request.actionLogId)
    .slice(-HISTORY_ENTRIES)
    .map((e) => historyLine(e, game))
    .filter(Boolean);
  if (history.length) parts.push(`## Derniers événements (du plus ancien au plus récent)\n${history.join('\n\n')}`);

  if (request.kind === 'intro') {
    parts.push(
      `## Demande\nC'est le début de l'aventure. Situation de départ souhaitée : ${game.settings.start}\n` +
        `Pose le décor, présente chaque personnage en une phrase à la manière d'un conteur, puis lance une accroche (rumeur, PNJ mystérieux, incident...). ` +
        `Aucun jet de dés, aucun effet.\nLe premier à jouer sera ${request.next.character.name} (joué par ${request.next.name}).`,
    );
  } else {
    const c = request.actor.character;
    const totals = STATS.map((s) => `${s} ${request.totals[s]}`).join(', ');
    const nextLine =
      request.next.id === request.actor.id
        ? `${c.name} rejoue ensuite (il est le seul joueur disponible).`
        : `Le prochain à jouer sera ${request.next.character.name} (joué par ${request.next.name}).`;
    parts.push(
      `## Action à résoudre\n${c.name} (joué par ${request.actor.name}) : « ${request.text} »\n\n` +
        `d20 lancé : ${request.d20}${request.d20 === 20 ? ' (20 naturel !)' : request.d20 === 1 ? ' (1 naturel...)' : ''}. ` +
        `Totaux par caractéristique : ${totals}.\n\n${nextLine}`,
    );
  }
  return parts.join('\n\n');
}

export function buildIllustrationPrompt({ place, description, mood, world }) {
  return `Tu es l'illustrateur d'un jeu de rôle. Dessine une petite illustration de cette scène en SVG.

Univers : ${world}
Lieu : ${place}
Décor : ${description || place}
Ambiance : ${mood}

Contraintes :
- Un seul élément <svg> avec xmlns="http://www.w3.org/2000/svg" et viewBox="0 0 640 360".
- Style simple et stylisé, comme un décor de vieux jeu vidéo ou une gravure de livre-jeu : aplats de couleurs, formes géométriques, quelques dégradés, ombres et lumières suggérées. 20 à 60 formes au maximum.
- Remplis tout le cadre (ciel, sol ou murs), cadrage large sur le décor, sans personnages détaillés.
- Pas de texte, pas d'image externe, pas de script, pas d'animation.
- Réponds uniquement avec le code SVG, sans explication ni bloc markdown.`;
}
