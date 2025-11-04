// ai/loaders/index.js
// Minimal document loaders supporting raw text, URLs (HTML stripped), and Markdown.

const fetch = global.fetch;

function stripHtml(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  const html = await res.text();
  return stripHtml(html);
}

function chunkText(text, opts = {}) {
  const size = opts.size || 800;
  const overlap = opts.overlap || 80;
  const chunks = [];
  const words = (text || '').split(/\s+/);
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(' ');
    chunks.push(chunk);
    i += size - overlap;
  }
  return chunks.filter(Boolean);
}

async function loadDocuments({ texts = [], urls = [], md = [] }) {
  const docs = [];
  for (const t of texts) docs.push(t);
  for (const m of md) docs.push(m);
  for (const u of urls) docs.push(await loadFromUrl(u));
  return docs;
}

module.exports = {
  loadDocuments,
  chunkText,
  stripHtml,
};
