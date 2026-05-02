// api/_lib.js — Shared helpers
// Stockage: Make.com webhook (remplace Neon PostgreSQL)
// JWT, crypto, HTTP helpers inchangés
import crypto from 'crypto';

// ─── Make.com Webhook ─────────────────────────────────────────────────────────
const WEBHOOK = 'https://hook.eu1.make.com/l2me90w9fjj4rssoxtyikt9abjio31ja';

export async function callWebhook(action, payload = {}) {
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => String(res.status));
    throw new Error(`Webhook error ${res.status}: ${t}`);
  }
  // Make.com peut retourner du texte vide ou du JSON
  const text = await res.text();
  if (!text || text.trim() === '') return { ok: true };
  try { return JSON.parse(text); }
  catch { return { ok: true, raw: text }; }
}

// ─── JWT ──────────────────────────────────────────────────────────────────────
const SECRET = () => process.env.JWT_SECRET || 'lln-jwt-secret-change-in-vercel';

export function jwtSign(payload, days = 7) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + days * 86400,
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  const s = crypto.createHmac('sha256', SECRET()).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

export function jwtVerify(token) {
  try {
    const [h, b, s] = (token || '').split('.');
    if (!h || !b || !s) return null;
    const exp = crypto.createHmac('sha256', SECRET()).update(`${h}.${b}`).digest('base64url');
    if (s !== exp) return null;
    const p = JSON.parse(Buffer.from(b, 'base64').toString());
    if (p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch { return null; }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
export async function requireAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const p = jwtVerify(auth.slice(7));
  if (!p) return null;
  // Vérifier le token auprès du webhook
  try {
    const d = await callWebhook('get_user', { userId: p.userId });
    return d?.user || d?.id ? (d.user || d) : null;
  } catch { return null; }
}

// ─── Crypto ───────────────────────────────────────────────────────────────────
export function hashPwd(p) {
  return crypto.createHash('sha256').update(p + 'lln-salt').digest('hex');
}

function getKey() {
  const raw = process.env.ENCRYPTION_KEY || 'libranation-default-32chars-key!!';
  return Buffer.from(raw.padEnd(32, '0').slice(0, 32));
}
export function enc(text) {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(16);
    const c  = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
    return iv.toString('hex') + ':' + Buffer.concat([c.update(text), c.final()]).toString('hex');
  } catch { return text; }
}
export function dec(encrypted) {
  if (!encrypted || !encrypted.includes(':')) return encrypted;
  try {
    const [ivH, encH] = encrypted.split(':');
    const d = crypto.createDecipheriv('aes-256-cbc', getKey(), Buffer.from(ivH, 'hex'));
    return Buffer.concat([d.update(Buffer.from(encH, 'hex')), d.final()]).toString();
  } catch { return encrypted; }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
export function ok(res, data, status = 200)  { cors(res); res.status(status).json(data); }
export function fail(res, msg, status = 400) { cors(res); res.status(status).json({ error: msg }); }

export async function parseBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => { d += c; });
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
