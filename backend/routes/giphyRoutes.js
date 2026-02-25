const express = require('express');
const router = express.Router();
const giphyController = require('../controllers/giphyController');
const { protect } = require('../middleware/auth');

/**
 * API Routes - GIPHY (GIF search)
 * GET /api/giphy/search?q=query&limit=10
 */
router.use(protect);
router.get('/search', giphyController.searchGifs);

module.exports = router;
