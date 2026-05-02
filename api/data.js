// api/data.js — Toutes les données via Make.com webhook
import crypto from 'crypto';
import { callWebhook, jwtVerify, enc, dec, ok, fail, cors, parseBody } from './_lib.js';

const GV = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v18.0'}`;

// Auth rapide depuis JWT sans appel webhook
function authFromJWT(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const p = jwtVerify(auth.slice(7));
  if (!p) return null;
  return { id: p.userId, email: p.email, name: p.name, role: p.role };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { cors(res); return res.status(204).end(); }

  const url  = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname;
  const q    = Object.fromEntries(url.searchParams);

  try {
    // ── HEALTH (sans auth) ────────────────────────────────────────────────────
    if (path.includes('/health')) {
      return ok(res, { status:'ok', version:'5.0.0', storage:'make-webhook', timestamp:new Date().toISOString() });
    }

    const user = authFromJWT(req);
    if (!user) return fail(res, 'Non authentifié — connectez-vous', 401);
    const uid = user.id;

    // ── SETTINGS ──────────────────────────────────────────────────────────────
    if (path.includes('/settings')) {
      if (req.method === 'GET') {
        const d = await callWebhook('get_settings', { userId: uid });
        const all  = d?.settings || {};
        const HIDE = ['meta_app_secret','anthropic_key','meta_user_token'];
        const safe = {};
        for (const [k,v] of Object.entries(all)) {
          if (HIDE.some(h => k.includes(h))) { safe[k]='••••••••'; safe[k+'_set']=true; }
          else safe[k] = v;
        }
        return ok(res, { settings: safe });
      }
      if (req.method === 'POST') {
        const { key, value } = await parseBody(req);
        if (!key) return fail(res, 'key requis');
        await callWebhook('save_setting', { userId: uid, key, value });
        return ok(res, { saved: true, key });
      }
    }

    // ── TEST ──────────────────────────────────────────────────────────────────
    if (path.includes('/test') && req.method === 'POST') {
      const { service } = await parseBody(req);
      try {
        if (service === 'anthropic') {
          const d   = await callWebhook('get_settings', { userId: uid });
          const key = d?.settings?.anthropic_key || process.env.ANTHROPIC_API_KEY;
          if (!key || key === '••••••••') return ok(res, { ok:false, message:'Clé Anthropic manquante' });
          const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'}, body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:10,messages:[{role:'user',content:'Hi'}]}) });
          const rd = await r.json();
          return ok(res, rd.error ? {ok:false,message:rd.error.message} : {ok:true,message:'✅ Anthropic OK'});
        }
        if (service === 'meta') {
          const appId = process.env.META_APP_ID;
          if (!appId) return ok(res, {ok:false,message:'META_APP_ID manquant dans Vercel Settings'});
          const r = await fetch(`${GV}/${appId}?fields=id,name`);
          const rd = await r.json();
          return ok(res, rd.error ? {ok:false,message:rd.error.message} : {ok:true,message:`✅ Meta App "${rd.name}" OK`});
        }
        if (service === 'database') {
          await callWebhook('ping', { userId: uid });
          return ok(res, {ok:true,message:'✅ Webhook Make.com connecté'});
        }
        return ok(res, {ok:false,message:'Service inconnu'});
      } catch(e) { return ok(res, {ok:false,message:e.message}); }
    }

    // ── PAGES ─────────────────────────────────────────────────────────────────
    if (path.includes('/pages')) {
      if (req.method === 'GET') {
        const d = await callWebhook('get_pages', { userId: uid });
        const pages = d?.pages || [];
        return ok(res, { pages, total: pages.length });
      }
      if (req.method === 'POST') {
        // Sync pages depuis Meta
        const d = await callWebhook('get_settings', { userId: uid });
        const raw = d?.settings?.[`meta_user_token:${uid}`];
        if (!raw) return fail(res, 'Compte Meta non connecté — Paramètres → Connecter Facebook');
        const pr = await fetch(`${GV}/me/accounts?access_token=${raw}&fields=id,name,category,fan_count,followers_count,picture{url},access_token&limit=30`);
        const pd = await pr.json();
        if (pd.error) return fail(res, pd.error.message);
        await callWebhook('save_pages', { userId: uid, pages: pd.data || [] });
        return ok(res, { synced: pd.data?.length || 0, pages: (pd.data||[]).map(p=>({page_id:p.id,page_name:p.name,category:p.category,fan_count:p.fan_count||0,followers_count:p.followers_count||0,picture_url:p.picture?.data?.url,status:'active'})) });
      }
    }

    // ── POSTS ─────────────────────────────────────────────────────────────────
    if (path.includes('/posts') && !path.includes('/agenda')) {
      if (req.method === 'GET') {
        const d = await callWebhook('get_posts', { userId: uid, status: q.status, limit: q.limit || 50 });
        return ok(res, { posts: d?.posts || [], total: d?.total || 0 });
      }
      if (req.method === 'POST') {
        const { action, post_id, ...b } = await parseBody(req);
        if (action === 'validate' && post_id) {
          const d = await callWebhook('validate_post', { userId: uid, post_id, action_type: b.action_type });
          return ok(res, { post: d?.post || {} });
        }
        if (action === 'publish' && post_id) {
          // Récupérer le post et sa page depuis webhook
          const pd = await callWebhook('get_post', { userId: uid, post_id });
          const post = pd?.post;
          if (!post) return fail(res, 'Post introuvable', 404);
          const paged = await callWebhook('get_page_token', { userId: uid, page_id: post.page_id });
          const token = paged?.access_token;
          if (!token) return fail(res, 'Page introuvable', 404);
          const r = await fetch(`${GV}/${post.page_id}/feed`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({access_token:token,message:post.content_arabic||post.content_text}) });
          const rd = await r.json();
          if (rd.error) return fail(res, rd.error.message);
          await callWebhook('update_post', { userId: uid, post_id, status:'published', platform_post_id: rd.id });
          return ok(res, { success: true, platform_post_id: rd.id });
        }
        // Create
        const id = crypto.randomUUID();
        const d  = await callWebhook('create_post', { userId: uid, id, ...b, status:'pending', validation_status:'pending' });
        return ok(res, { post: d?.post || { id, ...b } }, 201);
      }
    }

    // ── AGENDA ────────────────────────────────────────────────────────────────
    if (path.includes('/agenda')) {
      if (req.method === 'GET') {
        const y = parseInt(q.year)||new Date().getFullYear();
        const m = parseInt(q.month)||new Date().getMonth()+1;
        const d = await callWebhook('get_agenda', { userId: uid, year: y, month: m });
        return ok(res, { posts: d?.posts || [] });
      }
      if (req.method === 'POST') {
        const { action, post_id, ...b } = await parseBody(req);
        if (action === 'delete' && post_id) {
          await callWebhook('delete_post', { userId: uid, post_id });
          return ok(res, { success: true });
        }
        const id = crypto.randomUUID();
        const d  = await callWebhook('create_post', { userId: uid, id, ...b, status:'pending', validation_status:'pending' });
        return ok(res, { post: d?.post || { id, ...b } }, 201);
      }
    }

    // ── COMMENTS ─────────────────────────────────────────────────────────────
    if (path.includes('/comments')) {
      if (req.method === 'GET') {
        const d = await callWebhook('get_comments', { userId: uid, sentiment: q.sentiment, limit: q.limit || 100 });
        return ok(res, { comments: d?.comments || [] });
      }
      if (req.method === 'POST') {
        const { page_id, comment_id, action, message, post_id } = await parseBody(req);

        // Récupérer le token de la page via webhook
        const paged = await callWebhook('get_page_token', { userId: uid, page_id });
        if (paged?.error) return fail(res, 'Page non connectée');
        const token = paged?.access_token;

        if (post_id && !action) {
          const r = await fetch(`${GV}/${post_id}/comments?access_token=${token}&fields=id,message,from,created_time&limit=100&filter=stream`);
          const rd = await r.json();
          if (rd.error) return fail(res, rd.error.message);
          await callWebhook('save_comments', { userId: uid, page_id, comments: rd.data || [] });
          return ok(res, { synced: rd.data?.length || 0, comments: rd.data || [] });
        }

        if (action && comment_id) {
          if (action==='like')   { await fetch(`${GV}/${comment_id}/likes`,{method:'POST',body:new URLSearchParams({access_token:token})}); return ok(res,{success:true}); }
          if (action==='hide')   { await fetch(`${GV}/${comment_id}`,{method:'POST',body:new URLSearchParams({access_token:token,is_hidden:'true'})}); await callWebhook('update_comment',{userId:uid,comment_id,status:'hidden'}); return ok(res,{success:true}); }
          if (action==='delete') { await fetch(`${GV}/${comment_id}?access_token=${token}`,{method:'DELETE'}); await callWebhook('update_comment',{userId:uid,comment_id,status:'deleted'}); return ok(res,{success:true}); }
          if (action==='reply')  { await fetch(`${GV}/${comment_id}/comments`,{method:'POST',body:new URLSearchParams({access_token:token,message})}); await callWebhook('update_comment',{userId:uid,comment_id,replied_at:new Date().toISOString()}); return ok(res,{success:true}); }
          if (action==='auto_reply') {
            const cd   = await callWebhook('get_comment', { userId: uid, comment_id });
            const msg  = cd?.comment?.message || '';
            const ak   = process.env.ANTHROPIC_API_KEY;
            let replyText = 'شكراً على تعليقك! 🙏';
            if (ak) {
              try {
                const ar = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:100,messages:[{role:'user',content:`Réponse courte chaleureuse darija tunisien pour: "${msg.slice(0,150)}". Texte UNIQUEMENT.`}]})});
                const ad = await ar.json();
                replyText = ad.content?.[0]?.text?.trim() || replyText;
              } catch {}
            }
            await fetch(`${GV}/${comment_id}/comments`,{method:'POST',body:new URLSearchParams({access_token:token,message:replyText})});
            await callWebhook('update_comment',{userId:uid,comment_id,replied_at:new Date().toISOString(),auto_reply:replyText});
            return ok(res,{success:true,reply:replyText});
          }
        }
        return ok(res,{ok:true});
      }
    }

    // ── ANALYTICS ─────────────────────────────────────────────────────────────
    if (path.includes('/analytics')) {
      const d = await callWebhook('get_analytics', { userId: uid });
      return ok(res, {
        pages:           d?.pages || [],
        total_followers: d?.total_followers || 0,
        posts_stats:     d?.posts_stats || { published:0, pending:0, total:0 },
        sentiment_stats: d?.sentiment_stats || [],
        last_updated:    new Date().toISOString(),
      });
    }

    // ── CONTENT / AI ──────────────────────────────────────────────────────────
    if (path.includes('/content')) {
      const { theme, type, tone, context, action: act } = await parseBody(req);
      const ak = process.env.ANTHROPIC_API_KEY;
      if (!ak) return fail(res, 'ANTHROPIC_API_KEY manquant dans Vercel Settings');
      const prompt = act === 'suggestions'
        ? `Suggestions contenu politique tunisien "Les Libres de la Nation". JSON:\n{"trending_topics":[{"topic":"رفع الأجور","theme":"Pouvoir d'achat","score":92},{"topic":"البطالة","theme":"Chômage","score":88},{"topic":"غلاء المعيشة","theme":"Vie chère","score":85}],"hashtags_trending":["#تونس","#ليبرانيشن","#الشباب_التونسي","#حرية_التعبير"],"content_ideas":[{"title":"قارن ميزانيتك","theme":"Pouvoir d'achat","type":"image","viral_score":91},{"title":"شهادة شاب عاطل","theme":"Chômage","type":"video","viral_score":87}],"best_times":[{"day":"Vendredi","time":"20:00"}]}`
        : `Expert communication politique tunisienne. Post ${type||'text'} en darija pour "Les Libres de la Nation" sur "${theme||'Général'}". Ton: ${tone||'engaging'}. ${context||''}\nJSON:\n{"hook":"النص","message":"النص","emotion":"النص","cta":"النص","full_text":"النص الكامل","hashtags":["#تونس"],"risk_score":15,"reach_estimate":85000,"best_time":"09:00"}`;
      const r = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:prompt}]})});
      const rd = await r.json();
      if (rd.error) return fail(res, rd.error.message);
      const text = rd.content?.[0]?.text || '';
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
        return ok(res, act==='suggestions' ? {suggestions:parsed} : {content:parsed});
      } catch { return ok(res, act==='suggestions' ? {suggestions:{}} : {content:{full_text:text,hashtags:[]}}); }
    }

    // ── ADS ────────────────────────────────────────────────────────────────────
    if (path.includes('/ads')) {
      if (req.method === 'GET') {
        const d = await callWebhook('get_ads', { userId: uid });
        return ok(res, { campaigns: d?.campaigns || [] });
      }
      if (req.method === 'POST') {
        const { action, campaign_id, name, platform, objective, daily_budget, status } = await parseBody(req);
        if (action === 'create') {
          const id = crypto.randomUUID();
          const d  = await callWebhook('create_ad', { userId: uid, id, name, platform: platform||'meta', objective: objective||'engagement', daily_budget: daily_budget||0 });
          return ok(res, { campaign: d?.campaign || { id, name, platform, status:'draft' } }, 201);
        }
        if (action === 'update_status' && campaign_id) {
          const d = await callWebhook('update_ad', { userId: uid, campaign_id, status });
          return ok(res, { campaign: d?.campaign || {} });
        }
        if (action === 'delete' && campaign_id) {
          await callWebhook('delete_ad', { userId: uid, campaign_id });
          return ok(res, { success: true });
        }
      }
    }

    fail(res, 'Route introuvable', 404);

  } catch(e) {
    console.error('[data]', e.message);
    fail(res, e.message, 500);
  }
}
