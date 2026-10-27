// Petits outils d'interface partagés : création d'éléments, notifications, boîtes de dialogue, réglages.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // stockage indisponible (navigation privée) : tant pis
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // idem
    }
  },
  getJSON(key) {
    try {
      return JSON.parse(this.get(key)) ?? null;
    } catch {
      return null;
    }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },
};

// Crée un élément HTML : el('div', { className: 'x', text: 'y' }, enfant1, enfant2...)
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'className') node.className = value;
    else if (key === 'checked' || key === 'value') node[key] = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// Remplace le contenu d'un élément en ignorant les enfants vides (null, false...).
export function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
}

let toastTimer;
export function toast(message, type = 'erreur') {
  const box = $('#toast');
  box.textContent = message;
  box.className = `visible ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.className = ''), 5000);
}

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const modifier = (score) => Math.floor((score - 10) / 2);
export const formatMod = (mod) => (mod >= 0 ? `+${mod}` : `${mod}`);
// Mêmes formules que server/rules.js
export const xpForLevel = (level) => 50 * level * (level - 1);
export const proficiencyBonus = (level) => 2 + Math.floor((Math.max(1, level) - 1) / 4);

// ---------- Boîtes de dialogue ----------

export function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

for (const dialog of $$('dialog')) {
  // Clic sur le fond = fermer.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
document.addEventListener('click', (e) => {
  const closer = e.target.closest('[data-fermer]');
  if (closer) closer.closest('dialog')?.close();
});

// Remplace window.confirm() par une jolie boîte, utilisable au clavier.
export function confirmDialog(message, { ok = 'Confirmer', cancel = 'Annuler' } = {}) {
  const dialog = $('#dlg-confirmer');
  $('#confirmer-texte', dialog).textContent = message;
  $('#confirmer-ok', dialog).textContent = ok;
  $('#confirmer-annuler', dialog).textContent = cancel;
  openDialog(dialog);
  $('#confirmer-annuler', dialog).focus();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.returnValue = '';
  });
}

// ---------- Réglages d'affichage (propres à chaque navigateur) ----------

const DEFAULT_SETTINGS = { theme: 'auto', textSize: 'normal', readableFont: false, reduceMotion: false, highContrast: false, sound: true };
export const settings = { ...DEFAULT_SETTINGS, ...storage.getJSON('taverne:reglages') };

export function applySettings() {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.taille = settings.textSize;
  root.classList.toggle('police-lisible', settings.readableFont);
  root.classList.toggle('sans-animations', settings.reduceMotion);
  root.classList.toggle('contraste', settings.highContrast);
}

export function initSettings() {
  applySettings();
  const form = $('#form-reglages');
  for (const input of $$('input', form)) {
    if (input.type === 'radio') input.checked = settings[input.name] === input.value;
    else input.checked = Boolean(settings[input.name]);
    input.addEventListener('change', () => {
      settings[input.name] = input.type === 'radio' ? input.value : input.checked;
      storage.setJSON('taverne:reglages', settings);
      applySettings();
    });
  }
  for (const button of $$('.btn-reglages')) button.addEventListener('click', () => openDialog($('#dlg-reglages')));
  for (const button of $$('.btn-aide')) button.addEventListener('click', () => openDialog($('#dlg-aide')));
}
