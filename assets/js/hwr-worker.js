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
      // Téléchargement unique du modèle (environ 55 Mo téléchargés), avec progression
      // Tailles connues : moteur 21,6 Mo, vocabulaire 4,5 Mo, modèle 23 + 40,5 Mo
      // Part de chaque fichier dans le téléchargement (tailles décompressées : le serveur compresse, d'où des
      // octets lus supérieurs à la taille annoncée ; chaque part est donc bornée à 100 %)
      const W = { wasm: 21.6e6, tok: 4.5e6, enc: 23.1e6, dec: 40.5e6 };
      const done = { wasm: 0, tok: 0, enc: 0, dec: 0 };
      const key = (f) => (/encoder/.test(f) ? 'enc' : /decoder/.test(f) ? 'dec' : /tokenizer\.json/.test(f) ? 'tok' : '');
      let last = -1;
      const tell = () => { const p = Object.keys(W).reduce((a, k) => a + done[k] * W[k], 0) / Object.values(W).reduce((a, b) => a + b, 0); if (p - last >= 0.005) { last = p; reply({ progress: Math.min(0.999, p) }); } };
      // Le moteur d'exécution d'abord, lu en continu pour afficher la progression
      try {
        const res = await fetch(VENDOR + 'ort-wasm-simd-threaded.jsep.wasm');
        const rd = res.body.getReader(); let n = 0;
        for (;;) { const { done: end, value } = await rd.read(); if (end) break; n += value.length; done.wasm = Math.min(1, n / W.wasm); tell(); }
      } catch (err) { /* le moteur sera chargé par la bibliothèque */ }
      done.wasm = 1; tell();
      await loadOCR((p) => {
        const k = key(p.file || '');
        if (!k) return;
        if (p.status === 'progress') { done[k] = Math.min(1, (p.progress || 0) / 100); tell(); }
        if (p.status === 'done') { done[k] = 1; tell(); }
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
