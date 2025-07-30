const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Hent alle aktive mål
router.get('/aktive', (req, res) => {
    const sql = `
        SELECT * FROM mal 
        WHERE status = 'aktiv' 
        ORDER BY frist ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Database feil ved henting av mål:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        res.json(rows);
    });
});

// Hent alle oppnådde badges for bruker
router.get('/badges', (req, res) => {
    const sql = `
        SELECT b.*, ub.oppnadd_at, ub.detaljer 
        FROM badges b
        LEFT JOIN bruker_badges ub ON b.id = ub.badge_id
        ORDER BY b.type, ub.oppnadd_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Database feil ved henting av badges:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        // Strukturer data for frontend
        const badges = {
            oppnaadde: rows.filter(row => row.oppnadd_at),
            tilgjengelige: rows.filter(row => !row.oppnadd_at)
        };
        
        res.json(badges);
    });
});

// Opprett nytt mål
router.post('/', (req, res) => {
    const { type, beskrivelse, maal_verdi, enhet, frist, aktivitet_detaljer } = req.body;
    
    if (!type || !maal_verdi || !enhet || !frist) {
        return res.status(400).json({ error: 'Mangler påkrevde felter' });
    }
    
    const sql = `
        INSERT INTO mal (type, beskrivelse, maal_verdi, enhet, frist, aktivitet_detaljer)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [type, beskrivelse, maal_verdi, enhet, frist, aktivitet_detaljer], function(err) {
        if (err) {
            console.error('Database feil ved oppretting av mål:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        res.json({ 
            id: this.lastID,
            message: 'Mål opprettet!' 
        });
    });
});

// Oppdater fremgang på mål
router.put('/fremgang/:id', (req, res) => {
    const { id } = req.params;
    const { nuvaerende_verdi } = req.body;
    
    const sql = `
        UPDATE mal 
        SET nuvaerende_verdi = ?,
            status = CASE 
                WHEN ? >= maal_verdi THEN 'fullfort'
                WHEN date('now') > frist THEN 'utlopt'
                ELSE 'aktiv'
            END,
            oppnadd_at = CASE 
                WHEN ? >= maal_verdi THEN datetime('now')
                ELSE oppnadd_at
            END
        WHERE id = ?
    `;
    
    db.run(sql, [nuvaerende_verdi, nuvaerende_verdi, nuvaerende_verdi, id], function(err) {
        if (err) {
            console.error('Database feil ved oppdatering av mål:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Mål ikke funnet' });
        }
        
        res.json({ message: 'Fremgang oppdatert!' });
    });
});

// Slett mål
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = `DELETE FROM mal WHERE id = ?`;
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('Database feil ved sletting av mål:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Mål ikke funnet' });
        }
        
        res.json({ message: 'Mål slettet!' });
    });
});

// Gi badge til bruker
router.post('/badge/:badgeId', (req, res) => {
    const { badgeId } = req.params;
    const { detaljer } = req.body;
    
    // Sjekk om badge allerede er oppnådd
    const checkSql = `SELECT id FROM bruker_badges WHERE badge_id = ?`;
    
    db.get(checkSql, [badgeId], (err, existing) => {
        if (err) {
            console.error('Database feil ved sjekk av badge:', err);
            return res.status(500).json({ error: 'Database feil' });
        }
        
        if (existing) {
            return res.status(400).json({ error: 'Badge allerede oppnådd' });
        }
        
        const insertSql = `INSERT INTO bruker_badges (badge_id, detaljer) VALUES (?, ?)`;
        
        db.run(insertSql, [badgeId, detaljer], function(err) {
            if (err) {
                console.error('Database feil ved tildeling av badge:', err);
                return res.status(500).json({ error: 'Database feil' });
            }
            
            // Hent badge info for respons
            const badgeSql = `SELECT * FROM badges WHERE id = ?`;
            db.get(badgeSql, [badgeId], (err, badge) => {
                if (err) {
                    console.error('Database feil ved henting av badge:', err);
                    return res.status(500).json({ error: 'Database feil' });
                }
                
                res.json({ 
                    message: `Badge "${badge.navn}" oppnådd!`,
                    badge: badge
                });
            });
        });
    });
});

// Hent månedlig fremgang
router.get('/fremgang', (req, res) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Hent statistikk for inneværende måned
    const stats = {
        kondisjon: { sql: `SELECT COUNT(*) as antall, SUM(km) as total_km, SUM(kalorier) as kalorier FROM kondisjon WHERE date(dato) >= ? AND date(dato) < date(?, '+1 month')`, params: [currentMonth + '-01', currentMonth + '-01'] },
        styrke: { sql: `SELECT COUNT(*) as antall, SUM(kalorier) as kalorier FROM styrke_okter WHERE date(dato) >= ? AND date(dato) < date(?, '+1 month')`, params: [currentMonth + '-01', currentMonth + '-01'] },
        lagidrett: { sql: `SELECT COUNT(*) as antall, SUM(tid_minutter) as total_tid, SUM(kalorier) as kalorier FROM lagidrett WHERE date(dato) >= ? AND date(dato) < date(?, '+1 month')`, params: [currentMonth + '-01', currentMonth + '-01'] }
    };
    
    const results = {};
    const categories = Object.keys(stats);
    let completed = 0;
    
    categories.forEach(category => {
        db.get(stats[category].sql, stats[category].params, (err, row) => {
            if (err) {
                console.error(`Database feil ved henting av ${category} statistikk:`, err);
                results[category] = { antall: 0, error: true };
            } else {
                results[category] = row || { antall: 0 };
            }
            
            completed++;
            if (completed === categories.length) {
                res.json(results);
            }
        });
    });
});

module.exports = router;
