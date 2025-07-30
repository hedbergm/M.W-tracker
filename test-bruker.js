const db = require('./database/database');

console.log('Testing bruker table...');

// Test om tabellen eksisterer
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bruker'", (err, row) => {
    if (err) {
        console.error('Error checking table:', err);
        return;
    }
    
    if (row) {
        console.log('Bruker table exists!');
        
        // Test insert
        console.log('Testing insert...');
        db.run(`INSERT INTO bruker (vekt, hoyde) VALUES (?, ?)`, [75, 180], function(err) {
            if (err) {
                console.error('Insert error:', err);
            } else {
                console.log('Insert successful, ID:', this.lastID);
                
                // Test select
                db.get('SELECT * FROM bruker WHERE id = ?', [this.lastID], (err, row) => {
                    if (err) {
                        console.error('Select error:', err);
                    } else {
                        console.log('Select result:', row);
                    }
                    process.exit(0);
                });
            }
        });
    } else {
        console.log('Bruker table does not exist!');
        process.exit(1);
    }
});
