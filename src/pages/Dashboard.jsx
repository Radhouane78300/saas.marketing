import React, { useEffect, useState } from 'react';
import { analyticsApi, postsApi } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { Card, Metric, Btn, Badge, Dot, AR, PB, Empty, Spin, Toasts, useToast, fmt, SC, SB, SE, STC, TC, TI } from '../components/UI.jsx';

function PostCard({ post, onValidate }) {
  const [act, setAct] = useState(null);
  const validate = async action => {
    setAct(action);
    try { await onValidate(post, action); } finally { setAct(null); }
  };
  const tc = TC[post.theme] || 'var(--blue)';
  return (
    <div style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderLeft:`3px solid ${tc}`, borderRadius:10, padding:14, display:'flex', gap:11, alignItems:'flex-start' }}>
      <div style={{ width:34,height:34,borderRadius:8,flexShrink:0,background:tc+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{TI[post.post_type||'text']}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <AR style={{ fontSize:12,fontWeight:600,flex:1,margin:'0 0 7px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>
          {post.content_arabic||post.content_text||'Post'}
        </AR>
        <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:8 }}>
          {post.theme&&<span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,color:tc,background:tc+'22',fontFamily:'var(--mono)',textTransform:'uppercase'}}>{post.theme}</span>}
          <PB p={post.platform||'facebook'}/>
          <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,color:STC[post.validation_status||post.status]||'var(--muted)',background:(STC[post.validation_status||post.status]||'var(--muted)')+'22',fontFamily:'var(--mono)',textTransform:'uppercase'}}>{post.validation_status||post.status}</span>
        </div>
        {(post.validation_status==='pending'||post.status==='pending')&&(
          <div style={{display:'flex',gap:6}}>
            <Btn v="success" size="sm" onClick={()=>validate('approve')} disabled={!!act}>{act==='approve'?<Spin size={11}/>:'✓'} Approuver</Btn>
            <Btn v="danger"  size="sm" onClick={()=>validate('reject')}  disabled={!!act}>{act==='reject' ?<Spin size={11}/>:'✗'} Rejeter</Btn>
          </div>
        )}
      </div>
      {post.ai_score&&<span style={{fontSize:18,fontWeight:800,color:post.ai_score>75?'var(--green)':'var(--orange)',flexShrink:0}}>{post.ai_score}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { analytics, setAnalytics, posts, setPosts, updatePost, pages } = useStore(s => ({
    analytics:s.analytics, setAnalytics:s.setAnalytics,
    posts:s.posts, setPosts:s.setPosts, updatePost:s.updatePost, pages:s.pages
  }));
  const [loading, setLoading] = useState(!analytics);
  const { toasts, add:toast, dismiss } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, p] = await Promise.all([analyticsApi.overview(), postsApi.list({ limit:20 })]);
        setAnalytics(a.data); setPosts(p.data.posts||[]);
      } catch(e) { toast(e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  const validatePost = async (post, action) => {
    try {
      await postsApi.validate({ post_id:post.id, action_type:action });
      updatePost(post.id, { validation_status:action==='approve'?'approved':'rejected', status:action==='approve'?'approved':'rejected' });
      toast(action==='approve'?'✓ Approuvé':'✗ Rejeté', action==='approve'?'success':'error');
    } catch(e) { toast(e.message,'error'); }
  };

  const pending = posts.filter(p=>(p.validation_status||p.status)==='pending');

  return (
    <div style={{display:'grid',gap:22}} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>
      <h1 style={{fontSize:20,fontWeight:800}}>⬡ Dashboard</h1>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:11}}>
        <Metric label="Followers" value={loading?'—':fmt(analytics?.total_followers||0)} color="var(--gold)" loading={loading}/>
        <Metric label="Pages actives" value={loading?'—':pages.filter(p=>p.status==='active').length} color="var(--green)" loading={loading}/>
        <Metric label="À valider" value={loading?'—':pending.length} color="var(--orange)" loading={loading}/>
        <Metric label="Publiés" value={loading?'—':analytics?.posts_stats?.published||0} color="var(--blue)" loading={loading}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:18}}>
        <Card style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:'flex',justifyContent:'space-between'}}>
            ⬡ Pages connectées
            <span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--mono)'}}>{pages.length} pages</span>
          </div>
          {pages.length===0
            ? <Empty icon="📄" message="Connectez Facebook dans Paramètres" action={<Btn v="primary" size="sm" onClick={()=>window.location.href='/settings'}>Paramètres →</Btn>}/>
            : <div style={{display:'grid',gap:8}}>
                {pages.slice(0,5).map(p=>(
                  <div key={p.page_id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 12px',background:'var(--surface2)',borderRadius:8}}>
                    {p.picture_url&&<img src={p.picture_url} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>}
                    <Dot status={p.status||'active'}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.page_name}</div>
                      <div style={{fontSize:10,color:'var(--muted)'}}>{fmt(p.followers_count||p.fan_count||0)} followers</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>

        <Card style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:'flex',justifyContent:'space-between'}}>
            ✦ À valider
            {pending.length>0&&<Badge label={`${pending.length} en attente`} color="var(--orange)"/>}
          </div>
          {pending.length===0
            ? <Empty icon="✓" message="Aucun post en attente"/>
            : <div style={{display:'grid',gap:9}}>{pending.slice(0,3).map(p=><PostCard key={p.id} post={p} onValidate={validatePost}/>)}</div>
          }
        </Card>
      </div>

      {analytics?.sentiment_stats?.some(s=>s.count>0)&&(
        <Card style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>◎ Sentiments commentaires</div>
          <div style={{display:'flex',gap:11,flexWrap:'wrap'}}>
            {analytics.sentiment_stats.map(s=>(
              <div key={s.sentiment} style={{padding:'12px 18px',background:SB[s.sentiment]||'var(--surface2)',borderRadius:9,border:`1px solid ${SC[s.sentiment]||'var(--border)'}44`,textAlign:'center',minWidth:90}}>
                <div style={{fontSize:20,fontWeight:800,color:SC[s.sentiment]}}>{s.count}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{SE[s.sentiment]} {s.sentiment}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{padding:20,borderColor:'rgba(201,168,76,.2)'}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>◉ Recommandations IA</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:9}}>
          {[
            {i:'📈',t:'Opportunité',m:'Publiez davantage sur le thème Chômage — trending Tunisie',c:'var(--green)'},
            {i:'🎬',t:'Optimiser',  m:'Format vidéo → +40% engagement sur Instagram',             c:'var(--blue)'},
            {i:'⏰',t:'Timing',     m:'Meilleure heure: Vendredi 20h — pic engagement +65%',        c:'var(--gold)'},
            {i:'⚠️',t:'Alerte',     m:'Vérifiez les pages en erreur dans Paramètres',              c:'var(--orange)'},
          ].map(r=>(
            <div key={r.t} style={{padding:'12px 14px',background:'var(--surface2)',borderRadius:8,display:'flex',gap:10}}>
              <span style={{fontSize:20,flexShrink:0}}>{r.i}</span>
              <div>
                <div style={{fontSize:10,color:r.c,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{r.t}</div>
                <div style={{fontSize:12,color:'var(--dim)',lineHeight:1.5}}>{r.m}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
