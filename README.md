# 🐉 La Taverne du Dragon

Un jeu de rôle narratif dans l'esprit de **Donjons & Dragons**, joué **au tour par tour** à plusieurs, chacun sur son ordinateur, avec un **Maître du Jeu IA** (Claude) qui raconte l'histoire.

> *« La pluie martèle les volets de la taverne quand la porte s'ouvre sur vous… Que faites-vous ? »*

## Ce que fait le jeu

- **Narrateur IA** : Claude raconte, incarne les PNJ, arbitre les règles et réagit à tout ce que vous écrivez, librement.
- **Multijoueur en temps réel** : chacun joue depuis son navigateur ; quand c'est votre tour, un petit carillon sonne. Le texte du narrateur s'affiche au fur et à mesure qu'il l'écrit.
- **Tour par tour** : un joueur agit, le narrateur raconte la suite et passe la main au joueur suivant.
- **Personnages façon D&D** : 6 races, 6 classes, caractéristiques (FOR, DEX, CON, INT, SAG, CHA), jets de dés 4d6 ou répartition standard.
- **Jets de d20** : le serveur lance le dé, le narrateur choisit la caractéristique et la difficulté ; l'interface affiche le résultat (réussites et échecs critiques compris).
- **Progression** : points de vie, XP et niveaux, or, inventaire, états (empoisonné, à terre…), tout mis à jour automatiquement par le narrateur.
- **Visuels légers** : une petite illustration SVG est dessinée par l'IA à chaque nouveau lieu, plus des émojis d'ambiance et les ennemis présents.
- **Panneau latéral** : fiche du personnage, sac (inventaire), groupe, journal des quêtes et indices, chat hors-jeu entre joueurs.
- **Sauvegarde automatique** : les parties sont enregistrées sur le disque ; on peut fermer le navigateur et reprendre plus tard avec le code.
- **Mode démo** sans clé API, pour tester l'interface et le multijoueur.

## Démarrage rapide

Il faut [Node.js](https://nodejs.org) version 20.12 ou plus récente.

```bash
npm install
cp .env.example .env      # puis mettez votre clé ANTHROPIC_API_KEY dans .env
npm start
```

Ouvrez ensuite <http://localhost:3000>, entrez votre prénom et cliquez sur **Créer une partie**.
Créez votre personnage, puis cliquez sur **Copier le lien d'invitation** et envoyez-le à votre ami.

Pas encore de clé API ? `npm run demo` lance le jeu avec un narrateur simulé (les réponses sont toutes faites, mais tout le reste fonctionne).

La clé API se crée sur <https://platform.claude.com> (rubrique *API Keys*). L'utilisation est facturée à l'usage : voir [Combien ça coûte ?](#combien-ça-coûte-).

## Jouer à deux sur des ordinateurs différents

Le jeu tourne sur **un seul** ordinateur (celui qui lance `npm start`) ; les autres joueurs s'y connectent avec leur navigateur.

**Sur le même réseau (même Wi-Fi)** : au démarrage, le serveur affiche une adresse « Sur le réseau local », par exemple `http://192.168.1.20:3000`. Votre ami ouvre cette adresse (ou le lien d'invitation en remplaçant `localhost` par cette adresse). Si ça ne passe pas, autorisez Node.js dans le pare-feu.

**À distance (chacun chez soi)**, trois options :

1. **Un tunnel** (le plus simple) : il donne une adresse publique temporaire à votre jeu.
   - [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (gratuit, sans compte) : `cloudflared tunnel --url http://localhost:3000`
   - ou [ngrok](https://ngrok.com) : `ngrok http 3000`

   Ouvrez vous-même le jeu via l'adresse affichée par le tunnel, puis copiez le lien d'invitation : il contiendra la bonne adresse.
2. **Un réseau privé** comme [Tailscale](https://tailscale.com) : installé sur les deux ordinateurs, il vous met sur le « même réseau » où que vous soyez.
3. **Un hébergement en ligne** (Render, Railway, Fly.io…) : créez un service web Node.js, commande de démarrage `npm start`, et ajoutez `ANTHROPIC_API_KEY` dans les variables d'environnement. Attention : sur les offres gratuites, le disque est souvent effacé au redémarrage (les parties sauvegardées seraient perdues).

## Comment on joue

1. **Créer ou rejoindre** une partie (code de 4 lettres ou lien d'invitation).
2. **Créer son personnage** : nom, race, classe, caractéristiques et, si vous voulez, une petite histoire que le narrateur utilisera.
3. Dans le **salon**, réglez l'univers, le ton et la situation de départ (par défaut : une taverne un soir d'orage), puis **Commencer l'aventure**.
4. À votre tour, écrivez librement ce que fait votre personnage (« Je m'approche du barde et lui demande s'il connaît la légende du dragon »), ou cliquez sur une suggestion. Vous pouvez préparer votre action pendant le tour des autres.
5. Le narrateur raconte la suite, lance les dés si nécessaire, applique les dégâts, l'XP, l'or et les objets, puis passe la main.

Astuces :

- Bouton **Utiliser** dans le sac pour pré-remplir une action avec un objet.
- **Passer** son tour ; si un joueur est déconnecté, les autres peuvent passer son tour à sa place.
- Le **chat** sert à discuter entre joueurs sans que le narrateur le lise.
- Un ami peut rejoindre une partie déjà commencée : son personnage arrive en cours de route.
- En rechargeant la page, vous retrouvez automatiquement votre personnage (le navigateur garde un jeton secret).

## Combien ça coûte ?

Chaque tour fait un appel à l'API Anthropic. Ordre de grandeur avec le modèle par défaut (`claude-opus-5-5`, 4 $ par million de jetons en entrée et 20 $ en sortie) :

- un tour de jeu : environ **3 à 6 centimes** (le contexte grandit un peu avec l'histoire) ;
- une illustration de lieu : environ **5 à 8 centimes** ;
- une soirée de 2 heures (une centaine de tours) : environ **4 à 7 €**.

Pour réduire la facture : `NARRATOR_MODEL=claude-sonnet-5-5` (environ deux fois moins cher) et/ou `ILLUSTRATIONS=non` dans `.env`. Pensez aussi à fixer une limite de dépense mensuelle dans la console Anthropic.

## Configuration (`.env`)

| Variable | Rôle | Défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic. Sans clé : mode démo. | — |
| `NARRATOR_MODEL` | Modèle du narrateur. | `claude-opus-5-5` |
| `NARRATOR_EFFORT` | Temps de réflexion : `low` (rapide), `medium`, `high`. | `low` |
| `ILLUSTRATIONS` | Illustrations SVG des lieux : `oui` ou `non`. | `oui` |
| `ILLUSTRATOR_MODEL` | Modèle de l'illustrateur. | celui du narrateur |
| `NARRATEUR` | `auto`, `claude` ou `demo`. | `auto` |
| `PORT` | Port du serveur web. | `3000` |
| `DATA_DIR` | Dossier des sauvegardes. | `data/parties` |

## Organisation du code

```
server/
  index.js            Point d'entrée (npm start) : lit .env, lance le serveur
  app.js              Serveur web + temps réel (Socket.IO) : connexions, tours, narration
  game.js             État d'une partie : joueurs, ordre des tours, journal, application des effets
  rules.js            Règles : races, classes, caractéristiques, dés, XP et niveaux
  store.js            Sauvegarde des parties en JSON (data/parties/CODE.json)
  narrator/
    prompts.js        Consignes du Maître du Jeu et contexte envoyé à chaque tour
    schema.js         Format JSON imposé aux réponses (narration, jet, effets, lieu…)
    claude.js         Appels à l'API Claude (narration en streaming + illustrations)
    demo.js           Narrateur simulé, sans IA
    partialJson.js    Lecture de la narration pendant qu'elle s'écrit
public/
  index.html          Les écrans : accueil, création, salon, jeu
  style.css           L'apparence
  app.js              Toute la logique de l'interface (sans framework)
tests/                Tests automatiques (npm test)
```

### Comment fonctionne un tour

1. Le joueur envoie son action ; le serveur vérifie que c'est bien son tour et lance un d20.
2. `narrator/prompts.js` assemble le contexte : univers, fiches des personnages, journal, 30 derniers événements, l'action et le résultat du dé pour chaque caractéristique.
3. Claude répond dans un format JSON strict (`narrator/schema.js`) : narration, jet utilisé, effets sur les personnages, lieu, ambiance, ennemis, notes de journal, suggestions.
4. Le serveur applique les effets (`Game.applyEffects`) en bornant les valeurs, passe au joueur suivant et envoie le nouvel état à tous les navigateurs.
5. Si le groupe arrive dans un nouveau lieu, une illustration SVG est demandée en arrière-plan.

### Ajouter des fonctionnalités

- **Nouvelle race ou classe** : ajoutez-la dans `server/rules.js`, l'interface la proposera automatiquement.
- **Nouvelle information renvoyée par le narrateur** (par exemple une météo, une réputation…) : ajoutez le champ dans `narrator/schema.js`, expliquez-le dans `SYSTEM_PROMPT` (`narrator/prompts.js`), utilisez-le dans `applyNarration` (`server/app.js`) puis affichez-le dans `public/app.js`.
- **Changer le style du narrateur** : modifiez `SYSTEM_PROMPT`, ou simplement l'univers et le ton dans le salon.

Quelques idées pour la suite : combats plus tactiques avec PV des ennemis, carte du monde, sons d'ambiance, montée de niveau avec choix de nouvelles capacités, équipement porté (armes/armures) séparé du sac, export de l'histoire en livre, MJ humain qui peut corriger le narrateur…

## Tests

```bash
npm test
```

Les tests couvrent les règles, l'application des effets, une partie complète à deux joueurs (avec le narrateur de démo) et le narrateur Claude face à une fausse API (aucun appel réel, aucun coût).
