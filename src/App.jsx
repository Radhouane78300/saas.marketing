import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './lib/store.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import { Agenda, Contenus, Commentaires, Analyse, Veille, Ads, Recrutement } from './pages/AllTabs.jsx';

function Guard({ children }) {
  const token = useStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index           element={<Dashboard />} />
          <Route path="agenda"      element={<Agenda />} />
          <Route path="content"     element={<Contenus />} />
          <Route path="comments"    element={<Commentaires />} />
          <Route path="analytics"   element={<Analyse />} />
          <Route path="benchmark"   element={<Veille />} />
          <Route path="ads"         element={<Ads />} />
          <Route path="recruitment" element={<Recrutement />} />
          <Route path="settings"    element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
