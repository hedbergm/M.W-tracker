console.log('Testing bruker.js import...');

try {
    const brukerRoutes = require('./routes/bruker');
    console.log('Bruker routes imported successfully');
    console.log('Type:', typeof brukerRoutes);
    console.log('Routes object:', brukerRoutes);
} catch (error) {
    console.error('Error importing bruker routes:', error);
}
