// All tabs: Agenda, Contenus, Commentaires, Analyse, Veille, Ads, Recrutement
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { agendaApi, postsApi, commentsApi, contentApi, adsApi, analyticsApi } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { Card, Btn, Metric, Badge, Dot, AR, Empty, Spin, Modal, PB, Toasts, useToast, fmt, SC, SB, SE, STC, TC, TI } from '../components/UI.jsx';

const THEMES = ["Pouvoir d'achat",'Chômage','Santé','Éducation','Libertés','Corruption','Sécurité','Environnement','Agriculture','Jeunesse'];
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// ─── AGENDA ──────────────────────────────────────────────────────────────────
export function Agenda() {
  const { posts, setPosts, pages } = useStore(s=>({posts:s.posts,setPosts:s.setPosts,pages:s.pages}));
  const [cur,setCur]         = useState(new Date());
  const [loading,setLoad]    = useState(false);
  const [showCreate,setCreate] = useState(null);
  const { toasts, add:toast, dismiss } = useToast();

  const y=cur.getFullYear(), m=cur.getMonth();
  const daysCount = new Date(y,m+1,0).getDate();
  const startDow  = (() => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; })();
  const today     = new Date();

  useEffect(()=>{
    setLoad(true);
    agendaApi.posts({year:y,month:m+1}).then(r=>setPosts(r.data.posts||[])).catch(()=>{}).finally(()=>setLoad(false));
  },[y,m]);

  const byDay = {};
  posts.forEach(p=>{ if(p.scheduled_at){const d=new Date(p.scheduled_at).getDate();(byDay[d]=byDay[d]||[]).push(p);} });

  const nav = d => { const c=new Date(cur); c.setMonth(m+d); setCur(c); };

  const handleCreated = p => { setPosts(ps=>[p,...ps]); setCreate(null); toast('📅 Post planifié!'); };

  return (
    <div style={{display:'grid',gap:20}} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <h1 style={{fontSize:20,fontWeight:800}}>◫ Agenda — {MONTHS[m]} {y}</h1>
        <div style={{display:'flex',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>nav(-1)} style={{width:32,height:32,borderRadius:7,background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text)',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
            <button onClick={()=>setCur(new Date())} style={{padding:'6px 12px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',background:'var(--surface2)',color:'var(--dim)',border:'1px solid var(--border)'}}>Aujourd'hui</button>
            <button onClick={()=>nav(1)} style={{width:32,height:32,borderRadius:7,background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text)',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
          </div>
          <Btn v="primary" icon="+" onClick={()=>setCreate({})}>Nouveau post</Btn>
        </div>
      </div>

      <Card style={{overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
          {DAYS.map(d=><div key={d} style={{padding:'9px 5px',textAlign:'center',fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',background:'var(--surface2)'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gridAutoRows:'minmax(80px,auto)'}}>
          {Array.from({length:startDow},(_,i)=><div key={`e${i}`} style={{background:'var(--bg)',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}/>)}
          {Array.from({length:daysCount},(_,i)=>i+1).map(day=>{
            const dp=byDay[day]||[];
            const isToday=today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===day;
            return (
              <div key={day} onClick={()=>setCreate({day:new Date(y,m,day)})}
                style={{padding:'6px 5px',minHeight:80,cursor:'pointer',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',borderTop:isToday?'2px solid var(--gold)':'none',background:isToday?'rgba(201,168,76,.04)':'var(--surface)',transition:'background .1s'}}
                onMouseEnter={e=>e.currentTarget.style.background=isToday?'rgba(201,168,76,.08)':'rgba(255,255,255,.02)'}
                onMouseLeave={e=>e.currentTarget.style.background=isToday?'rgba(201,168,76,.04)':'var(--surface)'}>
                <div style={{fontSize:11,fontWeight:isToday?800:400,color:isToday?'var(--gold)':'var(--muted)',marginBottom:3}}>{day}</div>
                {dp.slice(0,2).map((p,i)=>(
                  <div key={i} style={{fontSize:9,fontWeight:600,color:'#fff',background:TC[p.theme]||'var(--blue)',borderRadius:3,padding:'1px 4px',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {TI[p.post_type]} {p.theme||'Post'}
                  </div>
                ))}
                {dp.length>2&&<div style={{fontSize:9,color:'var(--muted)'}}>+{dp.length-2}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {showCreate&&<CreatePostModal initialDate={showCreate.day} pages={pages} onClose={()=>setCreate(null)} onCreated={handleCreated}/>}
    </div>
  );
}

function CreatePostModal({initialDate,pages,onClose,onCreated}) {
  const [form,setForm] = useState({
    page_id:pages[0]?.page_id||'', platform:'facebook',
    post_type:'text', theme:THEMES[0], content_arabic:'',
    scheduled_at: initialDate?`${initialDate.toISOString().split('T')[0]}T09:00`:`${new Date().toISOString().split('T')[0]}T09:00`,
  });
  const [gen,setGen]   = useState(false);
  const [save,setSave] = useState(false);
  const [err,setErr]   = useState(null);

  const generate = async () => {
    setGen(true);
    try { const r=await contentApi.generate({theme:form.theme,type:form.post_type}); setForm(f=>({...f,content_arabic:r.data.content?.full_text||''})); }
    catch(e) { setErr(e.message); } finally { setGen(false); }
  };
  const submit = async () => {
    if (!form.content_arabic) return setErr('Contenu requis');
    setSave(true);
    try { const r=await agendaApi.create(form); onCreated(r.data.post); }
    catch(e) { setErr(e.message); } finally { setSave(false); }
  };

  return (
    <Modal title="✦ Nouveau Post" onClose={onClose} width={540}>
      <div style={{display:'grid',gap:14}}>
        {pages.length>0&&<div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Page</label><select value={form.page_id} onChange={e=>setForm(f=>({...f,page_id:e.target.value}))}>{pages.map(p=><option key={p.page_id} value={p.page_id}>{p.page_name}</option>)}</select></div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Thème</label><select value={form.theme} onChange={e=>setForm(f=>({...f,theme:e.target.value}))}>{THEMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Type</label><select value={form.post_type} onChange={e=>setForm(f=>({...f,post_type:e.target.value}))}>{['text','image','video','carousel'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <label style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>Contenu (Darija)</label>
            <Btn v="blue" size="sm" onClick={generate} disabled={gen} icon={gen?null:'🤖'}>{gen?<><Spin size={11}/>IA...</>:'Générer IA'}</Btn>
          </div>
          <textarea rows={5} value={form.content_arabic} onChange={e=>setForm(f=>({...f,content_arabic:e.target.value}))} placeholder="اكتب هنا بالدارجة..." style={{fontFamily:'var(--arabic)',direction:'rtl',textAlign:'right',fontSize:14,lineHeight:1.9,resize:'vertical'}}/>
        </div>
        <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Date & Heure</label><input type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(f=>({...f,scheduled_at:e.target.value}))}/></div>
        {err&&<div style={{padding:'9px 12px',background:'var(--red-d)',borderRadius:8,fontSize:12,color:'var(--red)',border:'1px solid rgba(239,68,68,.3)'}}>⚠ {err}</div>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn v="ghost" onClick={onClose}>Annuler</Btn><Btn v="primary" onClick={submit} disabled={save||!form.content_arabic}>{save?<Spin size={14} color="#000"/>:'📅 Planifier'}</Btn></div>
      </div>
    </Modal>
  );
}

// ─── CONTENUS ─────────────────────────────────────────────────────────────────
export function Contenus() {
  const { posts,setPosts,updatePost,pages } = useStore(s=>({posts:s.posts,setPosts:s.setPosts,updatePost:s.updatePost,pages:s.pages}));
  const [theme,setTheme]   = useState(THEMES[0]);
  const [type,setType]     = useState('text');
  const [contentAr,setCAr] = useState('');
  const [hashtags,setHash] = useState([]);
  const [hashIn,setHIn]    = useState('');
  const [gen,setGen]       = useState(false);
  const [result,setResult] = useState(null);
  const [preview,setPrev]  = useState(null);
  const [filter,setFilt]   = useState('all');
  const [loading,setLoad]  = useState(false);
  const [sugg,setSugg]     = useState(null);
  const { toasts,add:toast,dismiss } = useToast();

  useEffect(()=>{
    if (!posts.length) { setLoad(true); postsApi.list({limit:50}).then(r=>setPosts(r.data.posts||[])).catch(()=>{}).finally(()=>setLoad(false)); }
  },[]);

  const generate = async () => {
    setGen(true); setResult(null);
    try { const r=await contentApi.generate({theme,type}); setResult(r.data.content); setCAr(r.data.content.full_text||''); if(r.data.content.hashtags?.length) setHash(r.data.content.hashtags); toast('✨ Contenu généré!'); }
    catch(e) { toast(e.message,'error'); } finally { setGen(false); }
  };

  const loadSugg = async () => {
    try { const r=await contentApi.suggestions(); setSugg(r.data.suggestions); }
    catch(e) { toast(e.message,'error'); }
  };

  const validate = async (post,action) => {
    try { await postsApi.validate({post_id:post.id,action_type:action}); updatePost(post.id,{validation_status:action==='approve'?'approved':'rejected',status:action==='approve'?'approved':'rejected'}); toast(action==='approve'?'✓ Approuvé':'✗ Rejeté',action==='approve'?'success':'error'); }
    catch(e) { toast(e.message,'error'); }
  };

  const addHash = () => { const h=hashIn.trim().startsWith('#')?hashIn.trim():'#'+hashIn.trim(); if(h==='#'||hashtags.includes(h)){setHIn('');return;} setHash(hs=>[...hs,h]); setHIn(''); };
  const filtered = filter==='all'?posts:posts.filter(p=>(p.validation_status||p.status)===filter);

  return (
    <div style={{display:'grid',gap:22}} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>
      <h1 style={{fontSize:20,fontWeight:800}}>✦ Contenus</h1>
      <div style={{display:'grid',gridTemplateColumns:'minmax(300px,1fr) minmax(260px,380px)',gap:22,alignItems:'start'}}>
        <div style={{display:'grid',gap:14}}>
          {/* Type */}
          <Card style={{padding:18}}>
            <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:11}}>Type</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7}}>
              {['text','image','video','carousel'].map(t=><button key={t} onClick={()=>setType(t)} style={{padding:'10px 6px',borderRadius:9,cursor:'pointer',fontFamily:'var(--font)',display:'flex',flexDirection:'column',alignItems:'center',gap:5,border:'none',background:type===t?'var(--gold)':'var(--surface2)',color:type===t?'#000':'var(--dim)',transition:'all .15s'}}><span style={{fontSize:20}}>{TI[t]}</span><span style={{fontSize:10,fontWeight:700}}>{t}</span></button>)}
            </div>
          </Card>
          {/* Theme */}
          <Card style={{padding:18}}>
            <label style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',display:'block',marginBottom:9}}>Thème politique</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {THEMES.map(t=><button key={t} onClick={()=>setTheme(t)} style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',background:theme===t?TC[t]||'var(--gold)':'var(--surface2)',color:theme===t?'#fff':'var(--dim)',border:theme===t?'none':'1px solid var(--border)',transition:'all .12s'}}>{t}</button>)}
            </div>
          </Card>
          {/* Content */}
          <Card style={{padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <label style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em'}}>Texte Darija</label>
              <Btn v="blue" size="sm" onClick={generate} disabled={gen} icon={gen?null:'🤖'}>{gen?<><Spin size={11}/>Génération...</>:'Générer IA'}</Btn>
            </div>
            <textarea rows={6} value={contentAr} onChange={e=>setCAr(e.target.value)} placeholder="اكتب محتوى بوستك بالدارجة..." style={{fontFamily:'var(--arabic)',direction:'rtl',textAlign:'right',fontSize:14,lineHeight:1.9,resize:'vertical'}}/>
            {result&&(
              <div style={{marginTop:12,padding:13,background:'var(--gold-d)',borderRadius:9,border:'1px solid rgba(201,168,76,.2)',display:'grid',gap:8}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.07em'}}>✦ Analyse IA</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {[['Risque',(result.risk_score||0)+'%','var(--red)'],['Portée',fmt(result.reach_estimate||0),'var(--blue)'],['Heure',result.best_time||'—','var(--gold)']].map(([l,v,c])=>(
                    <div key={l} style={{padding:'8px',background:c+'15',borderRadius:7,textAlign:'center'}}><div style={{fontSize:9,color:c,textTransform:'uppercase',letterSpacing:'.06em'}}>{l}</div><div style={{fontSize:15,fontWeight:800,color:c,marginTop:2}}>{v}</div></div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          {/* Hashtags */}
          <Card style={{padding:18}}>
            <label style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',display:'block',marginBottom:9}}>Hashtags</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:9}}>
              {hashtags.map(h=><span key={h} style={{display:'flex',alignItems:'center',gap:3,padding:'3px 9px',borderRadius:5,fontSize:12,fontWeight:600,background:'var(--blue-d)',color:'var(--blue)',border:'1px solid rgba(59,130,246,.3)'}}>{h}<button onClick={()=>setHash(hs=>hs.filter(x=>x!==h))} style={{background:'none',border:'none',color:'var(--blue)',fontSize:11,cursor:'pointer',padding:0}}>✕</button></span>)}
              {!hashtags.length&&<span style={{fontSize:12,color:'var(--muted)'}}>Ajoutez des hashtags</span>}
            </div>
            <div style={{display:'flex',gap:7}}>
              <input value={hashIn} onChange={e=>setHIn(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addHash();}}} placeholder="#تونس + Entrée" style={{fontFamily:'var(--arabic)',direction:'rtl',textAlign:'right',fontSize:13,flex:1}}/>
              <Btn v="ghost" size="sm" onClick={addHash}>+</Btn>
            </div>
          </Card>
          {/* Suggestions */}
          <button onClick={loadSugg} style={{width:'100%',padding:'10px 14px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',display:'flex',alignItems:'center',justifyContent:'space-between',background:sugg?'var(--gold-d)':'var(--surface2)',color:sugg?'var(--gold)':'var(--dim)',border:sugg?'1px solid rgba(201,168,76,.35)':'1px solid var(--border)',transition:'all .15s'}}>
            💡 Suggestions Veille Politique Tunisie <span style={{fontSize:10,opacity:.7}}>{sugg?'▲':'▼'}</span>
          </button>
          {sugg&&(
            <Card style={{padding:14}}>
              {sugg.trending_topics?.length>0&&(<><div style={{fontSize:11,fontWeight:700,color:'var(--orange)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:7}}>🔥 Tendances</div><div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>{sugg.trending_topics.slice(0,5).map((t,i)=><button key={i} onClick={()=>setCAr(a=>a?(a+'\n'+t.topic):t.topic)} style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--arabic)',direction:'rtl',background:'rgba(249,115,22,.12)',color:'var(--orange)',border:'1px solid rgba(249,115,22,.3)'}}>{t.topic}</button>)}</div></>)}
              {sugg.hashtags_trending?.length>0&&(<><div style={{fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:7}}>🏷 Hashtags</div><div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>{sugg.hashtags_trending.map((h,i)=><button key={i} onClick={()=>setHash(hs=>[...new Set([...hs,h])])} style={{padding:'4px 9px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--mono)',background:'var(--blue-d)',color:'var(--blue)',border:'1px solid rgba(59,130,246,.3)'}}>{h}</button>)}</div></>)}
              {sugg.content_ideas?.length>0&&(<><div style={{fontSize:11,fontWeight:700,color:'var(--purple)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:7}}>✨ Idées</div>{sugg.content_ideas.slice(0,3).map((idea,i)=><button key={i} onClick={()=>setCAr(idea.title)} style={{display:'flex',gap:9,alignItems:'center',padding:'8px 11px',borderRadius:7,cursor:'pointer',background:'var(--surface)',border:'1px solid var(--border)',textAlign:'left',fontFamily:'var(--font)',width:'100%',marginBottom:5}}><span style={{fontSize:15}}>{TI[idea.type]||'📝'}</span><span style={{fontFamily:'var(--arabic)',fontSize:12,color:'var(--text)',flex:1,textAlign:'right',direction:'rtl'}}>{idea.title}</span><span style={{fontSize:11,fontWeight:800,color:'var(--green)',flexShrink:0}}>{idea.viral_score}%</span></button>)}</>)}
            </Card>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
            <Btn v="ghost" size="lg" onClick={()=>setPrev({content_arabic:contentAr,hashtags,theme,post_type:type})} disabled={!contentAr} style={{justifyContent:'center'}} icon="👁">Prévisualiser</Btn>
            <Btn v="primary" size="lg" disabled={!contentAr} style={{justifyContent:'center'}} icon="📅" onClick={()=>window.location.href='/agenda'}>Planifier</Btn>
          </div>
        </div>
        {/* Posts list */}
        <div style={{display:'grid',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 style={{fontSize:14,fontWeight:700}}>Posts</h2><span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--mono)'}}>{posts.length}</span></div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {['all','pending','approved','published','rejected'].map(s=><button key={s} onClick={()=>setFilt(s)} style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',background:filter===s?STC[s]||'var(--gold)':'var(--surface2)',color:filter===s?'#fff':'var(--dim)',border:filter===s?'none':'1px solid var(--border)',transition:'all .12s'}}>{s}</button>)}
          </div>
          {loading?<div style={{display:'flex',justifyContent:'center',padding:44}}><Spin size={26}/></div>
            :filtered.length===0?<Empty icon="📋" message="Aucun post"/>
            :<div style={{display:'grid',gap:9}}>
              {filtered.map(post=>{
                const tc=TC[post.theme]||'var(--blue)';
                return (
                  <div key={post.id} style={{background:'var(--surface)',border:`1px solid var(--border)`,borderLeft:`3px solid ${tc}`,borderRadius:10,padding:14,display:'flex',gap:11,alignItems:'flex-start'}}>
                    <div style={{width:34,height:34,borderRadius:8,flexShrink:0,background:tc+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{TI[post.post_type||'text']}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <AR style={{fontSize:12,fontWeight:600,margin:'0 0 7px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{post.content_arabic||post.content_text||'Post'}</AR>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:7}}>
                        {post.theme&&<span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,color:tc,background:tc+'22',fontFamily:'var(--mono)',textTransform:'uppercase'}}>{post.theme}</span>}
                        <PB p={post.platform||'facebook'}/>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,color:STC[post.validation_status||post.status]||'var(--muted)',background:(STC[post.validation_status||post.status]||'var(--muted)')+'22',fontFamily:'var(--mono)',textTransform:'uppercase'}}>{post.validation_status||post.status}</span>
                      </div>
                      {(post.validation_status==='pending'||post.status==='pending')&&<div style={{display:'flex',gap:6}}><Btn v="success" size="sm" onClick={()=>validate(post,'approve')}>✓ Approuver</Btn><Btn v="danger" size="sm" onClick={()=>validate(post,'reject')}>✗ Rejeter</Btn></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
      {preview&&(
        <Modal title="👁 Prévisualisation" onClose={()=>setPrev(null)} width={460}>
          <div style={{background:'#18191a',borderRadius:11,overflow:'hidden',border:'1px solid #3e4042'}}>
            <div style={{padding:'10px 13px',display:'flex',gap:9,alignItems:'center',background:'rgba(24,119,242,.1)'}}><div style={{width:34,height:34,borderRadius:'50%',background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#000'}}>L</div><div><div style={{fontSize:12,fontWeight:700,color:'#e4e6eb'}}>Les Libres de la Nation</div><div style={{fontSize:10,color:'#8a8d91'}}>{preview.theme}</div></div></div>
            <div style={{padding:'12px 13px'}}><AR style={{fontSize:14,color:'#e4e6eb',margin:0}}>{preview.content_arabic}</AR>{preview.hashtags?.length>0&&<div style={{marginTop:7,display:'flex',flexWrap:'wrap',gap:3}}>{preview.hashtags.map(h=><span key={h} style={{fontSize:11,color:'#4599ff'}}>{h}</span>)}</div>}</div>
            <div style={{padding:'7px 13px',borderTop:'1px solid #3e4042',display:'flex',gap:14,fontSize:12,color:'#8a8d91'}}><span>👍</span><span>💬</span><span>↗</span></div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:14}}><Btn v="ghost" onClick={()=>setPrev(null)}>Fermer</Btn><Btn v="primary" icon="📅" onClick={()=>window.location.href='/agenda'}>Planifier</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ─── COMMENTAIRES ─────────────────────────────────────────────────────────────
export function Commentaires() {
  const { comments,setComments,updateComment } = useStore(s=>({comments:s.comments,setComments:s.setComments,updateComment:s.updateComment}));
  const [filter,setFilt] = useState('all');
  const [loading,setLoad]= useState(!comments.length);
  const [actLoad,setAct] = useState(null);
  const [autoRep,setAR]  = useState(null);
  const [replyM,setReply]= useState(null);
  const [replyTxt,setRT] = useState('');
  const { toasts,add:toast,dismiss } = useToast();
  const timer = useRef(null);

  const load = useCallback(async (silent=false) => {
    if (!silent) setLoad(true);
    try { const r=await commentsApi.list({limit:100}); setComments(r.data.comments||[]); }
    catch(e) { if(!silent) toast(e.message,'error'); }
    finally { if(!silent) setLoad(false); }
  },[]);

  useEffect(()=>{ load(); timer.current=setInterval(()=>load(true),30000); return()=>clearInterval(timer.current); },[]);

  const doAction = async (c,action,extra={}) => {
    const key=c.id;
    setAct(key+'-'+action);
    try {
      await commentsApi.action({page_id:c.page_id,comment_id:key,action,...extra});
      if(action==='hide') updateComment(key,{status:'hidden'});
      if(action==='delete') setComments(cs=>cs.filter(x=>x.id!==key));
      toast(action==='like'?'👍 Liké':action==='hide'?'🔇 Masqué':action==='delete'?'🗑 Supprimé':'✅ Ok');
    } catch(e) { toast(e.message,'error'); }
    finally { setAct(null); }
  };

  const doAutoReply = async c => {
    setAR(c.id);
    try { const r=await commentsApi.action({page_id:c.page_id,comment_id:c.id,action:'auto_reply'}); updateComment(c.id,{replied_at:new Date().toISOString(),auto_reply:r.data.reply}); toast('🤖 Réponse auto envoyée'); }
    catch(e) { toast(e.message,'error'); } finally { setAR(null); }
  };

  const doManualReply = async () => {
    if (!replyTxt.trim()) return;
    setAct('reply');
    try { await commentsApi.action({page_id:replyM.page_id,comment_id:replyM.id,action:'reply',message:replyTxt}); updateComment(replyM.id,{replied_at:new Date().toISOString()}); setReply(null); setRT(''); toast('↩ Réponse envoyée'); }
    catch(e) { toast(e.message,'error'); } finally { setAct(null); }
  };

  const filtered=filter==='all'?comments:comments.filter(c=>c.sentiment===filter);
  const counts=['all','positive','neutral','critical','toxic'].reduce((a,f)=>({...a,[f]:f==='all'?comments.length:comments.filter(c=>c.sentiment===f).length}),{});

  return (
    <div style={{display:'grid',gap:18}} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:20,fontWeight:800}}>◎ Commentaires</h1>
        <Btn v="ghost" size="sm" onClick={()=>load()} disabled={loading} icon="⟳">Actualiser</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))',gap:9}}>
        {[['Total',comments.length,'var(--text)'],['Positifs',counts.positive,'var(--green)'],['Neutres',counts.neutral,'var(--blue)'],['Critiques',counts.critical,'var(--orange)'],['Toxiques',counts.toxic,'var(--red)']].map(([l,v,c])=>(
          <div key={l} style={{padding:'11px 13px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:9,textAlign:'center'}}><div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:3}}>{l}</div><div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {['all','positive','neutral','critical','toxic'].map(f=><button key={f} onClick={()=>setFilt(f)} style={{padding:'5px 13px',borderRadius:18,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',background:filter===f?SC[f]||'var(--gold)':'var(--surface)',color:filter===f?'#fff':'var(--dim)',border:filter===f?'none':'1px solid var(--border)',transition:'all .15s'}}>{f==='all'?`Tous (${counts.all})`:`${SE[f]} ${f} (${counts[f]||0})`}</button>)}
      </div>
      {loading?<div style={{display:'flex',justifyContent:'center',padding:55}}><Spin size={30}/></div>
        :filtered.length===0?<Empty icon="💬" message="Aucun commentaire"/>
        :<div style={{display:'grid',gap:11}}>
          {filtered.map(c=>(
            <Card key={c.id} style={{padding:17,borderLeft:`3px solid ${SC[c.sentiment]||'var(--border)'}`,opacity:['hidden','deleted'].includes(c.status)?.45:1}}>
              <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
                <div style={{width:34,height:34,borderRadius:'50%',flexShrink:0,background:`${SC[c.sentiment]||'var(--muted)'}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{SE[c.sentiment]||'💬'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:7,gap:8,flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:700}}>{c.author_name||'Anonyme'}</span>
                      {c.sentiment&&<Badge label={c.sentiment} color={SC[c.sentiment]} bg={SB[c.sentiment]}/>}
                      {c.replied_at&&<Badge label="Répondu" color="var(--green)" bg="var(--green-d)"/>}
                    </div>
                    <span style={{fontSize:10,color:'var(--muted)'}}>{c.created_time?new Date(c.created_time).toLocaleString('fr-TN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}</span>
                  </div>
                  <AR style={{fontSize:14,color:'var(--text)',marginBottom:9}}>{c.message}</AR>
                  {c.auto_reply&&<div style={{padding:'6px 10px',background:'var(--green-d)',borderRadius:6,marginBottom:8,fontSize:11,borderLeft:'2px solid var(--green)',display:'flex',gap:5}}><span style={{color:'var(--green)',fontWeight:700}}>↩</span><AR style={{fontSize:11,color:'var(--dim)',margin:0}}>{c.auto_reply}</AR></div>}
                  {c.status==='active'&&(
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <Btn v="ghost" size="sm" onClick={()=>doAction(c,'like')} disabled={actLoad===c.id+'-like'} icon="👍">{actLoad===c.id+'-like'?<Spin size={11}/>:'Liker'}</Btn>
                      {c.sentiment==='positive'&&<Btn v="success" size="sm" onClick={()=>doAutoReply(c)} disabled={autoRep===c.id||!!c.replied_at}>{autoRep===c.id?<><Spin size={11}/>IA...</>:c.replied_at?'✓ Répondu':'🤖 Auto'}</Btn>}
                      <Btn v="ghost" size="sm" onClick={()=>setReply(c)}>↩ Répondre</Btn>
                      {(c.sentiment==='critical'||c.sentiment==='toxic')&&<Btn v="danger" size="sm" onClick={()=>doAction(c,'hide')} disabled={actLoad===c.id+'-hide'} icon="🔇">{actLoad===c.id+'-hide'?<Spin size={11}/>:'Masquer'}</Btn>}
                      {c.sentiment==='toxic'&&<Btn v="danger" size="sm" onClick={()=>doAction(c,'delete')} disabled={actLoad===c.id+'-del'} icon="🗑">{actLoad===c.id+'-del'?<Spin size={11}/>:'Supprimer'}</Btn>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      }
      {replyM&&(
        <Modal title={`↩ Répondre à ${replyM.author_name||'Anonyme'}`} onClose={()=>setReply(null)} width={480}>
          <div style={{padding:'9px 13px',background:'var(--surface2)',borderRadius:8,marginBottom:13,borderLeft:`3px solid ${SC[replyM.sentiment]||'var(--border)'}`}}><AR style={{fontSize:13,color:'var(--dim)',margin:0}}>{replyM.message}</AR></div>
          <textarea rows={4} value={replyTxt} onChange={e=>setRT(e.target.value)} placeholder="كتب ردّك هنا..." style={{fontFamily:'var(--arabic)',direction:'rtl',textAlign:'right',resize:'vertical',marginBottom:11,fontSize:14}}/>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn v="ghost" onClick={()=>setReply(null)}>Annuler</Btn><Btn v="primary" onClick={doManualReply} disabled={!replyTxt.trim()||actLoad==='reply'}>{actLoad==='reply'?<Spin size={14} color="#000"/>:'Envoyer'}</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ─── ANALYSE ──────────────────────────────────────────────────────────────────
export function Analyse() {
  const { analytics,setAnalytics } = useStore(s=>({analytics:s.analytics,setAnalytics:s.setAnalytics}));
  const [loading,setLoad] = useState(!analytics);
  useEffect(()=>{ setLoad(true); analyticsApi.overview().then(r=>{setAnalytics(r.data);setLoad(false);}).catch(()=>setLoad(false)); },[]);
  const bar=[{l:'Lun',o:42,a:18},{l:'Mar',o:38,a:22},{l:'Mer',o:65,a:28},{l:'Jeu',o:55,a:31},{l:'Ven',o:72,a:35},{l:'Sam',o:88,a:42},{l:'Dim',o:95,a:48}];
  const mx=Math.max(...bar.map(d=>d.o+d.a));
  return (
    <div style={{display:'grid',gap:22}} className="fade-up">
      <h1 style={{fontSize:20,fontWeight:800}}>◉ Analyse Intelligente</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:11}}>
        <Metric label="Total Followers" value={loading?'—':fmt(analytics?.total_followers||0)} color="var(--gold)" loading={loading}/>
        <Metric label="Pages actives"   value={loading?'—':(analytics?.pages||[]).filter(p=>p.status==='active').length} color="var(--green)" loading={loading}/>
        <Metric label="Posts publiés"   value={loading?'—':analytics?.posts_stats?.published||0} color="var(--blue)" loading={loading}/>
        <Metric label="En attente"      value={loading?'—':analytics?.posts_stats?.pending||0} color="var(--orange)" loading={loading}/>
      </div>
      <Card style={{padding:22}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Portée 7 jours</div>
        <div style={{display:'flex',gap:3,alignItems:'flex-end',height:140,marginBottom:11}}>
          {bar.map((d,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{width:'100%',display:'flex',flexDirection:'column',gap:2,justifyContent:'flex-end',height:120}}>
                <div style={{width:'100%',background:'var(--blue)',borderRadius:'3px 3px 0 0',height:`${(d.a/mx)*100}%`,minHeight:3}}/>
                <div style={{width:'100%',background:'var(--gold)',borderRadius:'3px 3px 0 0',height:`${(d.o/mx)*100}%`,minHeight:3}}/>
              </div>
              <div style={{fontSize:9,color:'var(--muted)'}}>{d.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:14}}>{[['var(--gold)','Organique'],['var(--blue)','Publicité']].map(([c,l])=><div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--muted)'}}><span style={{width:9,height:9,background:c,borderRadius:2,display:'inline-block'}}/>{l}</div>)}</div>
      </Card>
      <Card style={{padding:22}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Performance par page</div>
        <div style={{display:'grid',gap:8}}>
          {loading?[1,2,3].map(i=><div key={i} className="skeleton" style={{height:42,borderRadius:8}}/>)
            :(analytics?.pages||[]).map(p=>(
              <div key={p.page_id} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:11,alignItems:'center',padding:'9px 13px',background:'var(--surface2)',borderRadius:8}}>
                <span style={{fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.page_name}</span>
                <span style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--dim)'}}>{fmt(p.followers_count||p.fan_count||0)}</span>
                <Dot status={p.status||'active'}/>
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
}

// ─── VEILLE ───────────────────────────────────────────────────────────────────
export function Veille() {
  const [sugg,setSugg]   = useState(null);
  const [loading,setLoad]= useState(false);
  const { toasts,add:toast,dismiss } = useToast();
  useEffect(()=>{ setLoad(true); contentApi.suggestions().then(r=>setSugg(r.data.suggestions)).catch(e=>toast(e.message,'error')).finally(()=>setLoad(false)); },[]);
  const COMP=[{name:'Parti X',followers:420000,engagement:2.1,posts:8},{name:'Mouvement Y',followers:280000,engagement:3.4,posts:14},{name:'Front Z',followers:190000,engagement:1.8,posts:5}];
  return (
    <div style={{display:'grid',gap:22}} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>
      <h1 style={{fontSize:20,fontWeight:800}}>◇ Veille Politique</h1>
      {loading?<div style={{display:'flex',justifyContent:'center',padding:55}}><Spin size={28}/></div>:sugg&&(
        <>
          <Card style={{padding:20}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>🔥 Tendances Tunisie<Badge label="IA temps réel" color="var(--orange)" bg="var(--orange-d)"/></div>
            <div style={{display:'grid',gap:8}}>
              {sugg.trending_topics?.map((t,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 13px',background:'var(--surface2)',borderRadius:8}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}><span style={{fontSize:15,fontWeight:800,color:'var(--orange)',fontFamily:'var(--mono)',minWidth:24}}>#{i+1}</span><div><AR style={{fontSize:13,fontWeight:700,margin:0}}>{t.topic}</AR><div style={{fontSize:11,color:'var(--muted)'}}>{t.theme}</div></div></div>
                  <Badge label={`${t.score}%`} color="var(--orange)" bg="var(--orange-d)"/>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{padding:20}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>🏷 Hashtags Trending</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>{sugg.hashtags_trending?.map((h,i)=><span key={i} style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,background:'var(--blue-d)',color:'var(--blue)',border:'1px solid rgba(59,130,246,.3)',fontFamily:'var(--mono)'}}>{h}</span>)}</div>
          </Card>
        </>
      )}
      <Card style={{padding:20}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>◇ Benchmark<Badge label="LLN Leader" color="var(--gold)"/></div>
        <div style={{display:'grid',gap:11}}>
          <Card style={{padding:18,borderColor:'rgba(201,168,76,.35)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--gold)',marginBottom:13}}>Les Libres de la Nation (Nous)</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{[['851K+','Followers'],['4.8%','Engagement'],['21','Posts/sem']].map(([v,l])=><div key={l} style={{padding:'10px',background:'var(--gold-d)',borderRadius:8,textAlign:'center'}}><div style={{fontSize:9,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em'}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:'var(--gold)',marginTop:3}}>{v}</div></div>)}</div>
          </Card>
          {COMP.map((c,i)=>(
            <Card key={i} style={{padding:18}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:11}}>{c.name}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[[fmt(c.followers),'Followers'],[`${c.engagement}%`,'Engagement'],[c.posts,'Posts/sem']].map(([v,l])=>(
                  <div key={l} style={{padding:'10px',background:'var(--surface2)',borderRadius:8,textAlign:'center'}}><div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:'var(--green)',marginTop:3}}>{v}</div></div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── ADS ──────────────────────────────────────────────────────────────────────
export function Ads() {
  const [campaigns,setCamp] = useState([]);
  const [loading,setLoad]   = useState(true);
  const [showNew,setNew]    = useState(false);
  const [nf,setNF]          = useState({name:'',platform:'meta',objective:'engagement',daily_budget:50});
  const { toasts,add:toast,dismiss } = useToast();
  useEffect(()=>{ adsApi.list().then(r=>setCamp(r.data.campaigns||[])).catch(()=>{}).finally(()=>setLoad(false)); },[]);
  const create = async () => {
    try { const r=await adsApi.action({action:'create',...nf}); setCamp(c=>[r.data.campaign,...c]); setNew(false); toast('✅ Campagne créée'); }
    catch(e) { toast(e.message,'error'); }
  };
  const updateStatus = async (id,status) => {
    try { const r=await adsApi.action({action:'update_status',campaign_id:id,status}); setCamp(c=>c.map(x=>x.id===id?r.data.campaign:x)); }
    catch(e) { toast(e.message,'error'); }
  };
  return (
    <div style={{display:'grid',gap:22}} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{fontSize:20,fontWeight:800}}>◈ Ads Engine</h1>
        <Btn v="primary" icon="+" onClick={()=>setNew(true)}>Nouvelle Campagne</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:11}}>
        <Metric label="Campagnes" value={campaigns.length} color="var(--purple)"/>
        <Metric label="Actives" value={campaigns.filter(c=>c.status==='active').length} color="var(--green)"/>
        <Metric label="Budget/j" value={campaigns.reduce((s,c)=>s+(parseFloat(c.daily_budget)||0),0).toFixed(0)+'€'} color="var(--gold)"/>
      </div>
      {loading?<div style={{display:'flex',justifyContent:'center',padding:55}}><Spin size={28}/></div>
        :campaigns.length===0?<Empty icon="📢" message="Aucune campagne" action={<Btn v="primary" onClick={()=>setNew(true)}>Créer</Btn>}/>
        :<div style={{display:'grid',gap:13}}>
          {campaigns.map(ad=>(
            <Card key={ad.id} style={{padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:13,gap:11,flexWrap:'wrap'}}>
                <div><h3 style={{fontSize:14,fontWeight:700,marginBottom:5}}>{ad.name}</h3><div style={{display:'flex',gap:7}}><PB p={ad.platform}/><Badge label={ad.status} color={STC[ad.status]||'var(--muted)'}/></div></div>
                <div style={{display:'flex',gap:7}}>
                  {ad.status==='active'&&<Btn v="danger" size="sm" onClick={()=>updateStatus(ad.id,'paused')}>⏸</Btn>}
                  {ad.status==='paused'&&<Btn v="success" size="sm" onClick={()=>updateStatus(ad.id,'active')}>▶</Btn>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))',gap:9}}>
                {[['Budget/j',`${parseFloat(ad.daily_budget||0).toFixed(0)}€`],['Clics',ad.clicks||0],['Conv.',ad.conversions||0]].map(([l,v])=>(
                  <div key={l} style={{padding:'9px 11px',background:'var(--surface2)',borderRadius:8}}><div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{l}</div><div style={{fontSize:17,fontWeight:800}}>{v}</div></div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      }
      {showNew&&(
        <Modal title="◈ Nouvelle Campagne" onClose={()=>setNew(false)}>
          <div style={{display:'grid',gap:13}}>
            <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Nom</label><input value={nf.name} onChange={e=>setNF(f=>({...f,name:e.target.value}))} placeholder="Campagne Pouvoir d'Achat"/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11}}>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Plateforme</label><select value={nf.platform} onChange={e=>setNF(f=>({...f,platform:e.target.value}))}><option value="meta">Meta</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option></select></div>
              <div><label style={{fontSize:11,color:'var(--muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Budget/jour (€)</label><input type="number" value={nf.daily_budget} onChange={e=>setNF(f=>({...f,daily_budget:e.target.value}))}/></div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn v="ghost" onClick={()=>setNew(false)}>Annuler</Btn><Btn v="primary" onClick={create} disabled={!nf.name}>Créer</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RECRUTEMENT ─────────────────────────────────────────────────────────────
export function Recrutement() {
  return (
    <div style={{display:'grid',gap:22}} className="fade-up">
      <h1 style={{fontSize:20,fontWeight:800}}>◍ Recrutement Militants</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:11}}>
        <Metric label="Inscrits ce mois" value="142" color="var(--green)"/>
        <Metric label="Leads en attente" value="38" color="var(--gold)"/>
        <Metric label="Régions couvertes" value="14/24" color="var(--blue)"/>
        <Metric label="Taux conversion" value="24%" color="var(--purple)"/>
      </div>
      <Card style={{padding:28,textAlign:'center',borderColor:'rgba(59,130,246,.2)'}}>
        <div style={{fontSize:38,marginBottom:14}}>◍</div>
        <h2 style={{fontSize:16,fontWeight:700,marginBottom:8}}>Module Recrutement</h2>
        <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,maxWidth:420,margin:'0 auto 18px'}}>Gestion des formulaires d'inscription, suivi des militants et campagnes de mobilisation régionale.</p>
        <Btn v="primary" onClick={()=>window.location.href='/settings'}>Configurer →</Btn>
      </Card>
    </div>
  );
}
