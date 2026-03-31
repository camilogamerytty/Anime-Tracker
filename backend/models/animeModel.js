const pool = require('../config/database');

const AnimeModel = {
    getAll: async () => {
        const [rows] = await pool.query('SELECT * FROM animes ORDER BY created_at DESC');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await pool.query('SELECT * FROM animes WHERE id = ?', [id]);
        return rows[0];
    },
    create: async (title, status, notes, image_url) => {
        const [result] = await pool.query(
            'INSERT INTO animes (title, status, notes, image_url) VALUES (?, ?, ?, ?)',
            [title, status, notes || '', image_url || null]
        );
        return { id: result.insertId, title, status, notes, image_url };
    },
    update: async (id, title, status, notes, image_url) => {
        const [result] = await pool.query(
            'UPDATE animes SET title = ?, status = ?, notes = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title, status, notes || '', image_url || null, id]
        );
        return result.affectedRows;
    },
    delete: async (id) => {
        const [result] = await pool.query('DELETE FROM animes WHERE id = ?', [id]);
        return result.affectedRows;
    }
};

module.exports = AnimeModel;