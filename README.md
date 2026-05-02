# LibraNation AI Engine v5

## Déploiement en 3 étapes

### 1. Base de données Neon (gratuit, 2 minutes)
1. Aller sur **https://neon.tech** → Sign Up
2. Create Project → nommer `libranation` → Create
3. Copier la **Connection string** (format: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### 2. GitHub
```bash
git init
git add .
git commit -m "LibraNation v5"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/libranation.git
git push -u origin main
```

### 3. Vercel
1. https://vercel.com → New Project → importer le repo
2. **Avant de déployer**, ajouter dans Environment Variables :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | La connection string Neon |

3. Cliquer **Deploy**

## Connexion après déploiement
```
Email    : admin@libranation.tn
Password : LibraNation2024!
```
Le compte est créé automatiquement au premier appel API.

## Architecture
```
api/
  auth.js      ← Login, Register, OAuth Meta
  data.js      ← Pages, Posts, Comments, Analytics, Ads, Content, Settings
  _lib.js      ← Helpers partagés (SQL, JWT, crypto)
src/
  pages/       ← 9 onglets React
  components/  ← Layout, UI
  lib/         ← API client, Zustand store
```

## Vérification
```bash
curl https://VOTRE-PROJET.vercel.app/api/data/health
# → {"status":"ok","storage":"neon-postgresql"}
```
