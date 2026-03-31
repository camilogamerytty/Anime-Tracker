const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const animeRoutes = require('./routes/animeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/animes', animeRoutes);
// Cualquier otra ruta que no sea estática ni API, devuelve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});