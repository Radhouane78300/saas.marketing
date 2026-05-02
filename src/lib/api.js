import axios from 'axios';

const api = axios.create({ baseURL: '', timeout: 55000 });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('lln_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('lln_token');
    localStorage.removeItem('lln_user');
    if (!window.location.pathname.includes('/login')) window.location.href = '/login';
  }
  return Promise.reject(new Error(err.response?.data?.error || err.message || 'Erreur réseau'));
});

export default api;

export const authApi = {
  login:    d => api.post('/api/auth', d),
  register: d => api.post('/api/auth', { ...d, action: 'register' }),
  me:       () => api.get('/api/auth?action=me'),
  metaUrl:  () => api.get('/api/auth?action=meta-url'),
};

export const pagesApi = {
  list: ()  => api.get('/api/data/pages'),
  sync: ()  => api.post('/api/data/pages'),
};

export const postsApi = {
  list:     p => api.get('/api/data/posts', { params: p }),
  create:   d => api.post('/api/data/posts', d),
  validate: d => api.post('/api/data/posts', { action: 'validate', ...d }),
  publish:  d => api.post('/api/data/posts', { action: 'publish', ...d }),
};

export const agendaApi = {
  posts:  p => api.get('/api/data/agenda', { params: p }),
  create: d => api.post('/api/data/agenda', d),
  delete: id => api.post('/api/data/agenda', { action: 'delete', post_id: id }),
};

export const commentsApi = {
  list:   p  => api.get('/api/data/comments', { params: p }),
  sync:   d  => api.post('/api/data/comments', d),
  action: d  => api.post('/api/data/comments', d),
};

export const analyticsApi = {
  overview: () => api.get('/api/data/analytics'),
};

export const contentApi = {
  generate:    d => api.post('/api/data/content', d),
  suggestions: () => api.post('/api/data/content', { action: 'suggestions' }),
};

export const adsApi = {
  list:   ()  => api.get('/api/data/ads'),
  action: d   => api.post('/api/data/ads', d),
};

export const settingsApi = {
  get:  ()  => api.get('/api/data/settings'),
  save: d   => api.post('/api/data/settings', d),
  test: d   => api.post('/api/data/test', d),
};
