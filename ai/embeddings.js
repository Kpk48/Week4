// ai/embeddings.js
// Provides embeddings via Gemini or OpenAI with a safe local fallback.

const crypto = require('crypto');

function normalize(v) {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function hashEmbedding(text, dims = 384) {
  // Lightweight deterministic embedding fallback using hashing
  const vec = new Array(dims).fill(0);
  const tokens = (text || '').toLowerCase().split(/\s+/).slice(0, 2048);
  for (let i = 0; i < tokens.length; i++) {
    const h = crypto.createHash('sha256').update(tokens[i]).digest();
    for (let j = 0; j < dims; j++) {
      vec[j] += (h[j % h.length] - 128) / 128.0;
    }
  }
  return normalize(vec);
}

async function geminiEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  if (!apiKey) return null; // signal to try other providers
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
  const body = {
    model: `models/${model}`.includes('models/') ? model : `models/${model}`,
    content: { parts: [{ text: String(text || '') }] },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini embeddings error: ${res.status} ${msg}`);
  }
  const data = await res.json();
  const v = data?.embedding?.value || data?.embedding?.values || data?.data?.[0]?.embedding;
  if (!v) throw new Error('Gemini embeddings: no embedding returned');
  return normalize(v);
}

async function openAIEmbedding(text, model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null; // signal to try fallback

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: text, model }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI embeddings error: ${res.status} ${msg}`);
  }
  const data = await res.json();
  const v = data?.data?.[0]?.embedding;
  if (!v) throw new Error('OpenAI embeddings: no embedding returned');
  return normalize(v);
}

async function embed(text) {
  const provider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  if (provider === 'gemini') {
    const v = await geminiEmbedding(text);
    return v ?? hashEmbedding(text);
  }
  if (provider === 'openai') {
    const v = await openAIEmbedding(text);
    return v ?? hashEmbedding(text);
  }
  // auto: prefer Gemini if key present, else OpenAI, else hash
  if (process.env.GEMINI_API_KEY) {
    const v = await geminiEmbedding(text);
    if (v) return v;
  }
  if (process.env.OPENAI_API_KEY) {
    const v = await openAIEmbedding(text);
    if (v) return v;
  }
  return hashEmbedding(text);
}

module.exports = {
  embed,
  hashEmbedding,
  normalize,
};
