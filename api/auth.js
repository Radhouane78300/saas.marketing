// api/auth.js — Login + Register + Me
// Stockage: Make.com webhook (plus de Neon DB)
import crypto from 'crypto';
import { callWebhook, jwtSign, jwtVerify, hashPwd, ok, fail, cors, parseBody } from './_lib.js';

const GV = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v18.0'}`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { cors(res); return res.status(204).end(); }

  const url    = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get('action') || '';

  try {

    // ── GET /api/auth?action=me ───────────────────────────────────────────────
    if (req.method === 'GET' && action === 'me') {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return fail(res, 'Non authentifié', 401);
      const payload = jwtVerify(auth.slice(7));
      if (!payload) return fail(res, 'Token invalide ou expiré', 401);
      try {
        const d = await callWebhook('get_user', { userId: payload.userId });
        const user = d?.user || d;
        if (!user?.id && !user?.email) return fail(res, 'Utilisateur introuvable', 401);
        return ok(res, { user });
      } catch(e) {
        // Si le webhook ne trouve pas l'user, retourner les infos du JWT
        return ok(res, { user: { id: payload.userId, email: payload.email || '', name: payload.name || 'Admin', role: payload.role || 'admin' } });
      }
    }

    // ── GET /api/auth?action=meta-url ─────────────────────────────────────────
    if (req.method === 'GET' && action === 'meta-url') {
      const auth = req.headers.authorization || '';
      const payload = jwtVerify(auth.slice(7));
      if (!payload) return fail(res, 'Non authentifié', 401);
      const appId    = process.env.META_APP_ID;
      const redirect = process.env.META_REDIRECT_URI || `https://${req.headers.host}/api/auth?action=meta-callback`;
      if (!appId) return fail(res, 'META_APP_ID manquant dans Vercel → Settings');
      const state = jwtSign({ userId: payload.userId, purpose: 'oauth' }, 0.17);
      const p = new URLSearchParams({ client_id: appId, redirect_uri: redirect, scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,pages_read_user_content,read_insights', response_type: 'code', state });
      return ok(res, { oauth_url: `https://www.facebook.com/dialog/oauth?${p}` });
    }

    // ── GET /api/auth?action=meta-callback ────────────────────────────────────
    if (req.method === 'GET' && action === 'meta-callback') {
      const q     = Object.fromEntries(url.searchParams);
      const front = process.env.FRONTEND_URL || `https://${req.headers.host}`;
      if (q.error) return res.redirect(302, `${front}/settings?error=${encodeURIComponent(q.error)}`);
      const statePayload = jwtVerify(q.state || '');
      if (!statePayload || statePayload.purpose !== 'oauth') return res.redirect(302, `${front}/settings?error=invalid_state`);
      try {
        const appId     = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        const redirect  = process.env.META_REDIRECT_URI || `https://${req.headers.host}/api/auth?action=meta-callback`;
        const tr = await fetch(`${GV}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirect)}&code=${q.code}`);
        const td = await tr.json(); if (td.error) throw new Error(td.error.message);
        const lr = await fetch(`${GV}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${td.access_token}`);
        const ld = await lr.json(); if (ld.error) throw new Error(ld.error.message);
        // Envoyer le token au webhook pour stockage
        await callWebhook('save_meta_token', { userId: statePayload.userId, access_token: ld.access_token });
        // Récupérer les pages Facebook
        const pr = await fetch(`${GV}/me/accounts?access_token=${ld.access_token}&fields=id,name,category,fan_count,followers_count,picture{url},access_token&limit=30`);
        const pd = await pr.json();
        // Envoyer les pages au webhook
        await callWebhook('save_pages', { userId: statePayload.userId, pages: pd.data || [] });
        return res.redirect(302, `${front}/settings?success=meta&pages=${pd.data?.length || 0}`);
      } catch(e) {
        return res.redirect(302, `${front}/settings?error=${encodeURIComponent(e.message)}`);
      }
    }

    // ── POST /api/auth — Login ou Register ────────────────────────────────────
    if (req.method === 'POST') {
      const b = await parseBody(req);
      const { email, password, name, action: act } = b;
      if (!email || !password) return fail(res, 'Email et mot de passe requis');

      // REGISTER
      if (act === 'register') {
        const result = await callWebhook('register', {
          email,
          password_hash: hashPwd(password),
          name: name || 'Admin',
          role: 'admin',
          id: crypto.randomUUID(),
        });
        if (result?.error) return fail(res, result.error, 409);
        const user = result?.user || { id: result?.id || crypto.randomUUID(), email, name: name||'Admin', role:'admin' };
        const token = jwtSign({ userId: user.id, email: user.email, name: user.name, role: user.role });
        return ok(res, { user, token }, 201);
      }

      // LOGIN — envoyer email + hash au webhook, qui retourne l'user si correct
      const result = await callWebhook('login', {
        email,
        password_hash: hashPwd(password),
      });

      // Le webhook retourne { user: {...} } si OK, ou { error: '...' } si KO
      if (result?.error) return fail(res, result.error, 401);

      const user = result?.user || result;
      if (!user?.id && !user?.email) return fail(res, 'Identifiants incorrects', 401);

      const token = jwtSign({
        userId: user.id,
        email:  user.email,
        name:   user.name,
        role:   user.role || 'admin',
      });

      return ok(res, {
        user: { id: user.id, email: user.email, name: user.name, role: user.role || 'admin' },
        token,
      });
    }

    fail(res, 'Method not allowed', 405);

  } catch(e) {
    console.error('[auth]', e.message);
    fail(res, e.message, 500);
  }
}
