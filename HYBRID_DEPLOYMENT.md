# 🔄 Hybrid Deployment - Domeneshop + Render

## Konsept: Frontend på Domeneshop, Backend på Render

### **Del 1: Forbered frontend for statisk hosting**

#### Steg 1: Opprett frontend-mappe
```bash
mkdir frontend-static
cp -r public/* frontend-static/
```

#### Steg 2: Oppdater API-kall i frontend
Endre alle fetch-kall til å peke på backend-URL:

```javascript
// I stedet for: fetch('/api/kondisjon')
// Bruk: fetch('https://workout-api-xxxx.onrender.com/api/kondisjon')
```

### **Del 2: Deploy backend på Render**
1. Deploy kun backend (Node.js server) på Render
2. Få API URL: `https://workout-api-xxxx.onrender.com`

### **Del 3: Upload frontend til Domeneshop**
1. Last opp alle filer fra `frontend-static` til public_html hos Domeneshop
2. Appen tilgjengelig på: `https://dittdomene.no`

### **Del 4: Konfigurer CORS**
Backend må tillate requests fra ditt domene:

```javascript
// I server.js
const cors = require('cors');
app.use(cors({
    origin: ['https://dittdomene.no', 'https://www.dittdomene.no']
}));
```

## 💰 **Kostnader:**
- **Domeneshop standard hosting**: ~99 kr/mnd
- **Render backend**: Gratis
- **Totalt**: ~99 kr/mnd

## ⚡ **Fordeler:**
- ✅ Bruker eksisterende Domeneshop hosting
- ✅ Gratis backend
- ✅ Ditt eget domene
- ✅ Rask frontend (statisk hosting)

## 🔧 **Ulemper:**
- ⚠️ Krever endring av frontend kode
- ⚠️ Mer kompleks deployment
- ⚠️ CORS-konfigurasjon nødvendig
