# 🚀 SUPER ENKEL DEPLOYMENT GUIDE

## 📍 ZIP-fil lokasjon:
`C:\Users\mhe\OneDrive - Holship A S\Skrivebord\Server Filer\Server Filer\workout-tracker-source.zip`

---

## ⚡ RASK 5-STEGS PROSESS:

### 🔥 **STEG 1: GitHub konto (2 min)**
1. Gå til: https://github.com
2. Klikk "Sign up"
3. Velg brukernavn og passord
4. Verifiser e-post

### 📁 **STEG 2: Opprett repository (1 min)**
1. På GitHub, klikk grønn "New" knapp
2. Repository name: `workout-tracker`
3. Velg "Public" 
4. ✅ IKKE velg "Add README" 
5. Klikk "Create repository"

### 📤 **STEG 3: Last opp filer (3 min)**
1. Pakk ut ZIP-filen på skrivebordet
2. På GitHub siden, klikk "uploading an existing file"
3. Dra ALLE filer fra utpakket mappe til nettleseren
4. Skriv: "Initial workout tracker upload"
5. Klikk "Commit changes"

### 🌐 **STEG 4: Deploy på Render (5 min)**
1. Gå til: https://render.com
2. Klikk "Get Started for Free"
3. Velg "GitHub" login
4. Klikk "New +" → "Web Service"
5. Velg din `workout-tracker` repository
6. Bruk disse innstillingene:
   ```
   Name: workout-tracker
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```
7. Klikk "Create Web Service"
8. NOTER URL: `https://workout-tracker-XXXX.onrender.com`

### 🔗 **STEG 5: Domeneshop subdomain (2 min)**
1. Logg inn: https://www.domeneshop.no/admin
2. Velg ditt domene
3. "DNS og navnetjenere"
4. "Legg til ny record"
5. Fyll ut:
   ```
   Type: CNAME
   Navn: workout
   Verdi: workout-tracker-XXXX.onrender.com
   TTL: 3600
   ```
6. Klikk "Lagre"

---

## 🎉 **FERDIG!**
Din app vil være tilgjengelig på: `https://workout.dittdomene.no`

**Total tid: ~15 minutter** ⏰

---

## 🆘 **Trenger hjelp?**
Hvis du får problemer på noen steg, gi beskjed så hjelper jeg deg videre!

## 📞 **Kontakt meg hvis:**
- GitHub opplasting feiler
- Render deployment ikke starter
- DNS ikke fungerer etter 1 time
- Du får feilmeldinger

Jeg følger deg gjennom hele prosessen! 🤝
