import { create } from 'zustand';

export const useStore = create((set) => ({
  user:      JSON.parse(localStorage.getItem('lln_user') || 'null'),
  token:     localStorage.getItem('lln_token') || null,
  pages:     [],
  posts:     [],
  comments:  [],
  analytics: null,

  setAuth: (user, token) => {
    localStorage.setItem('lln_user', JSON.stringify(user));
    localStorage.setItem('lln_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('lln_user');
    localStorage.removeItem('lln_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },
  setPages:     p => set({ pages: p }),
  setPosts:     p => set({ posts: p }),
  updatePost:   (id, d) => set(s => ({ posts: s.posts.map(p => p.id === id ? { ...p, ...d } : p) })),
  setComments:  c => set({ comments: c }),
  updateComment:(id, d) => set(s => ({ comments: s.comments.map(c => c.id === id ? { ...c, ...d } : c) })),
  setAnalytics: a => set({ analytics: a }),
}));
