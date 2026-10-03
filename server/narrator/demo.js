// Narrateur de démonstration : aucune IA, des réponses toutes faites.
// Pratique pour tester l'interface et le multijoueur sans clé API.

const PLACES = [
  { name: 'Taverne du Sanglier Borgne', mood: '🍺🔥🎻🌧️', sky: '#2b1d14', ground: '#5a3a22', accent: '#f0a030' },
  { name: 'Forêt des Murmures', mood: '🌲🌫️🦉🍄', sky: '#16302b', ground: '#22412a', accent: '#8fd18b' },
  { name: 'Ruines du Vieux Fort', mood: '🏚️🌙🦇💀', sky: '#1b1d33', ground: '#3b3b4f', accent: '#b9b2ff' },
  { name: 'Marché de Port-Brume', mood: '⚓🐟🪙🗣️', sky: '#20384f', ground: '#6b5b45', accent: '#ffd36b' },
];

const REACTIONS = [
  'Le tavernier, un colosse à la moustache tressée, hausse un sourcil intrigué.',
  'Un murmure parcourt la salle : visiblement, personne ne s’attendait à cela.',
  'Au-dehors, le tonnerre gronde comme pour saluer votre audace.',
  'Une silhouette encapuchonnée, au fond de la salle, ne vous quitte plus des yeux.',
  'Un chat noir saute sur une table et renverse une chope, déclenchant des éclats de rire.',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DemoNarrator {
  constructor() {
    this.label = 'Démo (sans IA)';
    this.placeIndex = 0;
  }

  async narrate(game, request, onPartial = () => {}) {
    const intro = request.kind === 'intro';
    const changePlace = intro || Math.random() < 0.2;
    if (intro) this.placeIndex = 0;
    else if (changePlace) this.placeIndex = (this.placeIndex + 1) % PLACES.length;
    const place = PLACES[this.placeIndex];
    const next = request.next.character.name;

    let narration;
    let roll = { utilise: false, caracteristique: 'aucune', difficulte: 0 };
    const effets = [];
    if (intro) {
      const names = game
        .activePlayers()
        .map((p) => `**${p.character.name}**`)
        .join(', ');
      narration =
        `La pluie martèle les volets de la ${place.name} quand la porte s’ouvre sur ${names}. ` +
        `L’air sent le bois brûlé et la bière épicée.\n\n` +
        `(Mode démo : aucune IA n’est branchée, l’histoire ne suivra pas vraiment vos actions. ` +
        `Ajoutez une clé ANTHROPIC_API_KEY pour un vrai Maître du Jeu.)\n\n${next}, que fais-tu ?`;
    } else {
      const c = request.actor.character;
      roll = { utilise: true, caracteristique: pick(['FOR', 'DEX', 'INT', 'SAG', 'CHA']), difficulte: pick([10, 12, 13, 15]) };
      const success = request.totals[roll.caracteristique] >= roll.difficulte;
      narration =
        `${c.name} décide : « ${request.text} ». ${success ? 'Avec brio, cela fonctionne !' : 'Hélas, rien ne se passe comme prévu.'} ` +
        `${pick(REACTIONS)}\n\n${next}, à toi : que fais-tu ?`;
      effets.push({
        personnage: c.name,
        pv: success ? 0 : -2,
        xp: success ? 20 : 5,
        or: success && Math.random() < 0.4 ? 5 : 0,
        objets_gagnes:
          success && Math.random() < 0.3
            ? [{ nom: 'Pièce étrange', quantite: 1, description: 'Une pièce gravée d’un œil.' }]
            : [],
        objets_perdus: [],
        etats_ajoutes: [],
        etats_retires: [],
      });
    }

    // Simule l'arrivée progressive du texte.
    for (let i = 20; i < narration.length; i += 20) {
      onPartial(narration.slice(0, i));
      await sleep(15);
    }

    return {
      jet: roll,
      narration,
      effets,
      lieu: place.name,
      changement_de_lieu: changePlace,
      description_visuelle: place.name,
      ambiance: place.mood,
      ennemis: [],
      journal: intro ? ['Le groupe s’est réuni à la ' + place.name + '.'] : [],
      suggestions: ['Observer les alentours', 'Commander à boire', 'Interroger l’inconnu'],
    };
  }

  // Petite illustration générée par le code (collines, lune, bâtiment).
  async illustrate(scene) {
    const place = PLACES.find((p) => p.name === scene.place) ?? PLACES[0];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${place.sky}"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
  <rect width="640" height="360" fill="url(#s)"/>
  <circle cx="520" cy="70" r="34" fill="${place.accent}" opacity="0.85"/>
  <path d="M0 260 Q160 200 320 250 T640 230 V360 H0Z" fill="${place.ground}"/>
  <path d="M0 300 Q200 260 400 300 T640 290 V360 H0Z" fill="#000" opacity="0.35"/>
  <rect x="250" y="170" width="140" height="100" fill="#3a2a1c"/>
  <path d="M235 175 L320 115 L405 175Z" fill="#241910"/>
  <rect x="300" y="215" width="40" height="55" fill="#1a120b"/>
  <rect x="265" y="190" width="24" height="20" fill="${place.accent}" opacity="0.9"/>
  <rect x="351" y="190" width="24" height="20" fill="${place.accent}" opacity="0.9"/>
</svg>`;
  }
}
