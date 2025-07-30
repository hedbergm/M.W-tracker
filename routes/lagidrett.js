const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Hent alle lagidrett treninger
router.get('/', (req, res) => {
    const sql = `SELECT * FROM lagidrett ORDER BY dato DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Legg til ny lagidrett trening
router.post('/', (req, res) => {
    const { sport, dato, tid_minutter, snittpuls, makspuls, kalorier, kommentar } = req.body;
    
    const sql = `INSERT INTO lagidrett (sport, dato, tid_minutter, snittpuls, makspuls, kalorier, kommentar) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [sport, dato, tid_minutter, snittpuls, makspuls, kalorier, kommentar], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            message: 'Lagidrett trening lagt til!'
        });
    });
});

// Hent statistikk for en bestemt sport
router.get('/statistikk/:sport', (req, res) => {
    const sport = req.params.sport;
    const sql = `SELECT 
                    COUNT(*) as antall_treninger,
                    AVG(tid_minutter) as gjennomsnitt_tid,
                    MAX(tid_minutter) as lengste_trening,
                    AVG(snittpuls) as gjennomsnitt_puls,
                    MAX(makspuls) as hoyeste_makspuls,
                    SUM(kalorier) as totale_kalorier
                 FROM lagidrett 
                 WHERE sport = ?`;
    
    db.get(sql, [sport], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Hent alle unike sporter
router.get('/sporter', (req, res) => {
    const sql = `SELECT DISTINCT sport FROM lagidrett ORDER BY sport`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => row.sport));
    });
});

// Slett lagidrett trening
router.delete('/:id', (req, res) => {
    const sql = `DELETE FROM lagidrett WHERE id = ?`;
    
    db.run(sql, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Lagidrett trening slettet!' });
    });
});

// Hent treninger for en bestemt sport
router.get('/sport/:sport', (req, res) => {
    const sport = req.params.sport;
    const sql = `SELECT * FROM lagidrett WHERE sport = ? ORDER BY dato DESC`;
    
    db.all(sql, [sport], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

module.exports = router;
