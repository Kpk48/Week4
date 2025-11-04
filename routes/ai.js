// routes/ai.js
// AI endpoints: RAG ingestion, chat assistant (RAG), summarizer, sentiment analyzer.

const express = require('express');
const router = express.Router();
const { loadDocuments } = require('../ai/loaders');
const { ingest, retrieve, generateAnswer, summarize, sentiment } = require('../ai/rag');
const { apiKeyGate, sizeGuard, promptInjectionGuard, aiRateLimiter } = require('../middleware/aiSecurity');

// Apply security middleware to all AI endpoints
router.use(aiRateLimiter);
router.use(apiKeyGate);
router.use(sizeGuard(parseInt(process.env.AI_MAX_PAYLOAD || '20000', 10)));
router.use(promptInjectionGuard);

// POST /api/ai/ingest
// Body: { texts?: string[], urls?: string[], md?: string[], namespace?: string, metadata?: object, chunk?: { size, overlap } }
router.post('/ingest', async (req, res, next) => {
  try {
    const { texts = [], urls = [], md = [], namespace = 'default', metadata = {}, chunk } = req.body || {};
    const docs = await loadDocuments({ texts, urls, md });
    const result = await ingest({ docs, namespace, metadata, chunk });
    res.json({ ok: true, ...result, namespace });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/chat
// Body: { query: string, namespace?: string, topK?: number, filter?: object }
router.post('/chat', async (req, res, next) => {
  try {
    const { query, namespace = 'default', topK = 5, filter = {} } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: { message: 'query is required' } });
    const contexts = await retrieve({ query, namespace, topK, filter });
    const answer = await generateAnswer({ query, contexts });
    res.json({ answer, contexts });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/summarize
// Body: { text: string }
router.post('/summarize', async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: { message: 'text is required' } });
    const summary = await summarize({ text });
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/sentiment
// Body: { text: string }
router.post('/sentiment', async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: { message: 'text is required' } });
    const result = await sentiment({ text });
    res.json({ sentiment: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
