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


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Accesible en tu red local en http://<tu-ip-local>:${PORT}`);
});