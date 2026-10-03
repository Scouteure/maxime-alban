// Format JSON imposé aux réponses du narrateur (structured outputs).
// Contraintes de l'API : chaque objet doit lister tous ses champs dans `required`
// et avoir `additionalProperties: false`. Les bornes numériques ne sont pas supportées :
// le serveur les applique lui-même (voir Game.applyEffects).

const item = (props) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(props),
  properties: props,
});

const stringList = { type: 'array', items: { type: 'string' } };

export const NARRATION_SCHEMA = item({
  jet: item({
    utilise: { type: 'boolean' },
    caracteristique: { type: 'string', enum: ['aucune', 'FOR', 'DEX', 'CON', 'INT', 'SAG', 'CHA'] },
    difficulte: { type: 'integer' },
  }),
  narration: { type: 'string' },
  effets: {
    type: 'array',
    items: item({
      personnage: { type: 'string' },
      pv: { type: 'integer' },
      xp: { type: 'integer' },
      or: { type: 'integer' },
      objets_gagnes: {
        type: 'array',
        items: item({
          nom: { type: 'string' },
          quantite: { type: 'integer' },
          description: { type: 'string' },
        }),
      },
      objets_perdus: {
        type: 'array',
        items: item({
          nom: { type: 'string' },
          quantite: { type: 'integer' },
        }),
      },
      etats_ajoutes: stringList,
      etats_retires: stringList,
    }),
  },
  lieu: { type: 'string' },
  changement_de_lieu: { type: 'boolean' },
  description_visuelle: { type: 'string' },
  ambiance: { type: 'string' },
  ennemis: {
    type: 'array',
    items: item({
      nom: { type: 'string' },
      etat: { type: 'string' },
    }),
  },
  journal: stringList,
  suggestions: stringList,
});
