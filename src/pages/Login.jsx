import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api.js';
import { useStore } from '../lib/store.js';
import { Btn, Spin } from '../components/UI.jsx';

export default function Login() {
  const nav    = useNavigate();
  const setAuth = useStore(s => s.setAuth);
  const [form, setForm] = useState({ email: 'admin@libranation.tn', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [mode,    setMode]    = useState('login');

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = mode === 'login'
        ? await authApi.login(form)
        : await authApi.register({ ...form, name: 'Admin LLN' });
      setAuth(res.data.user, res.data.token);
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
      <div style={{ position:'fixed', top:'15%', left:'50%', transform:'translateX(-50%)', width:500, height:250, background:'radial-gradient(ellipse,rgba(201,168,76,.07) 0%,transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:380, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:36, animation:'fadeUp .4s ease' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:13, background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#000', margin:'0 auto 14px' }}>L</div>
          <h1 style={{ fontSize:20, fontWeight:800 }}>LibraNation AI</h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Plateforme politique intelligente</p>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:22 }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); }} style={{ flex:1, padding:'7px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', background:mode===m?'var(--gold)':'var(--surface2)', color:mode===m?'#000':'var(--dim)', border:mode===m?'none':'1px solid var(--border)', transition:'all .15s' }}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display:'grid', gap:14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Nom</label>
              <input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Admin LLN"/>
            </div>
          )}
          <div>
            <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Email</label>
            <input type="email" required value={form.email} autoComplete="email"
              onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="admin@libranation.tn"/>
          </div>
          <div>
            <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Mot de passe</label>
            <input type="password" required value={form.password} autoComplete={mode==='login'?'current-password':'new-password'}
              onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••"/>
          </div>

          {error && (
            <div style={{ padding:'10px 13px', background:'var(--red-d)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, fontSize:12, color:'var(--red)' }}>
              ⚠ {error}
            </div>
          )}

          <Btn type="submit" v="primary" disabled={loading} style={{ width:'100%', justifyContent:'center', marginTop:4 }} size="lg">
            {loading ? <><Spin size={15} color="#000"/> Connexion...</> : mode==='login' ? 'Se connecter' : 'Créer le compte'}
          </Btn>
        </form>

        <div style={{ marginTop:20, padding:'14px 16px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, fontWeight:600 }}>COMPTE PAR DÉFAUT</div>
          <div style={{ fontSize:12, color:'var(--dim)', fontFamily:'var(--mono)' }}>
            admin@libranation.tn<br/>
            LibraNation2024!
          </div>
        </div>
      </div>
    </div>
  );
}
