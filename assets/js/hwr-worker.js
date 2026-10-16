// Lecture de l'écriture dans un fil séparé : le dessin reste fluide pendant le calcul.
// Moteur principal : TrOCR (Microsoft, entraîné sur de vraies écritures), installé une fois sur l'appareil,
// suivi du correcteur français. En attendant l'installation : le moteur simple par modèles de lettres.
import { recognize, preload } from './hwr.js';
import { buildIndex, pickBest } from './hwr-fix.js';

const VENDOR = new URL('./vendor/transformers-3.8.1/', import.meta.url).href;
const MODELS = new URL('../models/', import.meta.url).href;
let ocrP = null, idx = null, idxKey = '';

async function lexIndex(words = []) {
  const key = `${words.length}:${words.slice(-5).join('|')}`;
  if (idx && key === idxKey) return idx;
  const { default: LEX } = await import('./data/hwr-lexique.js');
  idx = buildIndex(LEX, words); idxKey = key;
  return idx;
}
function loadOCR(onProgress) {
  if (!ocrP) {
    ocrP = (async () => {
      const T = await import('./vendor/transformers-3.8.1/transformers.min.js');
      T.env.allowRemoteModels = false; T.env.allowLocalModels = true; T.env.localModelPath = MODELS;
      T.env.backends.onnx.wasm.wasmPaths = VENDOR;
      T.env.backends.onnx.wasm.numThreads = 1; T.env.backends.onnx.wasm.proxy = false;
      const pipe = await T.pipeline('image-to-text', 'trocr-small-handwritten', { dtype: 'q8', device: 'wasm', progress_callback: onProgress });
      return { pipe, RawImage: T.RawImage };
    })();
    ocrP.catch(() => { ocrP = null; });
  }
  return ocrP;
}

self.onmessage = async (e) => {
  const { id, kind, strokes, lines, words, warm } = e.data || {};
  const reply = (o) => self.postMessage({ id, ...o });
  try {
    if (warm) { await preload(); reply({ r: null }); return; }
    if (kind === 'install') {
      // Téléchargement unique du modèle (environ 90 Mo), avec progression
      // Tailles connues : moteur 21,6 Mo, vocabulaire 4,5 Mo, modèle 23 + 40,5 Mo
      const seen = { wasm: [0, 21.6e6], 'tokenizer.json': [0, 4.5e6], enc: [0, 23.1e6], dec: [0, 40.5e6] };
      const key = (f) => (/encoder/.test(f) ? 'enc' : /decoder/.test(f) ? 'dec' : f);
      const tell = () => { const tot = Object.values(seen).reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]); reply({ progress: Math.min(0.999, tot[0] / tot[1]), loaded: tot[0] }); };
      // Le moteur d'exécution d'abord (fichier le plus long), lu en continu pour afficher la progression
      try {
        const res = await fetch(VENDOR + 'ort-wasm-simd-threaded.jsep.wasm');
        const total = +res.headers.get('content-length') || 21.6e6; seen.wasm = [0, total];
        const rd = res.body.getReader(); let n = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; seen.wasm[0] = n; tell(); }
      } catch (err) { /* le moteur sera chargé par la bibliothèque */ }
      seen.wasm[0] = seen.wasm[1];
      await loadOCR((p) => {
        if (p.status === 'progress' && p.total) { seen[key(p.file)] = [p.loaded, p.total]; tell(); }
      });
      reply({ r: { ok: 1 } });
      return;
    }
    if (kind === 'ocr') {
      // lines : une image par ligne d'écriture (pixels RVBA), dans l'ordre
      const { pipe, RawImage } = await loadOCR();
      const index = await lexIndex(words);
      const texts = [], alts = [];
      for (const L of lines) {
        const img = new RawImage(new Uint8ClampedArray(L.data), L.w, L.h, 4);
        const out = await pipe(img, { max_new_tokens: 40 });
        const raw = (out[0]?.generated_text || '').trim();
        const best = pickBest([raw], index);
        texts.push(best[0]?.text || raw);
        alts.push(best.map((b) => b.text));
      }
      const text = texts.join('\n');
      const all = lines.length === 1 ? alts[0] : [text];
      reply({ r: { text, alts: all.length ? all : [text], engine: 'trocr' } });
      return;
    }
    reply({ r: await recognize(strokes, { words, local: true }) });
  } catch (err) { reply({ error: String(err && err.message || err) }); }
};
