const pool = require('../config/database');

const AnimeModel = {
    // Obtener todos los animes
    getAll: async () => {
        const [rows] = await pool.query('SELECT * FROM animes ORDER BY created_at DESC');
        return rows;
    },
    // Obtener uno por ID
    getById: async (id) => {
        const [rows] = await pool.query('SELECT * FROM animes WHERE id = ?', [id]);
        return rows[0];
    },
    // Crear anime
    create: async (title, status, notes) => {
        const [result] = await pool.query(
            'INSERT INTO animes (title, status, notes) VALUES (?, ?, ?)',
            [title, status, notes || '']
        );
        return { id: result.insertId, title, status, notes };
    },
    // Actualizar anime
    update: async (id, title, status, notes) => {
        const [result] = await pool.query(
            'UPDATE animes SET title = ?, status = ?, notes = ? WHERE id = ?',
            [title, status, notes || '', id]
        );
        return result.affectedRows;
    },
    // Eliminar anime
    delete: async (id) => {
        const [result] = await pool.query('DELETE FROM animes WHERE id = ?', [id]);
        return result.affectedRows;
    }
};

module.exports = AnimeModel;