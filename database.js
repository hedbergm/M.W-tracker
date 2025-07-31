const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'workout_tracker.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Bruker (User profile) table
    db.run(`CREATE TABLE IF NOT EXISTS bruker (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vekt REAL NOT NULL,
        hoyde INTEGER NOT NULL,
        alder INTEGER,
        kjonn TEXT CHECK(kjonn IN ('mann', 'kvinne')),
        aktivitetsniva TEXT CHECK(aktivitetsniva IN ('lav', 'moderat', 'hoy')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Kondisjon (Cardio) table
    db.run(`CREATE TABLE IF NOT EXISTS kondisjon (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dato DATE NOT NULL,
        km REAL NOT NULL,
        tid_minutter INTEGER NOT NULL,
        snittpuls INTEGER,
        hoydemeter REAL,
        stigningsprosent REAL,
        kalorier INTEGER,
        kommentar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Styrke (Strength) tables
    db.run(`CREATE TABLE IF NOT EXISTS styrke_aktiviteter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        navn TEXT NOT NULL UNIQUE,
        beskrivelse TEXT,
        maks_vekt REAL DEFAULT 0,
        maks_vekt_dato DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Styrke treningsøkter (workout sessions)
    db.run(`CREATE TABLE IF NOT EXISTS styrke_okter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dato DATE NOT NULL,
        navn TEXT,
        kommentar TEXT,
        kalorier INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Individuelle øvelser i en treningsøkt
    db.run(`CREATE TABLE IF NOT EXISTS styrke_ovelser (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        okt_id INTEGER NOT NULL,
        aktivitet_id INTEGER NOT NULL,
        sett INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        vekt REAL NOT NULL,
        tid_minutter INTEGER,
        kommentar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okt_id) REFERENCES styrke_okter (id) ON DELETE CASCADE,
        FOREIGN KEY (aktivitet_id) REFERENCES styrke_aktiviteter (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS styrke_rekorder (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        aktivitet_id INTEGER NOT NULL,
        vekt REAL NOT NULL,
        reps INTEGER NOT NULL,
        dato DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (aktivitet_id) REFERENCES styrke_aktiviteter (id)
    )`);

    // Lagidrett (Team Sports) table
    db.run(`CREATE TABLE IF NOT EXISTS lagidrett (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sport TEXT NOT NULL,
        dato DATE NOT NULL,
        tid_minutter INTEGER NOT NULL,
        snittpuls INTEGER,
        makspuls INTEGER,
        kalorier INTEGER,
        kommentar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Kondisjon rekorder table (forbedret)
    db.run(`CREATE TABLE IF NOT EXISTS kondisjon_rekorder (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        distanse_km REAL NOT NULL,
        beste_tid_minutter INTEGER NOT NULL,
        tempo_per_km REAL NOT NULL,
        okt_id INTEGER,
        dato DATE NOT NULL,
        automatisk BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okt_id) REFERENCES kondisjon (id)
    )`);
    
    // Legg til indeks for raskere søk
    db.run(`CREATE INDEX IF NOT EXISTS idx_kondisjon_rekorder_distanse ON kondisjon_rekorder (distanse_km)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_kondisjon_distanse ON kondisjon (km)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_kondisjon_tid ON kondisjon (tid_minutter)`);
    
    // Bruker profil table
    db.run(`CREATE TABLE IF NOT EXISTS bruker (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vekt REAL NOT NULL,
        hoyde INTEGER NOT NULL,
        alder INTEGER,
        kjonn TEXT,
        aktivitetsniva TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Mål (Goals) table
    db.run(`CREATE TABLE IF NOT EXISTS mal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        beskrivelse TEXT,
        maal_verdi REAL NOT NULL,
        nuvaerende_verdi REAL DEFAULT 0,
        enhet TEXT NOT NULL,
        frist DATE NOT NULL,
        status TEXT DEFAULT 'aktiv',
        aktivitet_detaljer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        oppnadd_at DATETIME
    )`);

    // Badges table
    db.run(`CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        navn TEXT NOT NULL UNIQUE,
        beskrivelse TEXT NOT NULL,
        type TEXT NOT NULL,
        kriterium TEXT NOT NULL,
        ikon TEXT DEFAULT '🏆',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bruker badges (oppnådde badges)
    db.run(`CREATE TABLE IF NOT EXISTS bruker_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_id INTEGER NOT NULL,
        oppnadd_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        detaljer TEXT,
        FOREIGN KEY (badge_id) REFERENCES badges (id)
    )`);

    // Legg til standard badges
    const standardBadges = [
        // Første gang badges
        ['Første Løp', 'Fullført din første kondisjonstrening', 'kondisjon', 'first_kondisjon', '🏃'],
        ['Første Styrke', 'Fullført din første styrketrening', 'styrke', 'first_styrke', '💪'],
        ['Første Lagidrett', 'Fullført din første lagidrettstrening', 'lagidrett', 'first_lagidrett', '⚽'],
        
        // Frekvens og strekk badges
        ['Uke Strekk', 'Trent 7 dager på rad', 'frekvens', 'streak_7', '🔥'],
        ['To Uker Strekk', 'Trent 14 dager på rad', 'frekvens', 'streak_14', '🔥🔥'],
        ['Måned Strekk', 'Trent 30 dager på rad', 'frekvens', 'streak_30', '🔥🔥🔥'],
        ['Uke Kriger', 'Trent 5 ganger på en uke', 'frekvens', 'week_5', '⚔️'],
        ['Helg Kriger', 'Trent i helgen 5 ganger', 'frekvens', 'weekend_5', '🛡️'],
        
        // Kondisjon avstands badges
        ['5K Nybegynner', 'Løpt totalt 5 km', 'kondisjon', 'total_5k', '🥉'],
        ['10K Mester', 'Løpt totalt 10 km', 'kondisjon', 'total_10k', '🎯'],
        ['Halvmaraton', 'Løpt totalt 21 km', 'kondisjon', 'total_21k', '🏃‍♂️'],
        ['50K Mester', 'Løpt totalt 50 km', 'kondisjon', 'total_50k', '🏆'],
        ['100K Mester', 'Løpt totalt 100 km', 'kondisjon', 'total_100k', '👑'],
        ['Maraton Konge', 'Løpt totalt 200 km', 'kondisjon', 'total_200k', '🔱'],
        ['Ultra Løper', 'Løpt totalt 500 km', 'kondisjon', 'total_500k', '🌟'],
        
        // Kondisjon tempo badges
        ['Tempo Mester', 'Løpt under 5:00 min/km', 'kondisjon', 'tempo_5min', '⚡'],
        ['Racer', 'Løpt under 4:30 min/km', 'kondisjon', 'tempo_430', '🏎️'],
        ['Sprinter', 'Løpt under 4:00 min/km', 'kondisjon', 'tempo_4min', '💨'],
        ['Usain Bolt', 'Løpt under 3:30 min/km', 'kondisjon', 'tempo_330', '🚀'],
        
        // Kondisjon enkelt økter
        ['5K Enkel', 'Løpt 5 km i en økt', 'kondisjon', 'single_5k', '🎖️'],
        ['10K Enkel', 'Løpt 10 km i en økt', 'kondisjon', 'single_10k', '🏅'],
        ['15K Enkel', 'Løpt 15 km i en økt', 'kondisjon', 'single_15k', '🥇'],
        ['Halvmaraton Enkelt', 'Løpt 21 km i en økt', 'kondisjon', 'single_21k', '👑'],
        
        // Styrke badges
        ['Styrke Veteran', '50 styrketreninger fullført', 'styrke', 'styrke_50', '🏋️'],
        ['Styrke Mester', '100 styrketreninger fullført', 'styrke', 'styrke_100', '🏋️‍♂️'],
        ['Styrke Gud', '200 styrketreninger fullført', 'styrke', 'styrke_200', '🦍'],
        ['Vekt Løfter', 'Løftet totalt 1000 kg', 'styrke', 'total_1000kg', '🏗️'],
        ['Kraftpakke', 'Løftet totalt 5000 kg', 'styrke', 'total_5000kg', '🦏'],
        ['Styrke Titan', 'Løftet totalt 10000 kg', 'styrke', 'total_10000kg', '🗿'],
        ['Sett Samler', 'Fullført 500 sett', 'styrke', 'sets_500', '📊'],
        ['Rep Mester', 'Fullført 5000 repetisjoner', 'styrke', 'reps_5000', '🔢'],
        
        // Lagidrett badges
        ['Sport Entusiast', '10 lagidrett økter fullført', 'lagidrett', 'lagidrett_10', '🏈'],
        ['Lagspiller', '25 lagidrett økter fullført', 'lagidrett', 'lagidrett_25', '🏐'],
        ['Sport Mester', '50 lagidrett økter fullført', 'lagidrett', 'lagidrett_50', '🏀'],
        ['Allsidig Atlet', 'Prøvd 3 forskjellige sporter', 'lagidrett', 'sports_3', '🎾'],
        ['Sport Samler', 'Prøvd 5 forskjellige sporter', 'lagidrett', 'sports_5', '⛳'],
        
        // Kalori badges
        ['Kalori Starter', 'Forbrent 1,000 kalorier totalt', 'kalorier', 'kalorier_1k', '🔥'],
        ['Kalori Brenner', 'Forbrent 10,000 kalorier totalt', 'kalorier', 'kalorier_10k', '🔥🔥'],
        ['Kalori Maskin', 'Forbrent 25,000 kalorier totalt', 'kalorier', 'kalorier_25k', '🔥🔥🔥'],
        ['Kalori Inferno', 'Forbrent 50,000 kalorier totalt', 'kalorier', 'kalorier_50k', '🌋'],
        ['Kalori Støvsuger', 'Forbrent 100,000 kalorier totalt', 'kalorier', 'kalorier_100k', '⚡🔥'],
        ['Mega Forbrenning', 'Forbrent 1000+ kalorier i en økt', 'kalorier', 'single_1000cal', '💥'],
        
        // Rekord og progresjon badges
        ['PR Jeger', 'Satt 10 personlige rekorder', 'rekord', 'pr_10', '📈'],
        ['Rekord Breaker', 'Satt 25 personlige rekorder', 'rekord', 'pr_25', '📊'],
        ['Progresjon Mester', 'Satt 50 personlige rekorder', 'rekord', 'pr_50', '🚀'],
        
        // Tid og varighet badges
        ['Tidtaker', 'Trent totalt 10 timer', 'tid', 'time_10h', '⏰'],
        ['Maraton Tid', 'Trent totalt 50 timer', 'tid', 'time_50h', '⏲️'],
        ['Tid Mester', 'Trent totalt 100 timer', 'tid', 'time_100h', '🕰️'],
        ['Tid Gud', 'Trent totalt 200 timer', 'tid', 'time_200h', '⌚'],
        ['Lang Økt', 'Trent 2+ timer i en økt', 'tid', 'long_2h', '🏃‍♀️'],
        ['Ultra Økt', 'Trent 3+ timer i en økt', 'tid', 'long_3h', '🏃‍♂️💨'],
        
        // Spesielle badges
        ['Morgenfugl', 'Trent før 07:00 - 10 ganger', 'spesiell', 'morning_10', '🌅'],
        ['Nattugle', 'Trent etter 22:00 - 10 ganger', 'spesiell', 'night_10', '🦉'],
        ['Regn Kriger', 'Trent utendørs i dårlig vær', 'spesiell', 'rain_warrior', '🌧️'],
        ['Påskehare', 'Trent på påskedag', 'spesiell', 'easter', '🐰'],
        ['Julenisse', 'Trent på julaften', 'spesiell', 'christmas', '🎅'],
        ['Nyttårs Helt', 'Trent på nyttårsdag', 'spesiell', 'newyear', '🎊'],
        ['Konsistent', 'Trent samme dag i uken 10 ganger', 'spesiell', 'consistent_10', '📅'],
        ['Allsidig', 'Alle tre treningstyper samme uke', 'spesiell', 'all_types_week', '🎯'],
        
        // Motivasjons badges
        ['Comeback Kid', 'Trent etter 30 dagers pause', 'motivasjon', 'comeback_30', '💪✨'],
        ['Dedikert', 'Trent 100 ganger totalt', 'motivasjon', 'sessions_100', '🎖️'],
        ['Livsstil', 'Trent 365 ganger totalt', 'motivasjon', 'sessions_365', '🏆👑'],
        ['Inspirasjon', 'Trent 500 ganger totalt', 'motivasjon', 'sessions_500', '🌟�']
    ];

    const insertBadge = db.prepare(`INSERT OR IGNORE INTO badges (navn, beskrivelse, type, kriterium, ikon) VALUES (?, ?, ?, ?, ?)`);
    standardBadges.forEach(badge => {
        insertBadge.run(badge);
    });
    insertBadge.finalize();
    
    // Migrasjon: Legg til nye kolonner hvis de ikke finnes
    db.run(`ALTER TABLE kondisjon ADD COLUMN kalorier INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Feil ved tillegg av kalorier kolonne til kondisjon:', err.message);
        }
    });
    
    db.run(`ALTER TABLE styrke_okter ADD COLUMN kalorier INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Feil ved tillegg av kalorier kolonne til styrke_okter:', err.message);
        }
    });
    
    db.run(`ALTER TABLE styrke_aktiviteter ADD COLUMN maks_vekt REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Feil ved tillegg av maks_vekt kolonne:', err.message);
        }
    });
    
    db.run(`ALTER TABLE styrke_aktiviteter ADD COLUMN maks_vekt_dato DATE`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Feil ved tillegg av maks_vekt_dato kolonne:', err.message);
        }
    });
    
    db.run(`ALTER TABLE styrke_ovelser ADD COLUMN tid_minutter INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Feil ved tillegg av tid_minutter kolonne:', err.message);
        }
    });
});

module.exports = db;
