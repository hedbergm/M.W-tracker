# 🏋️ Workout Tracker

En moderne webapplikasjon for å tracke treninger innen kondisjon, styrke og lagidrett. Bygget med Node.js, Express.js og SQLite.

## ✨ Funksjoner

### 🏃‍♂️ Kondisjon
- Registrer km, tid, snittpuls, høydemeter og stigningsprosent
- Automatisk rekordtracking for standarddistanser (3, 5, 10, 15 km)
- Beregning av tempo (min/km)
- Komplett treningshistorikk

### 💪 Styrke
- Opprett egne aktiviteter (f.eks. benkpress, brystpress)
- Registrer sett, reps og vekt
- Automatisk beregning av 1RM (One Rep Max)
- Personlige rekorder per aktivitet
- Fullt CRUD for aktiviteter og treninger

### ⚽ Lagidrett
- Registrer forskjellige sporter
- Spor tid, snittpuls, makspuls og kalorier
- Statistikk per sport
- Oversikt over alle lagidrett aktiviteter

### 📊 Statistikk
- Sammendrag av alle treningskategorier
- Totaler og gjennomsnitt
- Visuell presentasjon av fremgang

## 🚀 Installasjon og Oppstart

### Forutsetninger
- Node.js (versjon 14 eller nyere)
- npm (følger med Node.js)

### Steg 1: Installer avhengigheter
```bash
npm install
```

### Steg 2: Start serveren
```bash
npm start
```

Applikasjonen vil være tilgjengelig på `http://localhost:3000`

## 🛠️ Teknisk Oversikt

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database for datapersistering
- **CORS** - Cross-origin resource sharing

### Frontend
- **Vanilla HTML/CSS/JavaScript** - Ingen frameworks for enkel vedlikehold
- **Responsive design** - Fungerer på desktop og mobile
- **Single Page Application (SPA)** - Smooth navigasjon

### Database Struktur
- `kondisjon` - Kondisjon treninger
- `kondisjon_rekorder` - Personlige rekorder for kondisjon
- `styrke_aktiviteter` - Definerte styrke aktiviteter
- `styrke_treninger` - Styrke treninger
- `styrke_rekorder` - Personlige rekorder for styrke
- `lagidrett` - Lagidrett treninger

## 📱 Bruk

1. **Start applikasjonen** ved å kjøre `npm start`
2. **Åpne nettleseren** på `http://localhost:3000`
3. **Naviger mellom seksjoner** ved å klikke på ønsket kategori
4. **Registrer treninger** ved å klikke "Ny Trening" i hver seksjon
5. **Se statistikk** i statistikk-seksjonen

## 🎯 Spesielle Funksjoner

### Kondisjon Rekorder
Applikasjonen tracker automatisk personlige rekorder for:
- 3 km
- 5 km 
- 10 km
- 15 km

### Styrke Beregninger
- **1RM Beregning**: Bruker Brzycki formelen for å estimere One Rep Max
- **Automatisk Rekordtracking**: Sammenligner nye treninger med eksisterende rekorder

### Lagidrett Statistikk
- **Per-sport analyse**: Klikk på en sport for å se detaljert statistikk
- **Omfattende metrics**: Antall treninger, gjennomsnitt, totaler

## 🔧 API Endpoints

### Kondisjon
- `GET /api/kondisjon` - Hent alle kondisjon treninger
- `POST /api/kondisjon` - Opprett ny kondisjon trening
- `DELETE /api/kondisjon/:id` - Slett kondisjon trening
- `GET /api/kondisjon/rekorder` - Hent alle kondisjon rekorder

### Styrke
- `GET /api/styrke/aktiviteter` - Hent alle aktiviteter
- `POST /api/styrke/aktiviteter` - Opprett ny aktivitet
- `DELETE /api/styrke/aktiviteter/:id` - Slett aktivitet
- `GET /api/styrke/treninger` - Hent alle styrke treninger
- `POST /api/styrke/treninger` - Opprett ny styrke trening
- `DELETE /api/styrke/treninger/:id` - Slett styrke trening
- `GET /api/styrke/rekorder` - Hent alle styrke rekorder

### Lagidrett
- `GET /api/lagidrett` - Hent alle lagidrett treninger
- `POST /api/lagidrett` - Opprett ny lagidrett trening
- `DELETE /api/lagidrett/:id` - Slett lagidrett trening
- `GET /api/lagidrett/sporter` - Hent alle unike sporter
- `GET /api/lagidrett/statistikk/:sport` - Hent statistikk for bestemt sport

## 💾 Database

Applikasjonen bruker SQLite som automatisk oppretter `workout_tracker.db` filen i `database/` mappen ved første oppstart. Alle data lagres lokalt og persistent.

## 🤝 Bidrag

Dette er et personlig treningstracking prosjekt. Forslag til forbedringer er velkommen!

## 📄 Lisens

ISC

---

**Laget med ❤️ for alle som vil holde styr på treningsframgangen sin!**
