// Portrait du personnage, dessiné en SVG à partir de ses choix d'apparence.
// Toutes les couleurs viennent de la liste d'options du serveur (/api/regles) : rien n'est injecté tel quel.

const NS = 'http://www.w3.org/2000/svg';

function s(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) if (child) node.append(child);
  return node;
}

// Assombrit (amount < 0) ou éclaircit (amount > 0) une couleur #rrggbb.
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const mirror = (d) => s('g', { transform: 'translate(100 0) scale(-1 1)' }, s('path', d));

function backHair(style, color) {
  switch (style) {
    case 'long':
      return s('path', { d: 'M27,42 Q24,82 33,90 L67,90 Q76,82 73,42 Z', fill: color });
    case 'mi-long':
      return s('path', { d: 'M28,42 Q26,66 33,70 L67,70 Q74,66 72,42 Z', fill: color });
    case 'tresse':
      return s(
        'g',
        { fill: color },
        s('path', { d: 'M29,42 Q27,58 33,62 L67,62 Q73,58 71,42 Z' }),
        [64, 70, 76, 82].map((y, i) => s('ellipse', { cx: 70 + i, cy: y, rx: 4, ry: 3.6, stroke: shade(color, -0.3), 'stroke-width': 0.6 })),
      );
    case 'queue':
      return s('path', { d: 'M66,30 Q84,40 78,72 Q74,60 68,46 Z', fill: color });
    case 'boucles':
      return s(
        'g',
        { fill: color },
        [
          [30, 34],
          [27, 46],
          [29, 58],
          [70, 34],
          [73, 46],
          [71, 58],
          [36, 64],
          [64, 64],
        ].map(([cx, cy]) => s('circle', { cx, cy, r: 8 })),
      );
    case 'chignon':
      return s('circle', { cx: 50, cy: 20, r: 8, fill: color });
    default:
      return null;
  }
}

function frontHair(style, color) {
  const dark = shade(color, -0.25);
  switch (style) {
    case 'chauve':
      return null;
    case 'crete':
      return s('path', { d: 'M45,32 Q47,8 50,6 Q53,8 55,32 Q50,28 45,32 Z', fill: color, stroke: dark, 'stroke-width': 0.6 });
    case 'boucles':
      return s(
        'g',
        { fill: color },
        [34, 42, 50, 58, 66].map((cx, i) => s('circle', { cx, cy: i % 2 ? 26 : 29, r: 7 })),
      );
    case 'court':
      return s('path', { d: 'M30,44 Q28,20 50,19 Q72,20 70,44 Q67,31 50,30 Q35,31 30,44 Z', fill: color, stroke: dark, 'stroke-width': 0.5 });
    default:
      // Coiffures longues : raie sur le côté, mèches qui encadrent le visage.
      return s('path', {
        d: 'M30,52 Q27,20 50,19 Q73,20 70,52 Q68,36 60,31 Q52,34 44,30 Q34,36 30,52 Z',
        fill: color,
        stroke: dark,
        'stroke-width': 0.5,
      });
  }
}

function ears(race, skin) {
  const stroke = { stroke: shade(skin, -0.25), 'stroke-width': 0.6, fill: skin };
  switch (race) {
    case 'elfe':
      return [s('path', { d: 'M32,44 L13,28 L32,55 Z', ...stroke }), mirror({ d: 'M32,44 L13,28 L32,55 Z', ...stroke })];
    case 'demielfe':
      return [s('path', { d: 'M32,44 L21,35 L32,55 Z', ...stroke }), mirror({ d: 'M32,44 L21,35 L32,55 Z', ...stroke })];
    case 'gnome':
    case 'halfelin':
      return [s('path', { d: 'M32,43 Q20,38 24,48 Q24,56 32,56 Z', ...stroke }), mirror({ d: 'M32,43 Q20,38 24,48 Q24,56 32,56 Z', ...stroke })];
    case 'drakeide':
      return null;
    default:
      return [s('ellipse', { cx: 31, cy: 49, rx: 3.5, ry: 5.5, ...stroke }), s('ellipse', { cx: 69, cy: 49, rx: 3.5, ry: 5.5, ...stroke })];
  }
}

function head(race, skin) {
  const stroke = shade(skin, -0.3);
  if (race === 'drakeide') {
    return s(
      'g',
      {},
      s('path', { d: 'M31,40 Q32,20 50,20 Q68,20 69,40 L67,60 Q62,74 50,75 Q38,74 33,60 Z', fill: skin, stroke, 'stroke-width': 0.8 }),
      // écailles
      [
        [40, 30],
        [50, 27],
        [60, 30],
        [36, 58],
        [64, 58],
      ].map(([x, y]) => s('path', { d: `M${x - 4},${y} q4,4 8,0`, fill: 'none', stroke, 'stroke-width': 0.7 })),
      s('ellipse', { cx: 47, cy: 64, rx: 1, ry: 0.6, fill: stroke }),
      s('ellipse', { cx: 53, cy: 64, rx: 1, ry: 0.6, fill: stroke }),
    );
  }
  const wide = ['nain', 'demiorc'].includes(race);
  return s('ellipse', { cx: 50, cy: 47, rx: wide ? 21 : 19, ry: wide ? 22 : 23, fill: skin, stroke, 'stroke-width': 0.6 });
}

function horns(race, skin) {
  if (race === 'tieffelin') {
    const fill = '#3b2a30';
    const d = 'M38,30 Q30,14 38,6 Q36,16 44,27 Z';
    return [s('path', { d, fill, stroke: '#1c1418', 'stroke-width': 0.6 }), mirror({ d, fill, stroke: '#1c1418', 'stroke-width': 0.6 })];
  }
  if (race === 'drakeide') {
    const fill = shade(skin, -0.35);
    const d = 'M36,28 Q24,22 18,12 Q30,18 40,24 Z';
    return [s('path', { d, fill }), mirror({ d, fill })];
  }
  return null;
}

function eyes(look, opts, race) {
  const iris = opts.eyes.options[look.eyes]?.color ?? '#5a3a1e';
  const milky = look.eyes === 'blanc';
  const slit = race === 'drakeide';
  const y = race === 'drakeide' ? 42 : 46;
  const brow = look.hairStyle === 'chauve' || race === 'drakeide' ? '#00000066' : (opts.hairColor.options[look.hairColor]?.color ?? '#333');
  return [41.5, 58.5].map((x) =>
    s(
      'g',
      {},
      s('ellipse', { cx: x, cy: y, rx: 4.2, ry: 3, fill: '#fbf8f2' }),
      s('circle', { cx: x, cy: y, r: 2.3, fill: iris }),
      milky ? null : slit ? s('ellipse', { cx: x, cy: y, rx: 0.6, ry: 2.1, fill: '#111' }) : s('circle', { cx: x, cy: y, r: 1.1, fill: '#111' }),
      s('circle', { cx: x + 0.8, cy: y - 0.9, r: 0.6, fill: '#fff' }),
      s('path', { d: `M${x - 4.5},${y - 5} Q${x},${y - 7.5} ${x + 4.5},${y - 5}`, fill: 'none', stroke: brow, 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
    ),
  );
}

function face(race, skin) {
  if (race === 'drakeide') {
    return s('path', { d: 'M42,69 Q50,72 58,69', fill: 'none', stroke: shade(skin, -0.45), 'stroke-width': 1, 'stroke-linecap': 'round' });
  }
  const line = shade(skin, -0.35);
  return s(
    'g',
    {},
    s('path', { d: 'M50,48 Q48,54 50,55 Q52,55.5 53,54', fill: 'none', stroke: line, 'stroke-width': 0.9, 'stroke-linecap': 'round' }),
    s('path', { d: 'M45,61 Q50,64 55,61', fill: 'none', stroke: '#7a3a32', 'stroke-width': 1.2, 'stroke-linecap': 'round' }),
    race === 'demiorc'
      ? [s('path', { d: 'M44.5,62 L45.5,56.5 L47,62 Z', fill: '#f4ecd8' }), s('path', { d: 'M53,62 L54.5,56.5 L55.5,62 Z', fill: '#f4ecd8' })]
      : null,
  );
}

function beard(style, color, race) {
  if (race === 'drakeide') return null;
  const dark = shade(color, -0.25);
  const attrs = { fill: color, stroke: dark, 'stroke-width': 0.5 };
  switch (style) {
    case 'moustache':
      return s('path', { d: 'M41,59 Q46,55 50,57.5 Q54,55 59,59 Q54,58.5 50,59.5 Q46,58.5 41,59 Z', ...attrs });
    case 'bouc':
      return [
        s('path', { d: 'M43,59 Q50,55.5 57,59 Q50,58 43,59 Z', ...attrs }),
        s('path', { d: 'M46,64 Q50,75 54,64 Q50,66 46,64 Z', ...attrs }),
      ];
    case 'courte':
      return s('path', { d: 'M30,48 Q31,71 50,73 Q69,71 70,48 Q67,60 58,59 Q50,56 42,59 Q33,60 30,48 Z', ...attrs });
    case 'longue':
      return s('path', { d: 'M30,48 Q30,70 40,80 Q50,94 60,80 Q70,70 70,48 Q67,60 58,59 Q50,56 42,59 Q33,60 30,48 Z', ...attrs });
    case 'tressee':
      return s(
        'g',
        {},
        s('path', { d: 'M30,48 Q31,70 42,76 L50,78 L58,76 Q69,70 70,48 Q67,60 58,59 Q50,56 42,59 Q33,60 30,48 Z', ...attrs }),
        [78, 83, 88].map((y) => s('ellipse', { cx: 50, cy: y, rx: 3.2, ry: 2.8, ...attrs })),
        s('rect', { x: 46.5, y: 79.5, width: 7, height: 1.6, fill: '#c9a03a' }),
      );
    default:
      return null;
  }
}

function mark(type, skin, race) {
  const y = race === 'drakeide' ? 42 : 46;
  switch (type) {
    case 'rousseur':
      return s(
        'g',
        { fill: shade(skin, -0.35), opacity: 0.8 },
        [
          [37, 53],
          [40, 55],
          [43, 53],
          [57, 53],
          [60, 55],
          [63, 53],
        ].map(([cx, cy]) => s('circle', { cx, cy, r: 0.7 })),
      );
    case 'cicatrice':
      return s('path', { d: 'M60,52 L65,60 M61.5,55 L63.5,54.5 M62.8,57.3 L64.8,56.8', stroke: '#c0605a', 'stroke-width': 0.9, fill: 'none' });
    case 'balafre':
      return s('path', { d: `M54,${y - 9} L63,${y + 9}`, stroke: '#b04a44', 'stroke-width': 1.3, fill: 'none', 'stroke-linecap': 'round' });
    case 'cacheoeil':
      return s(
        'g',
        {},
        s('path', { d: `M30,${y - 8} L70,${y - 2}`, stroke: '#1a1a1a', 'stroke-width': 1 }),
        s('ellipse', { cx: 58.5, cy: y, rx: 5, ry: 4.2, fill: '#1a1a1a' }),
      );
    case 'tatouages':
      return s('path', {
        d: `M50,30 L50,36 M46,33 L54,33 M36,${y + 8} q3,3 6,0 M58,${y + 8} q3,3 6,0`,
        stroke: '#2a4a8a',
        'stroke-width': 1.1,
        fill: 'none',
        opacity: 0.9,
      });
    case 'peinture':
      return s(
        'g',
        { fill: '#b8322a', opacity: 0.85 },
        s('rect', { x: 35, y: y + 5, width: 11, height: 2, rx: 1 }),
        s('rect', { x: 54, y: y + 5, width: 11, height: 2, rx: 1 }),
      );
    default:
      return null;
  }
}

function body(look, opts, skin) {
  const color = opts.outfitColor.options[look.outfitColor]?.color ?? '#7a5232';
  const dark = shade(color, -0.3);
  const light = shade(color, 0.25);
  const torso = s('path', { d: 'M12,100 Q14,77 36,72 L64,72 Q86,77 88,100 Z', fill: color, stroke: dark, 'stroke-width': 0.8 });
  const neck = s('rect', { x: 43, y: 60, width: 14, height: 15, fill: shade(skin, -0.12) });
  let details = null;
  switch (look.outfitStyle) {
    case 'armure':
      details = [
        s('ellipse', { cx: 25, cy: 82, rx: 13, ry: 8, fill: light, stroke: dark, 'stroke-width': 0.8 }),
        s('ellipse', { cx: 75, cy: 82, rx: 13, ry: 8, fill: light, stroke: dark, 'stroke-width': 0.8 }),
        s('path', { d: 'M40,74 Q50,80 60,74 L58,100 L42,100 Z', fill: shade(color, 0.1), stroke: dark, 'stroke-width': 0.6 }),
        s('path', { d: 'M50,78 L50,100', stroke: dark, 'stroke-width': 0.6 }),
      ];
      break;
    case 'robe':
      details = [
        s('path', { d: 'M38,72 L50,90 L62,72', fill: shade(skin, -0.12), stroke: light, 'stroke-width': 2 }),
        s('path', { d: 'M50,90 L50,100', stroke: light, 'stroke-width': 1.5 }),
      ];
      break;
    case 'cuir':
      details = [
        s('path', { d: 'M40,72 Q50,79 60,72', fill: 'none', stroke: dark, 'stroke-width': 1.5 }),
        s('path', { d: 'M30,76 L66,100', stroke: dark, 'stroke-width': 4 }),
        s('circle', { cx: 46, cy: 87, r: 1.6, fill: '#c9a03a' }),
      ];
      break;
    case 'fourrure':
      details = s(
        'g',
        { fill: '#d9c8a8', stroke: '#a8957a', 'stroke-width': 0.5 },
        [18, 26, 34, 42, 50, 58, 66, 74, 82].map((cx, i) => s('circle', { cx, cy: 78 - Math.sin((i / 8) * Math.PI) * 4, r: 6 })),
      );
      break;
    default:
      details = s('path', { d: 'M40,72 Q50,81 60,72', fill: 'none', stroke: light, 'stroke-width': 1.8 });
  }
  return [neck, torso, details];
}

function hoodBack(look, opts) {
  if (look.headwear !== 'capuche') return null;
  const color = opts.outfitColor.options[look.outfitColor]?.color ?? '#7a5232';
  return s('path', { d: 'M22,80 Q16,30 50,14 Q84,30 78,80 Z', fill: shade(color, -0.2) });
}

function headwear(look, opts) {
  const outfit = opts.outfitColor.options[look.outfitColor]?.color ?? '#7a5232';
  switch (look.headwear) {
    case 'capuche':
      return s('path', { d: 'M24,58 Q22,16 50,15 Q78,16 76,58 Q72,30 50,26 Q28,30 24,58 Z', fill: outfit, stroke: shade(outfit, -0.35), 'stroke-width': 0.8 });
    case 'mage': {
      const hat = look.outfitColor === 'blanc' ? '#3a4a8a' : outfit;
      return s(
        'g',
        {},
        s('path', { d: 'M38,26 Q46,10 52,-2 Q58,12 64,26 Z', fill: hat, stroke: shade(hat, -0.35), 'stroke-width': 0.8 }),
        s('ellipse', { cx: 50, cy: 27, rx: 26, ry: 5, fill: hat, stroke: shade(hat, -0.35), 'stroke-width': 0.8 }),
        s('path', { d: 'M39,24 Q50,27 62,24', stroke: '#e3c060', 'stroke-width': 2, fill: 'none' }),
        s('path', { d: 'M53,10 l1,2 l2,0 l-1.6,1.3 l0.6,2 l-2,-1.2 l-2,1.2 l0.6,-2 l-1.6,-1.3 l2,0 Z', fill: '#f0d070' }),
      );
    }
    case 'plume':
      return s(
        'g',
        {},
        s('ellipse', { cx: 50, cy: 27, rx: 24, ry: 5, fill: '#3a2a20' }),
        s('path', { d: 'M34,27 Q36,12 50,12 Q64,12 66,27 Z', fill: '#4a3628' }),
        s('path', { d: 'M36,24 Q50,27 64,24', stroke: outfit, 'stroke-width': 2.5, fill: 'none' }),
        s('path', { d: 'M60,22 Q76,6 84,4 Q76,14 62,25 Z', fill: '#d84a3a', stroke: '#8a2a20', 'stroke-width': 0.5 }),
      );
    case 'casque':
      return s(
        'g',
        { stroke: '#4a525c', 'stroke-width': 0.8 },
        s('path', { d: 'M28,40 Q28,16 50,15 Q72,16 72,40 L67,40 Q66,26 50,25 Q34,26 33,40 Z', fill: '#9aa4b0' }),
        s('path', { d: 'M28,40 Q28,16 50,15 Q72,16 72,40 Q68,33 50,33 Q32,33 28,40 Z', fill: '#aab4c0' }),
        s('rect', { x: 48, y: 33, width: 4, height: 18, fill: '#8a949e' }),
      );
    case 'bandeau':
      return s(
        'g',
        { fill: outfit === '#e4e0d4' ? '#9a2f2a' : outfit },
        s('path', { d: 'M29,36 Q50,30 71,36 L71,40 Q50,34 29,40 Z' }),
        s('path', { d: 'M70,37 L80,44 L77,46 L70,40 Z' }),
        s('path', { d: 'M70,38 L82,38 L81,41 L70,40 Z' }),
      );
    case 'couronne':
      return s(
        'g',
        {},
        s('path', { d: 'M33,32 Q50,26 67,32 L65,35 Q50,30 35,35 Z', fill: '#d8b048', stroke: '#9a7a20', 'stroke-width': 0.5 }),
        s('path', { d: 'M46,30 L50,22 L54,30 Z', fill: '#d8b048', stroke: '#9a7a20', 'stroke-width': 0.5 }),
        s('circle', { cx: 50, cy: 30, r: 1.8, fill: '#4ab0e0' }),
      );
    case 'fleurs':
      return s(
        'g',
        {},
        [32, 39, 46, 54, 61, 68].map((cx, i) =>
          s(
            'g',
            {},
            s('circle', { cx, cy: 30 - Math.sin((i / 5) * Math.PI) * 4, r: 3.2, fill: ['#f0a0c0', '#f6e070', '#ffffff', '#c0a0f0'][i % 4] }),
            s('circle', { cx, cy: 30 - Math.sin((i / 5) * Math.PI) * 4, r: 1.1, fill: '#e8a020' }),
          ),
        ),
      );
    default:
      return null;
  }
}

// Construit le portrait. `rules` est l'objet renvoyé par /api/regles.
export function portrait(character, rules, { size, label } = {}) {
  const opts = rules.look;
  const look = character.look ?? rules.defaultLooks?.[character.race]?.[character.classKey] ?? {};
  const race = character.race;
  const skin = opts.skin.options[look.skin]?.color ?? '#e6b993';
  const hair = opts.hairColor.options[look.hairColor]?.color ?? '#4a2e1c';
  const bg = opts.backdrop.options[look.backdrop]?.color ?? '#4a3220';
  const id = `p${Math.random().toString(36).slice(2, 8)}`;
  const hasHood = look.headwear === 'capuche';
  const hidesHair = ['casque'].includes(look.headwear);

  const svg = s(
    'svg',
    {
      viewBox: '0 0 100 100',
      class: 'portrait-svg',
      role: 'img',
      'aria-label': label ?? `Portrait de ${character.name || 'ton personnage'}`,
      width: size,
      height: size,
    },
    s(
      'defs',
      {},
      s('radialGradient', { id: `${id}-bg`, cx: '50%', cy: '35%', r: '75%' }, s('stop', { offset: '0', 'stop-color': shade(bg, 0.25) }), s('stop', { offset: '1', 'stop-color': shade(bg, -0.35) })),
      s('clipPath', { id: `${id}-clip` }, s('rect', { width: 100, height: 100, rx: 50 })),
    ),
    s(
      'g',
      { 'clip-path': `url(#${id}-clip)` },
      s('rect', { width: 100, height: 100, fill: `url(#${id}-bg)` }),
      race === 'aasimar'
        ? s('circle', { cx: 50, cy: 40, r: 33, fill: 'none', stroke: '#ffe9a0', 'stroke-width': 2.5, opacity: 0.55 })
        : null,
      hoodBack(look, opts),
      hasHood || hidesHair || race === 'drakeide' ? null : backHair(look.hairStyle, hair),
      body(look, opts, skin),
      ears(race, skin),
      head(race, skin),
      mark(look.mark, skin, race),
      eyes(look, opts, race),
      face(race, skin),
      beard(look.beard, hair, race),
      hasHood || hidesHair || race === 'drakeide' ? (race === 'drakeide' && look.hairStyle === 'crete' ? frontHair('crete', hair) : null) : frontHair(look.hairStyle, hair),
      horns(race, skin),
      headwear(look, opts),
    ),
  );
  return svg;
}
