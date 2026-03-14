const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  // Build combined query: "type name" (e.g. "block ice")
  const combinedQuery = type ? `${type} ${q}` : q;

  try {
    console.log(`🔍 Searching OpenGameArt for: "${combinedQuery}"`);
    
    // OpenGameArt advanced search for 2D Art (tid=9)
    const url = `https://opengameart.org/art-search-advanced?keys=${encodeURIComponent(combinedQuery)}&field_art_type_tid[]=9`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    const html = response.data;
    
    // Simple regex to find thumbnail images
    // Pattern: https://opengameart.org/sites/default/files/styles/thumbnail/public/...
    const regex = /https:\/\/opengameart\.org\/sites\/default\/files\/styles\/thumbnail\/public\/[^"']+/g;
    const matches = html.match(regex) || [];
    
    // Remove duplicates and limit to 3
    const uniqueMatches = [...new Set(matches)].slice(0, 3);
    
    const results = uniqueMatches.map((src, index) => {
      // Use the thumbnail URL for both display and downloading.
      // Since our pipeline pixelates/resizes everything anyway, 
      // the thumbnail is actually a better, faster source.
      return {
        id: `oga-${index}-${Date.now()}`,
        url: src,
        thumbnail: src,
        label: q
      };
    });

    console.log(`✅ Found ${results.length} results on OpenGameArt`);
    res.json({ results });

  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.json({ results: [], error: 'Search service unavailable' });
  }
});

module.exports = router;
