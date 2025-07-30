# 🌐 Domeneshop.no Deployment Guide

## Publiser Workout Tracker med eksisterende Domeneshop domene

### 📋 **Metode: Subdomain + Render (Anbefalt)**

#### **Steg 1: Deploy på Render**
1. Opprett GitHub repository med koden
2. Gå til [render.com](https://render.com) og opprett konto
3. Opprett "Web Service" fra GitHub repository
4. Konfigurer:
   - **Name**: workout-tracker
   - **Build Command**: `npm install`  
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Noter URL: `https://workout-tracker-xxxx.onrender.com`

#### **Steg 2: Sett opp subdomain hos Domeneshop**
1. Logg inn på [Domeneshop kontrollpanel](https://www.domeneshop.no/admin)
2. Velg ditt domene
3. Gå til **"DNS og navnetjenere"**
4. Legg til ny DNS-record:
   ```
   Type: CNAME
   Navn: workout (eller ønsket subdomain)
   Verdi: workout-tracker-xxxx.onrender.com
   TTL: 3600
   ```
5. Klikk **"Lagre"**

#### **Steg 3: Vent på DNS-propagering**
- DNS-endringer kan ta 5-60 minutter
- Tester: `nslookup workout.dittdomene.no`

#### **Steg 4: Konfigurer custom domain på Render**
1. Gå til Render dashboard
2. Velg din service
3. Gå til **"Settings"** → **"Custom Domains"**
4. Legg til: `workout.dittdomene.no`
5. Render setter automatisk opp SSL-sertifikat

### 🎯 **Resultat**
Appen vil være tilgjengelig på: `https://workout.dittdomene.no`

---

## 🔧 **Alternativ: Domeneshop VPS/Cloud Server**

Hvis du har VPS eller Cloud Server hos Domeneshop:

### **Steg 1: Koble til server**
```bash
ssh brukernavn@din-server-ip
```

### **Steg 2: Installer Node.js**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Eller via nvm (anbefalt)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### **Steg 3: Last opp appen**
```bash
# Via git
git clone https://github.com/ditt-brukernavn/workout-tracker.git
cd workout-tracker
npm install

# Eller last opp via FTP/SCP
```

### **Steg 4: Sett opp reverse proxy (Nginx)**
```nginx
# /etc/nginx/sites-available/workout
server {
    listen 80;
    server_name workout.dittdomene.no;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Steg 5: Start appen med PM2**
```bash
npm install -g pm2
pm2 start server.js --name workout-tracker
pm2 startup
pm2 save
```

---

## 💰 **Kostnader**

- **Render + Subdomain**: Gratis
- **Domeneshop VPS**: Fra ~199 kr/mnd
- **SSL-sertifikat**: Gratis (Let's Encrypt)

## 🏆 **Anbefaling**

**Start med Render + subdomain** - det er gratis, enkelt og profesjonelt. Du kan alltid migrere til egen server senere om nødvendig.

Din workout tracker vil være tilgjengelig på f.eks:
- `https://workout.dittdomene.no`
- `https://trening.dittdomene.no`  
- `https://app.dittdomene.no`
