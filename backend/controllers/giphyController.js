/**
 * GIPHY Controller
 * Proxy for GIPHY API to search GIFs (avoids CORS from frontend)
 * Uses native fetch (Node 18+)
 */

/**
 * @route   GET /api/giphy/search?q=query&limit=10
 * @desc    Search GIFs via GIPHY API
 */
exports.searchGifs = async (req, res) => {
  try {
    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'GIPHY API key not configured' });
    }

    const { q, limit = 10 } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${Math.min(parseInt(limit) || 10, 25)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.meta?.status !== 200) {
      return res.status(500).json({ message: 'GIPHY API error' });
    }

    const gifs = (data.data || []).map((g) => ({
      id: g.id,
      url: g.images?.fixed_height?.url || g.images?.original?.url,
      title: g.title
    }));

    res.json(gifs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
