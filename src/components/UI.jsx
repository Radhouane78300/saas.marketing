import React from 'react';

export const fmt = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(0)+'K' : String(n||0);

export const SC = { positive:'var(--green)', neutral:'var(--blue)', critical:'var(--orange)', toxic:'var(--red)' };
export const SB = { positive:'var(--green-d)', neutral:'var(--blue-d)', critical:'var(--orange-d)', toxic:'var(--red-d)' };
export const SE = { positive:'😊', neutral:'😐', critical:'😤', toxic:'🤬' };
export const STC = { pending:'var(--gold)', approved:'var(--blue)', published:'var(--green)', rejected:'var(--red)', failed:'var(--red)', active:'var(--green)', error:'var(--red)', draft:'var(--muted)' };
export const TC = { "Pouvoir d'achat":'#C9A84C', Chômage:'#3B82F6', Santé:'#22C55E', Éducation:'#F97316', Libertés:'#A855F7', Corruption:'#EF4444', Sécurité:'#06B6D4', Environnement:'#84CC16', Agriculture:'#F59E0B', Jeunesse:'#EC4899', Économie:'#8B5CF6', Transport:'#64748B' };
export const TI = { text:'📝', image:'🖼', video:'🎬', carousel:'🎠' };

export const Spin = ({ size=20, color='var(--gold)' }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', border:`2px solid ${color}33`, borderTopColor:color, animation:'spin .7s linear infinite', flexShrink:0 }}/>
);

export const Btn = ({ children, v='primary', size='md', onClick, disabled, icon, style={}, type='button' }) => {
  const vs = { primary:{background:'var(--gold)',color:'#000',border:'none'}, ghost:{background:'transparent',color:'var(--dim)',border:'1px solid var(--border)'}, danger:{background:'var(--red-d)',color:'var(--red)',border:'1px solid rgba(239,68,68,.3)'}, success:{background:'var(--green-d)',color:'var(--green)',border:'1px solid rgba(34,197,94,.3)'}, blue:{background:'var(--blue-d)',color:'var(--blue)',border:'1px solid rgba(59,130,246,.3)'} };
  const ss = { sm:{fontSize:11,padding:'5px 11px'}, md:{fontSize:13,padding:'8px 16px'}, lg:{fontSize:14,padding:'11px 24px'} };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...vs[v]||vs.ghost, ...ss[size]||ss.md, borderRadius:8, fontFamily:'var(--font)', fontWeight:600, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity:disabled?.5:1, transition:'all .15s', whiteSpace:'nowrap', ...style }}>{icon&&<span style={{fontSize:'1.1em',lineHeight:1}}>{icon}</span>}{children}</button>;
};

export const Card = ({ children, style={} }) => <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', ...style }}>{children}</div>;

export const Badge = ({ label, color, bg }) => <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color, background:bg||color+'22', padding:'2px 7px', borderRadius:4, fontFamily:'var(--mono)', flexShrink:0 }}>{label}</span>;

export const Dot = ({ status }) => <span style={{ width:8, height:8, borderRadius:'50%', background:STC[status]||'var(--muted)', display:'inline-block', flexShrink:0, boxShadow:status==='active'?`0 0 0 3px ${STC[status]}33`:'none', animation:status==='active'?'pulse 2s ease infinite':'none' }}/>;

export const PB = ({ p }) => {
  const c = { facebook:'#1877F2', instagram:'#E4405F', youtube:'#FF0000', tiktok:'#010101', meta:'#1877F2' };
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:(c[p]||'#333')+'22', color:c[p]||'#fff', fontFamily:'var(--mono)', textTransform:'uppercase', flexShrink:0 }}>{p}</span>;
};

export const Metric = ({ label, value, sub, color, loading }) => (
  <Card style={{ padding:'18px 22px' }}>
    {loading
      ? <><div className="skeleton" style={{height:11,width:70,marginBottom:10}}/><div className="skeleton" style={{height:26,width:55}}/></>
      : <><div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:7}}>{label}</div>
          <div style={{fontSize:26,fontWeight:800,color:color||'var(--text)',lineHeight:1}}>{value}</div>
          {sub&&<div style={{fontSize:11,color:'var(--muted)',marginTop:5}}>{sub}</div>}</>
    }
  </Card>
);

export const Empty = ({ icon='◎', message, action }) => (
  <div style={{ textAlign:'center', padding:'50px 20px', color:'var(--muted)' }}>
    <div style={{fontSize:38,marginBottom:14,opacity:.4}}>{icon}</div>
    <p style={{fontSize:13,marginBottom:action?18:0}}>{message}</p>
    {action}
  </div>
);

export const AR = ({ children, style={} }) => <p style={{ fontFamily:'var(--arabic)', direction:'rtl', textAlign:'right', lineHeight:1.85, ...style }}>{children}</p>;

export const Modal = ({ children, onClose, title, width=520 }) => (
  <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.82)', backdropFilter:'blur(8px)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
    <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:width, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, maxHeight:'92vh', overflowY:'auto', animation:'fadeUp .22s ease' }}>
      {title&&<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid var(--border)' }}><h2 style={{fontSize:15,fontWeight:700}}>{title}</h2><button onClick={onClose} style={{background:'none',border:'none',color:'var(--muted)',fontSize:19,cursor:'pointer'}}>✕</button></div>}
      <div style={{padding:22}}>{children}</div>
    </div>
  </div>
);

export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const add = React.useCallback((msg, type='success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const dismiss = id => setToasts(t => t.filter(x => x.id !== id));
  return { toasts, add, dismiss };
}

export function Toasts({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', bottom:22, right:22, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents:'auto', padding:'11px 16px', borderRadius:10, background:'var(--surface)', border:`1px solid ${t.type==='error'?'rgba(239,68,68,.4)':t.type==='warning'?'rgba(249,115,22,.4)':'rgba(34,197,94,.4)'}`, borderLeft:`3px solid ${t.type==='error'?'var(--red)':t.type==='warning'?'var(--orange)':'var(--green)'}`, boxShadow:'0 8px 28px rgba(0,0,0,.6)', display:'flex', gap:10, minWidth:240, maxWidth:340, animation:'fadeUp .22s ease' }}>
          <span style={{fontSize:13,color:'var(--text)',flex:1}}>{t.msg}</span>
          <button onClick={()=>dismiss(t.id)} style={{background:'none',border:'none',color:'var(--muted)',fontSize:15,cursor:'pointer'}}>✕</button>
        </div>
      ))}
    </div>
  );
}
