// Règles du jeu : caractéristiques, compétences, races, classes, historiques, dés, expérience.
// Inspiré de D&D 5e, mais volontairement simplifié.

import { LOOK_DEFAULT, normalizeLook, normalizePersonality } from './personnalisation.js';

export const STATS = ['FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'];

export const STAT_LABELS = {
  FOR: 'Force',
  DEX: 'Dextérité',
  CON: 'Constitution',
  INT: 'Intelligence',
  SAG: 'Sagesse',
  CHA: 'Charisme',
};

export const STAT_DESCRIPTIONS = {
  FOR: 'Puissance physique : frapper, soulever, grimper, enfoncer une porte.',
  DEX: 'Agilité et réflexes : esquiver, viser, se faufiler, crocheter.',
  CON: 'Endurance et santé : encaisser les coups, résister au poison. Donne des PV.',
  INT: 'Savoir et logique : magie des livres, énigmes, mémoire.',
  SAG: 'Perception et intuition : remarquer un détail, deviner un mensonge, soigner.',
  CHA: 'Présence et éloquence : convaincre, mentir, impressionner, inspirer.',
};

// Compétences : quand le narrateur demande un jet lié à une compétence maîtrisée,
// le personnage ajoute son bonus de maîtrise (+2 au niveau 1).
export const SKILLS = {
  acrobaties: { label: 'Acrobaties', stat: 'DEX' },
  arcanes: { label: 'Arcanes', stat: 'INT' },
  athletisme: { label: 'Athlétisme', stat: 'FOR' },
  discretion: { label: 'Discrétion', stat: 'DEX' },
  dressage: { label: 'Dressage', stat: 'SAG' },
  escamotage: { label: 'Escamotage', stat: 'DEX' },
  histoire: { label: 'Histoire', stat: 'INT' },
  intimidation: { label: 'Intimidation', stat: 'CHA' },
  intuition: { label: 'Intuition', stat: 'SAG' },
  investigation: { label: 'Investigation', stat: 'INT' },
  medecine: { label: 'Médecine', stat: 'SAG' },
  nature: { label: 'Nature', stat: 'INT' },
  perception: { label: 'Perception', stat: 'SAG' },
  persuasion: { label: 'Persuasion', stat: 'CHA' },
  religion: { label: 'Religion', stat: 'INT' },
  representation: { label: 'Représentation', stat: 'CHA' },
  survie: { label: 'Survie', stat: 'SAG' },
  tromperie: { label: 'Tromperie', stat: 'CHA' },
};

export const RACES = {
  humain: {
    label: 'Humain',
    emoji: '🧑',
    description: 'Ambitieux et adaptables, les humains sont partout et peuvent tout devenir.',
    bonus: { FOR: 1, DEX: 1, CON: 1, INT: 1, SAG: 1, CHA: 1 },
    traits: ['Polyvalent (+1 à toutes les caractéristiques)', 'Débrouillard : une compétence de plus au choix'],
    extraSkills: 1,
    look: { skin: 'clair', hairStyle: 'court', hairColor: 'chatain', eyes: 'marron' },
  },
  elfe: {
    label: 'Elfe',
    emoji: '🧝',
    description: 'Gracieux et presque immortels, ils vivent au rythme des forêts et de la magie.',
    bonus: { DEX: 2, INT: 1 },
    traits: ['Vision dans le noir', 'Sens aiguisés (maîtrise de la Perception)', 'Transe : 4 heures de méditation remplacent le sommeil'],
    skills: ['perception'],
    look: { skin: 'porcelaine', hairStyle: 'long', hairColor: 'blond', eyes: 'vert' },
  },
  demielfe: {
    label: 'Demi-elfe',
    emoji: '🧝‍♂️',
    description: 'Entre deux mondes, charmeurs et curieux, ils se sentent chez eux partout… et nulle part.',
    bonus: { CHA: 2, DEX: 1, SAG: 1 },
    traits: ['Vision dans le noir', 'Ascendance féerique (résiste aux charmes)', 'Talents variés : une compétence de plus au choix'],
    extraSkills: 1,
    look: { skin: 'mat', hairStyle: 'mi-long', hairColor: 'brun', eyes: 'noisette' },
  },
  nain: {
    label: 'Nain',
    emoji: '🧔',
    description: 'Robustes, têtus et fiers artisans des montagnes. Ils n’oublient jamais une dette.',
    bonus: { CON: 2, FOR: 1 },
    traits: ['Vision dans le noir', 'Résistance naine (poisons)', 'Connaissance de la pierre'],
    skills: ['histoire'],
    look: { skin: 'ambre', hairStyle: 'court', hairColor: 'roux', eyes: 'marron', beard: 'tressee' },
  },
  halfelin: {
    label: 'Halfelin',
    emoji: '🧒',
    description: 'Petits, joyeux et étonnamment chanceux, ils aiment le confort… et l’aventure malgré eux.',
    bonus: { DEX: 2, CHA: 1 },
    traits: ['Chanceux (relance les 1 naturels)', 'Brave (résiste à la peur)', 'Agilité halfeline'],
    skills: ['discretion'],
    look: { skin: 'clair', hairStyle: 'boucles', hairColor: 'chatain', eyes: 'noisette' },
  },
  gnome: {
    label: 'Gnome',
    emoji: '🧙‍♂️',
    description: 'Inventeurs pétillants et farceurs, d’une curiosité insatiable pour tout ce qui fait « clic ».',
    bonus: { INT: 2, CON: 1 },
    traits: ['Vision dans le noir', 'Ruse gnome (résiste à la magie mentale)', 'Bricoleur de petits mécanismes'],
    skills: ['investigation'],
    look: { skin: 'clair', hairStyle: 'crete', hairColor: 'blanc', eyes: 'bleu' },
  },
  demiorc: {
    label: 'Demi-orc',
    emoji: '👹',
    description: 'Puissants et redoutés, ils portent la fureur orque… et la volonté de prouver qui ils sont.',
    bonus: { FOR: 2, CON: 1 },
    traits: ['Vision dans le noir', 'Menaçant (maîtrise de l’Intimidation)', 'Endurance implacable (reste debout à 1 PV une fois par jour)'],
    skills: ['intimidation'],
    look: { skin: 'olive', hairStyle: 'queue', hairColor: 'noir', eyes: 'ambre' },
  },
  tieffelin: {
    label: 'Tieffelin',
    emoji: '😈',
    description: 'Marqués par un héritage infernal (cornes, queue), souvent mal jugés, toujours fascinants.',
    bonus: { CHA: 2, INT: 1 },
    traits: ['Vision dans le noir', 'Résistance au feu', 'Héritage infernal (petits tours de magie)'],
    skills: ['tromperie'],
    look: { skin: 'rouge', hairStyle: 'long', hairColor: 'noir', eyes: 'dore' },
  },
  drakeide: {
    label: 'Drakéide',
    emoji: '🐲',
    description: 'Fiers descendants des dragons, couverts d’écailles, capables de cracher leur souffle élémentaire.',
    bonus: { FOR: 2, CHA: 1 },
    traits: ['Souffle draconique (feu, froid ou foudre selon les écailles)', 'Résistance à cet élément', 'Écailles solides'],
    skills: ['intimidation'],
    look: { skin: 'bronze', hairStyle: 'chauve', hairColor: 'noir', eyes: 'dore' },
  },
  aasimar: {
    label: 'Aasimar',
    emoji: '😇',
    description: 'Touchés par le divin, guidés par un ange gardien, ils rayonnent d’une lumière intérieure.',
    bonus: { CHA: 2, SAG: 1 },
    traits: ['Vision dans le noir', 'Mains guérisseuses (soigne une fois par jour)', 'Porteur de lumière'],
    skills: ['religion'],
    look: { skin: 'dore', hairStyle: 'long', hairColor: 'argent', eyes: 'dore' },
  },
};

const POTION = { name: 'Potion de soin', quantity: 1, description: 'Rend environ 7 PV.' };

export const CLASSES = {
  guerrier: {
    label: 'Guerrier',
    emoji: '⚔️',
    description: 'Maître des armes et des armures, il protège ses alliés et frappe fort.',
    role: 'Combattant · Protecteur',
    difficulty: 1,
    hitDie: 10,
    priorities: ['FOR', 'CON', 'DEX', 'SAG', 'CHA', 'INT'],
    gold: 15,
    skillChoices: ['acrobaties', 'athletisme', 'dressage', 'histoire', 'intimidation', 'intuition', 'perception', 'survie'],
    skillCount: 2,
    abilities: ['Second souffle (se soigner une fois par combat)', 'Attaque puissante', 'Maîtrise des armures lourdes'],
    items: [
      { name: 'Épée longue', quantity: 1, description: 'Arme fiable, 1d8 dégâts.' },
      { name: 'Bouclier', quantity: 1, description: 'Rend plus difficile à toucher.' },
      { name: 'Cotte de mailles', quantity: 1, description: 'Armure lourde.' },
      POTION,
    ],
    look: { outfitStyle: 'armure', outfitColor: 'acier', headwear: 'aucun' },
  },
  barbare: {
    label: 'Barbare',
    emoji: '🪓',
    description: 'Guerrier sauvage qui puise sa force dans la rage. Encaisse tout, ne recule devant rien.',
    role: 'Combattant · Increvable',
    difficulty: 1,
    hitDie: 12,
    priorities: ['FOR', 'CON', 'DEX', 'SAG', 'CHA', 'INT'],
    gold: 10,
    skillChoices: ['athletisme', 'dressage', 'intimidation', 'nature', 'perception', 'survie'],
    skillCount: 2,
    abilities: ['Rage (frappe plus fort, encaisse mieux)', 'Défense sans armure', 'Attaque téméraire'],
    items: [
      { name: 'Hache à deux mains', quantity: 1, description: 'Arme lourde, 1d12 dégâts.' },
      { name: 'Javelines', quantity: 4, description: 'Se lancent, 1d6 dégâts.' },
      { name: 'Peau de bête', quantity: 1, description: 'Cape chaude et impressionnante.' },
      { name: 'Rations de voyage', quantity: 3, description: 'De quoi tenir quelques jours.' },
    ],
    look: { outfitStyle: 'fourrure', outfitColor: 'cuir', headwear: 'aucun' },
  },
  paladin: {
    label: 'Paladin',
    emoji: '🛡️',
    description: 'Chevalier sacré lié par un serment. Combat, soigne et protège au nom de son idéal.',
    role: 'Combattant · Soutien',
    difficulty: 2,
    hitDie: 10,
    priorities: ['FOR', 'CHA', 'CON', 'SAG', 'DEX', 'INT'],
    gold: 15,
    skillChoices: ['athletisme', 'intimidation', 'intuition', 'medecine', 'persuasion', 'religion'],
    skillCount: 2,
    abilities: ['Imposition des mains (soigne en touchant)', 'Châtiment divin', 'Détection du mal'],
    items: [
      { name: 'Épée longue', quantity: 1, description: 'Arme fiable, 1d8 dégâts.' },
      { name: 'Bouclier blasonné', quantity: 1, description: 'Porte le symbole de votre serment.' },
      { name: 'Cotte de mailles', quantity: 1, description: 'Armure lourde.' },
      { name: 'Symbole sacré', quantity: 1, description: 'Focaliseur divin.' },
    ],
    look: { outfitStyle: 'armure', outfitColor: 'blanc', headwear: 'aucun' },
  },
  rodeur: {
    label: 'Rôdeur',
    emoji: '🏹',
    description: 'Chasseur des terres sauvages, pisteur hors pair et tireur précis.',
    role: 'Tireur · Éclaireur',
    difficulty: 2,
    hitDie: 10,
    priorities: ['DEX', 'SAG', 'CON', 'FOR', 'INT', 'CHA'],
    gold: 15,
    skillChoices: ['athletisme', 'discretion', 'dressage', 'intuition', 'investigation', 'nature', 'perception', 'survie'],
    skillCount: 3,
    abilities: ['Tir précis', 'Pistage', 'Ennemi juré (bêtes)', 'Survie en milieu sauvage'],
    items: [
      { name: 'Arc long', quantity: 1, description: 'Arme à distance, 1d8 dégâts.' },
      { name: 'Flèches', quantity: 20, description: 'Munitions pour l’arc.' },
      { name: 'Épée courte', quantity: 1, description: 'Arme de corps à corps, 1d6 dégâts.' },
      { name: 'Rations de voyage', quantity: 3, description: 'De quoi tenir quelques jours.' },
    ],
    look: { outfitStyle: 'cuir', outfitColor: 'vert', headwear: 'capuche' },
  },
  voleur: {
    label: 'Voleur',
    emoji: '🗡️',
    description: 'Agile et discret, expert des serrures, des pièges et des coups bien placés.',
    role: 'Furtif · Spécialiste',
    difficulty: 1,
    hitDie: 8,
    priorities: ['DEX', 'CHA', 'CON', 'INT', 'SAG', 'FOR'],
    gold: 20,
    skillChoices: ['acrobaties', 'athletisme', 'discretion', 'escamotage', 'intimidation', 'intuition', 'investigation', 'perception', 'persuasion', 'representation', 'tromperie'],
    skillCount: 4,
    abilities: ['Attaque sournoise', 'Discrétion experte', 'Crochetage et pièges', 'Esquive agile'],
    items: [
      { name: 'Dague', quantity: 2, description: 'Légère, peut être lancée, 1d4 dégâts.' },
      { name: 'Outils de voleur', quantity: 1, description: 'Crochets et petits outils.' },
      { name: 'Cape sombre', quantity: 1, description: 'Idéale pour se fondre dans l’ombre.' },
      { name: 'Corde (15 m)', quantity: 1, description: 'Corde en chanvre solide.' },
    ],
    look: { outfitStyle: 'cuir', outfitColor: 'noir', headwear: 'capuche' },
  },
  moine: {
    label: 'Moine',
    emoji: '🥋',
    description: 'Combattant à mains nues, rapide comme le vent, discipliné de corps et d’esprit.',
    role: 'Combattant · Mobile',
    difficulty: 2,
    hitDie: 8,
    priorities: ['DEX', 'SAG', 'CON', 'FOR', 'INT', 'CHA'],
    gold: 8,
    skillChoices: ['acrobaties', 'athletisme', 'discretion', 'histoire', 'intuition', 'religion'],
    skillCount: 2,
    abilities: ['Arts martiaux (coups à mains nues)', 'Déluge de coups', 'Défense sans armure', 'Pas du vent'],
    items: [
      { name: 'Bâton', quantity: 1, description: 'Simple et efficace, 1d6 dégâts.' },
      { name: 'Fléchettes', quantity: 10, description: 'Petits projectiles, 1d4 dégâts.' },
      { name: 'Bol et chapelet', quantity: 1, description: 'Pour la méditation.' },
      POTION,
    ],
    look: { outfitStyle: 'tunique', outfitColor: 'orange', headwear: 'bandeau' },
  },
  barde: {
    label: 'Barde',
    emoji: '🎻',
    description: 'Artiste et charmeur dont la musique est magique. Inspire ses alliés, ridiculise ses ennemis.',
    role: 'Soutien · Diplomate',
    difficulty: 2,
    hitDie: 8,
    priorities: ['CHA', 'DEX', 'CON', 'SAG', 'INT', 'FOR'],
    gold: 18,
    skillChoices: [], // touche-à-tout : rempli plus bas avec toutes les compétences
    skillCount: 3,
    abilities: ['Inspiration bardique', 'Moquerie cruelle (sort)', 'Charme-personne', 'Touche-à-tout'],
    items: [
      { name: 'Luth', quantity: 1, description: 'Instrument de musique bien accordé.' },
      { name: 'Rapière', quantity: 1, description: 'Arme élégante, 1d8 dégâts.' },
      { name: 'Costume de scène', quantity: 1, description: 'Pour briller en société.' },
      POTION,
    ],
    look: { outfitStyle: 'tunique', outfitColor: 'violet', headwear: 'plume' },
  },
  clerc: {
    label: 'Clerc',
    emoji: '✨',
    description: 'Serviteur d’une divinité, guérisseur du groupe, redoutable contre les morts-vivants.',
    role: 'Soigneur · Soutien',
    difficulty: 2,
    hitDie: 8,
    priorities: ['SAG', 'CON', 'FOR', 'CHA', 'INT', 'DEX'],
    gold: 15,
    skillChoices: ['histoire', 'intuition', 'medecine', 'persuasion', 'religion'],
    skillCount: 2,
    abilities: ['Soins (toucher guérisseur)', 'Flamme sacrée', 'Bénédiction', 'Repousser les morts-vivants'],
    items: [
      { name: 'Masse d’armes', quantity: 1, description: 'Arme contondante, 1d6 dégâts.' },
      { name: 'Symbole sacré', quantity: 1, description: 'Focaliseur divin.' },
      { name: 'Bouclier', quantity: 1, description: 'Rend plus difficile à toucher.' },
      { ...POTION, quantity: 2 },
    ],
    look: { outfitStyle: 'robe', outfitColor: 'blanc', headwear: 'aucun' },
  },
  druide: {
    label: 'Druide',
    emoji: '🌿',
    description: 'Gardien de la nature qui parle aux bêtes, soigne et peut se changer en animal.',
    role: 'Soigneur · Polyvalent',
    difficulty: 3,
    hitDie: 8,
    priorities: ['SAG', 'CON', 'DEX', 'INT', 'CHA', 'FOR'],
    gold: 10,
    skillChoices: ['arcanes', 'dressage', 'intuition', 'medecine', 'nature', 'perception', 'religion', 'survie'],
    skillCount: 2,
    abilities: ['Forme sauvage (se transformer en animal)', 'Baies nourricières', 'Enchevêtrement', 'Parler avec les animaux'],
    items: [
      { name: 'Bâton noueux', quantity: 1, description: 'Focaliseur druidique, 1d6 dégâts.' },
      { name: 'Serpe', quantity: 1, description: 'Pour cueillir le gui, 1d4 dégâts.' },
      { name: 'Sacoche d’herboriste', quantity: 1, description: 'Herbes et onguents.' },
      POTION,
    ],
    look: { outfitStyle: 'robe', outfitColor: 'vert', headwear: 'fleurs' },
  },
  mage: {
    label: 'Mage',
    emoji: '🧙',
    description: 'Érudit de la magie des livres : le plus grand choix de sorts, mais fragile au contact.',
    role: 'Lanceur de sorts · Contrôle',
    difficulty: 3,
    hitDie: 6,
    priorities: ['INT', 'DEX', 'CON', 'SAG', 'CHA', 'FOR'],
    gold: 12,
    skillChoices: ['arcanes', 'histoire', 'intuition', 'investigation', 'medecine', 'religion'],
    skillCount: 2,
    abilities: ['Projectile magique (touche toujours)', 'Bouclier arcanique', 'Lumière', 'Sommeil'],
    items: [
      { name: 'Bâton de mage', quantity: 1, description: 'Focaliseur arcanique, peut servir de gourdin.' },
      { name: 'Grimoire', quantity: 1, description: 'Contient vos sorts.' },
      { name: 'Composantes de sorts', quantity: 1, description: 'Petite sacoche de poudres et cristaux.' },
      POTION,
    ],
    look: { outfitStyle: 'robe', outfitColor: 'bleu', headwear: 'mage' },
  },
  ensorceleur: {
    label: 'Ensorceleur',
    emoji: '🔥',
    description: 'La magie coule dans son sang : peu de sorts, mais qu’il peut tordre et amplifier.',
    role: 'Lanceur de sorts · Dégâts',
    difficulty: 3,
    hitDie: 6,
    priorities: ['CHA', 'CON', 'DEX', 'SAG', 'INT', 'FOR'],
    gold: 12,
    skillChoices: ['arcanes', 'intimidation', 'intuition', 'persuasion', 'religion', 'tromperie'],
    skillCount: 2,
    abilities: ['Trait de feu', 'Métamagie (modifier ses sorts)', 'Bouclier', 'Magie innée'],
    items: [
      { name: 'Dague', quantity: 2, description: 'Légère, peut être lancée, 1d4 dégâts.' },
      { name: 'Orbe de cristal', quantity: 1, description: 'Focaliseur arcanique.' },
      { name: 'Sac d’explorateur', quantity: 1, description: 'Couverture, torches, gamelle.' },
      POTION,
    ],
    look: { outfitStyle: 'robe', outfitColor: 'rouge', headwear: 'aucun' },
  },
  occultiste: {
    label: 'Occultiste',
    emoji: '👁️',
    description: 'A passé un pacte avec une entité mystérieuse en échange de pouvoirs… et de quelques secrets.',
    role: 'Lanceur de sorts · Mystère',
    difficulty: 3,
    hitDie: 8,
    priorities: ['CHA', 'CON', 'DEX', 'SAG', 'INT', 'FOR'],
    gold: 12,
    skillChoices: ['arcanes', 'histoire', 'intimidation', 'investigation', 'nature', 'religion', 'tromperie'],
    skillCount: 2,
    abilities: ['Décharge occulte', 'Maléfice', 'Invocations ténébreuses', 'Patron mystérieux'],
    items: [
      { name: 'Arbalète légère', quantity: 1, description: 'Arme à distance, 1d8 dégâts.' },
      { name: 'Carreaux', quantity: 20, description: 'Munitions pour l’arbalète.' },
      { name: 'Grimoire du pacte', quantity: 1, description: 'Des pages qui chuchotent la nuit.' },
      { name: 'Dague', quantity: 1, description: 'Légère, 1d4 dégâts.' },
    ],
    look: { outfitStyle: 'robe', outfitColor: 'noir', headwear: 'capuche' },
  },
};
CLASSES.barde.skillChoices = Object.keys(SKILLS);

// Historiques : ce que faisait le personnage avant l'aventure.
export const ORIGINS = {
  acolyte: {
    label: 'Acolyte',
    emoji: '🕯️',
    description: 'Élevé au service d’un temple, vous connaissez les rites et les fidèles.',
    skills: ['intuition', 'religion'],
    feature: 'Abri des fidèles : les temples de votre foi vous accueillent.',
    item: { name: 'Livre de prières', quantity: 1, description: 'Usé à force d’être lu.' },
  },
  artisan: {
    label: 'Artisan de guilde',
    emoji: '🔨',
    description: 'Forgeron, brasseur ou tisserand, vous avez un métier et une guilde.',
    skills: ['intuition', 'persuasion'],
    feature: 'Membre de guilde : vos confrères vous logent et vous renseignent.',
    item: { name: 'Outils d’artisan', quantity: 1, description: 'Les outils de votre métier.' },
  },
  charlatan: {
    label: 'Charlatan',
    emoji: '🎭',
    description: 'Fausses potions, faux titres, vrais ennuis : vous savez embobiner.',
    skills: ['escamotage', 'tromperie'],
    feature: 'Fausse identité : vous avez des papiers à un autre nom.',
    item: { name: 'Kit de déguisement', quantity: 1, description: 'Perruques, fards et faux nez.' },
  },
  criminel: {
    label: 'Criminel',
    emoji: '🦹',
    description: 'Vous avez vécu de l’autre côté de la loi et y avez gardé des contacts.',
    skills: ['discretion', 'tromperie'],
    feature: 'Contact dans la pègre : quelqu’un peut faire passer des messages.',
    item: { name: 'Pied-de-biche', quantity: 1, description: 'Ouvre ce qui est fermé.' },
  },
  enfantdesrues: {
    label: 'Enfant des rues',
    emoji: '🐀',
    description: 'Orphelin des bas quartiers, vous connaissez chaque ruelle et chaque raccourci.',
    skills: ['discretion', 'escamotage'],
    feature: 'Secrets de la ville : vous trouvez toujours un passage.',
    item: { name: 'Souris apprivoisée', quantity: 1, description: 'Votre seule amie d’enfance.' },
  },
  heros: {
    label: 'Héros du peuple',
    emoji: '🌾',
    description: 'Simple paysan, vous avez un jour tenu tête à un tyran ou à un monstre.',
    skills: ['dressage', 'survie'],
    feature: 'Hospitalité rustique : les gens simples vous cachent et vous nourrissent.',
    item: { name: 'Pelle', quantity: 1, description: 'Souvenir de la ferme.' },
  },
  marin: {
    label: 'Marin',
    emoji: '⚓',
    description: 'Vous avez navigué sur toutes les mers, affronté tempêtes et pirates.',
    skills: ['athletisme', 'perception'],
    feature: 'Passage en mer : vous trouvez toujours un navire pour vous emmener.',
    item: { name: 'Cabillot d’amarrage', quantity: 1, description: 'Bâton de bois robuste, 1d4 dégâts.' },
  },
  noble: {
    label: 'Noble',
    emoji: '👑',
    description: 'Né dans la soie, vous connaissez l’étiquette, les blasons et les intrigues de cour.',
    skills: ['histoire', 'persuasion'],
    feature: 'Privilège : la haute société vous reçoit.',
    item: { name: 'Chevalière', quantity: 1, description: 'Aux armes de votre famille.' },
    gold: 15,
  },
  sage: {
    label: 'Sage',
    emoji: '📚',
    description: 'Vous avez passé des années dans les bibliothèques à étudier le monde.',
    skills: ['arcanes', 'histoire'],
    feature: 'Chercheur : vous savez où trouver une information.',
    item: { name: 'Encre et plume', quantity: 1, description: 'Et un carnet plein de notes.' },
  },
  saltimbanque: {
    label: 'Saltimbanque',
    emoji: '🤹',
    description: 'Acrobate, conteur ou musicien, vous avez fait le tour des foires.',
    skills: ['acrobaties', 'representation'],
    feature: 'À la demande générale : on vous offre gîte et couvert contre un spectacle.',
    item: { name: 'Costume de spectacle', quantity: 1, description: 'Paillettes et grelots.' },
  },
  soldat: {
    label: 'Soldat',
    emoji: '🎖️',
    description: 'Vous avez servi dans une armée et connu la guerre.',
    skills: ['athletisme', 'intimidation'],
    feature: 'Grade militaire : les soldats de votre ancienne armée vous respectent.',
    item: { name: 'Insigne de grade', quantity: 1, description: 'Souvenir de votre régiment.' },
  },
  sauvageon: {
    label: 'Sauvageon',
    emoji: '🌲',
    description: 'Vous avez grandi loin des villes, au rythme des saisons et des bêtes.',
    skills: ['athletisme', 'survie'],
    feature: 'Vagabond : vous trouvez toujours à manger et un chemin dans la nature.',
    item: { name: 'Trophée de chasse', quantity: 1, description: 'Une griffe ou une dent impressionnante.' },
  },
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Achat de points : chaque valeur a un coût, budget de 27 points, valeurs de 8 à 15.
export const POINT_BUY = { budget: 27, min: 8, max: 15, costs: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } };

export function modifier(score) {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function proficiencyBonus(level) {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

export function rollDie(sides, rng = Math.random) {
  return 1 + Math.floor(rng() * sides);
}

export function roll4d6DropLowest(rng = Math.random) {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)].sort((a, b) => b - a);
  return dice[0] + dice[1] + dice[2];
}

// Six valeurs tirées au 4d6 (on garde les 3 meilleurs dés), de la plus haute à la plus basse.
export function rollPool(rng = Math.random) {
  return STATS.map(() => roll4d6DropLowest(rng)).sort((a, b) => b - a);
}

// Répartit une liste de valeurs (de la plus haute à la plus basse) selon les priorités de la classe.
function assignByPriority(values, classKey) {
  const cls = CLASSES[classKey] ?? CLASSES.guerrier;
  const sorted = [...values].sort((a, b) => b - a);
  const stats = {};
  cls.priorities.forEach((stat, i) => {
    stats[stat] = sorted[i];
  });
  return stats;
}

export function standardStats(classKey) {
  return assignByPriority(STANDARD_ARRAY, classKey);
}

export function rollStats(classKey, rng = Math.random) {
  return assignByPriority(rollPool(rng), classKey);
}

export function pointBuyCost(stats) {
  return STATS.reduce((sum, s) => sum + (POINT_BUY.costs[stats[s]] ?? Infinity), 0);
}

function sameValues(a, b) {
  const x = [...a].sort((m, n) => m - n);
  const y = [...b].sort((m, n) => m - n);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

// Vérifie les caractéristiques de base envoyées par le joueur selon la méthode choisie.
// Renvoie des caractéristiques valides (celles du joueur, ou la répartition standard à défaut).
export function validBaseStats({ statMethod, baseStats, rolledPool, classKey }) {
  const complete = baseStats && typeof baseStats === 'object' && STATS.every((s) => Number.isInteger(baseStats[s]));
  if (complete) {
    const values = STATS.map((s) => baseStats[s]);
    if (statMethod === 'achat' && values.every((v) => v >= POINT_BUY.min && v <= POINT_BUY.max) && pointBuyCost(baseStats) <= POINT_BUY.budget) {
      return { ...baseStats };
    }
    if (statMethod === 'des' && Array.isArray(rolledPool) && sameValues(values, rolledPool)) return { ...baseStats };
    if (sameValues(values, STANDARD_ARRAY)) return { ...baseStats };
  }
  return standardStats(classKey);
}

// Expérience nécessaire pour atteindre un niveau : niv 2 = 100, niv 3 = 300, niv 4 = 600, niv 5 = 1000...
export function xpForLevel(level) {
  return 50 * level * (level - 1);
}

export function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < 20) level++;
  return level;
}

function cleanText(value, max) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

// Apparence proposée par défaut : celle de la race, habillée selon la classe.
export function defaultLook(race, classKey) {
  return { ...LOOK_DEFAULT, ...RACES[race]?.look, ...CLASSES[classKey]?.look };
}

// Compétences du personnage : race + historique (imposées) + choix du joueur dans la liste de sa classe.
export function resolveSkills({ race, classKey, origin, skills }) {
  const fixed = new Set([...(RACES[race]?.skills ?? []), ...(ORIGINS[origin]?.skills ?? [])]);
  const cls = CLASSES[classKey];
  const extra = RACES[race]?.extraSkills ?? 0;
  const wanted = Array.isArray(skills) ? skills.filter((k) => SKILLS[k] && !fixed.has(k)) : [];
  const fromClass = [...new Set(wanted.filter((k) => cls.skillChoices.includes(k)))];
  const chosen = fromClass.slice(0, cls.skillCount);
  // Complète automatiquement si le joueur n'a pas tout choisi.
  for (const k of cls.skillChoices) {
    if (chosen.length >= cls.skillCount) break;
    if (!fixed.has(k) && !chosen.includes(k)) chosen.push(k);
  }
  // Compétences libres (humain, demi-elfe) : n'importe laquelle.
  const free = [...new Set(wanted.filter((k) => !chosen.includes(k)))].slice(0, extra);
  for (const k of Object.keys(SKILLS)) {
    if (free.length >= extra) break;
    if (!fixed.has(k) && !chosen.includes(k) && !free.includes(k)) free.push(k);
  }
  return Object.keys(SKILLS).filter((k) => fixed.has(k) || chosen.includes(k) || free.includes(k));
}

// Crée une fiche de personnage complète à partir des choix du joueur.
export function createCharacter(choices) {
  const { name, race, classKey, origin, background } = choices;
  const raceKey = RACES[race] ? race : 'humain';
  const cls = CLASSES[classKey] ? classKey : 'guerrier';
  const originKey = ORIGINS[origin] ? origin : '';
  const base = validBaseStats({ ...choices, classKey: cls });
  const stats = {};
  for (const s of STATS) {
    stats[s] = Math.min(20, base[s] + (RACES[raceKey].bonus[s] ?? 0));
  }
  const maxHp = Math.max(4, CLASSES[cls].hitDie + modifier(stats.CON));
  const inventory = CLASSES[cls].items.map((item) => ({ ...item }));
  if (originKey) inventory.push({ ...ORIGINS[originKey].item });
  return {
    name: cleanText(name, 40) || 'Aventurier sans nom',
    race: raceKey,
    classKey: cls,
    origin: originKey,
    emoji: CLASSES[cls].emoji,
    ...normalizePersonality(choices),
    look: normalizeLook(choices.look, defaultLook(raceKey, cls)),
    background: cleanText(background, 600),
    level: 1,
    xp: 0,
    maxHp,
    hp: maxHp,
    gold: CLASSES[cls].gold + (ORIGINS[originKey]?.gold ?? 0),
    stats,
    baseStats: base,
    skills: resolveSkills({ race: raceKey, classKey: cls, origin: originKey, skills: choices.skills }),
    abilities: [...CLASSES[cls].abilities],
    racialTraits: [...RACES[raceKey].traits],
    feature: ORIGINS[originKey]?.feature ?? '',
    inventory,
    conditions: [],
  };
}

// Change uniquement le style (apparence, personnalité, histoire) : possible même en pleine aventure.
export function restyleCharacter(character, choices) {
  Object.assign(character, normalizePersonality(choices));
  character.look = normalizeLook(choices.look, defaultLook(character.race, character.classKey));
  character.background = cleanText(choices.background, 600);
  return character;
}

// Complète les fiches créées avec une ancienne version du jeu.
export function upgradeCharacter(c) {
  if (!c) return c;
  if (!RACES[c.race]) c.race = 'humain';
  if (!CLASSES[c.classKey]) c.classKey = 'guerrier';
  c.origin ??= '';
  Object.assign(c, normalizePersonality(c));
  c.look = normalizeLook(c.look, defaultLook(c.race, c.classKey));
  c.skills ??= resolveSkills({ race: c.race, classKey: c.classKey, origin: c.origin });
  c.racialTraits ??= [...RACES[c.race].traits];
  c.feature ??= ORIGINS[c.origin]?.feature ?? '';
  return c;
}

// PV gagnés à chaque nouveau niveau : moyenne du dé de vie + modificateur de CON (minimum 1).
export function hpGainOnLevelUp(character) {
  const hitDie = CLASSES[character.classKey]?.hitDie ?? 8;
  return Math.max(1, hitDie / 2 + 1 + modifier(character.stats.CON));
}

// Totaux d'un jet de d20 pour chaque caractéristique (d20 + modificateur).
export function rollTotals(character, d20) {
  const totals = {};
  for (const s of STATS) totals[s] = d20 + modifier(character.stats[s]);
  return totals;
}

// Totaux pour les compétences maîtrisées (d20 + modificateur + bonus de maîtrise).
export function skillTotals(character, d20) {
  const bonus = proficiencyBonus(character.level);
  const totals = {};
  for (const k of character.skills ?? []) {
    if (SKILLS[k]) totals[k] = d20 + modifier(character.stats[SKILLS[k].stat]) + bonus;
  }
  return totals;
}

export function describeCharacterShort(character) {
  const race = RACES[character.race]?.label ?? character.race;
  const cls = CLASSES[character.classKey]?.label ?? character.classKey;
  return `${race} ${cls} niveau ${character.level}`;
}
