// Personnalisation des personnages : apparence (portrait), personnalité, noms.
// Tout ce qui est ici est purement descriptif : aucun effet sur les règles.

// Options d'apparence. Les couleurs servent à dessiner le portrait (public/portrait.js).
export const LOOK = {
  skin: {
    label: 'Teint',
    options: {
      porcelaine: { label: 'Porcelaine', color: '#f3d5c0' },
      clair: { label: 'Clair', color: '#e6b993' },
      mat: { label: 'Mat', color: '#c99168' },
      ambre: { label: 'Ambré', color: '#a8704a' },
      brun: { label: 'Brun', color: '#7d4b2e' },
      ebene: { label: 'Ébène', color: '#4e2f1d' },
      olive: { label: 'Vert-de-gris', color: '#8a9a5b' },
      cendre: { label: 'Cendré', color: '#9ea3a8' },
      rouge: { label: 'Rouge infernal', color: '#b5473a' },
      violet: { label: 'Violet', color: '#7e5aa0' },
      bleu: { label: 'Bleu', color: '#5b7fb5' },
      dore: { label: 'Doré', color: '#e0b860' },
      bronze: { label: 'Écailles bronze', color: '#b07a3a' },
      vert: { label: 'Écailles vertes', color: '#4f8a4a' },
      argent: { label: 'Écailles argent', color: '#c9ced6' },
      noir: { label: 'Écailles noires', color: '#34323a' },
    },
  },
  hairStyle: {
    label: 'Coiffure',
    options: {
      chauve: { label: 'Crâne rasé' },
      court: { label: 'Courts' },
      'mi-long': { label: 'Mi-longs' },
      long: { label: 'Longs' },
      boucles: { label: 'Bouclés' },
      tresse: { label: 'Tresse' },
      queue: { label: 'Queue de cheval' },
      chignon: { label: 'Chignon' },
      crete: { label: 'Crête' },
    },
  },
  hairColor: {
    label: 'Couleur des cheveux',
    options: {
      noir: { label: 'Noirs', color: '#1f1a17' },
      brun: { label: 'Bruns', color: '#4a2e1c' },
      chatain: { label: 'Châtains', color: '#7a5230' },
      roux: { label: 'Roux', color: '#b5502a' },
      blond: { label: 'Blonds', color: '#e0c070' },
      blanc: { label: 'Blancs', color: '#eeeae0' },
      gris: { label: 'Gris', color: '#8f8f8f' },
      argent: { label: 'Argentés', color: '#c8d0dc' },
      bleu: { label: 'Bleu nuit', color: '#2e4a8a' },
      vert: { label: 'Verts', color: '#3f7a4a' },
      violet: { label: 'Violets', color: '#6a3d8a' },
      rose: { label: 'Roses', color: '#d77ba0' },
    },
  },
  eyes: {
    label: 'Yeux',
    options: {
      marron: { label: 'Marron', color: '#5a3a1e' },
      noisette: { label: 'Noisette', color: '#8a6a2e' },
      vert: { label: 'Verts', color: '#3f8a4a' },
      bleu: { label: 'Bleus', color: '#3a6fc0' },
      gris: { label: 'Gris', color: '#8a96a0' },
      ambre: { label: 'Ambre', color: '#d8962a' },
      violet: { label: 'Violets', color: '#8a4ac0' },
      rouge: { label: 'Rouges', color: '#c0302a' },
      dore: { label: 'Dorés', color: '#e6c040' },
      blanc: { label: 'Blanc laiteux', color: '#dfe7ec' },
    },
  },
  beard: {
    label: 'Pilosité',
    options: {
      aucune: { label: 'Aucune' },
      moustache: { label: 'Moustache' },
      bouc: { label: 'Bouc' },
      courte: { label: 'Barbe courte' },
      longue: { label: 'Longue barbe' },
      tressee: { label: 'Barbe tressée' },
    },
  },
  mark: {
    label: 'Signe distinctif',
    options: {
      aucune: { label: 'Aucun' },
      rousseur: { label: 'Taches de rousseur' },
      cicatrice: { label: 'Cicatrice sur la joue' },
      balafre: { label: 'Balafre sur l’œil' },
      cacheoeil: { label: 'Cache-œil' },
      tatouages: { label: 'Tatouages' },
      peinture: { label: 'Peinture de guerre' },
    },
  },
  headwear: {
    label: 'Couvre-chef',
    options: {
      aucun: { label: 'Aucun' },
      capuche: { label: 'Capuche' },
      mage: { label: 'Chapeau pointu' },
      plume: { label: 'Chapeau à plume' },
      casque: { label: 'Casque' },
      bandeau: { label: 'Bandeau' },
      couronne: { label: 'Diadème' },
      fleurs: { label: 'Couronne de fleurs' },
    },
  },
  outfitStyle: {
    label: 'Tenue',
    options: {
      armure: { label: 'Armure' },
      cuir: { label: 'Cuir' },
      robe: { label: 'Robe' },
      tunique: { label: 'Tunique' },
      fourrure: { label: 'Fourrures' },
    },
  },
  outfitColor: {
    label: 'Couleur de la tenue',
    options: {
      cuir: { label: 'Cuir', color: '#7a5232' },
      acier: { label: 'Acier', color: '#8a96a6' },
      rouge: { label: 'Rouge', color: '#9a2f2a' },
      orange: { label: 'Orange', color: '#c06a20' },
      or: { label: 'Or', color: '#c9a03a' },
      vert: { label: 'Vert', color: '#2f6a3a' },
      bleu: { label: 'Bleu', color: '#2f4f8f' },
      violet: { label: 'Violet', color: '#5f3a8a' },
      noir: { label: 'Noir', color: '#26232a' },
      blanc: { label: 'Blanc', color: '#e4e0d4' },
    },
  },
  backdrop: {
    label: 'Fond du portrait',
    options: {
      taverne: { label: 'Taverne', color: '#4a3220' },
      foret: { label: 'Forêt', color: '#1f4a32' },
      nuit: { label: 'Nuit', color: '#1c2a52' },
      braise: { label: 'Braise', color: '#5a221a' },
      brume: { label: 'Brume', color: '#46505a' },
      pourpre: { label: 'Pourpre', color: '#4a2252' },
    },
  },
};

export const LOOK_DEFAULT = {
  skin: 'clair',
  hairStyle: 'court',
  hairColor: 'chatain',
  eyes: 'marron',
  beard: 'aucune',
  mark: 'aucune',
  headwear: 'aucun',
  outfitStyle: 'tunique',
  outfitColor: 'cuir',
  backdrop: 'taverne',
};

export const PRONOUNS = {
  il: { label: 'Il', description: 'Le narrateur parlera de lui au masculin.' },
  elle: { label: 'Elle', description: 'Le narrateur parlera d’elle au féminin.' },
  iel: { label: 'Iel', description: 'Le narrateur évitera de genrer le personnage.' },
};

export const AGES = {
  jeune: { label: 'Jeune', description: 'Plein de fougue, peu d’expérience.' },
  adulte: { label: 'Adulte', description: 'Dans la force de l’âge.' },
  mur: { label: 'D’âge mûr', description: 'Expérimenté, un peu usé.' },
  vieux: { label: 'Vénérable', description: 'A tout vu, ou presque.' },
};

export const ALIGNMENTS = {
  lb: { label: 'Loyal bon', description: 'Fait le bien en respectant les règles.' },
  nb: { label: 'Neutre bon', description: 'Fait le bien, avec ou sans règles.' },
  cb: { label: 'Chaotique bon', description: 'Fait le bien à sa façon, libre.' },
  ln: { label: 'Loyal neutre', description: 'La loi et l’ordre avant tout.' },
  n: { label: 'Neutre', description: 'Garde l’équilibre, évite les extrêmes.' },
  cn: { label: 'Chaotique neutre', description: 'Suit ses envies, imprévisible.' },
  lm: { label: 'Loyal mauvais', description: 'Égoïste, mais tient parole.' },
  nm: { label: 'Neutre mauvais', description: 'Ne pense qu’à son intérêt.' },
  cm: { label: 'Chaotique mauvais', description: 'Cruel et sans foi ni loi.' },
};

export const TRAITS = [
  'Courage à toute épreuve',
  'Curiosité insatiable',
  'Toujours le mot pour rire',
  'Grognon au grand cœur',
  'Loyauté absolue',
  'Prudence extrême',
  'Impulsivité',
  'Gourmandise',
  'Amour de l’or',
  'Optimisme indestructible',
  'Mélancolie',
  'Fierté',
  'Timidité',
  'Bavardage',
  'Superstition',
  'Franchise brutale',
  'Sens du spectacle',
  'Calme olympien',
  'Méfiance',
  'Générosité',
  'Esprit de compétition',
  'Amour des animaux',
  'Peur du noir',
  'Vantardise',
];

// Idées pour les champs libres (bouton « Inspire-moi »).
export const INSPIRATIONS = {
  ideal: [
    'Protéger ceux qui ne peuvent pas se défendre.',
    'La liberté avant tout : personne ne m’enchaînera.',
    'Le savoir est le plus grand des trésors.',
    'Devenir une légende dont on chantera le nom.',
    'La famille, celle de sang ou celle qu’on choisit.',
    'Rembourser mes dettes, toutes mes dettes.',
    'Prouver que je vaux mieux que ce qu’on dit de moi.',
    'Rire de tout, surtout du danger.',
  ],
  bond: [
    'Je cherche la personne qui a détruit mon village.',
    'Je porte l’épée de mon mentor disparu.',
    'Ma sœur jumelle m’attend quelque part au nord.',
    'Je dois une vie à un inconnu masqué.',
    'Une prophétie parle de moi, et elle m’effraie.',
    'Ma taverne préférée est tout ce qui me reste.',
    'Je protège un secret qui pourrait changer le royaume.',
    'J’ai promis de ramener un trésor à mon clan.',
  ],
  flaw: [
    'Je ne résiste jamais à un pari.',
    'Je mens dès que la vérité devient gênante.',
    'Je fonce sans réfléchir.',
    'Je ne fais confiance à personne.',
    'L’or me fait perdre la tête.',
    'Je ne supporte pas d’avoir tort.',
    'J’ai une peur bleue des araignées.',
    'Je parle beaucoup trop, surtout aux mauvais moments.',
  ],
  background: [
    'Ancien forgeron en quête de vengeance, adore les énigmes et déteste les araignées.',
    'Chassé de son école de magie pour avoir transformé le directeur en crapaud (temporairement).',
    'A grandi sur un bateau pirate et ne sait toujours pas nager.',
    'Héritier d’une famille ruinée, bien décidé à redorer son blason.',
    'Garde forestier qui a vu quelque chose d’impossible dans les bois, et veut comprendre.',
    'Ancien cuisinier de la garde royale, renvoyé après un banquet mémorable.',
  ],
};

// Noms pour le bouton « 🎲 » (un nom au hasard selon la race).
export const NAMES = {
  humain: ['Aldric', 'Mara', 'Tomas', 'Elise', 'Corentin', 'Ysolde', 'Bastien', 'Léonie', 'Gauvain', 'Rosalind'],
  elfe: ['Aelar', 'Lyra', 'Thalion', 'Sylvara', 'Erevan', 'Naïlo', 'Aerith', 'Faelar', 'Ilyana', 'Varis'],
  demielfe: ['Tanis', 'Aria', 'Kaelen', 'Mirel', 'Soren', 'Liane', 'Evander', 'Nyssa', 'Alaric', 'Selene'],
  nain: ['Borin', 'Dagna', 'Thorgrim', 'Helja', 'Balin', 'Gunnlöd', 'Durgan', 'Eldeth', 'Rurik', 'Brunhild'],
  halfelin: ['Pippin', 'Rosie', 'Milo', 'Daisy', 'Cade', 'Lavinia', 'Merric', 'Poppy', 'Fargo', 'Callie'],
  gnome: ['Fizzwick', 'Nissa', 'Gimble', 'Tana', 'Boddynock', 'Zanna', 'Orryn', 'Bimpnottin', 'Wrenn', 'Pocket'],
  demiorc: ['Grosh', 'Ursa', 'Thokk', 'Baggi', 'Krusk', 'Volen', 'Mhurren', 'Shauga', 'Dench', 'Yevelda'],
  tieffelin: ['Zariel', 'Akmenos', 'Nemeia', 'Damakos', 'Orianna', 'Kallista', 'Mordai', 'Rieta', 'Ekemon', 'Temperance'],
  drakeide: ['Arjhan', 'Sora', 'Kriv', 'Biri', 'Medrash', 'Kava', 'Nadarr', 'Thava', 'Rhogar', 'Harann'],
  aasimar: ['Seraphiel', 'Lumière', 'Aurelion', 'Celestine', 'Ariel', 'Davin', 'Elysia', 'Galadon', 'Oriane', 'Zephyr'],
};

function cleanText(value, max) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

// Garde uniquement des options connues ; sinon, la valeur par défaut.
export function normalizeLook(look, defaults = LOOK_DEFAULT) {
  const source = look && typeof look === 'object' ? look : {};
  const result = {};
  for (const [key, def] of Object.entries(LOOK)) {
    const wanted = source[key];
    result[key] = Object.hasOwn(def.options, wanted) ? wanted : (defaults[key] ?? LOOK_DEFAULT[key]);
  }
  result.details = cleanText(source.details, 160);
  return result;
}

export function normalizePersonality(choices = {}) {
  const p = choices.personality && typeof choices.personality === 'object' ? choices.personality : {};
  const traits = Array.isArray(p.traits) ? [...new Set(p.traits.filter((t) => TRAITS.includes(t)))].slice(0, 3) : [];
  return {
    pronouns: Object.hasOwn(PRONOUNS, choices.pronouns) ? choices.pronouns : '',
    age: Object.hasOwn(AGES, choices.age) ? choices.age : 'adulte',
    alignment: Object.hasOwn(ALIGNMENTS, choices.alignment) ? choices.alignment : '',
    personality: {
      traits,
      ideal: cleanText(p.ideal, 160),
      bond: cleanText(p.bond, 160),
      flaw: cleanText(p.flaw, 160),
    },
  };
}

// Description de l'apparence en une phrase, pour le narrateur.
export function describeLook(look) {
  const label = (key) => LOOK[key].options[look[key]]?.label ?? '';
  const parts = [`teint ${label('skin').toLowerCase()}`, `yeux ${label('eyes').toLowerCase()}`];
  if (look.hairStyle === 'chauve') parts.push('crâne rasé');
  else parts.push(`cheveux ${label('hairColor').toLowerCase()} (${label('hairStyle').toLowerCase()})`);
  if (look.beard !== 'aucune') parts.push(label('beard').toLowerCase());
  if (look.mark !== 'aucune') parts.push(label('mark').toLowerCase());
  if (look.headwear !== 'aucun') parts.push(label('headwear').toLowerCase());
  parts.push(`tenue : ${label('outfitStyle').toLowerCase()} ${label('outfitColor').toLowerCase()}`);
  if (look.details) parts.push(look.details);
  return parts.join(', ');
}
