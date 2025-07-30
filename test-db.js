const db = require('./database/database');

// Sjekk hvilke tabeller som finnes
db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
    if (err) {
        console.error('Feil:', err);
    } else {
        console.log('Tabeller i databasen:');
        rows.forEach(row => console.log(' -', row.name));
    }
    
    // Test å hente treningsøkter
    db.all('SELECT * FROM styrke_okter', [], (err, rows) => {
        if (err) {
            console.error('Feil ved henting av treningsøkter:', err.message);
        } else {
            console.log('Treningsøkter:', rows);
        }
        process.exit();
    });
});
