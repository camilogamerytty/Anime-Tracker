const AnimeModel = require('../models/animeModel');

exports.getAll = async (req, res) => {
    try {
        const animes = await AnimeModel.getAll();
        res.json(animes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener animes' });
    }
};

exports.create = async (req, res) => {
    const { title, status, notes, image_url } = req.body;
    if (!title || !status) {
        return res.status(400).json({ error: 'Título y estado son obligatorios' });
    }
    try {
        const newAnime = await AnimeModel.create(title, status, notes, image_url);
        res.status(201).json(newAnime);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear anime' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { title, status, notes, image_url } = req.body;
    if (!title || !status) {
        return res.status(400).json({ error: 'Título y estado son obligatorios' });
    }
    try {
        const affected = await AnimeModel.update(id, title, status, notes, image_url);
        if (affected === 0) {
            return res.status(404).json({ error: 'Anime no encontrado' });
        }
        res.json({ message: 'Anime actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar anime' });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const affected = await AnimeModel.delete(id);
        if (affected === 0) {
            return res.status(404).json({ error: 'Anime no encontrado' });
        }
        res.json({ message: 'Anime eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar anime' });
    }
};