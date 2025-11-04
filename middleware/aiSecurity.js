// middleware/aiSecurity.js
// Security for AI endpoints: API key/auth gate, input limits, PI logging redaction, prompt-injection guard, and rate limiting.

const rateLimit = require('express-rate-limit');

// Simple bearer token gate for AI endpoints (optional). Set AI_API_KEY to enable.
function apiKeyGate(req, res, next) {
  const expected = process.env.AI_API_KEY;
  if (!expected) return next(); // disabled
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token === expected) return next();
  return res.status(401).json({ error: { message: 'Unauthorized' } });
}

// Limit sizes of inputs
function sizeGuard(limit = 8000) {
  return (req, res, next) => {
    const bodyStr = JSON.stringify(req.body || '');
    if (bodyStr.length > limit) {
      return res.status(413).json({ error: { message: 'Payload too large for AI endpoint' } });
    }
    next();
  };
}

// Very lightweight prompt-injection guard: blocks suspicious phrases
function promptInjectionGuard(req, res, next) {
  const fields = ['query', 'text', 'instruction'];
  const s = fields.map((k) => (req.body?.[k] || '')).join(' ').toLowerCase();
  const bad = [
    'ignore previous',
    'disregard previous',
    'act as system',
    'you are now',
    'developer mode',
    'exfiltrate',
    'leak secret',
    'reveal prompt',
  ];
  const hit = bad.find((w) => s.includes(w));
  if (hit) {
    return res.status(400).json({ error: { message: 'Rejected due to prompt-injection indicators', indicator: hit } });
  }
  next();
}

// Redact secrets in logs if any middleware logs request bodies elsewhere
function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  const secretKeys = ['key', 'token', 'password', 'secret'];
  for (const k of Object.keys(clone)) {
    if (secretKeys.some((s) => k.toLowerCase().includes(s))) clone[k] = '***redacted***';
  }
  return clone;
}

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.AI_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiKeyGate, sizeGuard, promptInjectionGuard, redact, aiRateLimiter };
