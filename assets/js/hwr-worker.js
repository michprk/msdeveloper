// Lecture de l'écriture dans un fil séparé : le dessin reste fluide pendant le calcul.
import { recognize, preload } from './hwr.js';
self.onmessage = async (e) => {
  const { id, strokes, words, warm } = e.data || {};
  try {
    if (warm) { await preload(); self.postMessage({ id, r: null }); return; }
    self.postMessage({ id, r: await recognize(strokes, { words, local: true }) });
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
