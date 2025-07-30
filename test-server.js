const express = require('express');
const app = express();
app.use(express.json());

console.log('Attempting to require bruker routes...');
try {
    const brukerRoutes = require('./routes/bruker');
    console.log('Bruker routes loaded successfully');
    
    app.use('/api/bruker', brukerRoutes);
    console.log('Bruker routes mounted successfully');
    
    const PORT = 3001;
    app.listen(PORT, () => {
        console.log(`Test server kjører på port ${PORT}`);
    });
} catch (error) {
    console.error('Error loading bruker routes:', error);
}
