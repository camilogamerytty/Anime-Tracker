const express = require('express');
const router = express.Router();
const animeController = require('../controllers/animeController');

router.get('/', animeController.getAll);
router.post('/', animeController.create);
router.put('/:id', animeController.update);
router.delete('/:id', animeController.delete);

module.exports = router;