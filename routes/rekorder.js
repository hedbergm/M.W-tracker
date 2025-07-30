const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Hent alle personlige rekorder
router.get('/', (req, res) => {
    const targetDistances = [3, 5, 10, 15]; // km
    const rekorder = {};
    let completed = 0;
    
    targetDistances.forEach(distanse => {
        // Finn beste tid for denne distansen (eksakt match eller interpoler)
        findBestTimeForDistance(distanse, (err, record) => {
            if (err) {
                console.error(`Feil ved henting av rekord for ${distanse}km:`, err);
                rekorder[`${distanse}km`] = null;
            } else {
                rekorder[`${distanse}km`] = record;
            }
            
            completed++;
            if (completed === targetDistances.length) {
                res.json(rekorder);
            }
        });
    });
});

// Beregn beste tid for en spesifikk distanse
function findBestTimeForDistance(targetKm, callback) {
    // Først, sjekk om vi har eksakte matcher
    const exactSql = `
        SELECT 
            k.*,
            (k.tid_minutter / k.km) as tempo_per_km
        FROM kondisjon k 
        WHERE k.km = ?
        ORDER BY k.tid_minutter ASC
        LIMIT 1
    `;
    
    db.get(exactSql, [targetKm], (err, exactMatch) => {
        if (err) {
            return callback(err);
        }
        
        if (exactMatch) {
            return callback(null, {
                distanse_km: targetKm,
                beste_tid_minutter: exactMatch.tid_minutter,
                tempo_per_km: exactMatch.tempo_per_km,
                dato: exactMatch.dato,
                type: 'eksakt',
                okt_id: exactMatch.id
            });
        }
        
        // Hvis ingen eksakt match, interpoler fra nærmeste distanser
        interpolateTimeForDistance(targetKm, callback);
    });
}

// Interpoler tid basert på nærmeste distanser
function interpolateTimeForDistance(targetKm, callback) {
    const sql = `
        WITH best_times AS (
            SELECT 
                km,
                MIN(tid_minutter) as beste_tid,
                MIN(tid_minutter / km) as beste_tempo,
                dato,
                id
            FROM kondisjon 
            WHERE km > 0
            GROUP BY km
        )
        SELECT * FROM best_times
        ORDER BY ABS(km - ?) ASC
        LIMIT 3
    `;
    
    db.all(sql, [targetKm], (err, rows) => {
        if (err) {
            return callback(err);
        }
        
        if (rows.length === 0) {
            return callback(null, null);
        }
        
        // Bruk beste tempo til å estimere tid
        const bestTempo = Math.min(...rows.map(r => r.beste_tempo));
        const estimatedTime = Math.round(bestTempo * targetKm);
        
        // Finn nærmeste økt for referanse
        const closestOkt = rows[0];
        
        callback(null, {
            distanse_km: targetKm,
            beste_tid_minutter: estimatedTime,
            tempo_per_km: bestTempo,
            dato: closestOkt.dato,
            type: 'estimert',
            okt_id: closestOkt.id,
            basert_pa: `${closestOkt.km}km økt`
        });
    });
}

// Oppdater rekorder etter ny kondisjon økt
router.post('/oppdater', (req, res) => {
    const { okt_id } = req.body;
    
    if (!okt_id) {
        return res.status(400).json({ error: 'Mangler økt ID' });
    }
    
    // Hent økt data
    const sql = `SELECT * FROM kondisjon WHERE id = ?`;
    
    db.get(sql, [okt_id], (err, okt) => {
        if (err) {
            console.error('Feil ved henting av økt:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        if (!okt) {
            return res.status(404).json({ error: 'Økt ikke funnet' });
        }
        
        // Sjekk om dette er en ny rekord for denne distansen
        const targetDistances = [3, 5, 10, 15];
        let nyeRekorder = [];
        
        // Sjekk eksakt match
        if (targetDistances.includes(okt.km)) {
            checkAndUpdateRecord(okt, okt.km, (err, updated) => {
                if (updated) nyeRekorder.push(`${okt.km}km`);
                
                // Også sjekk andre distanser for potensielle forbedringer
                checkOtherDistances(okt, nyeRekorder, (err, allRekorder) => {
                    res.json({ 
                        message: 'Rekorder oppdatert',
                        nye_rekorder: allRekorder 
                    });
                });
            });
        } else {
            checkOtherDistances(okt, nyeRekorder, (err, allRekorder) => {
                res.json({ 
                    message: 'Rekorder sjekket',
                    nye_rekorder: allRekorder 
                });
            });
        }
    });
});

function checkAndUpdateRecord(okt, distanse, callback) {
    const checkSql = `
        SELECT * FROM kondisjon_rekorder 
        WHERE distanse_km = ? 
        ORDER BY beste_tid_minutter ASC 
        LIMIT 1
    `;
    
    db.get(checkSql, [distanse], (err, existing) => {
        if (err) {
            return callback(err);
        }
        
        const currentTempo = okt.tid_minutter / okt.km;
        const estimatedTime = Math.round(currentTempo * distanse);
        
        if (!existing || estimatedTime < existing.beste_tid_minutter) {
            // Ny rekord!
            const insertSql = `
                INSERT OR REPLACE INTO kondisjon_rekorder 
                (distanse_km, beste_tid_minutter, tempo_per_km, okt_id, dato, automatisk)
                VALUES (?, ?, ?, ?, ?, 1)
            `;
            
            db.run(insertSql, [distanse, estimatedTime, currentTempo, okt.id, okt.dato], function(err) {
                if (err) {
                    return callback(err);
                }
                callback(null, true);
            });
        } else {
            callback(null, false);
        }
    });
}

function checkOtherDistances(okt, nyeRekorder, callback) {
    const targetDistances = [3, 5, 10, 15];
    let completed = 0;
    
    targetDistances.forEach(distanse => {
        if (distanse === okt.km) {
            completed++;
            if (completed === targetDistances.length) {
                callback(null, nyeRekorder);
            }
            return;
        }
        
        checkAndUpdateRecord(okt, distanse, (err, updated) => {
            if (updated) nyeRekorder.push(`${distanse}km (estimert)`);
            
            completed++;
            if (completed === targetDistances.length) {
                callback(null, nyeRekorder);
            }
        });
    });
}

// Hent rekordhistorikk for en distanse
router.get('/historikk/:distanse', (req, res) => {
    const { distanse } = req.params;
    
    const sql = `
        SELECT 
            kr.*,
            k.dato as okt_dato,
            k.km as faktisk_km,
            k.tid_minutter as faktisk_tid
        FROM kondisjon_rekorder kr
        LEFT JOIN kondisjon k ON kr.okt_id = k.id
        WHERE kr.distanse_km = ?
        ORDER BY kr.created_at DESC
        LIMIT 10
    `;
    
    db.all(sql, [parseFloat(distanse)], (err, rows) => {
        if (err) {
            console.error('Database feil ved henting av rekordhistorikk:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        res.json(rows);
    });
});

// Slett rekord (for manual rydding)
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = `DELETE FROM kondisjon_rekorder WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('Database feil ved sletting av rekord:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Rekord ikke funnet' });
        }
        
        res.json({ message: 'Rekord slettet!' });
    });
});

// Hent styrkerekorder per aktivitet
router.get('/styrke', (req, res) => {
    const sql = `
        SELECT 
            a.id,
            a.navn as aktivitet_navn,
            a.maks_vekt,
            a.maks_vekt_dato,
            MAX(so.vekt) as beste_vekt_ovelse,
            MAX(so.vekt * (36.0 / (37.0 - so.reps))) as beste_1rm,
            COUNT(DISTINCT sok.id) as antall_okter,
            COUNT(so.id) as antall_ovelser,
            AVG(so.vekt) as gjennomsnitt_vekt,
            so_best.dato as beste_vekt_dato,
            so_best.sett as beste_vekt_sett,
            so_best.reps as beste_vekt_reps,
            so_1rm.dato as beste_1rm_dato,
            so_1rm.sett as beste_1rm_sett,
            so_1rm.reps as beste_1rm_reps,
            so_1rm.vekt as beste_1rm_vekt
        FROM styrke_aktiviteter a
        LEFT JOIN styrke_ovelser so ON so.aktivitet_id = a.id
        LEFT JOIN styrke_okter sok ON so.okt_id = sok.id
        LEFT JOIN (
            SELECT 
                so1.*,
                sok1.dato
            FROM styrke_ovelser so1
            JOIN styrke_okter sok1 ON so1.okt_id = sok1.id
            WHERE (so1.aktivitet_id, so1.vekt) IN (
                SELECT aktivitet_id, MAX(vekt)
                FROM styrke_ovelser
                GROUP BY aktivitet_id
            )
        ) so_best ON so_best.aktivitet_id = a.id AND so_best.vekt = (
            SELECT MAX(vekt) FROM styrke_ovelser WHERE aktivitet_id = a.id
        )
        LEFT JOIN (
            SELECT 
                so2.*,
                sok2.dato,
                (so2.vekt * (36.0 / (37.0 - so2.reps))) as calc_1rm
            FROM styrke_ovelser so2
            JOIN styrke_okter sok2 ON so2.okt_id = sok2.id
            WHERE (so2.aktivitet_id, (so2.vekt * (36.0 / (37.0 - so2.reps)))) IN (
                SELECT 
                    aktivitet_id, 
                    MAX(vekt * (36.0 / (37.0 - reps)))
                FROM styrke_ovelser
                WHERE reps > 0 AND reps < 37
                GROUP BY aktivitet_id
            )
        ) so_1rm ON so_1rm.aktivitet_id = a.id
        GROUP BY a.id, a.navn, a.maks_vekt, a.maks_vekt_dato
        HAVING antall_ovelser > 0
        ORDER BY a.navn
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Feil ved henting av styrkerekorder:', err);
            return res.status(500).json({ error: 'Kunne ikke hente styrkerekorder' });
        }
        
        res.json(rows);
    });
});

module.exports = router;
