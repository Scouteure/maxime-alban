// Extrait la valeur (éventuellement incomplète) d'un champ texte d'un JSON en cours de génération.
// Sert à afficher la narration au fur et à mesure qu'elle arrive, avant la fin de la réponse.

const ESCAPES = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

export function extractPartialString(json, key) {
  const match = new RegExp(`"${key}"\\s*:\\s*"`).exec(json);
  if (!match) return null;
  let out = '';
  let i = match.index + match[0].length;
  while (i < json.length) {
    const ch = json[i];
    if (ch === '"') return out; // fin de la chaîne
    if (ch !== '\\') {
      out += ch;
      i += 1;
      continue;
    }
    const next = json[i + 1];
    if (next === undefined) break; // échappement coupé en plein milieu
    if (next === 'u') {
      const hex = json.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 6;
    } else {
      out += ESCAPES[next] ?? next;
      i += 2;
    }
  }
  return out;
}
