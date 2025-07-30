const express = require('express');
const router = express.Router();
const db = require('../database/database');

// AKTIVITETER ROUTES

// Hent alle styrke aktiviteter
router.get('/aktiviteter', (req, res) => {
    const sql = `SELECT * FROM styrke_aktiviteter ORDER BY navn`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Legg til ny aktivitet
router.post('/aktiviteter', (req, res) => {
    const { navn, beskrivelse } = req.body;
    
    const sql = `INSERT INTO styrke_aktiviteter (navn, beskrivelse) VALUES (?, ?)`;
    
    db.run(sql, [navn, beskrivelse], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            message: 'Aktivitet opprettet!'
        });
    });
});

// Slett aktivitet
router.delete('/aktiviteter/:id', (req, res) => {
    const sql = `DELETE FROM styrke_aktiviteter WHERE id = ?`;
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Aktivitet slettet!' });
    });
});

// Oppdater maks vekt for aktivitet
router.put('/aktiviteter/:id/maks', (req, res) => {
    const { maks_vekt } = req.body;
    const aktivitetId = req.params.id;
    const dato = new Date().toISOString().split('T')[0];
    
    const sql = `UPDATE styrke_aktiviteter SET maks_vekt = ?, maks_vekt_dato = ? WHERE id = ?`;
    
    db.run(sql, [maks_vekt, dato, aktivitetId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Maks vekt oppdatert!' });
    });
});

// TRENINGSØKTER ROUTES

// Hent alle styrke treningsøkter
router.get('/okter', (req, res) => {
    const sql = `SELECT so.*, 
                 COUNT(sov.id) as antall_ovelser,
                 GROUP_CONCAT(sa.navn) as aktiviteter
                 FROM styrke_okter so 
                 LEFT JOIN styrke_ovelser sov ON so.id = sov.okt_id
                 LEFT JOIN styrke_aktiviteter sa ON sov.aktivitet_id = sa.id
                 GROUP BY so.id
                 ORDER BY so.dato DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Opprett ny treningsøkt
router.post('/okter', (req, res) => {
    const { dato, navn, kommentar, kalorier, ovelser } = req.body;
    
    const sql = `INSERT INTO styrke_okter (dato, navn, kommentar, kalorier) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [dato, navn, kommentar, kalorier], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const oktId = this.lastID;
        
        // Legg til øvelser hvis de er oppgitt
        if (ovelser && ovelser.length > 0) {
            const ovelsePromises = ovelser.map(ovelse => {
                return new Promise((resolve, reject) => {
                    const ovelseSql = `INSERT INTO styrke_ovelser (okt_id, aktivitet_id, sett, reps, vekt, tid_minutter, kommentar) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    
                    db.run(ovelseSql, [oktId, ovelse.aktivitet_id, ovelse.sett, ovelse.reps, ovelse.vekt, ovelse.tid_minutter, ovelse.kommentar], function(err) {
                        if (err) reject(err);
                        else {
                            // Sjekk rekord for denne øvelsen
                            checkAndUpdateStrengthRecord(ovelse.aktivitet_id, ovelse.vekt, ovelse.reps, dato);
                            resolve();
                        }
                    });
                });
            });
            
            Promise.all(ovelsePromises)
                .then(() => {
                    res.json({
                        id: oktId,
                        message: 'Treningsøkt opprettet med øvelser!'
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: 'Feil ved lagring av øvelser: ' + err.message });
                });
        } else {
            res.json({
                id: oktId,
                message: 'Treningsøkt opprettet!'
            });
        }
    });
});

// Hent detaljer for en treningsøkt
router.get('/okter/:id', (req, res) => {
    const oktSql = `SELECT * FROM styrke_okter WHERE id = ?`;
    const ovelserSql = `SELECT sov.*, sa.navn as aktivitet_navn 
                        FROM styrke_ovelser sov 
                        JOIN styrke_aktiviteter sa ON sov.aktivitet_id = sa.id 
                        WHERE sov.okt_id = ?`;
    
    db.get(oktSql, [req.params.id], (err, okt) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!okt) {
            res.status(404).json({ error: 'Treningsøkt ikke funnet' });
            return;
        }
        
        db.all(ovelserSql, [req.params.id], (err, ovelser) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                ...okt,
                ovelser: ovelser
            });
        });
    });
});

// Legg til øvelse til eksisterende treningsøkt
router.post('/okter/:id/ovelser', (req, res) => {
    const { aktivitet_id, sett, reps, vekt, kommentar } = req.body;
    const oktId = req.params.id;
    
    // Først sjekk at økt eksisterer
    const checkSql = `SELECT dato FROM styrke_okter WHERE id = ?`;
    
    db.get(checkSql, [oktId], (err, okt) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!okt) {
            res.status(404).json({ error: 'Treningsøkt ikke funnet' });
            return;
        }
        
        const sql = `INSERT INTO styrke_ovelser (okt_id, aktivitet_id, sett, reps, vekt, kommentar) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [oktId, aktivitet_id, sett, reps, vekt, kommentar], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Sjekk om dette er en ny rekord
            checkAndUpdateStrengthRecord(aktivitet_id, vekt, reps, okt.dato);
            
            res.json({
                id: this.lastID,
                message: 'Øvelse lagt til!'
            });
        });
    });
});

// Slett treningsøkt (og alle tilhørende øvelser)
router.delete('/okter/:id', (req, res) => {
    const sql = `DELETE FROM styrke_okter WHERE id = ?`;
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Treningsøkt slettet!' });
    });
});

// Slett enkelt øvelse
router.delete('/ovelser/:id', (req, res) => {
    const sql = `DELETE FROM styrke_ovelser WHERE id = ?`;
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Øvelse slettet!' });
    });
});

// TRENINGER ROUTES (BAKOVERKOMPATIBILITET - DEPRECATED)

// TRENINGER ROUTES (BAKOVERKOMPATIBILITET - DEPRECATED)

// Hent alle styrke treninger (vis som individuelle øvelser)
router.get('/treninger', (req, res) => {
    const sql = `SELECT sov.*, sa.navn as aktivitet_navn, so.dato, so.navn as okt_navn
                 FROM styrke_ovelser sov 
                 JOIN styrke_aktiviteter sa ON sov.aktivitet_id = sa.id 
                 JOIN styrke_okter so ON sov.okt_id = so.id
                 ORDER BY so.dato DESC, sov.created_at ASC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Legg til ny styrke trening (opprett økt med én øvelse for bakoverkompatibilitet)
router.post('/treninger', (req, res) => {
    const { aktivitet_id, dato, sett, reps, vekt, kommentar } = req.body;
    
    // Opprett først en økt
    const oktSql = `INSERT INTO styrke_okter (dato, navn) VALUES (?, ?)`;
    
    db.run(oktSql, [dato, 'Rask økt'], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const oktId = this.lastID;
        
        // Legg til øvelsen
        const ovelseSql = `INSERT INTO styrke_ovelser (okt_id, aktivitet_id, sett, reps, vekt, kommentar) 
                           VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(ovelseSql, [oktId, aktivitet_id, sett, reps, vekt, kommentar], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Sjekk om dette er en ny personlig rekord
            checkAndUpdateStrengthRecord(aktivitet_id, vekt, reps, dato);
            
            res.json({
                id: this.lastID,
                message: 'Styrke trening lagt til!'
            });
        });
    });
});

// Slett styrke trening
router.delete('/treninger/:id', (req, res) => {
    const sql = `DELETE FROM styrke_ovelser WHERE id = ?`;
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Styrke trening slettet!' });
    });
});

// REKORDER ROUTES

// Hent rekorder for en aktivitet
router.get('/rekorder/:aktivitet_id', (req, res) => {
    const sql = `SELECT sr.*, sa.navn as aktivitet_navn 
                 FROM styrke_rekorder sr 
                 JOIN styrke_aktiviteter sa ON sr.aktivitet_id = sa.id 
                 WHERE sr.aktivitet_id = ? 
                 ORDER BY sr.vekt DESC`;
    
    db.all(sql, [req.params.aktivitet_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Hent alle rekorder
router.get('/rekorder', (req, res) => {
    const sql = `SELECT sr.*, sa.navn as aktivitet_navn 
                 FROM styrke_rekorder sr 
                 JOIN styrke_aktiviteter sa ON sr.aktivitet_id = sa.id 
                 ORDER BY sa.navn, sr.vekt DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Funksjon for å sjekke og oppdatere styrke rekorder
function checkAndUpdateStrengthRecord(aktivitet_id, vekt, reps, dato) {
    // Beregn 1RM (One Rep Max) ved hjelp av Brzycki formula
    const oneRepMax = vekt * (36 / (37 - reps));
    
    // Sjekk om dette er en ny rekord for denne aktiviteten
    const checkSql = `SELECT * FROM styrke_rekorder WHERE aktivitet_id = ? ORDER BY vekt DESC LIMIT 1`;
    
    db.get(checkSql, [aktivitet_id], (err, row) => {
        if (err) return;
        
        const currentOneRepMax = row ? row.vekt * (36 / (37 - row.reps)) : 0;
        
        if (!row || oneRepMax > currentOneRepMax) {
            // Ny rekord!
            const updateSql = `INSERT INTO styrke_rekorder (aktivitet_id, vekt, reps, dato) VALUES (?, ?, ?, ?)`;
            
            db.run(updateSql, [aktivitet_id, vekt, reps, dato], (err) => {
                if (err) console.error('Feil ved oppdatering av styrke rekord:', err);
                else console.log(`Ny styrke rekord for aktivitet ${aktivitet_id}: ${vekt}kg x ${reps}!`);
            });
        }
    });
}

// Hent alle øvelser for statistikk
router.get('/ovelser', (req, res) => {
    const sql = `SELECT sov.*, sa.navn as aktivitet_navn 
                 FROM styrke_ovelser sov 
                 JOIN styrke_okter sok ON sov.okt_id = sok.id 
                 JOIN styrke_aktiviteter sa ON sov.aktivitet_id = sa.id 
                 ORDER BY sok.dato DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

module.exports = router;
