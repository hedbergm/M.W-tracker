const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Hent alle kondisjon treninger
router.get('/', (req, res) => {
    const sql = `SELECT * FROM kondisjon ORDER BY dato DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Legg til ny kondisjon trening
router.post('/', (req, res) => {
    const { dato, km, tid_minutter, snittpuls, hoydemeter, stigningsprosent, kalorier, kommentar } = req.body;
    
    const sql = `INSERT INTO kondisjon (dato, km, tid_minutter, snittpuls, hoydemeter, stigningsprosent, kalorier, kommentar) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [dato, km, tid_minutter, snittpuls, hoydemeter, stigningsprosent, kalorier, kommentar], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Automatisk oppdater rekorder etter ny økt
        const oktId = this.lastID;
        updateRecordsAfterWorkout(oktId);
        
        res.json({
            id: oktId,
            message: 'Kondisjon trening lagt til!'
        });
    });
});

// Hent rekorder
router.get('/rekorder', (req, res) => {
    const sql = `SELECT * FROM kondisjon_rekorder ORDER BY distanse_km ASC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Slett kondisjon trening
router.delete('/:id', (req, res) => {
    const sql = `DELETE FROM kondisjon WHERE id = ?`;
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Kondisjon trening slettet!' });
    });
});

// Funksjon for å sjekke og oppdatere rekorder
function checkAndUpdateRecord(km, tid_minutter, dato) {
    // Sjekk for standarddistanser: 3, 5, 10, 15 km
    const standardDistanser = [3, 5, 10, 15];
    
    standardDistanser.forEach(distanse => {
        if (Math.abs(km - distanse) < 0.1) { // Toleranse på 100m
            // Sjekk om dette er en ny rekord
            const checkSql = `SELECT beste_tid_minutter FROM kondisjon_rekorder WHERE distanse_km = ?`;
            
            db.get(checkSql, [distanse], (err, row) => {
                if (err) return;
                
                if (!row || tid_minutter < row.beste_tid_minutter) {
                    // Ny rekord!
                    const updateSql = `INSERT OR REPLACE INTO kondisjon_rekorder 
                                      (distanse_km, beste_tid_minutter, dato) VALUES (?, ?, ?)`;
                    
                    db.run(updateSql, [distanse, tid_minutter, dato], (err) => {
                        if (err) console.error('Feil ved oppdatering av rekord:', err);
                        else console.log(`Ny rekord for ${distanse}km: ${tid_minutter} minutter!`);
                    });
                }
            });
        }
    });
}

// Automatisk oppdater rekorder etter ny økt
function updateRecordsAfterWorkout(oktId) {
    // Kall rekorder API for å oppdatere alle potensielle rekorder
    const http = require('http');
    const postData = JSON.stringify({ okt_id: oktId });
    
    const options = {
        hostname: process.env.HOST || 'localhost',
        port: process.env.PORT || 3000,
        path: '/api/rekorder/oppdater',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.nye_rekorder && result.nye_rekorder.length > 0) {
                    console.log('🏆 Nye rekorder oppnådd:', result.nye_rekorder.join(', '));
                }
            } catch (e) {
                console.error('Feil ved parsing av rekorder respons:', e);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error('Feil ved oppdatering av rekorder:', e);
    });
    
    req.write(postData);
    req.end();
}

module.exports = router;
