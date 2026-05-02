import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { settingsApi, authApi, pagesApi } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { Card, Btn, Spin, Dot, Badge, Toasts, useToast } from '../components/UI.jsx';

const KEYS = [
  { key:'anthropic_key',   label:'Anthropic API Key (IA)',  ph:'sk-ant-api03-...', icon:'🤖', svc:'anthropic' },
  { key:'meta_app_id',     label:'Meta App ID',             ph:'123456789',        icon:'📘', svc:'meta' },
  { key:'meta_app_secret', label:'Meta App Secret',         ph:'abc123...',        icon:'🔒' },
  { key:'meta_redirect',   label:'Meta Redirect URI',       ph:'https://...vercel.app/api/auth?action=meta-callback', icon:'🔗' },
];

export default function Settings() {
  const [params]  = useSearchParams();
  const { pages, setPages } = useStore(s => ({ pages:s.pages, setPages:s.setPages }));
  const { toasts, add:toast, dismiss } = useToast();
  const [settings, setSettings] = useState({});
  const [values,   setValues]   = useState({});
  const [saving,   setSaving]   = useState(null);
  const [testing,  setTesting]  = useState(null);
  const [syncing,  setSyncing]  = useState(false);
  const [oauthLoad,setOAuth]    = useState(false);
  const [pubMode,  setPubMode]  = useState('semi-auto');

  useEffect(() => {
    const success = params.get('success');
    const error   = params.get('error');
    if (success === 'meta') { toast(`✅ Facebook connecté! ${params.get('pages')} pages.`); loadPages(); }
    if (error) toast(`❌ ${decodeURIComponent(error)}`, 'error');
    loadSettings();
    loadPages();
  }, []);

  const loadSettings = async () => {
    try { const r = await settingsApi.get(); setSettings(r.data.settings||{}); } catch {}
  };
  const loadPages = async () => {
    try { const r = await pagesApi.list(); setPages(r.data.pages||[]); } catch {}
  };

  const save = async key => {
    if (!values[key]?.trim()) return;
    setSaving(key);
    try {
      await settingsApi.save({ key, value:values[key] });
      toast(`✅ ${key} sauvegardé`);
      setSettings(s => ({ ...s, [key]:'••••••••', [key+'_set']:true }));
      setValues(v => ({ ...v, [key]:'' }));
    } catch(e) { toast(e.message, 'error'); }
    finally { setSaving(null); }
  };

  const test = async svc => {
    setTesting(svc);
    try {
      const r = await settingsApi.test({ service:svc });
      toast(r.data.message, r.data.ok ? 'success' : 'error');
    } catch(e) { toast(e.message, 'error'); }
    finally { setTesting(null); }
  };

  const connectMeta = async () => {
    // Auto-save redirect URI based on current domain
    const redirect = `${window.location.origin}/api/auth?action=meta-callback`;
    try { await settingsApi.save({ key:'meta_redirect', value:redirect }); } catch {}
    setOAuth(true);
    try {
      const r = await authApi.metaUrl();
      window.location.href = r.data.oauth_url;
    } catch(e) { toast(e.message, 'error'); setOAuth(false); }
  };

  const syncPages = async () => {
    setSyncing(true);
    try {
      const r = await pagesApi.sync();
      setPages(r.data.pages||[]);
      toast(`✅ ${r.data.synced} pages synchronisées`);
    } catch(e) { toast(e.message, 'error'); }
    finally { setSyncing(false); }
  };

  return (
    <div style={{ display:'grid', gap:22, maxWidth:740 }} className="fade-up">
      <Toasts toasts={toasts} dismiss={dismiss}/>

      <div>
        <h1 style={{ fontSize:20, fontWeight:800 }}>◌ Paramètres</h1>
        <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Tout se configure ici — aucun fichier .env requis</p>
      </div>

      {/* Status bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
        {[
          ['IA (Anthropic)', !!settings.anthropic_key_set, '🤖'],
          ['Facebook',       pages.length > 0,             '📘'],
          ['Base Neon',      true,                         '🐘'],
          ['Chiffrement',    true,                         '🔐'],
        ].map(([l,ok,ico]) => (
          <div key={l} style={{ padding:'12px 14px', background:ok?'var(--green-d)':'var(--surface)', border:`1px solid ${ok?'rgba(34,197,94,.25)':'var(--border)'}`, borderRadius:10, display:'flex', gap:8, alignItems:'center' }}>
            <span style={{fontSize:18}}>{ico}</span>
            <div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>{l}</div>
              <div style={{fontSize:12,fontWeight:700,color:ok?'var(--green)':'var(--orange)'}}>{ok?'Connecté':'À configurer'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Facebook OAuth */}
      <Card style={{ padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ fontSize:14, fontWeight:700 }}>🔗 Facebook OAuth</h2>
          {pages.length > 0 && <Badge label={`${pages.length} pages`} color="var(--green)" bg="var(--green-d)"/>}
        </div>

        <div style={{ padding:'11px 14px', background:'var(--surface2)', borderRadius:8, marginBottom:14, fontSize:12, color:'var(--dim)' }}>
          <strong style={{color:'var(--gold)'}}>Redirect URI à copier dans Meta Developer Console :</strong><br/>
          <code style={{color:'var(--blue)',wordBreak:'break-all'}}>{window.location.origin}/api/auth?action=meta-callback</code>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {pages.length === 0
            ? <Btn v="primary" onClick={connectMeta} disabled={oauthLoad||!settings.meta_app_id_set} icon={oauthLoad?null:'📘'}>
                {oauthLoad?<><Spin size={14} color="#000"/>Redirection...</>:'Connecter Facebook'}
              </Btn>
            : <>
                <Btn v="blue" size="sm" onClick={syncPages} disabled={syncing} icon={syncing?null:'⟳'}>
                  {syncing?<><Spin size={11}/>Sync...</>:`⟳ Resync (${pages.length} pages)`}
                </Btn>
                <Btn v="ghost" size="sm" onClick={connectMeta}>Reconnecter</Btn>
              </>
          }
          {!settings.meta_app_id_set && <p style={{fontSize:11,color:'var(--orange)',alignSelf:'center'}}>⚠ Configurez Meta App ID ci-dessous d'abord</p>}
        </div>

        {pages.length > 0 && (
          <div style={{ marginTop:14, display:'grid', gap:7, maxHeight:200, overflowY:'auto' }}>
            {pages.map(p => (
              <div key={p.page_id} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 12px', background:'var(--surface2)', borderRadius:8 }}>
                {p.picture_url && <img src={p.picture_url} alt="" style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>}
                <Dot status={p.status||'active'}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.page_name}</div>
                  <div style={{fontSize:10,color:'var(--muted)'}}>ID: {p.page_id}</div>
                </div>
                <Badge label={p.status||'active'} color={p.status==='active'?'var(--green)':'var(--orange)'}/>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* API Keys */}
      <Card style={{ padding:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ fontSize:14, fontWeight:700 }}>🔑 Clés API</h2>
          <Badge label="Chiffrées automatiquement" color="var(--green)" bg="var(--green-d)"/>
        </div>
        <div style={{ display:'grid', gap:14 }}>
          {KEYS.map(svc => (
            <div key={svc.key}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{fontSize:15}}>{svc.icon}</span>
                <label style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>{svc.label}</label>
                {settings[svc.key+'_set'] && <Badge label="✓ Configuré" color="var(--green)" bg="var(--green-d)"/>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input type={svc.key.includes('secret')||svc.key.includes('key')?'password':'text'}
                  value={values[svc.key]||''}
                  placeholder={settings[svc.key+'_set']?'••••••••':svc.ph}
                  onChange={e=>setValues(v=>({...v,[svc.key]:e.target.value}))}
                  style={{fontFamily:'var(--mono)',fontSize:12,flex:1}}/>
                {svc.svc && (
                  <Btn v="ghost" size="sm" onClick={()=>test(svc.svc)} disabled={!!testing}>
                    {testing===svc.svc?<Spin size={11}/>:'⚡ Test'}
                  </Btn>
                )}
                <Btn v="primary" size="sm" onClick={()=>save(svc.key)} disabled={!values[svc.key]?.trim()||saving===svc.key}>
                  {saving===svc.key?<Spin size={11} color="#000"/>:'💾'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Publication mode */}
      <Card style={{ padding:22 }}>
        <h2 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>⚙️ Mode de Publication</h2>
        <div style={{ display:'grid', gap:9 }}>
          {[
            { id:'manual',    label:'Manuel',         desc:'Validation humaine obligatoire', rec:false },
            { id:'semi-auto', label:'Semi-Auto',      desc:'Validation si risque IA > 50',   rec:true  },
            { id:'auto',      label:'Autonome',       desc:'Publication auto si score > 80', rec:false },
          ].map(m => (
            <div key={m.id} onClick={()=>setPubMode(m.id)} style={{ display:'flex', gap:12, padding:'12px 14px', cursor:'pointer', background:pubMode===m.id?'var(--gold-d)':'var(--surface2)', borderRadius:9, border:pubMode===m.id?'1px solid rgba(201,168,76,.35)':'1px solid transparent', transition:'all .15s' }}>
              <div style={{ width:17, height:17, borderRadius:'50%', border:`2px solid ${pubMode===m.id?'var(--gold)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                {pubMode===m.id && <div style={{width:7,height:7,borderRadius:'50%',background:'var(--gold)'}}/>}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, display:'flex', gap:8, alignItems:'center' }}>
                  {m.label}
                  {m.rec && <Badge label="Recommandé" color="var(--gold)"/>}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <Btn v="primary" size="sm" style={{marginTop:14}} onClick={()=>toast('✅ Mode sauvegardé')}>Sauvegarder</Btn>
      </Card>

      {/* Neon DB info */}
      <Card style={{ padding:22, borderColor:'rgba(59,130,246,.2)' }}>
        <h2 style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>🐘 Base de données Neon</h2>
        <div style={{ padding:'12px 14px', background:'var(--surface2)', borderRadius:8, fontSize:12, color:'var(--dim)', lineHeight:1.7, marginBottom:10 }}>
          <strong style={{color:'var(--gold)'}}>DATABASE_URL</strong> doit être configurée dans :<br/>
          Vercel Dashboard → votre projet → <strong style={{color:'var(--blue)'}}>Settings → Environment Variables</strong><br/><br/>
          Obtenez une DB gratuite sur <strong style={{color:'var(--blue)'}}>neon.tech</strong> → Connection string → copier/coller.
        </div>
        <Btn v="ghost" size="sm" onClick={()=>test('database')} disabled={!!testing}>
          {testing==='database'?<><Spin size={11}/>Test...</>:'⚡ Tester la connexion DB'}
        </Btn>
      </Card>
    </div>
  );
}
