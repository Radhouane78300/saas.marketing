import React from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '../lib/store.js';
import { Dot } from './UI.jsx';

const NAV = [
  { to:'/',           label:'Dashboard',           icon:'⬡' },
  { to:'/agenda',     label:'Agenda',              icon:'◫' },
  { to:'/content',    label:'Contenus',            icon:'✦', badge:true },
  { to:'/comments',   label:'Commentaires',        icon:'◎' },
  { to:'/analytics',  label:'Analyse intelligente',icon:'◉' },
  { to:'/benchmark',  label:'Veille politique',    icon:'◇' },
  { to:'/ads',        label:'Ads Engine',          icon:'◈' },
  { to:'/recruitment',label:'Recrutement',         icon:'◍' },
  { to:'/settings',   label:'Paramètres',          icon:'◌' },
];

function Sidebar({ onClose }) {
  const { user, logout, posts } = useStore(s => ({ user:s.user, logout:s.logout, posts:s.posts }));
  const loc     = useLocation();
  const pending = posts.filter(p => (p.validation_status||p.status) === 'pending').length;

  return (
    <aside style={{ width:232, flexShrink:0, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, zIndex:60 }}>
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#000' }}>L</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, lineHeight:1.1 }}>LibraNation</div>
            <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', marginTop:2 }}>AI Engine v5</div>
          </div>
        </div>
        {onClose && <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:17, cursor:'pointer' }}>✕</button>}
      </div>

      <nav style={{ flex:1, padding:'12px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        {NAV.map(item => {
          const active = item.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(item.to);
          return (
            <NavLink key={item.to} to={item.to} onClick={onClose} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 11px', borderRadius:8, fontSize:12, fontWeight:active?700:500, textDecoration:'none', background:active?'var(--gold-d)':'transparent', color:active?'var(--gold)':'var(--dim)', transition:'all .15s' }}>
              <span style={{ fontSize:14, opacity:active?1:.55 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge && pending > 0 && <span style={{ fontSize:9, fontWeight:700, background:'var(--red)', color:'#fff', borderRadius:10, padding:'1px 5px', minWidth:16, textAlign:'center' }}>{pending}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#000', flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize:9, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}><Dot status="active"/>En ligne</div>
          </div>
          <button onClick={logout} title="Déconnexion" style={{ background:'none', border:'none', color:'var(--muted)', fontSize:13, cursor:'pointer' }}>⏻</button>
        </div>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [open, setOpen] = React.useState(false);
  const loc = useLocation();
  React.useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Mobile overlay */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.65)', backdropFilter:'blur(4px)' }}/>
          <div style={{ position:'relative', zIndex:1 }}><Sidebar onClose={() => setOpen(false)}/></div>
        </div>
      )}

      {/* Desktop */}
      <div className="desktop-sb"><Sidebar/></div>
      <style>{`@media(max-width:768px){.desktop-sb{display:none}.mobile-btn{display:flex!important}}`}</style>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <header style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 18px', height:52, display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, zIndex:50 }}>
          <button className="mobile-btn" onClick={() => setOpen(true)} style={{ background:'none', border:'none', color:'var(--text)', fontSize:19, cursor:'pointer', display:'none' }}>☰</button>
          <div style={{ flex:1 }}/>
          <button style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, background:'var(--red-d)', border:'1px solid rgba(239,68,68,.3)', color:'var(--red)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>🚨 Mode Crise</button>
        </header>
        <main style={{ flex:1, padding:'22px 18px', overflowY:'auto' }}>
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
