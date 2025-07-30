const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const kondisjonRoutes = require('./routes/kondisjon');
const styrkeRoutes = require('./routes/styrke');
const lagidrettRoutes = require('./routes/lagidrett');
const brukerRoutes = require('./routes/bruker');
const malRoutes = require('./routes/mal');
const rekorderRoutes = require('./routes/rekorder');

app.use('/api/kondisjon', kondisjonRoutes);
app.use('/api/styrke', styrkeRoutes);
app.use('/api/lagidrett', lagidrettRoutes);
app.use('/api/bruker', brukerRoutes);
app.use('/api/mal', malRoutes);
app.use('/api/rekorder', rekorderRoutes);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Workout Tracker server kjører på port ${PORT}`);
    console.log(`Åpne http://localhost:${PORT} i nettleseren din`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nLukker database forbindelse...');
    db.close((err) => {
        if (err) {
            console.error('Feil ved lukking av database:', err.message);
        } else {
            console.log('Database forbindelse lukket.');
        }
        process.exit(0);
    });
});
