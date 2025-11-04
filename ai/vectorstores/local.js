// ai/vectorstores/local.js
// Simple JSON file-based vector store with cosine similarity.

const fs = require('fs');
const path = require('path');
const { normalize } = require('../embeddings');

const DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_FILE = path.join(DATA_DIR, 'vectorstore.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore(file = DEFAULT_FILE) {
  ensureDir();
  if (!fs.existsSync(file)) return { docs: [] };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return { docs: [] };
  }
}

function saveStore(store, file = DEFAULT_FILE) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8');
}

function cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

class LocalVectorStore {
  constructor(opts = {}) {
    this.file = opts.file || DEFAULT_FILE;
    this.namespace = opts.namespace || 'default';
    this.store = loadStore(this.file);
    if (!this.store.docs) this.store.docs = [];
  }

  upsert(vectors, metadata = {}) {
    // vectors: [{ id, values: number[], text, meta }]
    const ns = this.namespace;
    for (const v of vectors) {
      const rec = { id: v.id || `${Date.now()}-${Math.random()}`, ns, values: normalize(v.values), text: v.text || '', meta: { ...metadata, ...(v.meta || {}) } };
      const idx = this.store.docs.findIndex((d) => d.id === rec.id && d.ns === ns);
      if (idx >= 0) this.store.docs[idx] = rec; else this.store.docs.push(rec);
    }
    saveStore(this.store, this.file);
    return { upserted: vectors.length };
  }

  query(queryVec, topK = 5, filter = {}) {
    const ns = this.namespace;
    const candidates = this.store.docs.filter((d) => d.ns === ns && Object.entries(filter).every(([k, v]) => d.meta?.[k] === v));
    const scored = candidates.map((d) => ({ ...d, score: cosine(queryVec, d.values) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

module.exports = { LocalVectorStore };
