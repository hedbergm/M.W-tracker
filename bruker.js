const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Hent brukerprofil
router.get('/', (req, res) => {
    db.get('SELECT * FROM bruker ORDER BY updated_at DESC LIMIT 1', (err, row) => {
        if (err) {
            console.error('Feil ved henting av brukerprofil:', err);
            return res.status(500).json({ error: 'Databasefeil' });
        }
        res.json(row || null);
    });
});

// Opprett eller oppdater brukerprofil
router.post('/', (req, res) => {
    const { vekt, hoyde, alder, kjonn, aktivitetsniva } = req.body;
    
    if (!vekt || !hoyde) {
        return res.status(400).json({ error: 'Vekt og høyde er påkrevd' });
    }

    // Sjekk om bruker allerede eksisterer
    db.get('SELECT id FROM bruker ORDER BY updated_at DESC LIMIT 1', (err, existingUser) => {
        if (err) {
            console.error('Feil ved sjekk av eksisterende bruker:', err);
            return res.status(500).json({ error: 'Databasefeil' });
        }

        if (existingUser) {
            // Oppdater eksisterende bruker
            db.run(`UPDATE bruker SET 
                vekt = ?, hoyde = ?, alder = ?, kjonn = ?, aktivitetsniva = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [vekt, hoyde, alder, kjonn, aktivitetsniva, existingUser.id],
                function(err) {
                    if (err) {
                        console.error('Feil ved oppdatering av brukerprofil:', err);
                        return res.status(500).json({ error: 'Databasefeil' });
                    }
                    res.json({ id: existingUser.id, message: 'Brukerprofil oppdatert' });
                }
            );
        } else {
            // Opprett ny bruker
            db.run(`INSERT INTO bruker (vekt, hoyde, alder, kjonn, aktivitetsniva) 
                VALUES (?, ?, ?, ?, ?)`,
                [vekt, hoyde, alder, kjonn, aktivitetsniva],
                function(err) {
                    if (err) {
                        console.error('Feil ved opprettelse av brukerprofil:', err);
                        return res.status(500).json({ error: 'Databasefeil' });
                    }
                    res.json({ id: this.lastID, message: 'Brukerprofil opprettet' });
                }
            );
        }
    });
});

// Beregn kalorier for kondisjon (løping)
router.post('/beregn-kalorier/kondisjon', (req, res) => {
    const { km, tid_minutter, vekt } = req.body;
    
    if (!km || !tid_minutter || !vekt) {
        return res.status(400).json({ error: 'Mangler nødvendige data for kaloriberegning' });
    }
    
    // Beregning basert på MET-verdier for løping
    const hastighet = km / (tid_minutter / 60); // km/t
    let met = 8.0; // Standard MET for moderat løping
    
    if (hastighet < 6.4) met = 6.0;      // Lett jogging
    else if (hastighet < 8.0) met = 8.3;  // Moderat løping
    else if (hastighet < 9.7) met = 9.8;  // Rask løping
    else if (hastighet < 11.3) met = 11.0; // Løping 11+ km/t
    else if (hastighet < 12.9) met = 11.8; // Løping 12+ km/t
    else if (hastighet < 14.5) met = 12.8; // Løping 14+ km/t
    else met = 14.5; // Meget rask løping
    
    // Kalorier = MET × vekt (kg) × tid (timer)
    const kalorier = Math.round(met * vekt * (tid_minutter / 60));
    
    res.json({ kalorier, met, hastighet: hastighet.toFixed(1) });
});

// Beregn kalorier for styrketrening
router.post('/beregn-kalorier/styrke', (req, res) => {
    const { tid_minutter, vekt, intensitet } = req.body;
    
    if (!tid_minutter || !vekt) {
        return res.status(400).json({ error: 'Mangler nødvendige data for kaloriberegning' });
    }
    
    // MET-verdier for styrketrening
    let met = 3.5; // Standard lett styrketrening
    
    switch (intensitet) {
        case 'lett':
            met = 3.5;
            break;
        case 'moderat':
            met = 5.0;
            break;
        case 'intensiv':
            met = 6.0;
            break;
        case 'meget_intensiv':
            met = 8.0;
            break;
        default:
            met = 5.0; // Default moderat
    }
    
    // Kalorier = MET × vekt (kg) × tid (timer)
    const kalorier = Math.round(met * vekt * (tid_minutter / 60));
    
    res.json({ kalorier, met });
});

// Beregn kalorier for lagidrett
router.post('/beregn-kalorier/lagidrett', (req, res) => {
    const { sport, tid_minutter, vekt } = req.body;
    
    if (!sport || !tid_minutter || !vekt) {
        return res.status(400).json({ error: 'Mangler nødvendige data for kaloriberegning' });
    }
    
    // MET-verdier for forskjellige sporter
    const sportMET = {
        'fotball': 7.0,
        'basketball': 6.5,
        'volleyball': 4.0,
        'håndball': 8.0,
        'tennis': 7.3,
        'badminton': 5.5,
        'squash': 12.0,
        'hockey': 8.0,
        'svømming': 6.0,
        'sykling': 7.5,
        'golf': 4.8,
        'bordtennis': 4.0
    };
    
    const met = sportMET[sport.toLowerCase()] || 6.0; // Default 6.0 hvis sport ikke finnes
    
    // Kalorier = MET × vekt (kg) × tid (timer)
    const kalorier = Math.round(met * vekt * (tid_minutter / 60));
    
    res.json({ kalorier, met });
});

module.exports = router;
