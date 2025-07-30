# 🚀 Deployment Guide

## Publiser på Render (Gratis)

### Steg 1: Opprett GitHub Repository
1. Gå til [github.com](https://github.com) og opprett ny repository
2. Navnet kan være `workout-tracker` eller lignende
3. Velg "Public" (gratis for offentlige repos)

### Steg 2: Last opp kode til GitHub
```bash
# I prosjektmappen
git init
git add .
git commit -m "Initial commit - Workout Tracker"
git branch -M main
git remote add origin https://github.com/DITT-BRUKERNAVN/workout-tracker.git
git push -u origin main
```

### Steg 3: Deploy på Render
1. Gå til [render.com](https://render.com)
2. Opprett konto (kan bruke GitHub login)
3. Klikk "New +" → "Web Service"
4. Koble til GitHub repository
5. Konfigurer:
   - **Name**: workout-tracker
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. Klikk "Create Web Service"

### Steg 4: Ferdig!
- Appen vil være tilgjengelig på: `https://workout-tracker-XXXX.onrender.com`
- Automatisk deployment ved nye commits til main branch

## Alternative plattformer

### Railway
1. [railway.app](https://railway.app)
2. "Deploy from GitHub"
3. Samme prosess som Render

### Fly.io
1. [fly.io](https://fly.io)
2. Installer Fly CLI
3. `fly launch` i prosjektmappen

## 📝 Viktige notater

- **Database**: SQLite database vil bli opprettet automatisk
- **Gratis tier begrensninger**: 
  - Render: 750 timer/måned, går i dvale etter 15 min inaktivitet
  - Railway: $5 kreditt/måned
- **Custom domain**: Mulig å legge til eget domene senere

## 🔧 Environment Variables (hvis nødvendig)
- `NODE_ENV=production`
- `PORT` (settes automatisk av hosting-plattform)

Appen er allerede konfigurert for production deployment! 🎉
